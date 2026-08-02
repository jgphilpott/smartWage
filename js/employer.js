/**
 * employer.js — Employer dashboard logic
 * Requires app.js (provider, signer, userAddress, helpers) and ethers.js to be loaded first.
 */

let EMPLOYER_ABI = [];
let EMPLOYER_BYTECODE = "";

let payrollContract = null;
let contractAddress = null;
const STORAGE_KEY = "smartwage_employer_contract";

async function loadArtifacts() {
    if (EMPLOYER_ABI.length > 0 && EMPLOYER_BYTECODE) return;

    const artifact = await fetch("../abis/EmployerPayroll.json").then((res) => res.json());
    EMPLOYER_ABI = artifact.abi || artifact;
    EMPLOYER_BYTECODE = artifact.bytecode || "";
}

async function getEmployeeMeta(addr) {
    const [name, department, jobTitle, jobDescription, employmentType, startDate] =
        await payrollContract.getEmployeeMeta(addr);
    return { name, department, jobTitle, jobDescription, employmentType, startDate };
}

async function getEmployeeAgreement(addr) {
    const [employeeContract, active, removed] = await payrollContract.getEmployeeAgreement(addr);
    return { employeeContract, active, removed };
}

function getContract(address) {
    return new ethers.Contract(address, EMPLOYER_ABI, signer);
}

async function handleDeployNewContract() {
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

        showToast("Deploying a new EmployerPayroll contract…", "info");
        const factory = new ethers.ContractFactory(EMPLOYER_ABI, EMPLOYER_BYTECODE, signer);
        const deployed = await factory.deploy();
        await deployed.waitForDeployment();
        const newAddress = await deployed.getAddress();

        document.getElementById("contract-addr-input").value = newAddress;
        await connectToContract(newAddress);
        showToast(`Deployed new payroll contract at ${shortAddress(newAddress)}!`, "success");
    } catch (err) {
        console.error("handleDeployNewContract failed:", err);
        showToast(`Deployment failed: ${err.reason || err.message}`, "error", 6000);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "🚀 Deploy New Payroll Contract";
        }
    }
}

async function refreshDashboard() {
    if (!payrollContract) return;

    try {
        const [balance, employeeList] = await Promise.all([
            payrollContract.getBalance(),
            payrollContract.getEmployeeList()
        ]);

        document.getElementById("contract-balance").textContent = formatWei(balance);
        const addrDisplay = document.getElementById("contract-address-display");
        addrDisplay.textContent = contractAddress;
        addrDisplay.title = "Click to copy";
        addrDisplay.onclick = () => copyAddressToClipboard(contractAddress);

        await renderEmployeeTable(employeeList);
        await loadFundsHistory();
    } catch (err) {
        console.error("refreshDashboard failed:", err);
        showToast("Failed to load contract data: " + err.message, "error");
    }
}

