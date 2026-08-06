const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EmployeePortal", function () {
    let payroll;
    let portal;
    let employer;
    let employee;
    let other;

    const ONE_WEEK = 7 * 24 * 60 * 60;
    const WAGE = ethers.parseEther("0.01");

    beforeEach(async function () {
        [employer, employee, other] = await ethers.getSigners();

        const EmployerPayroll = await ethers.getContractFactory("EmployerPayroll");
        payroll = await EmployerPayroll.connect(employer).deploy();
        await employer.sendTransaction({
            to: payroll.target,
            value: ethers.parseEther("1")
        });

        await payroll.connect(employer).registerEmployee(
            employee.address,
            WAGE,
            ONE_WEEK,
            "Jane Smith",
            "Engineering",
            "Software Engineer",
            "Builds cool things",
            "Full-time",
            "2025-01-15"
        );

        portal = await ethers.getContractAt(
            "EmployeePortal",
            await payroll.getEmployeePortal(employee.address)
        );
    });

    describe("Deployment", function () {
        it("stores the linked employer, payroll, and employee", async function () {
            expect(await portal.employee()).to.equal(employee.address);
            expect(await portal.employer()).to.equal(employer.address);
            expect(await portal.employerPayroll()).to.equal(payroll.target);
            expect(await portal.signed()).to.be.false;
        });

        it("rejects zero constructor addresses", async function () {
            const EmployeePortal = await ethers.getContractFactory("EmployeePortal");
            await expect(
                EmployeePortal.deploy(ethers.ZeroAddress, employer.address, employee.address)
            ).to.be.revertedWith("EmployeePortal: zero payroll");
        });
    });

    describe("signContract()", function () {
        it("allows the linked employee to sign and activates payroll", async function () {
            await expect(portal.connect(employee).signContract())
                .to.emit(portal, "ContractSigned")
                .withArgs(employee.address, payroll.target);

            expect(await portal.signed()).to.be.true;

            const [, , , lastPaid, activatedAt, active] = await payroll.getEmployee(employee.address);
            expect(active).to.be.true;
            expect(lastPaid).to.be.gt(0);
            expect(activatedAt).to.equal(lastPaid);
        });

        it("reverts if caller is not the employee", async function () {
            await expect(
                portal.connect(other).signContract()
            ).to.be.revertedWith("EmployeePortal: caller is not the employee");
        });

        it("reverts when signing twice", async function () {
            await portal.connect(employee).signContract();

            await expect(
                portal.connect(employee).signContract()
            ).to.be.revertedWith("EmployeePortal: contract already signed");
        });
    });

    describe("getContractDetails()", function () {
        it("returns the linked employee's details from payroll", async function () {
            const [addr, wageWei, payFrequency, lastPaid, activatedAt, active] =
                await portal.getContractDetails();

            expect(addr).to.equal(employee.address);
            expect(wageWei).to.equal(WAGE);
            expect(payFrequency).to.equal(ONE_WEEK);
            expect(lastPaid).to.equal(0);
            expect(activatedAt).to.equal(0);
            expect(active).to.be.false;
        });
    });

    describe("getEmployeeMeta()", function () {
        it("returns the linked employee metadata from payroll", async function () {
            const [name, department, jobTitle, jobDescription, employmentType, startDate] =
                await portal.getEmployeeMeta();

            expect(name).to.equal("Jane Smith");
            expect(department).to.equal("Engineering");
            expect(jobTitle).to.equal("Software Engineer");
            expect(jobDescription).to.equal("Builds cool things");
            expect(employmentType).to.equal("Full-time");
            expect(startDate).to.equal("2025-01-15");
        });
    });

    describe("getAgreementStatus()", function () {
        it("returns signed and active status", async function () {
            let [contractSigned, active] = await portal.getAgreementStatus();
            expect(contractSigned).to.be.false;
            expect(active).to.be.false;

            await portal.connect(employee).signContract();

            [contractSigned, active] = await portal.getAgreementStatus();
            expect(contractSigned).to.be.true;
            expect(active).to.be.true;
        });
    });

    describe("Access control", function () {
        it("getContractDetails() reverts for an unauthorized caller", async function () {
            await expect(
                portal.connect(other).getContractDetails()
            ).to.be.revertedWith("EmployeePortal: access denied");
        });

        it("getEmployeeMeta() reverts for an unauthorized caller", async function () {
            await expect(
                portal.connect(other).getEmployeeMeta()
            ).to.be.revertedWith("EmployeePortal: access denied");
        });

        it("getAgreementStatus() reverts for an unauthorized caller", async function () {
            await expect(
                portal.connect(other).getAgreementStatus()
            ).to.be.revertedWith("EmployeePortal: access denied");
        });

        it("getContractDetails() succeeds for the employee", async function () {
            const [addr] = await portal.connect(employee).getContractDetails();
            expect(addr).to.equal(employee.address);
        });

        it("getContractDetails() succeeds for the employer", async function () {
            const [addr] = await portal.connect(employer).getContractDetails();
            expect(addr).to.equal(employee.address);
        });
    });
});
