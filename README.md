<p align="center">
  <img src="imgs/icon.png" alt="smartWage" width="188" />
</p>

# smartWage

A simple and free dApp that uses Ethereum smart contracts to automate the payroll process. Employers deploy an on-chain payroll contract, register employees, and automatically create a linked employee contract for each hire. Employees connect with the contract address their employer provides, review the agreement, and sign to activate it.

---

## Table of Contents

- [Overview](#overview)
- [Connecting to the App](#connecting-to-the-app)
- [Using the Employer Contract](#using-the-employer-contract)
- [Using the Employee Contract](#using-the-employee-contract)
- [ZK-STARK Proofs](#zk-stark-proofs)
- [Developer Notes](#developer-notes)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Compiling](#compiling)
  - [Testing](#testing)
  - [Deploying](#deploying)

---

## Overview

smartWage has two roles and two matching smart contracts:

| Role | Contract | Purpose |
|---|---|---|
| **Employer** | `EmployerPayroll` | Holds ETH, registers employees, creates linked employee contracts, schedules payments, sends bonuses |
| **Employee** | `EmployeePortal` | A single employment agreement linked to one employer and one employee; employees use it to review and sign |

The frontend is a static site (no build step) that can be hosted on GitHub Pages or served locally via any HTTP server. It uses [ethers.js v6](https://docs.ethers.org/v6/) and requires a [MetaMask](https://metamask.io/) wallet.

---

## Connecting to the App

> **Important:** MetaMask only injects into pages served over `http://` or `https://`. Opening `index.html` directly from the file system (`file:///…`) will not work. Use one of the options below.

**Option A — GitHub Pages (recommended)**

Visit the live app at [https://jgphilpott.github.io/smartWage](https://jgphilpott.github.io/smartWage).

**Option B — Local HTTP server**

```bash
# Python 3
python3 -m http.server 8080

# Node.js (npx)
npx serve .
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

**Connecting your wallet**

1. Install [MetaMask](https://metamask.io/download/) if you haven't already.
2. Open the app and click **Connect Wallet**.
3. Approve the connection request in MetaMask.
4. Choose your role — **Employer** or **Employee**.

---

## Using the Employer Contract

### Deploying EmployerPayroll

Deploy `contracts/employer/EmployerPayroll.sol` using [Remix](https://remix.ethereum.org), Hardhat (see [Deploying](#deploying) below), or any other tool. Copy the deployed contract address — you will need it to use the dashboard.

### Employer Dashboard

1. Navigate to the **Employer** page and paste your `EmployerPayroll` contract address.
2. Click **Connect** to load your dashboard.

#### Funding the contract

Go to the **Fund Contract** tab, enter an ETH amount, and click **Deposit ETH**. The contract must hold enough ETH to cover scheduled payments.

#### Registering an employee

Go to the **Register Employee** tab:

| Field | Description |
|---|---|
| Employee wallet address | The employee's Ethereum address |
| Wage per cycle (ETH) | Amount paid each pay period |
| Pay frequency | How often payments are made (minute → monthly) |

Click **Register Employee**. smartWage will automatically deploy a linked `EmployeePortal` contract for that employee. Share that contract address with the employee so they can connect and sign it. The first payment becomes due one full pay cycle after the employee signs.

#### Managing employees

The **Employees** tab lists all current employees. For each employee you can:

- **Copy Contract** — copy the linked employee contract to share with the employee.
- **Pay** — immediately send one cycle's wage (employer only).
- **Bonus** — send a one-off bonus of any amount.
- **Edit** — update wage and/or pay frequency.
- **Remove** — deactivate the employee record.

#### Running due payments

Click **⚡ Run Due Payments** on the employer dashboard to trigger `processDuePayments(start, count)`. This is permissionless — anyone (employer, employee, keeper bot, cron job) can call it. Use pagination (`start` and `count`) to process a bounded slice of the employee list per transaction and avoid block gas-limit issues as the list grows. On the employee dashboard, **⚡ Run Due Payments** triggers `processDuePaymentFor(employeeAddress)` to process that employee's accrued cycles directly. If multiple pay cycles elapsed between runs, wages accrue and are paid in a catch-up transfer when this method is called. If the contract is underfunded, it pays as many full cycles as possible and leaves the remainder due for the next run.

### EmployerPayroll — Key Functions

```solidity
// Register an employee and deploy their linked employee contract
registerEmployee(address addr, uint256 wageWei, uint256 payFrequency)

// Activate an employee after their linked contract is signed
activateEmployeeFromPortal(address addr)

// Update an existing employee's wage / frequency
updateEmployee(address addr, uint256 wageWei, uint256 payFrequency)

// Deactivate an employee
removeEmployee(address addr)

// Manually pay one employee (employer only, ignores schedule)
payEmployee(address addr)

// Batch-process overdue payments for a slice of the employee list (permissionless)
processDuePayments(uint256 start, uint256 count)

// Process overdue payments for one employee (permissionless)
processDuePaymentFor(address addr)

// Send a one-off bonus
sendBonus(address addr, uint256 amount)

// Deposit ETH
deposit()  // or send ETH directly to the contract address
```

---

## Using the Employee Contract

### Employee Dashboard

1. Ask your employer for the linked `EmployeePortal` contract address they created for you.
2. Navigate to the **Employee** page and paste that contract address.
3. Click **Connect** to load your agreement.
4. Review the terms and click **Sign Contract** to activate it.

#### Reviewing and signing your agreement

Once connected, the employee dashboard shows:

- your linked payroll contract
- wage and pay frequency
- profile metadata such as title, department, employment type, and start date
- whether the agreement is still pending signature or already active
- a **Run Due Payments** action for triggering permissionless catch-up processing
- top-bar indicators for accrued unpaid wages and time until the next scheduled payment

The first scheduled payment becomes due after one full pay cycle from the time you sign.

#### Viewing pay history

The pay history panel queries `PaymentSent` and `BonusSent` events emitted by the linked employer payroll contract for your address, giving you a full on-chain record of every payment received.

### EmployeePortal — Key Functions

```solidity
// Employee signs the linked agreement
signContract()

// Read the linked payroll record
getContractDetails()
    // returns (addr, wageWei, payFrequency, lastPaid, active)

// Read linked employee metadata
getEmployeeMeta()

// Read signature + activation state
getAgreementStatus()
```

### Legacy note

The employee contract is no longer a multi-employer self-deployed portal. It now represents a single employment agreement created by the employer during onboarding.

---

## ZK-STARK Proofs

smartWage includes a set of [Cairo 2](https://docs.cairo-lang.org/) ZK-STARK programs that let employees prove facts about their salary to third parties **without revealing the actual wage amount**.  The proofs are anchored to an on-chain Poseidon commitment stored by the employer, so no employer letter or payslip needs to be shared.

Three proofs are currently implemented in `cairo/src/`:

| Executable | Statement proven | Example use case |
|---|---|---|
| `minimum_income_proof` | wage ≥ X | Mortgage / rental eligibility |
| `maximum_income_proof` | wage ≤ X | Means-tested benefits, tax bracket |
| `salary_range_proof`   | A ≤ wage ≤ B | Insurance, tax confirmation |

See [`docs/zk-starks.md`](docs/zk-starks.md) for the full design rationale, commitment scheme, and instructions for building and running the proofs with [Scarb](https://docs.swmansion.com/scarb/).

---

## Developer Notes

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [npm](https://www.npmjs.com/) v9 or later

### Installation

```bash
npm install
```

### Compiling

```bash
npm run compile
# or
npx hardhat compile
```

Compiled artefacts are written to `artifacts/` and ABI files can be found under `artifacts/contracts/`.

### Testing

```bash
npm test
# or
npx hardhat test
```

The test suite covers contract creation, employee signing, access-control reverts, payment scheduling, and cross-contract reads.

### Deploying

To deploy to the Hardhat local network for development:

```bash
npx hardhat node          # start a local node (keep this running)
npx hardhat run scripts/deploy.js --network localhost
```

To deploy to a public testnet (e.g. Sepolia), add the network to `hardhat.config.js`:

```js
networks: {
  sepolia: {
    url: process.env.SEPOLIA_RPC_URL,
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

Then run:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

> Store private keys in a `.env` file and never commit them to version control.
