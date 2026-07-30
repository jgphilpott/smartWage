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

        // Deploy payroll contract as the employer
        const EmployerPayroll = await ethers.getContractFactory("EmployerPayroll");
        payroll = await EmployerPayroll.connect(employer).deploy();
        await employer.sendTransaction({
            to: payroll.target,
            value: ethers.parseEther("1")
        });

        // Register the employee in the payroll contract
        await payroll.connect(employer).registerEmployee(employee.address, WAGE, ONE_WEEK, "", "", "", "", "", "");

        // Deploy the employee's portal contract
        const EmployeePortal = await ethers.getContractFactory("EmployeePortal");
        portal = await EmployeePortal.connect(employee).deploy();
    });

    // ──────────────────────────────────────────
    //  Deployment
    // ──────────────────────────────────────────

    describe("Deployment", function () {
        it("sets the deployer as employee", async function () {
            expect(await portal.employee()).to.equal(employee.address);
        });
    });

    // ──────────────────────────────────────────
    //  registerEmployer
    // ──────────────────────────────────────────

    describe("registerEmployer()", function () {
        it("adds employer contract and emits EmployerAdded", async function () {
            await expect(portal.connect(employee).registerEmployer(payroll.target))
                .to.emit(portal, "EmployerAdded")
                .withArgs(payroll.target);

            expect(await portal.isRegistered(payroll.target)).to.be.true;
        });

        it("increments employer count", async function () {
            await portal.connect(employee).registerEmployer(payroll.target);
            expect(await portal.getEmployerCount()).to.equal(1);
        });

        it("reverts if caller is not the employee", async function () {
            await expect(
                portal.connect(other).registerEmployer(payroll.target)
            ).to.be.revertedWith("EmployeePortal: caller is not the employee");
        });

        it("reverts if already registered", async function () {
            await portal.connect(employee).registerEmployer(payroll.target);
            await expect(
                portal.connect(employee).registerEmployer(payroll.target)
            ).to.be.revertedWith("EmployeePortal: employer already registered");
        });

        it("reverts on zero address", async function () {
            await expect(
                portal.connect(employee).registerEmployer(ethers.ZeroAddress)
            ).to.be.revertedWith("EmployeePortal: zero address");
        });
    });

    // ──────────────────────────────────────────
    //  removeEmployer
    // ──────────────────────────────────────────

    describe("removeEmployer()", function () {
        beforeEach(async function () {
            await portal.connect(employee).registerEmployer(payroll.target);
        });

        it("marks employer as unregistered and emits EmployerRemoved", async function () {
            await expect(portal.connect(employee).removeEmployer(payroll.target))
                .to.emit(portal, "EmployerRemoved")
                .withArgs(payroll.target);

            expect(await portal.isRegistered(payroll.target)).to.be.false;
        });

        it("reverts if caller is not the employee", async function () {
            await expect(
                portal.connect(other).removeEmployer(payroll.target)
            ).to.be.revertedWith("EmployeePortal: caller is not the employee");
        });

        it("reverts if employer not registered", async function () {
            await expect(
                portal.connect(employee).removeEmployer(other.address)
            ).to.be.revertedWith("EmployeePortal: employer not registered");
        });
    });

    // ──────────────────────────────────────────
    //  getContractDetails
    // ──────────────────────────────────────────

    describe("getContractDetails()", function () {
        it("returns the employee's details from the employer contract", async function () {
            const [addr, wageWei, payFrequency, , active] =
                await portal.connect(employee).getContractDetails(payroll.target);

            expect(addr).to.equal(employee.address);
            expect(wageWei).to.equal(WAGE);
            expect(payFrequency).to.equal(ONE_WEEK);
            expect(active).to.be.true;
        });
    });

    // ──────────────────────────────────────────
    //  getEmployerAddress
    // ──────────────────────────────────────────

    describe("getEmployerAddress()", function () {
        it("returns the employer wallet address", async function () {
            expect(
                await portal.getEmployerAddress(payroll.target)
            ).to.equal(employer.address);
        });
    });

    // ──────────────────────────────────────────
    //  getEmployerContracts
    // ──────────────────────────────────────────

    describe("getEmployerContracts()", function () {
        it("returns registered employer contract addresses", async function () {
            await portal.connect(employee).registerEmployer(payroll.target);
            const contracts = await portal.getEmployerContracts();
            expect(contracts).to.include(payroll.target);
        });
    });
});
