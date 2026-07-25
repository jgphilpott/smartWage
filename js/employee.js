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
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No employers registered. Add one below.</td></tr>`;
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
        const events = await employerPayroll.queryFilter(filter);

        // Also filter BonusSent events
        const bonusFilter = employerPayroll.filters.BonusSent(userAddress);
        const bonusEvents = await employerPayroll.queryFilter(bonusFilter);

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
    try {
        portalContract = new ethers.Contract(address, EMPLOYEE_ABI, signer);
        // Validate by calling employee()
        await portalContract.employee();
        portalAddress = address;
        localStorage.setItem(STORAGE_KEY, address);
        showDashboard();
        await refreshDashboard();
        showToast("Connected to employee portal.", "success");
    } catch {
        showToast("Could not connect: invalid portal address or wrong network.", "error");
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
