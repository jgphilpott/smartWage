/**
 * employee.js — Employee dashboard logic
 * Requires app.js (provider, signer, userAddress, helpers) and ethers.js to be loaded first.
 */

let EMPLOYEE_ABI = [];
let EMPLOYER_EVENT_ABI = [];

let portalContract = null;
let portalAddress = null;
let linkedPayrollAddress = null;
const STORAGE_KEY = "smartwage_employee_contract";

async function loadArtifacts() {
    if (EMPLOYEE_ABI.length > 0) return;

    const employeeArtifact = await fetch("../abis/EmployeePortal.json").then((res) => res.json());
    EMPLOYEE_ABI = employeeArtifact.abi || employeeArtifact;
}

async function ensureEmployerEventAbiLoaded() {
    if (EMPLOYER_EVENT_ABI.length > 0) return;

    const employerArtifact = await fetch("../abis/EmployerPayroll.json").then((res) => res.json());
    const employerAbi = employerArtifact.abi || employerArtifact;
    EMPLOYER_EVENT_ABI = employerAbi.filter((entry) =>
        entry.type === "event" || ["employer", "PaymentSent", "BonusSent"].includes(entry.name)
    );
}

async function refreshDashboard() {
    if (!portalContract) return;

    try {
        const [details, meta, status, employerAddr, payrollAddr] = await Promise.all([
            portalContract.getContractDetails(),
            portalContract.getEmployeeMeta(),
            portalContract.getAgreementStatus(),
            portalContract.employer(),
            portalContract.employerPayroll()
        ]);

        linkedPayrollAddress = payrollAddr;

        const agreementDisplay = document.getElementById("agreement-address-display");
        agreementDisplay.textContent = portalAddress;
        agreementDisplay.title = "Click to copy";
        agreementDisplay.onclick = () => copyAddressToClipboard(portalAddress);

        const employerDisplay = document.getElementById("employer-addr-display");
        employerDisplay.textContent = employerAddr;
        employerDisplay.title = "Click to copy";
        employerDisplay.onclick = () => copyAddressToClipboard(employerAddr);

        const [contractSigned, active] = status;
        const statusBadge = document.getElementById("agreement-status-badge");
        if (contractSigned && active) {
            statusBadge.className = "badge badge-success";
            statusBadge.textContent = "Active";
        } else if (contractSigned) {
            statusBadge.className = "badge";
            statusBadge.textContent = "Signed";
        } else {
            statusBadge.className = "badge badge-danger";
            statusBadge.textContent = "Pending Signature";
        }

        const signBtn = document.getElementById("sign-contract-btn");
        signBtn.style.display = contractSigned ? "none" : "inline-flex";

        renderAgreementDetails(details, meta, payrollAddr);
    } catch (err) {
        console.error("refreshDashboard failed:", err);
        showToast("Failed to load agreement: " + err.message, "error");
    }
}

function renderAgreementDetails(details, meta, payrollAddr) {
    const tbody = document.getElementById("agreement-details-tbody");
    if (!tbody) return;

    const [employeeAddr, wageWei, payFrequency, lastPaid, active] = details;
    const [name, department, jobTitle, jobDescription, employmentType, startDate] = meta;

    const walletValue = employeeAddr || userAddress;
    const copyable = (addr) => `<span class="copyable-text" title="Click to copy" onclick="copyAddressToClipboard('${addr}')">${addr}</span>`;

    const rows = [
        ["Employee wallet", copyable(walletValue)],
        ["Full name", name || "—"],
        ["Job title", jobTitle || "—"],
        ["Department", department || "—"],
        ["Employment type", employmentType || "—"],
        ["Start date", startDate || "—"],
        ["Wage per cycle", formatWei(wageWei)],
        ["Pay frequency", formatFrequency(payFrequency)],
        ["Last paid", formatTimestamp(lastPaid)],
        ["Payroll contract", copyable(payrollAddr)],
        ["Payroll status", active ? "Active" : "Inactive"],
        ["Job description", jobDescription || "—"]
    ];

    tbody.innerHTML = rows.map(([label, value]) => `
        <tr>
            <th>${label}</th>
            <td>${value}</td>
        </tr>
    `).join("");
}

