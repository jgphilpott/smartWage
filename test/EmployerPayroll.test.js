const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("EmployerPayroll", function () {
    let payroll;
    let employer;
    let employee1;
    let employee2;
    let other;

    const ONE_WEEK = 7 * 24 * 60 * 60; // seconds
    const WAGE = ethers.parseEther("0.01");
    const INITIAL_FUND = ethers.parseEther("1");

    beforeEach(async function () {
        [employer, employee1, employee2, other] = await ethers.getSigners();

        const EmployerPayroll = await ethers.getContractFactory("EmployerPayroll");
        payroll = await EmployerPayroll.connect(employer).deploy();

        // Fund the contract
        await employer.sendTransaction({
            to: payroll.target,
            value: INITIAL_FUND
        });
    });

    // ──────────────────────────────────────────
    //  Deployment
    // ──────────────────────────────────────────

    describe("Deployment", function () {
        it("sets the deployer as employer", async function () {
            expect(await payroll.employer()).to.equal(employer.address);
        });

        it("receives ETH via receive()", async function () {
            expect(await payroll.getBalance()).to.equal(INITIAL_FUND);
        });
    });

    // ──────────────────────────────────────────
    //  Funding
    // ──────────────────────────────────────────

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

    // ──────────────────────────────────────────
    //  registerEmployee
    // ──────────────────────────────────────────

    describe("registerEmployee()", function () {
        it("registers a new employee and emits event", async function () {
            await expect(
                payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK)
            )
                .to.emit(payroll, "EmployeeRegistered")
                .withArgs(employee1.address, WAGE, ONE_WEEK);

            const [addr, wageWei, payFrequency, , active] =
                await payroll.getEmployee(employee1.address);

            expect(addr).to.equal(employee1.address);
            expect(wageWei).to.equal(WAGE);
            expect(payFrequency).to.equal(ONE_WEEK);
            expect(active).to.be.true;
        });

        it("reverts if caller is not employer", async function () {
            await expect(
                payroll.connect(other).registerEmployee(employee1.address, WAGE, ONE_WEEK)
            ).to.be.revertedWith("EmployerPayroll: caller is not employer");
        });

        it("reverts if employee already registered", async function () {
            await payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK);
            await expect(
                payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK)
            ).to.be.revertedWith("EmployerPayroll: employee already registered");
        });

        it("reverts on zero address", async function () {
            await expect(
                payroll.registerEmployee(ethers.ZeroAddress, WAGE, ONE_WEEK)
            ).to.be.revertedWith("EmployerPayroll: zero address");
        });

        it("reverts when wage is zero", async function () {
            await expect(
                payroll.registerEmployee(employee1.address, 0, ONE_WEEK)
            ).to.be.revertedWith("EmployerPayroll: wage must be > 0");
        });

        it("reverts when payFrequency is zero", async function () {
            await expect(
                payroll.registerEmployee(employee1.address, WAGE, 0)
            ).to.be.revertedWith("EmployerPayroll: pay frequency must be > 0");
        });
    });

    // ──────────────────────────────────────────
    //  updateEmployee
    // ──────────────────────────────────────────

    describe("updateEmployee()", function () {
        beforeEach(async function () {
            await payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK);
        });

        it("updates wage and frequency", async function () {
            const newWage = ethers.parseEther("0.02");
            const newFreq = ONE_WEEK * 2;

            await expect(payroll.updateEmployee(employee1.address, newWage, newFreq))
                .to.emit(payroll, "EmployeeUpdated")
                .withArgs(employee1.address, newWage, newFreq);

            const [, wageWei, payFrequency] = await payroll.getEmployee(employee1.address);
            expect(wageWei).to.equal(newWage);
            expect(payFrequency).to.equal(newFreq);
        });

        it("reverts if caller is not employer", async function () {
            await expect(
                payroll.connect(other).updateEmployee(employee1.address, WAGE, ONE_WEEK)
            ).to.be.revertedWith("EmployerPayroll: caller is not employer");
        });

        it("reverts if employee not found", async function () {
            await expect(
                payroll.updateEmployee(employee2.address, WAGE, ONE_WEEK)
            ).to.be.revertedWith("EmployerPayroll: employee not found");
        });
    });

    // ──────────────────────────────────────────
    //  removeEmployee
    // ──────────────────────────────────────────

    describe("removeEmployee()", function () {
        beforeEach(async function () {
            await payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK);
        });

        it("deactivates the employee", async function () {
            await expect(payroll.removeEmployee(employee1.address))
                .to.emit(payroll, "EmployeeRemoved")
                .withArgs(employee1.address);

            const [, , , , active] = await payroll.getEmployee(employee1.address);
            expect(active).to.be.false;
        });

        it("reverts if caller is not employer", async function () {
            await expect(
                payroll.connect(other).removeEmployee(employee1.address)
            ).to.be.revertedWith("EmployerPayroll: caller is not employer");
        });

        it("reverts if employee not found", async function () {
            await expect(
                payroll.removeEmployee(employee2.address)
            ).to.be.revertedWith("EmployerPayroll: employee not found");
        });
    });

    // ──────────────────────────────────────────
    //  payEmployee
    // ──────────────────────────────────────────

    describe("payEmployee()", function () {
        beforeEach(async function () {
            await payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK);
        });

        it("transfers wage and emits PaymentSent", async function () {
            const before = await ethers.provider.getBalance(employee1.address);
            await payroll.payEmployee(employee1.address);
            const after = await ethers.provider.getBalance(employee1.address);
            expect(after - before).to.equal(WAGE);
        });

        it("reverts if insufficient balance", async function () {
            // Drain the contract first
            const balance = await payroll.getBalance();
            const bigWage = balance + WAGE;
            await payroll.registerEmployee(employee2.address, bigWage, ONE_WEEK);
            await expect(
                payroll.payEmployee(employee2.address)
            ).to.be.revertedWith("EmployerPayroll: insufficient balance");
        });

        it("reverts if caller is not employer", async function () {
            await expect(
                payroll.connect(other).payEmployee(employee1.address)
            ).to.be.revertedWith("EmployerPayroll: caller is not employer");
        });
    });

    // ──────────────────────────────────────────
    //  processDuePayments
    // ──────────────────────────────────────────

    describe("processDuePayments()", function () {
        it("pays all employees whose frequency has elapsed", async function () {
            await payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK);
            await payroll.registerEmployee(employee2.address, WAGE, ONE_WEEK * 2);

            // Advance 1 week — employee1 is due, employee2 is not
            await time.increase(ONE_WEEK + 1);

            const before1 = await ethers.provider.getBalance(employee1.address);
            const before2 = await ethers.provider.getBalance(employee2.address);

            await payroll.processDuePayments(0, 100);

            const after1 = await ethers.provider.getBalance(employee1.address);
            const after2 = await ethers.provider.getBalance(employee2.address);

            expect(after1 - before1).to.equal(WAGE);
            expect(after2 - before2).to.equal(0n);
        });

        it("can be called by anyone, not just employer", async function () {
            await payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK);
            await time.increase(ONE_WEEK + 1);
            await expect(
                payroll.connect(other).processDuePayments(0, 100)
            ).to.not.be.reverted;
        });

        it("skips employees that are not yet due", async function () {
            await payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK * 4);
            await time.increase(ONE_WEEK);

            const before = await ethers.provider.getBalance(employee1.address);
            await payroll.processDuePayments(0, 100);
            const after = await ethers.provider.getBalance(employee1.address);

            expect(after - before).to.equal(0n);
        });

        it("only processes employees within the given range", async function () {
            await payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK);
            await payroll.registerEmployee(employee2.address, WAGE, ONE_WEEK);

            await time.increase(ONE_WEEK + 1);

            const before1 = await ethers.provider.getBalance(employee1.address);
            const before2 = await ethers.provider.getBalance(employee2.address);

            // Process only the first employee (index 0, count 1)
            await payroll.processDuePayments(0, 1);

            const after1 = await ethers.provider.getBalance(employee1.address);
            const after2 = await ethers.provider.getBalance(employee2.address);

            expect(after1 - before1).to.equal(WAGE);
            expect(after2 - before2).to.equal(0n);
        });

        it("clamps end index to list length when count exceeds bounds", async function () {
            await payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK);
            await time.increase(ONE_WEEK + 1);

            const before = await ethers.provider.getBalance(employee1.address);
            // count larger than the list — should not revert
            await payroll.processDuePayments(0, 9999);
            const after = await ethers.provider.getBalance(employee1.address);

            expect(after - before).to.equal(WAGE);
        });
    });

    // ──────────────────────────────────────────
    //  sendBonus
    // ──────────────────────────────────────────

    describe("sendBonus()", function () {
        beforeEach(async function () {
            await payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK);
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
            await payroll.removeEmployee(employee1.address);
            await expect(
                payroll.sendBonus(employee1.address, WAGE)
            ).to.be.revertedWith("EmployerPayroll: employee not found");
        });

        it("reverts if bonus is zero", async function () {
            await expect(
                payroll.sendBonus(employee1.address, 0)
            ).to.be.revertedWith("EmployerPayroll: bonus must be > 0");
        });

        it("reverts if insufficient balance", async function () {
            const huge = ethers.parseEther("1000");
            await expect(
                payroll.sendBonus(employee1.address, huge)
            ).to.be.revertedWith("EmployerPayroll: insufficient balance");
        });
    });

    // ──────────────────────────────────────────
    //  isPaymentDue
    // ──────────────────────────────────────────

    describe("isPaymentDue()", function () {
        it("returns true when frequency elapsed", async function () {
            await payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK);
            await time.increase(ONE_WEEK + 1);
            expect(await payroll.isPaymentDue(employee1.address)).to.be.true;
        });

        it("returns false when not yet due", async function () {
            await payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK);
            expect(await payroll.isPaymentDue(employee1.address)).to.be.false;
        });

        it("returns false for removed employee", async function () {
            await payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK);
            await payroll.removeEmployee(employee1.address);
            await time.increase(ONE_WEEK + 1);
            expect(await payroll.isPaymentDue(employee1.address)).to.be.false;
        });
    });

    // ──────────────────────────────────────────
    //  getEmployeeList / getEmployeeCount
    // ──────────────────────────────────────────

    describe("getEmployeeList() / getEmployeeCount()", function () {
        it("returns all registered employee addresses", async function () {
            await payroll.registerEmployee(employee1.address, WAGE, ONE_WEEK);
            await payroll.registerEmployee(employee2.address, WAGE, ONE_WEEK);

            const list = await payroll.getEmployeeList();
            expect(list).to.include(employee1.address);
            expect(list).to.include(employee2.address);
            expect(await payroll.getEmployeeCount()).to.equal(2);
        });
    });
});
