/**
 * employee.js — Employee dashboard logic
 * Requires app.js (provider, signer, userAddress, helpers) and ethers.js to be loaded first.
 */

// ─────────────────────────────────────────────────────────────
//  ABIs (inline)
// ─────────────────────────────────────────────────────────────

const EMPLOYEE_ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [], "name": "employee", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "employerContract", "type": "address" }], "name": "registerEmployer", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "employerContract", "type": "address" }], "name": "removeEmployer", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "employerContract", "type": "address" }], "name": "getContractDetails", "outputs": [{ "internalType": "address", "name": "addr", "type": "address" }, { "internalType": "uint256", "name": "wageWei", "type": "uint256" }, { "internalType": "uint256", "name": "payFrequency", "type": "uint256" }, { "internalType": "uint256", "name": "lastPaid", "type": "uint256" }, { "internalType": "bool", "name": "active", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "employerContract", "type": "address" }], "name": "getEmployerAddress", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getEmployerContracts", "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getEmployerCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "employerContract", "type": "address" }], "name": "isRegistered", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "employerContract", "type": "address" }], "name": "EmployerAdded", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "employerContract", "type": "address" }], "name": "EmployerRemoved", "type": "event" }
];

const EMPLOYER_ABI_MINIMAL = [
  { "inputs": [], "name": "employer", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "employee", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }], "name": "PaymentSent", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "employee", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "BonusSent", "type": "event" }
];

// Compiled bytecode for EmployeePortal (kept in sync with contracts/employee/EmployeePortal.sol).
// Lets employees deploy their own portal directly from the dashboard instead of
// requiring an external tool like Remix or the Hardhat CLI.
const EMPLOYEE_BYTECODE = "0x6080604052348015600f57600080fd5b50600080546001600160a01b031916331790556106f5806100316000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c8063a0a1a7d71161005b578063a0a1a7d714610114578063a2b7cee41461013f578063b71289c714610152578063c3c5a5471461016557600080fd5b806332df3f021461008d5780634a9d6ae4146100d957806353b2edef146100ee5780637191b10a146100ff575b600080fd5b6100a061009b36600461058b565b6101a1565b604080516001600160a01b03909616865260208601949094529284019190915260608301521515608082015260a0015b60405180910390f35b6100e161022a565b6040516100d091906105af565b6001546040519081526020016100d0565b61011261010d36600461058b565b61028c565b005b600054610127906001600160a01b031681565b6040516001600160a01b0390911681526020016100d0565b61012761014d36600461058b565b610380565b61011261016036600461058b565b6103ea565b61019161017336600461058b565b6001600160a01b031660009081526002602052604090205460ff1690565b60405190151581526020016100d0565b600080546040516332648e0960e01b81526001600160a01b0391821660048201528291829182918291908716906332648e099060240160a060405180830381865afa1580156101f4573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061021891906105fb565b939a9299509097509550909350915050565b6060600180548060200260200160405190810160405280929190818152602001828054801561028257602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311610264575b5050505050905090565b6000546001600160a01b031633146102bf5760405162461bcd60e51b81526004016102b690610658565b60405180910390fd5b6001600160a01b03811660009081526002602052604090205460ff166103375760405162461bcd60e51b815260206004820152602760248201527f456d706c6f796565506f7274616c3a20656d706c6f796572206e6f74207265676044820152661a5cdd195c995960ca1b60648201526084016102b6565b6001600160a01b038116600081815260026020526040808220805460ff19169055517fba41c03c14e5c6511d4d0b64cbef2f6f35c915bd15aee993def2d0f34e4492ed9190a250565b6000816001600160a01b031663ae200e796040518163ffffffff1660e01b8152600401602060405180830381865afa1580156103c0573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906103e491906106a2565b92915050565b6000546001600160a01b031633146104145760405162461bcd60e51b81526004016102b690610658565b6001600160a01b03811661046a5760405162461bcd60e51b815260206004820152601c60248201527f456d706c6f796565506f7274616c3a207a65726f20616464726573730000000060448201526064016102b6565b6001600160a01b03811660009081526002602052604090205460ff16156104e75760405162461bcd60e51b815260206004820152602b60248201527f456d706c6f796565506f7274616c3a20656d706c6f79657220616c726561647960448201526a081c9959da5cdd195c995960aa1b60648201526084016102b6565b6001805480820182557fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf60180546001600160a01b0319166001600160a01b038416908117909155600081815260026020526040808220805460ff1916909417909355915190917f5a8f2961260f818d9667b25560811fd29da53292f5479e674f27c6f0db898fd491a250565b6001600160a01b038116811461058857600080fd5b50565b60006020828403121561059d57600080fd5b81356105a881610573565b9392505050565b602080825282518282018190526000918401906040840190835b818110156105f05783516001600160a01b03168352602093840193909201916001016105c9565b509095945050505050565b600080600080600060a0868803121561061357600080fd5b855161061e81610573565b60208701516040880151606089015160808a015193985091965094509250801515811461064a57600080fd5b809150509295509295909350565b6020808252602a908201527f456d706c6f796565506f7274616c3a2063616c6c6572206973206e6f742074686040820152696520656d706c6f79656560b01b606082015260800190565b6000602082840312156106b457600080fd5b81516105a88161057356fea2646970667358221220442c23134bde22eb8f375fb1862a91bfc476fc2278b2c1ece27bfdfe916c08ae64736f6c634300081a0033";