async function viewPayHistory() {
    const historyEl = document.getElementById("pay-history-panel");
    const historyBody = document.getElementById("history-tbody");
    if (!linkedPayrollAddress) return;

    document.getElementById("agreement-card").style.display = "none";
    historyEl.style.display = "block";
    historyBody.innerHTML = `<tr><td colspan="3" class="empty-state">Loading…</td></tr>`;

    try {
        await ensureEmployerEventAbiLoaded();
        const employerPayroll = new ethers.Contract(linkedPayrollAddress, EMPLOYER_EVENT_ABI, provider);
        const latest = await provider.getBlockNumber();
        const fromBlock = Math.max(0, latest - 200_000);

        const [salaryEvents, bonusEvents] = await Promise.all([
            employerPayroll.queryFilter(employerPayroll.filters.PaymentSent(userAddress), fromBlock, latest),
            employerPayroll.queryFilter(employerPayroll.filters.BonusSent(userAddress), fromBlock, latest)
        ]);

        const allEvents = [
            ...salaryEvents.map((event) => ({
                type: "Salary",
                amount: event.args.amount,
                timestamp: event.args.timestamp,
                block: event.blockNumber
            })),
            ...bonusEvents.map((event) => ({
                type: "Bonus",
                amount: event.args.amount,
                timestamp: null,
                block: event.blockNumber
            }))
        ].sort((a, b) => b.block - a.block);

        if (allEvents.length === 0) {
            historyBody.innerHTML = `<tr><td colspan="3" class="empty-state">No payment history found.</td></tr>`;
            return;
        }

        historyBody.innerHTML = allEvents.map((event) => `
            <tr>
                <td><span class="badge ${event.type === "Salary" ? "badge-success" : "badge-danger"}">${event.type}</span></td>
                <td>${formatWei(event.amount)}</td>
                <td>${event.timestamp ? formatTimestamp(event.timestamp) : "(bonus)"}</td>
            </tr>
        `).join("");
    } catch (err) {
        console.error("viewPayHistory failed:", err);
        historyBody.innerHTML = `<tr><td colspan="3" style="color:var(--accent-danger)">Error loading history: ${err.message}</td></tr>`;
    }
}

async function handleSignContract() {
    try {
        showToast("Submitting contract signature…", "info");
        const tx = await portalContract.signContract();
        await tx.wait();
        showToast("Contract signed successfully!", "success");
        await refreshDashboard();
    } catch (err) {
        showToast(err.reason || err.message, "error");
    }
}

async function connectToPortal(address) {
    if (!ethers.isAddress(address)) {
        showToast("Could not connect: that doesn't look like a valid address.", "error");
        return;
    }

    try {
        const code = await provider.getCode(address);
        if (code === "0x") {
            showToast("Could not connect: no contract found at that address on the current network.", "error", 8000);
            return;
        }

        const candidate = new ethers.Contract(address, EMPLOYEE_ABI, signer);
        const linkedEmployee = await candidate.employee();
        if (linkedEmployee.toLowerCase() !== userAddress.toLowerCase()) {
            showToast("This employee contract belongs to a different wallet.", "error", 7000);
            return;
        }

        portalContract = candidate;
        portalAddress = address;
        linkedPayrollAddress = await portalContract.employerPayroll();
        localStorage.setItem(STORAGE_KEY, address);
        showDashboard();
        await refreshDashboard();
        showToast("Connected to employee contract.", "success");
    } catch (err) {
        console.error("connectToPortal failed:", err);
        showToast(`Could not connect: ${err.reason || err.message || "invalid contract address or wrong network."}`, "error", 6000);
    }
}

function showDashboard() {
    document.getElementById("setup-section").style.display = "none";
    document.getElementById("dashboard-section").style.display = "block";
}

function showSetup() {
    document.getElementById("setup-section").style.display = "block";
    document.getElementById("dashboard-section").style.display = "none";
    portalContract = null;
    portalAddress = null;
    linkedPayrollAddress = null;
}

async function onWalletReady() {
    await loadArtifacts();

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        document.getElementById("portal-addr-input").value = saved;
    }

    document.getElementById("connect-portal-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const addr = document.getElementById("portal-addr-input").value.trim();
        await connectToPortal(addr);
    });

    document.getElementById("sign-contract-btn").addEventListener("click", handleSignContract);
    document.getElementById("view-history-btn").addEventListener("click", viewPayHistory);
    document.getElementById("disconnect-btn").addEventListener("click", showSetup);
    document.getElementById("refresh-btn").addEventListener("click", refreshDashboard);
    document.getElementById("close-history-btn").addEventListener("click", () => {
        document.getElementById("pay-history-panel").style.display = "none";
        document.getElementById("agreement-card").style.display = "block";
    });

    if (saved) {
        await connectToPortal(saved);
    }
}
