<p align="center">
  <img src="imgs/icon.png" alt="smartWage" width="188" />
</p>

# smartWage

A simple and free dApp that uses Ethereum smart contracts to automate the payroll process. Employers deploy an on-chain contract to schedule ETH payments to employees; employees track their contracts and pay history through their own portal contract.

---

## Table of Contents

- [Overview](#overview)
- [Connecting to the App](#connecting-to-the-app)
- [Using the Employer Contract](#using-the-employer-contract)
- [Using the Employee Contract](#using-the-employee-contract)
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
| **Employer** | `EmployerPayroll` | Holds ETH, registers employees, schedules payments, sends bonuses |
| **Employee** | `EmployeePortal` | Aggregates employer relationships, reads contract details cross-chain |

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

Click **Register Employee**. The first payment becomes due after one full pay cycle.

#### Managing employees

The **Employees** tab lists all registered employees. For each employee you can:

- **Pay** — immediately send one cycle's wage (employer only).
- **Bonus** — send a one-off bonus of any amount.
- **Edit** — update wage and/or pay frequency.
- **Remove** — deactivate the employee record.

#### Running due payments

Click **⚡ Run Due Payments** to trigger `processDuePayments(start, count)`. This is permissionless — anyone (employer, keeper bot, cron job) can call it. Use pagination (`start` and `count`) to process a bounded slice of the employee list per transaction and avoid block gas-limit issues as the list grows. Employees whose payment is not yet due, or whose payment cannot be covered by the current balance, are skipped rather than causing the whole transaction to revert.

### EmployerPayroll — Key Functions

```solidity
// Register an employee — first payment due after one full cycle
registerEmployee(address addr, uint256 wageWei, uint256 payFrequency)

// Update an existing employee's wage / frequency
updateEmployee(address addr, uint256 wageWei, uint256 payFrequency)

// Deactivate an employee
removeEmployee(address addr)

// Manually pay one employee (employer only, ignores schedule)
payEmployee(address addr)

// Batch-process overdue payments for a slice of the employee list (permissionless)
processDuePayments(uint256 start, uint256 count)

// Send a one-off bonus
sendBonus(address addr, uint256 amount)

// Deposit ETH
deposit()  // or send ETH directly to the contract address
```

---

## Using the Employee Contract

### Deploying EmployeePortal

Deploy `contracts/employee/EmployeePortal.sol` once per employee wallet. The deployer address becomes the owner.

### Employee Dashboard

1. Navigate to the **Employee** page and paste your `EmployeePortal` contract address.
2. Click **Connect** to load your dashboard.

#### Adding an employer

Use the **Add Employer** form and enter the `EmployerPayroll` contract address your employer gave you. This registers it in your portal so you can view details and pay history.

#### Viewing contract details

For each registered employer the dashboard shows your wage, pay frequency, last payment date, and whether your record is currently active.

#### Viewing pay history

The pay history panel queries `PaymentSent` and `BonusSent` events emitted by the employer contract for your address, giving you a full on-chain record of every payment received.

### EmployeePortal — Key Functions

```solidity
// Register an employer's payroll contract
registerEmployer(address employerContract)

// Unregister an employer contract
removeEmployer(address employerContract)

// Read your contract details from a specific employer
getContractDetails(address employerContract)
    // returns (addr, wageWei, payFrequency, lastPaid, active)

// Get all registered employer contract addresses
getEmployerContracts()
```

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

The test suite covers all contract functions, access-control reverts, payment scheduling, and cross-contract reads (42 tests).

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
