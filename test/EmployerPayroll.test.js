const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("EmployerPayroll", function () {
    let payroll;
    let employer;
    let employee1;
    let employee2;
    let other;

    const ONE_WEEK = 7 * 24 * 60 * 60;
    const WAGE = ethers.parseEther("0.01");
    const INITIAL_FUND = ethers.parseEther("1");

    async function registerEmployee(signer = employee1, wage = WAGE, frequency = ONE_WEEK) {
        const tx = await payroll.registerEmployee(
            signer.address,
            wage,
            frequency,
            "Jane Smith",
            "Engineering",
            "Software Engineer",
            "Builds things",
            "Full-time",
            "2025-01-15"
        );
        await tx.wait();
        const portalAddress = await payroll.getEmployeePortal(signer.address);
        return ethers.getContractAt("EmployeePortal", portalAddress);
    }

    async function registerAndSignEmployee(signer = employee1, wage = WAGE, frequency = ONE_WEEK) {
        const portal = await registerEmployee(signer, wage, frequency);
        await portal.connect(signer).signContract();
        return portal;
    }

    beforeEach(async function () {
        [employer, employee1, employee2, other] = await ethers.getSigners();

        const EmployerPayroll = await ethers.getContractFactory("EmployerPayroll");
        payroll = await EmployerPayroll.connect(employer).deploy();

        await employer.sendTransaction({
            to: payroll.target,
            value: INITIAL_FUND
        });
    });

    describe("Deployment", function () {
        it("sets the deployer as employer", async function () {
            expect(await payroll.employer()).to.equal(employer.address);
        });

        it("receives ETH via receive()", async function () {
            expect(await payroll.getBalance()).to.equal(INITIAL_FUND);
        });
    });

    describe("deposit()", function () {
        it("increases the contract balance", async function () {
            const extra = ethers.parseEther("0.5");
            await payroll.deposit({ value: extra });
            expect(await payroll.getBalance()).to.equal(INITIAL_FUND + extra);
        });

        it("emits FundsDeposited", async function () {
            const extra = ethers.parseEther("0.1");
            await expect(payroll.deposit({ value: extra }))
                .to.emit(payroll, "FundsDeposited")
                .withArgs(employer.address, extra);
        });
    });

    describe("registerEmployee()", function () {
        it("creates a linked employee agreement and stores a pending employee", async function () {
            const portal = await registerEmployee(employee1);
            const portalAddress = await portal.getAddress();

            expect(await payroll.getEmployeePortal(employee1.address)).to.equal(portalAddress);

            const [addr, wageWei, payFrequency, lastPaid, active] = await payroll.getEmployee(employee1.address);
            expect(addr).to.equal(employee1.address);
            expect(wageWei).to.equal(WAGE);
            expect(payFrequency).to.equal(ONE_WEEK);
            expect(lastPaid).to.equal(0);
            expect(active).to.be.false;

            const [employeeContract, agreementActive, removed] = await payroll.getEmployeeAgreement(employee1.address);
            expect(employeeContract).to.equal(portalAddress);
            expect(agreementActive).to.be.false;
            expect(removed).to.be.false;

            expect(await portal.employee()).to.equal(employee1.address);
            expect(await portal.employer()).to.equal(employer.address);
            expect(await portal.employerPayroll()).to.equal(payroll.target);
            expect(await portal.signed()).to.be.false;
        });

        it("emits EmployeeRegistered with the linked agreement address", async function () {
            const tx = await payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK, "", "", "", "", "", "");
            const receipt = await tx.wait();
            const event = receipt.logs.find((log) => log.fragment && log.fragment.name === "EmployeeRegistered");

            expect(event.args.employee).to.equal(employee1.address);
            expect(event.args.employeeContract).to.equal(await payroll.getEmployeePortal(employee1.address));
            expect(event.args.wageWei).to.equal(WAGE);
            expect(event.args.payFrequency).to.equal(ONE_WEEK);
        });

        it("reverts if caller is not employer", async function () {
            await expect(
                payroll.connect(other).registerEmployee(employee1.address, WAGE, ONE_WEEK, "", "", "", "", "", "")
            ).to.be.revertedWith("EmployerPayroll: caller is not employer");
        });

        it("reverts if employee already registered", async function () {
            await registerEmployee(employee1);
            await expect(
                payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK, "", "", "", "", "", "")
            ).to.be.revertedWith("EmployerPayroll: employee already registered");
        });

        it("reverts on zero address", async function () {
            await expect(
                payroll.registerEmployee(ethers.ZeroAddress, WAGE, ONE_WEEK, "", "", "", "", "", "")
            ).to.be.revertedWith("EmployerPayroll: zero address");
        });

        it("reverts when wage is zero", async function () {
            await expect(
                payroll.registerEmployee(employee1.address, 0, ONE_WEEK, "", "", "", "", "", "")
            ).to.be.revertedWith("EmployerPayroll: wage must be > 0");
        });

        it("reverts when payFrequency is zero", async function () {
            await expect(
                payroll.registerEmployee(employee1.address, WAGE, 0, "", "", "", "", "", "")
            ).to.be.revertedWith("EmployerPayroll: pay frequency must be > 0");
        });
    });

    describe("activation workflow", function () {
        it("activates an employee when they sign their linked agreement", async function () {
            const portal = await registerEmployee(employee1);

            await expect(portal.connect(employee1).signContract())
                .to.emit(payroll, "EmployeeActivated");

            const [, , , lastPaid, active] = await payroll.getEmployee(employee1.address);
            expect(active).to.be.true;
            expect(lastPaid).to.be.gt(0);
        });

        it("reverts when someone else attempts to sign", async function () {
            const portal = await registerEmployee(employee1);

            await expect(
                portal.connect(other).signContract()
            ).to.be.revertedWith("EmployeePortal: caller is not the employee");
        });

        it("reverts when activateEmployeeFromPortal is called by a non-portal address", async function () {
            await registerEmployee(employee1);

            await expect(
                payroll.connect(other).activateEmployeeFromPortal(employee1.address)
            ).to.be.revertedWith("EmployerPayroll: caller is not employee contract");
        });
    });

    describe("updateEmployee()", function () {
        beforeEach(async function () {
            await registerEmployee(employee1);
        });

        it("updates wage and frequency before activation", async function () {
            const newWage = ethers.parseEther("0.02");
            const newFreq = ONE_WEEK * 2;

            await expect(payroll.updateEmployee(employee1.address, newWage, newFreq, "", "", "", "", "", ""))
                .to.emit(payroll, "EmployeeUpdated")
                .withArgs(employee1.address, newWage, newFreq);

            const [, wageWei, payFrequency] = await payroll.getEmployee(employee1.address);
            expect(wageWei).to.equal(newWage);
            expect(payFrequency).to.equal(newFreq);
        });

        it("reverts if caller is not employer", async function () {
            await expect(
                payroll.connect(other).updateEmployee(employee1.address, WAGE, ONE_WEEK, "", "", "", "", "", "")
            ).to.be.revertedWith("EmployerPayroll: caller is not employer");
        });

        it("reverts if employee not found", async function () {
            await expect(
                payroll.updateEmployee(employee2.address, WAGE, ONE_WEEK, "", "", "", "", "", "")
            ).to.be.revertedWith("EmployerPayroll: employee not found");
        });
    });

    describe("removeEmployee()", function () {
        beforeEach(async function () {
            await registerEmployee(employee1);
        });

        it("marks the employee as removed", async function () {
            const portalAddress = await payroll.getEmployeePortal(employee1.address);

            await expect(payroll.removeEmployee(employee1.address))
                .to.emit(payroll, "EmployeeRemoved")
                .withArgs(employee1.address, portalAddress);

            const [employeeContract, active, removed] = await payroll.getEmployeeAgreement(employee1.address);
            expect(employeeContract).to.equal(portalAddress);
            expect(active).to.be.false;
            expect(removed).to.be.true;
        });

        it("prevents later activation after removal", async function () {
            const portal = await ethers.getContractAt(
                "EmployeePortal",
                await payroll.getEmployeePortal(employee1.address)
            );
            await payroll.removeEmployee(employee1.address);

            await expect(
                portal.connect(employee1).signContract()
            ).to.be.revertedWith("EmployerPayroll: employee removed");
        });
    });

    describe("payEmployee()", function () {
        beforeEach(async function () {
            await registerAndSignEmployee(employee1);
        });

        it("transfers wage and emits PaymentSent", async function () {
            const before = await ethers.provider.getBalance(employee1.address);
            await expect(payroll.payEmployee(employee1.address))
                .to.emit(payroll, "PaymentSent");
            const after = await ethers.provider.getBalance(employee1.address);
            expect(after - before).to.equal(WAGE);
        });

        it("reverts if employee is not yet active", async function () {
            await registerEmployee(employee2);
            await expect(
                payroll.payEmployee(employee2.address)
            ).to.be.revertedWith("EmployerPayroll: employee not active");
        });

        it("reverts if insufficient balance", async function () {
            const balance = await payroll.getBalance();
            const bigWage = balance + WAGE;
            await registerAndSignEmployee(employee2, bigWage);

            await expect(
                payroll.payEmployee(employee2.address)
            ).to.be.revertedWith("EmployerPayroll: insufficient balance");
        });
    });

    describe("processDuePayments()", function () {
        it("only pays signed employees whose frequency has elapsed", async function () {
            await registerAndSignEmployee(employee1, WAGE, ONE_WEEK);
            await registerEmployee(employee2, WAGE, ONE_WEEK);
            await time.increase(ONE_WEEK + 1);

            const before1 = await ethers.provider.getBalance(employee1.address);
            const before2 = await ethers.provider.getBalance(employee2.address);

            await payroll.processDuePayments(0, 100);

            const after1 = await ethers.provider.getBalance(employee1.address);
            const after2 = await ethers.provider.getBalance(employee2.address);

            expect(after1 - before1).to.equal(WAGE);
            expect(after2 - before2).to.equal(0n);
        });

        it("pays all elapsed cycles when payments were missed", async function () {
            const ONE_MINUTE = 60;
            await registerAndSignEmployee(employee1, WAGE, ONE_MINUTE);
            await time.increase((10 * ONE_MINUTE) + 1);

            const before = await ethers.provider.getBalance(employee1.address);
            await payroll.processDuePayments(0, 100);
            const after = await ethers.provider.getBalance(employee1.address);

            expect(after - before).to.equal(WAGE * 10n);
        });

        it("can be called by anyone", async function () {
            await registerAndSignEmployee(employee1);
            await time.increase(ONE_WEEK + 1);
            await expect(
                payroll.connect(other).processDuePayments(0, 100)
            ).to.not.be.reverted;
        });

        it("only processes employees within the given range", async function () {
            await registerAndSignEmployee(employee1);
            await registerAndSignEmployee(employee2);
            await time.increase(ONE_WEEK + 1);

            const before1 = await ethers.provider.getBalance(employee1.address);
            const before2 = await ethers.provider.getBalance(employee2.address);

            await payroll.processDuePayments(0, 1);

            const after1 = await ethers.provider.getBalance(employee1.address);
            const after2 = await ethers.provider.getBalance(employee2.address);

            expect(after1 - before1).to.equal(WAGE);
            expect(after2 - before2).to.equal(0n);
        });

        it("partially catches up and preserves unpaid cycles when underfunded", async function () {
            const ONE_MINUTE = 60;
            const highWage = ethers.parseEther("0.2");
            await registerAndSignEmployee(employee1, highWage, ONE_MINUTE);
            await time.increase((10 * ONE_MINUTE) + 1);

            const [, , payFrequency, initialLastPaid] = await payroll.getEmployee(employee1.address);
            const before = await ethers.provider.getBalance(employee1.address);

            await payroll.processDuePayments(0, 100);

            const after = await ethers.provider.getBalance(employee1.address);
            const [, , , updatedLastPaid] = await payroll.getEmployee(employee1.address);

            expect(after - before).to.equal(ethers.parseEther("1"));
            expect(updatedLastPaid - initialLastPaid).to.equal(payFrequency * 5n);
            expect(await payroll.isPaymentDue(employee1.address)).to.be.true;
        });
    });

    describe("processDuePaymentFor()", function () {
        it("can be called by anyone", async function () {
            await registerAndSignEmployee(employee1);
            await time.increase(ONE_WEEK + 1);
            await expect(
                payroll.connect(other).processDuePaymentFor(employee1.address)
            ).to.not.be.reverted;
        });

        it("partially catches up and preserves unpaid cycles when underfunded", async function () {
            const ONE_MINUTE = 60;
            const highWage = ethers.parseEther("0.2");
            await registerAndSignEmployee(employee1, highWage, ONE_MINUTE);
            await time.increase((10 * ONE_MINUTE) + 1);

            const [, , payFrequency, initialLastPaid] = await payroll.getEmployee(employee1.address);
            const before = await ethers.provider.getBalance(employee1.address);

            await payroll.connect(other).processDuePaymentFor(employee1.address);

            const after = await ethers.provider.getBalance(employee1.address);
            const [, , , updatedLastPaid] = await payroll.getEmployee(employee1.address);

            expect(after - before).to.equal(ethers.parseEther("1"));
            expect(updatedLastPaid - initialLastPaid).to.equal(payFrequency * 5n);
            expect(await payroll.isPaymentDue(employee1.address)).to.be.true;
        });

        it("pays the targeted employee's full accrued cycles when funded", async function () {
            const ONE_MINUTE = 60;
            const wage = ethers.parseEther("0.1");
            await registerAndSignEmployee(employee1, wage, ONE_MINUTE);
            await time.increase((10 * ONE_MINUTE) + 1);

            const before = await ethers.provider.getBalance(employee1.address);
            await payroll.connect(other).processDuePaymentFor(employee1.address);
            const after = await ethers.provider.getBalance(employee1.address);

            expect(after - before).to.equal(ethers.parseEther("1"));
        });

        it("isolates targeted payouts from list-order competition", async function () {
            const ONE_MINUTE = 60;
            const wage = ethers.parseEther("0.1");
            await registerAndSignEmployee(employee1, wage, ONE_MINUTE);
            await registerAndSignEmployee(employee2, wage, ONE_MINUTE);
            await time.increase((10 * ONE_MINUTE) + 1);

            const before1 = await ethers.provider.getBalance(employee1.address);
            const before2 = await ethers.provider.getBalance(employee2.address);

            await payroll.connect(other).processDuePaymentFor(employee2.address);

            const after1 = await ethers.provider.getBalance(employee1.address);
            const after2 = await ethers.provider.getBalance(employee2.address);

            expect(after1 - before1).to.equal(0n);
            expect(after2 - before2).to.equal(ethers.parseEther("1"));
        });
    });

    describe("sendBonus()", function () {
        beforeEach(async function () {
            await registerAndSignEmployee(employee1);
        });

        it("transfers the bonus and emits BonusSent", async function () {
            const bonus = ethers.parseEther("0.05");
            const before = await ethers.provider.getBalance(employee1.address);
            await expect(payroll.sendBonus(employee1.address, bonus))
                .to.emit(payroll, "BonusSent")
                .withArgs(employee1.address, bonus);
            const after = await ethers.provider.getBalance(employee1.address);
            expect(after - before).to.equal(bonus);
        });

        it("reverts if employee is not active", async function () {
            await registerEmployee(employee2);
            await expect(
                payroll.sendBonus(employee2.address, WAGE)
            ).to.be.revertedWith("EmployerPayroll: employee not active");
        });
    });

    describe("isPaymentDue()", function () {
        it("returns false before the employee signs", async function () {
            await registerEmployee(employee1);
            await time.increase(ONE_WEEK + 1);
            expect(await payroll.isPaymentDue(employee1.address)).to.be.false;
        });

        it("returns true when an active employee's pay frequency has elapsed", async function () {
            await registerAndSignEmployee(employee1);
            await time.increase(ONE_WEEK + 1);
            expect(await payroll.isPaymentDue(employee1.address)).to.be.true;
        });
    });

    describe("getPayrollRunway()", function () {
        it("returns the next shortfall time for active employees", async function () {
            const ONE_DAY = 24 * 60 * 60;
            const wage = ethers.parseEther("0.1");
            await payroll.deposit({ value: ethers.parseEther("0.1") });
            await registerAndSignEmployee(employee1, wage, ONE_DAY);

            const [, effectiveBalance] = await payroll.getPayrollRunway();
            expect(effectiveBalance).to.equal(ethers.parseEther("1.1"));

            const latest = await time.latest();
            const [runwaySeconds] = await payroll.getPayrollRunway();
            expect(runwaySeconds).to.equal((latest + (11 * ONE_DAY)) - latest);
        });

        it("subtracts currently due unpaid wages before projecting runway", async function () {
            const ONE_MINUTE = 60;
            const wage = ethers.parseEther("0.2");
            await registerAndSignEmployee(employee1, wage, ONE_MINUTE);
            await time.increase((3 * ONE_MINUTE) + 1);

            const [runwaySeconds, effectiveBalance] = await payroll.getPayrollRunway();
            expect(effectiveBalance).to.equal(ethers.parseEther("0.4"));
            expect(runwaySeconds).to.equal(ONE_MINUTE);
        });

        it("returns zero runway when due wages already exhaust the balance", async function () {
            const ONE_MINUTE = 60;
            const wage = ethers.parseEther("0.5");
            await registerAndSignEmployee(employee1, wage, ONE_MINUTE);
            await time.increase((3 * ONE_MINUTE) + 1);

            const [runwaySeconds, effectiveBalance] = await payroll.getPayrollRunway();
            expect(runwaySeconds).to.equal(0);
            expect(effectiveBalance).to.equal(0);
        });
    });

    describe("getEmployeeList() / getEmployeeCount()", function () {
        it("returns all registered employee addresses", async function () {
            await registerEmployee(employee1);
            await registerEmployee(employee2);

            const list = await payroll.getEmployeeList();
            expect(list).to.include(employee1.address);
            expect(list).to.include(employee2.address);
            expect(await payroll.getEmployeeCount()).to.equal(2);
        });
    });

    describe("setEmployeeMeta() / getEmployeeMeta()", function () {
        beforeEach(async function () {
            await registerEmployee(employee1);
        });

        it("stores and retrieves all metadata fields", async function () {
            await payroll.setEmployeeMeta(
                employee1.address,
                "Jane Smith",
                "Engineering",
                "Software Engineer",
                "Builds cool things",
                "Full-time",
                "2025-01-15"
            );

            const [name, department, jobTitle, jobDescription, employmentType, startDate] =
                await payroll.getEmployeeMeta(employee1.address);

            expect(name).to.equal("Jane Smith");
            expect(department).to.equal("Engineering");
            expect(jobTitle).to.equal("Software Engineer");
            expect(jobDescription).to.equal("Builds cool things");
            expect(employmentType).to.equal("Full-time");
            expect(startDate).to.equal("2025-01-15");
        });

        it("reverts if employee is not found", async function () {
            await expect(
                payroll.setEmployeeMeta(
                    employee2.address, "Jane", "Eng", "Dev", "", "Full-time", "2025-01-01"
                )
            ).to.be.revertedWith("EmployerPayroll: employee not found");
        });
    });

    describe("Access control", function () {
        beforeEach(async function () {
            await registerEmployee(employee1);
        });

        it("getEmployee() reverts for an unauthorized caller", async function () {
            await expect(
                payroll.connect(other).getEmployee(employee1.address)
            ).to.be.revertedWith("EmployerPayroll: access denied");
        });

        it("getEmployeeMeta() reverts for an unauthorized caller", async function () {
            await expect(
                payroll.connect(other).getEmployeeMeta(employee1.address)
            ).to.be.revertedWith("EmployerPayroll: access denied");
        });

        it("getEmployeeAgreement() reverts for an unauthorized caller", async function () {
            await expect(
                payroll.connect(other).getEmployeeAgreement(employee1.address)
            ).to.be.revertedWith("EmployerPayroll: access denied");
        });

        it("getEmployeePortal() reverts for an unauthorized caller", async function () {
            await expect(
                payroll.connect(other).getEmployeePortal(employee1.address)
            ).to.be.revertedWith("EmployerPayroll: access denied");
        });

        it("isPaymentDue() reverts for an unauthorized caller", async function () {
            await expect(
                payroll.connect(other).isPaymentDue(employee1.address)
            ).to.be.revertedWith("EmployerPayroll: access denied");
        });

        it("getEmployeeList() reverts for an unauthorized caller", async function () {
            await expect(
                payroll.connect(other).getEmployeeList()
            ).to.be.revertedWith("EmployerPayroll: caller is not employer");
        });

        it("getEmployeeCount() reverts for an unauthorized caller", async function () {
            await expect(
                payroll.connect(other).getEmployeeCount()
            ).to.be.revertedWith("EmployerPayroll: caller is not employer");
        });

        it("getBalance() reverts for an unauthorized caller", async function () {
            await expect(
                payroll.connect(other).getBalance()
            ).to.be.revertedWith("EmployerPayroll: caller is not employer");
        });

        it("getEmployee() succeeds when called via the linked employee portal", async function () {
            const portal = await ethers.getContractAt(
                "EmployeePortal",
                await payroll.getEmployeePortal(employee1.address)
            );
            // getContractDetails() delegates to payroll.getEmployee() with msg.sender == portal
            const [addr] = await portal.connect(employee1).getContractDetails();
            expect(addr).to.equal(employee1.address);
        });
    });

    describe("setWageCommitment() / getWageCommitment()", function () {
        // A valid felt252 commitment: top 4 bits are zero (value < 2^252)
        const VALID_COMMITMENT = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        const INVALID_COMMITMENT = "0xf123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

        beforeEach(async function () {
            await registerEmployee(employee1);
        });

        it("allows the employer to store and retrieve a wage commitment", async function () {
            await payroll.setWageCommitment(employee1.address, VALID_COMMITMENT);
            expect(await payroll.getWageCommitment(employee1.address)).to.equal(VALID_COMMITMENT);
        });

        it("allows anyone to read the wage commitment (needed for ZK verification)", async function () {
            await payroll.setWageCommitment(employee1.address, VALID_COMMITMENT);
            expect(await payroll.connect(other).getWageCommitment(employee1.address)).to.equal(VALID_COMMITMENT);
        });

        it("reverts if commitment exceeds felt252 range", async function () {
            await expect(
                payroll.setWageCommitment(employee1.address, INVALID_COMMITMENT)
            ).to.be.revertedWith("EmployerPayroll: commitment exceeds felt252 range");
        });

        it("reverts if caller is not the employer", async function () {
            await expect(
                payroll.connect(other).setWageCommitment(employee1.address, VALID_COMMITMENT)
            ).to.be.revertedWith("EmployerPayroll: caller is not employer");
        });

        it("reverts if employee is not found", async function () {
            await expect(
                payroll.setWageCommitment(employee2.address, VALID_COMMITMENT)
            ).to.be.revertedWith("EmployerPayroll: employee not found");
        });

        it("reverts getWageCommitment for an address that was never registered", async function () {
            await expect(
                payroll.getWageCommitment(other.address)
            ).to.be.revertedWith("EmployerPayroll: employee not registered");
        });

        it("allows getWageCommitment for a removed employee", async function () {
            await payroll.setWageCommitment(employee1.address, VALID_COMMITMENT);
            await payroll.removeEmployee(employee1.address);
            expect(await payroll.getWageCommitment(employee1.address)).to.equal(VALID_COMMITMENT);
        });
    });
});
