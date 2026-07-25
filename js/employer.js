/**
 * employer.js — Employer dashboard logic
 * Requires app.js (provider, signer, userAddress, helpers) and ethers.js to be loaded first.
 */

// ─────────────────────────────────────────────────────────────
//  ABI (inline — same as abis/EmployerPayroll.json)
// ─────────────────────────────────────────────────────────────

const EMPLOYER_ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [], "name": "employer", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "addr", "type": "address" }, { "internalType": "uint256", "name": "wageWei", "type": "uint256" }, { "internalType": "uint256", "name": "payFrequency", "type": "uint256" }], "name": "registerEmployee", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "addr", "type": "address" }, { "internalType": "uint256", "name": "wageWei", "type": "uint256" }, { "internalType": "uint256", "name": "payFrequency", "type": "uint256" }], "name": "updateEmployee", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "addr", "type": "address" }], "name": "removeEmployee", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "addr", "type": "address" }], "name": "payEmployee", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "processDuePayments", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "addr", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "sendBonus", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "addr", "type": "address" }], "name": "getEmployee", "outputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getEmployeeList", "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getEmployeeCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getBalance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "addr", "type": "address" }], "name": "isPaymentDue", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "deposit", "outputs": [], "stateMutability": "payable", "type": "function" },
  { "stateMutability": "payable", "type": "receive" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "FundsDeposited", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "employee", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "wageWei", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "payFrequency", "type": "uint256" }], "name": "EmployeeRegistered", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "employee", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "wageWei", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "payFrequency", "type": "uint256" }], "name": "EmployeeUpdated", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "employee", "type": "address" }], "name": "EmployeeRemoved", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "employee", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }], "name": "PaymentSent", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "employee", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "BonusSent", "type": "event" }
];

// ─────────────────────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────────────────────

let payrollContract = null;
let contractAddress = null;
const STORAGE_KEY = "smartwage_employer_contract";

// ─────────────────────────────────────────────────────────────
//  Contract helpers
// ─────────────────────────────────────────────────────────────

function getContract(address) {
    return new ethers.Contract(address, EMPLOYER_ABI, signer);
}

async function deployContract() {
    const factory = new ethers.ContractFactory(EMPLOYER_ABI, BYTECODE_EMPLOYER, signer);
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return contract;
}

// ─────────────────────────────────────────────────────────────
//  UI rendering
// ─────────────────────────────────────────────────────────────

async function refreshDashboard() {
    if (!payrollContract) return;

    try {
        const [balance, employeeList] = await Promise.all([
            payrollContract.getBalance(),
            payrollContract.getEmployeeList()
        ]);

        document.getElementById("contract-balance").textContent = formatWei(balance);
        document.getElementById("contract-address-display").textContent = contractAddress;
        document.getElementById("contract-address-display").title = contractAddress;

        await renderEmployeeTable(employeeList);
    } catch (err) {
        showToast("Failed to load contract data: " + err.message, "error");
    }
}