// ─────────────────────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────────────────────

let portalContract = null;
let portalAddress = null;
const STORAGE_KEY = "smartwage_employee_contract";

// ─────────────────────────────────────────────────────────────
//  Dashboard rendering
// ─────────────────────────────────────────────────────────────

async function refreshDashboard() {
    if (!portalContract) return;

    try {
        const contracts = await portalContract.getEmployerContracts();
        await renderContractsTable(contracts);
    } catch (err) {
        showToast("Failed to load portal data: " + err.message, "error");
    }
}

async function renderContractsTable(employerContracts) {
    const tbody = document.getElementById("contracts-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const activeContracts = [];
    for (const addr of employerContracts) {
        const isReg = await portalContract.isRegistered(addr);
        if (isReg) activeContracts.push(addr);
    }

    if (activeContracts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No employers registered. Add one below.</td></tr>`;
        return;
    }

    for (const contractAddr of activeContracts) {
        try {
            const [addr, wageWei, payFrequency, lastPaid, active] =
                await portalContract.getContractDetails(contractAddr);
            const employerAddr = await portalContract.getEmployerAddress(contractAddr);

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><span class="truncate" title="${contractAddr}">${contractAddr}</span></td>
                <td><span class="truncate" title="${employerAddr}">${shortAddress(employerAddr)}</span></td>
                <td>${formatWei(wageWei)}</td>
                <td>${formatFrequency(payFrequency)}</td>
                <td>${formatTimestamp(lastPaid)}</td>
                <td><span class="badge ${active ? "badge-success" : "badge-danger"}">${active ? "Active" : "Inactive"}</span></td>
                <td class="flex-row">
                    <button class="btn btn-sm btn-ghost" onclick="viewPayHistory('${contractAddr}')">History</button>
                    <button class="btn btn-sm btn-danger" onclick="handleRemoveEmployer('${contractAddr}')">Remove</button>
                </td>
            `;
            tbody.appendChild(tr);
        } catch {
            // Contract may be invalid or on wrong network — skip gracefully
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="7" style="color:var(--accent-danger)">⚠ Could not read contract at ${shortAddress(contractAddr)}</td>`;
            tbody.appendChild(tr);
        }
    }
}

// ─────────────────────────────────────────────────────────────
//  Pay history
// ─────────────────────────────────────────────────────────────

async function viewPayHistory(contractAddr) {
    const historyEl = document.getElementById("pay-history-panel");
    const historyBody = document.getElementById("history-tbody");
    const historyTitle = document.getElementById("history-contract-addr");

    historyEl.style.display = "block";
    historyBody.innerHTML = `<tr><td colspan="3" class="empty-state">Loading…</td></tr>`;
    historyTitle.textContent = shortAddress(contractAddr);
    historyTitle.title = contractAddr;

    try {
        const employerPayroll = new ethers.Contract(contractAddr, EMPLOYER_ABI_MINIMAL, provider);

        // Filter PaymentSent events for this employee address
        const filter = employerPayroll.filters.PaymentSent(userAddress);
        const latest = await provider.getBlockNumber();
        const fromBlock = Math.max(0, latest - 200_000);
        const events = await employerPayroll.queryFilter(filter, fromBlock, latest);

        // Also filter BonusSent events
        const bonusFilter = employerPayroll.filters.BonusSent(userAddress);
        const bonusEvents = await employerPayroll.queryFilter(bonusFilter, fromBlock, latest);
        // Combine and sort by block number descending
        const allEvents = [
            ...events.map(e => ({ type: "Salary", amount: e.args.amount, timestamp: e.args.timestamp, block: e.blockNumber })),
            ...bonusEvents.map(e => ({ type: "Bonus", amount: e.args.amount, timestamp: null, block: e.blockNumber }))
        ].sort((a, b) => b.block - a.block);

        if (allEvents.length === 0) {
            historyBody.innerHTML = `<tr><td colspan="3" class="empty-state">No payment history found.</td></tr>`;
            return;
        }

        historyBody.innerHTML = "";
        for (const ev of allEvents) {
            let ts = ev.timestamp ? formatTimestamp(ev.timestamp) : "(pending)";
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><span class="badge ${ev.type === "Salary" ? "badge-success" : "badge-danger"}">${ev.type}</span></td>
                <td>${formatWei(ev.amount)}</td>
                <td>${ts}</td>
            `;
            historyBody.appendChild(tr);
        }
    } catch (err) {
        historyBody.innerHTML = `<tr><td colspan="3" style="color:var(--accent-danger)">Error loading history: ${err.message}</td></tr>`;
    }
}

// ─────────────────────────────────────────────────────────────
//  Employer management
// ─────────────────────────────────────────────────────────────