async function renderEmployeeTable(addresses) {
    const tbody = document.getElementById("employee-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (addresses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No employees registered yet.</td></tr>`;
        return;
    }

    const [employeeData, agreementData, metaData, dueData] = await Promise.all([
        Promise.all(addresses.map((addr) => payrollContract.getEmployee(addr))),
        Promise.all(addresses.map((addr) => getEmployeeAgreement(addr))),
        Promise.all(addresses.map((addr) => getEmployeeMeta(addr))),
        Promise.all(addresses.map((addr) => payrollContract.isPaymentDue(addr)))
    ]);

    const entries = addresses.map((addr, index) => ({
        addr,
        data: employeeData[index],
        agreement: agreementData[index],
        meta: metaData[index],
        isDue: dueData[index]
    })).filter(({ agreement }) => agreement.employeeContract && !agreement.removed);

    if (entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No current employees. Register one below.</td></tr>`;
        return;
    }

    entries.forEach(({ addr, data, agreement, meta, isDue }) => {
        const [, wageWei, payFrequency] = data;
        const displayName = meta.name || "—";
        const displayRole = [meta.jobTitle, meta.department].filter(Boolean).join(" · ");

        let statusText = "Pending Signature";
        let statusClass = "badge badge-danger";
        if (agreement.active) {
            statusText = isDue ? "Due" : "Active";
            statusClass = "badge badge-success";
        }

        const contractLabel = shortAddress(agreement.employeeContract);
        const walletLabel = shortAddress(addr);
        const actionButtons = [
            agreement.active ? `<button class="btn btn-sm btn-success" onclick="handlePayEmployee('${addr}')">Pay</button>` : "",
            agreement.active ? `<button class="btn btn-sm btn-primary" onclick="openBonusModal('${addr}')">Bonus</button>` : "",
            `<button class="btn btn-sm btn-ghost" onclick="openEditModal('${addr}', '${wageWei}', '${payFrequency}')">Edit</button>`,
            `<button class="btn btn-sm btn-danger" onclick="handleRemoveEmployee('${addr}')">Remove</button>`
        ].filter(Boolean).join("");

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <div style="font-weight:600">${displayName}</div>
                ${displayRole ? `<div style="font-size:.8rem;color:var(--text-muted)">${displayRole}</div>` : ""}
            </td>
            <td><span class="wallet-address wallet-address-clickable" title="Click to copy" onclick="copyAddressToClipboard('${addr}')">${walletLabel}</span></td>
            <td><span class="wallet-address wallet-address-clickable" title="Click to copy" onclick="copyAddressToClipboard('${agreement.employeeContract}')">${contractLabel}</span></td>
            <td>${formatWei(wageWei)}</td>
            <td>${formatFrequency(payFrequency)}</td>
            <td><span class="${statusClass}">${statusText}</span></td>
            <td><div class="flex-row">${actionButtons}</div></td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadFundsHistory() {
    const tbody = document.getElementById("funds-history-tbody");
    if (!tbody || !payrollContract) return;

    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Loading…</td></tr>`;

    try {
        const latest = await provider.getBlockNumber();
        const fromBlock = Math.max(0, latest - 200_000);
        const { chainId } = await provider.getNetwork();

        const [depositEvents, paymentEvents, bonusEvents] = await Promise.all([
            payrollContract.queryFilter(payrollContract.filters.FundsDeposited(), fromBlock, latest),
            payrollContract.queryFilter(payrollContract.filters.PaymentSent(), fromBlock, latest),
            payrollContract.queryFilter(payrollContract.filters.BonusSent(), fromBlock, latest)
        ]);

        const allEvents = [
            ...depositEvents.map((event) => ({ type: "Deposit", addr: event.args.from, amount: event.args.amount, block: event.blockNumber, txHash: event.transactionHash })),
            ...paymentEvents.map((event) => ({ type: "Payment", addr: event.args.employee, amount: event.args.amount, block: event.blockNumber, txHash: event.transactionHash })),
            ...bonusEvents.map((event) => ({ type: "Bonus", addr: event.args.employee, amount: event.args.amount, block: event.blockNumber, txHash: event.transactionHash }))
        ].sort((a, b) => b.block - a.block);

        if (allEvents.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No funds activity found.</td></tr>`;
            return;
        }

        const blockNumbers = [...new Set(allEvents.map((event) => event.block))];
        const blocks = await Promise.all(blockNumbers.map((blockNumber) => provider.getBlock(blockNumber)));
        const tsByBlock = Object.fromEntries(blocks.map((block) => [block.number, block.timestamp]));

        tbody.innerHTML = allEvents.map((event) => {
            const explorerUrl = getExplorerTxUrl(chainId, event.txHash);
            const txCell = explorerUrl
                ? `<a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="truncate">${shortAddress(event.txHash)}</a>`
                : `<span class="truncate copyable-text" title="Click to copy" onclick="copyAddressToClipboard('${event.txHash}')">${shortAddress(event.txHash)}</span>`;
            return `
            <tr>
                <td><span class="badge ${event.type === "Deposit" ? "badge-success" : "badge-danger"}">${event.type === "Deposit" ? "↓ Deposit" : `↑ ${event.type}`}</span></td>
                <td><span class="truncate copyable-text" title="Click to copy" onclick="copyAddressToClipboard('${event.addr}')">${shortAddress(event.addr)}</span></td>
                <td>${formatWei(event.amount)}</td>
                <td>${txCell}</td>
                <td>${formatTimestamp(tsByBlock[event.block])}</td>
            </tr>
        `;
        }).join("");
    } catch (err) {
        console.error("loadFundsHistory failed:", err);
        tbody.innerHTML = `<tr><td colspan="5" style="color:var(--accent-danger)">Error loading funds activity: ${err.message}</td></tr>`;
    }
}

function loadSavedContract() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        document.getElementById("contract-addr-input").value = saved;
    }
}

async function connectToContract(address) {
    if (!ethers.isAddress(address)) {
        showToast("Could not connect: that doesn't look like a valid address.", "error");
        return;
    }

    try {
        const code = await provider.getCode(address);
        if (code === "0x") {
            showToast(
                "Could not connect: no contract found at that address on the current network.",
                "error",
                8000
            );
            return;
        }

        payrollContract = getContract(address);
        const linkedEmployer = await payrollContract.employer();
        if (linkedEmployer.toLowerCase() !== userAddress.toLowerCase()) {
            payrollContract = null;
            showToast("This payroll contract belongs to a different wallet.", "error", 7000);
            return;
        }

        contractAddress = address;
        localStorage.setItem(STORAGE_KEY, address);
        showDashboard();
        await refreshDashboard();
        showToast("Connected to payroll contract.", "success");
    } catch (err) {
        console.error("connectToContract failed:", err);
        showToast(`Could not connect: ${err.reason || err.message || "invalid contract address or wrong network."}`, "error", 6000);
    }
}

function showRegisterForm() {
    document.getElementById("register-card").style.display = "block";
    document.getElementById("employee-card").style.display = "none";
}

function hideRegisterForm() {
    document.getElementById("register-card").style.display = "none";
    document.getElementById("employee-card").style.display = "";
    document.getElementById("register-form").reset();
}

async function handleRegisterEmployee(e) {
    e.preventDefault();
    const addr = document.getElementById("reg-addr").value.trim();
    const wageEth = document.getElementById("reg-wage").value;
    const freqSeconds = document.getElementById("reg-freq").value;

    if (!ethers.isAddress(addr)) {
        showToast("Invalid employee address.", "error");
        return;
    }

    try {
        showToast("Registering employee and creating linked contract…", "info");
        const tx = await payrollContract.registerEmployee(
            addr,
            ethers.parseEther(wageEth),
            BigInt(freqSeconds),
            document.getElementById("reg-name").value.trim(),
            document.getElementById("reg-department").value.trim(),
            document.getElementById("reg-job-title").value.trim(),
            document.getElementById("reg-job-description").value.trim(),
            document.getElementById("reg-employment-type").value,
            document.getElementById("reg-start-date").value
        );
        await tx.wait();

        const employeeContract = await payrollContract.getEmployeePortal(addr);
        showToast(`Employee registered. Share contract ${shortAddress(employeeContract)} with the employee.`, "success", 8000);
        hideRegisterForm();
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
        showToast("Processing due payments…", "info");
        const count = await payrollContract.getEmployeeCount();
        const tx = await payrollContract.processDuePayments(0, count);
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

function showDepositForm() {
    document.getElementById("deposit-card").style.display = "block";
    document.getElementById("funds-history-card").style.display = "none";
}

function hideDepositForm() {
    document.getElementById("deposit-card").style.display = "none";
    document.getElementById("funds-history-card").style.display = "";
    document.getElementById("deposit-form").reset();
}

async function handleDeposit(e) {
    e.preventDefault();
    try {
        showToast("Depositing funds…", "info");
        const tx = await payrollContract.deposit({
            value: ethers.parseEther(document.getElementById("deposit-amount").value)
        });
        await tx.wait();
        showToast("Funds deposited!", "success");
        hideDepositForm();
        await refreshDashboard();
    } catch (err) {
        showToast(err.reason || err.message, "error");
    }
}

let editTarget = null;

async function openEditModal(addr, wageWei, payFrequency) {
    editTarget = addr;
    document.getElementById("edit-addr-display").textContent = shortAddress(addr);
    document.getElementById("edit-wage").value = ethers.formatEther(wageWei);
    document.getElementById("edit-freq").value = payFrequency.toString();
    document.getElementById("edit-modal").style.display = "flex";

    try {
        const meta = await getEmployeeMeta(addr);
        document.getElementById("edit-addr-display").textContent = meta.name || shortAddress(addr);
        document.getElementById("edit-name").value = meta.name || "";
        document.getElementById("edit-department").value = meta.department || "";
        document.getElementById("edit-job-title").value = meta.jobTitle || "";
        document.getElementById("edit-job-description").value = meta.jobDescription || "";
        document.getElementById("edit-employment-type").value = meta.employmentType || "Full-time";
        document.getElementById("edit-start-date").value = meta.startDate || "";
    } catch {
        document.getElementById("edit-name").value = "";
        document.getElementById("edit-department").value = "";
        document.getElementById("edit-job-title").value = "";
        document.getElementById("edit-job-description").value = "";
        document.getElementById("edit-employment-type").value = "Full-time";
        document.getElementById("edit-start-date").value = "";
    }
}

function closeEditModal() {
    document.getElementById("edit-modal").style.display = "none";
    editTarget = null;
}

async function handleUpdateEmployee(e) {
    e.preventDefault();
    if (!editTarget) return;

    try {
        showToast("Updating employee…", "info");
        const tx = await payrollContract.updateEmployee(
            editTarget,
            ethers.parseEther(document.getElementById("edit-wage").value),
            BigInt(document.getElementById("edit-freq").value),
            document.getElementById("edit-name").value.trim(),
            document.getElementById("edit-department").value.trim(),
            document.getElementById("edit-job-title").value.trim(),
            document.getElementById("edit-job-description").value.trim(),
            document.getElementById("edit-employment-type").value,
            document.getElementById("edit-start-date").value
        );
        await tx.wait();

        showToast("Employee updated!", "success");
        closeEditModal();
        await refreshDashboard();
    } catch (err) {
        showToast(err.reason || err.message, "error");
    }
}

let bonusTarget = null;

async function openBonusModal(addr) {
    bonusTarget = addr;
    document.getElementById("bonus-addr-display").textContent = shortAddress(addr);
    document.getElementById("bonus-modal").style.display = "flex";

    try {
        const meta = await getEmployeeMeta(addr);
        document.getElementById("bonus-addr-display").textContent = meta.name || shortAddress(addr);
    } catch {
        // Keep the short address fallback already set above.
    }
}

function closeBonusModal() {
    document.getElementById("bonus-modal").style.display = "none";
    bonusTarget = null;
}

async function handleSendBonus(e) {
    e.preventDefault();
    if (!bonusTarget) return;

    try {
        showToast("Sending bonus…", "info");
        const tx = await payrollContract.sendBonus(
            bonusTarget,
            ethers.parseEther(document.getElementById("bonus-amount").value)
        );
        await tx.wait();
        showToast("Bonus sent!", "success");
        closeBonusModal();
        await refreshDashboard();
    } catch (err) {
        showToast(err.reason || err.message, "error");
    }
}

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

async function onWalletReady() {
    await loadArtifacts();
    loadSavedContract();

    document.getElementById("connect-contract-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        await connectToContract(document.getElementById("contract-addr-input").value.trim());
    });

    document.getElementById("deploy-new-btn").addEventListener("click", handleDeployNewContract);
    document.getElementById("register-form").addEventListener("submit", handleRegisterEmployee);
    document.getElementById("show-register-btn").addEventListener("click", showRegisterForm);
    document.getElementById("hide-register-btn").addEventListener("click", hideRegisterForm);
    document.getElementById("deposit-form").addEventListener("submit", handleDeposit);
    document.getElementById("show-deposit-btn").addEventListener("click", showDepositForm);
    document.getElementById("hide-deposit-btn").addEventListener("click", hideDepositForm);
    document.getElementById("process-due-btn").addEventListener("click", handleProcessDue);
    document.getElementById("edit-form").addEventListener("submit", handleUpdateEmployee);
    document.getElementById("close-edit-modal").addEventListener("click", closeEditModal);
    document.getElementById("bonus-form").addEventListener("submit", handleSendBonus);
    document.getElementById("close-bonus-modal").addEventListener("click", closeBonusModal);
    document.getElementById("disconnect-btn").addEventListener("click", showSetup);
    document.getElementById("refresh-btn").addEventListener("click", refreshDashboard);

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        await connectToContract(saved);
    }
}