async function renderEmployeeTable(addresses) {
    const tbody = document.getElementById("employee-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const activeAddresses = [];
    for (const addr of addresses) {
        const [, , , , active] = await payrollContract.getEmployee(addr);
        if (active) activeAddresses.push(addr);
    }

    if (activeAddresses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No active employees. Register one below.</td></tr>`;
        return;
    }

    for (const addr of activeAddresses) {
        const [, wageWei, payFrequency, lastPaid] = await payrollContract.getEmployee(addr);
        const isDue = await payrollContract.isPaymentDue(addr);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><span class="truncate" title="${addr}">${addr}</span></td>
            <td>${formatWei(wageWei)}</td>
            <td>${formatFrequency(payFrequency)}</td>
            <td>${formatTimestamp(lastPaid)}</td>
            <td><span class="badge ${isDue ? "badge-success" : "badge-danger"}">${isDue ? "Due" : "Not Due"}</span></td>
            <td class="flex-row">
                <button class="btn btn-sm btn-primary" onclick="handlePayEmployee('${addr}')">Pay</button>
                <button class="btn btn-sm btn-ghost" onclick="openBonusModal('${addr}')">Bonus</button>
                <button class="btn btn-sm btn-ghost" onclick="openEditModal('${addr}', '${wageWei}', '${payFrequency}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="handleRemoveEmployee('${addr}')">Remove</button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

// ─────────────────────────────────────────────────────────────
//  Contract address management
// ─────────────────────────────────────────────────────────────

function loadSavedContract() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        document.getElementById("contract-addr-input").value = saved;
    }
}

async function connectToContract(address) {
    try {
        payrollContract = getContract(address);
        // Verify it's a valid payroll contract by calling employer()
        await payrollContract.employer();
        contractAddress = address;
        localStorage.setItem(STORAGE_KEY, address);
        showDashboard();
        await refreshDashboard();
        showToast("Connected to payroll contract.", "success");
    } catch {
        showToast("Could not connect: invalid contract address or wrong network.", "error");
    }
}

// ─────────────────────────────────────────────────────────────
//  Employee actions
// ─────────────────────────────────────────────────────────────

async function handleRegisterEmployee(e) {
    e.preventDefault();
    const addr = document.getElementById("reg-addr").value.trim();
    const wageEth = document.getElementById("reg-wage").value;
    const freqSeconds = document.getElementById("reg-freq").value;

    if (!ethers.isAddress(addr)) {
        return showToast("Invalid employee address.", "error");
    }

    try {
        showToast("Submitting transaction…", "info");
        const tx = await payrollContract.registerEmployee(
            addr,
            ethers.parseEther(wageEth),
            BigInt(freqSeconds)
        );
        await tx.wait();
        showToast("Employee registered successfully!", "success");
        e.target.reset();
        await refreshDashboard();
    } catch (err) {
        showToast(err.reason || err.message, "error");
    }
}

async function handlePayEmployee(addr) {
    try {
        showToast("Sending payment…", "info");
        const tx = await payrollContract.payEmployee(addr);
        await tx.wait();
        showToast(`Payment sent to ${shortAddress(addr)}.`, "success");
        await refreshDashboard();
    } catch (err) {
        showToast(err.reason || err.message, "error");
    }
}

async function handleProcessDue() {
    try {
        showToast("Processing all due payments…", "info");
        const tx = await payrollContract.processDuePayments();
        await tx.wait();
        showToast("Due payments processed.", "success");
        await refreshDashboard();
    } catch (err) {
        showToast(err.reason || err.message, "error");
    }
}

async function handleRemoveEmployee(addr) {
    if (!confirm(`Remove employee ${addr}?`)) return;
    try {
        showToast("Removing employee…", "info");
        const tx = await payrollContract.removeEmployee(addr);
        await tx.wait();
        showToast("Employee removed.", "success");
        await refreshDashboard();
    } catch (err) {
        showToast(err.reason || err.message, "error");
    }
}

async function handleDeposit(e) {
    e.preventDefault();
    const ethAmount = document.getElementById("deposit-amount").value;
    try {
        showToast("Depositing funds…", "info");
        const tx = await payrollContract.deposit({ value: ethers.parseEther(ethAmount) });
        await tx.wait();
        showToast("Funds deposited!", "success");
        e.target.reset();
        await refreshDashboard();
    } catch (err) {
        showToast(err.reason || err.message, "error");
    }
}

// ─────────────────────────────────────────────────────────────
//  Edit modal
// ─────────────────────────────────────────────────────────────

let editTarget = null;

function openEditModal(addr, wageWei, payFrequency) {
    editTarget = addr;
    document.getElementById("edit-addr-display").textContent = shortAddress(addr);
    document.getElementById("edit-wage").value = ethers.formatEther(wageWei);
    document.getElementById("edit-freq").value = payFrequency.toString();
    document.getElementById("edit-modal").style.display = "flex";
}

function closeEditModal() {
    document.getElementById("edit-modal").style.display = "none";
    editTarget = null;
}

async function handleUpdateEmployee(e) {
    e.preventDefault();
    if (!editTarget) return;
    const wageEth = document.getElementById("edit-wage").value;
    const freqSeconds = document.getElementById("edit-freq").value;
    try {
        showToast("Updating employee…", "info");
        const tx = await payrollContract.updateEmployee(
            editTarget,
            ethers.parseEther(wageEth),
            BigInt(freqSeconds)
        );
        await tx.wait();
        showToast("Employee updated!", "success");
        closeEditModal();
        await refreshDashboard();
    } catch (err) {
        showToast(err.reason || err.message, "error");
    }
}

// ─────────────────────────────────────────────────────────────
//  Bonus modal
// ─────────────────────────────────────────────────────────────

let bonusTarget = null;

function openBonusModal(addr) {
    bonusTarget = addr;
    document.getElementById("bonus-addr-display").textContent = shortAddress(addr);
    document.getElementById("bonus-modal").style.display = "flex";
}

function closeBonusModal() {
    document.getElementById("bonus-modal").style.display = "none";
    bonusTarget = null;
}

async function handleSendBonus(e) {
    e.preventDefault();
    if (!bonusTarget) return;
    const bonusEth = document.getElementById("bonus-amount").value;
    try {
        showToast("Sending bonus…", "info");
        const tx = await payrollContract.sendBonus(bonusTarget, ethers.parseEther(bonusEth));
        await tx.wait();
        showToast("Bonus sent!", "success");
        closeBonusModal();
        await refreshDashboard();
    } catch (err) {
        showToast(err.reason || err.message, "error");
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
    payrollContract = null;
    contractAddress = null;
}

// ─────────────────────────────────────────────────────────────
//  Initialisation
// ─────────────────────────────────────────────────────────────

async function onWalletReady() {
    loadSavedContract();

    // Wire up connect-to-existing form
    document.getElementById("connect-contract-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const addr = document.getElementById("contract-addr-input").value.trim();
        await connectToContract(addr);
    });

    // Register employee form
    document.getElementById("register-form").addEventListener("submit", handleRegisterEmployee);

    // Deposit form
    document.getElementById("deposit-form").addEventListener("submit", handleDeposit);

    // Process due payments button
    document.getElementById("process-due-btn").addEventListener("click", handleProcessDue);

    // Edit modal form
    document.getElementById("edit-form").addEventListener("submit", handleUpdateEmployee);
    document.getElementById("close-edit-modal").addEventListener("click", closeEditModal);

    // Bonus modal form
    document.getElementById("bonus-form").addEventListener("submit", handleSendBonus);
    document.getElementById("close-bonus-modal").addEventListener("click", closeBonusModal);

    // Disconnect button
    document.getElementById("disconnect-btn").addEventListener("click", showSetup);

    // Refresh button
    document.getElementById("refresh-btn").addEventListener("click", refreshDashboard);

    // Auto-connect to saved contract
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        await connectToContract(saved);
    }
}