async function handleRegisterEmployer(e) {
    e.preventDefault();
    const addr = document.getElementById("employer-contract-input").value.trim();

    if (!ethers.isAddress(addr)) {
        return showToast("Invalid contract address.", "error");
    }

    try {
        showToast("Submitting transaction…", "info");
        const tx = await portalContract.registerEmployer(addr);
        await tx.wait();
        showToast("Employer registered!", "success");
        e.target.reset();
        await refreshDashboard();
    } catch (err) {
        showToast(err.reason || err.message, "error");
    }
}

async function handleRemoveEmployer(addr) {
    if (!confirm(`Remove employer contract ${addr}?`)) return;
    try {
        showToast("Removing employer…", "info");
        const tx = await portalContract.removeEmployer(addr);
        await tx.wait();
        showToast("Employer removed.", "success");
        await refreshDashboard();
    } catch (err) {
        showToast(err.reason || err.message, "error");
    }
}

// ─────────────────────────────────────────────────────────────
//  Contract address management
// ─────────────────────────────────────────────────────────────

async function connectToPortal(address) {
    if (!ethers.isAddress(address)) {
        showToast("Could not connect: that doesn't look like a valid address.", "error");
        return;
    }

    try {
        // Make sure there's actually contract bytecode at this address on the
        // currently-connected network. This is the #1 cause of the generic
        // "invalid portal address or wrong network" error — it happens
        // whenever a local Hardhat node is restarted, since that wipes all
        // previously deployed contracts even though the saved address looks fine.
        const code = await provider.getCode(address);
        if (code === "0x") {
            showToast(
                "Could not connect: no contract found at that address on the current network. " +
                "If you're using a local Hardhat node, it may have restarted (which wipes all deployed " +
                "contracts) — deploy a new one below, and confirm MetaMask is on the Localhost network.",
                "error",
                8000
            );
            return;
        }

        portalContract = new ethers.Contract(address, EMPLOYEE_ABI, signer);
        // Validate by calling employee()
        await portalContract.employee();
        portalAddress = address;
        localStorage.setItem(STORAGE_KEY, address);
        showDashboard();
        await refreshDashboard();
        showToast("Connected to employee portal.", "success");
    } catch (err) {
        console.error("connectToPortal failed:", err);
        showToast(`Could not connect: ${err.reason || err.message || "invalid portal address or wrong network."}`, "error", 6000);
    }
}

// ─────────────────────────────────────────────────────────────
//  Deploy a brand new employee portal as the connected wallet
// ─────────────────────────────────────────────────────────────

async function handleDeployNewPortal() {
    if (!signer) {
        showToast("Connect your wallet first.", "error");
        return;
    }

    const btn = document.getElementById("deploy-new-btn");
    try {
        if (btn) {
            btn.disabled = true;
            btn.textContent = "Deploying…";
        }
        showToast("Deploying a new EmployeePortal contract…", "info");

        const factory = new ethers.ContractFactory(EMPLOYEE_ABI, EMPLOYEE_BYTECODE, signer);
        const deployed = await factory.deploy();
        await deployed.waitForDeployment();
        const newAddress = await deployed.getAddress();

        showToast(`Deployed new employee portal at ${shortAddress(newAddress)}!`, "success");

        const input = document.getElementById("portal-addr-input");
        if (input) input.value = newAddress;

        await connectToPortal(newAddress);
    } catch (err) {
        console.error("handleDeployNewPortal failed:", err);
        showToast(`Deployment failed: ${err.reason || err.message}`, "error", 6000);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "🚀 Deploy New Employee Portal";
        }
    }
}

// ─────────────────────────────────────────────────────────────
//  UI state transitions
// ─────────────────────────────────────────────────────────────

function showDashboard() {
    document.getElementById("setup-section").style.display = "none";
    document.getElementById("dashboard-section").style.display = "block";
}

function showSetup() {
    document.getElementById("setup-section").style.display = "block";
    document.getElementById("dashboard-section").style.display = "none";
    portalContract = null;
    portalAddress = null;
}

// ─────────────────────────────────────────────────────────────
//  Initialisation
// ─────────────────────────────────────────────────────────────

async function onWalletReady() {
    const el = document.getElementById("user-addr-display");
    if (el) el.textContent = userAddress;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        document.getElementById("portal-addr-input").value = saved;
    }

    document.getElementById("connect-portal-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const addr = document.getElementById("portal-addr-input").value.trim();
        await connectToPortal(addr);
    });

    // Deploy a brand new employee portal as the connected wallet
    const deployBtn = document.getElementById("deploy-new-btn");
    if (deployBtn) {
        deployBtn.addEventListener("click", handleDeployNewPortal);
    }

    document.getElementById("register-employer-form").addEventListener("submit", handleRegisterEmployer);

    document.getElementById("disconnect-btn").addEventListener("click", showSetup);
    document.getElementById("refresh-btn").addEventListener("click", refreshDashboard);
    document.getElementById("close-history-btn").addEventListener("click", () => {
        document.getElementById("pay-history-panel").style.display = "none";
    });

    if (saved) {
        await connectToPortal(saved);
    }
}
