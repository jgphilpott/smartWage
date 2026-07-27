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
  { "inputs": [{ "internalType": "uint256", "name": "start", "type": "uint256" }, { "internalType": "uint256", "name": "count", "type": "uint256" }], "name": "processDuePayments", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
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

// Compiled bytecode for EmployerPayroll (kept in sync with contracts/employer/EmployerPayroll.sol).
// Lets employers deploy a brand new contract directly from the dashboard instead of
// requiring an external tool like Remix or the Hardhat CLI.
const EMPLOYER_BYTECODE = "0x6080604052348015600f57600080fd5b50600080546001600160a01b03191633179055610f7b806100316000396000f3fe6080604052600436106100c65760003560e01c80637dd1bf111161007f578063c2a63e3b11610059578063c2a63e3b146102c8578063d0e30db0146102dd578063d108177a146102e5578063e7c45cf71461030557600080fd5b80637dd1bf111461024057806397ad7e0214610260578063ae200e791461029057600080fd5b806301664948146101075780630b9362a21461012957806312065fe0146101545780631f50ad161461017157806332648e0914610191578063592147651461022057600080fd5b366101025760405134815233907f543ba50a5eec5e6178218e364b1d0f396157b3c8fa278522c2cb7fd99407d4749060200160405180910390a2005b600080fd5b34801561011357600080fd5b50610127610122366004610cac565b610325565b005b34801561013557600080fd5b5061013e61048c565b60405161014b9190610cce565b60405180910390f35b34801561016057600080fd5b50475b60405190815260200161014b565b34801561017d57600080fd5b5061012761018c366004610d36565b6104ee565b34801561019d57600080fd5b506101ec6101ac366004610d36565b6001600160a01b03908116600090815260016020819052604090912080549181015460028201546003830154600490930154939094169490939260ff1690565b604080516001600160a01b03909616865260208601949094529284019190915260608301521515608082015260a00161014b565b34801561022c57600080fd5b5061012761023b366004610d51565b610679565b34801561024c57600080fd5b5061012761025b366004610d7b565b610837565b34801561026c57600080fd5b5061028061027b366004610d36565b610a6c565b604051901515815260200161014b565b34801561029c57600080fd5b506000546102b0906001600160a01b031681565b6040516001600160a01b03909116815260200161014b565b3480156102d457600080fd5b50600254610163565b610127610aa3565b3480156102f157600080fd5b50610127610300366004610d36565b610ada565b34801561031157600080fd5b50610127610320366004610d7b565b610b8b565b60025460006103348385610dae565b9050818111156103415750805b835b81811015610485576000600160006002848154811061036457610364610dd5565b60009182526020808320909101546001600160a01b031683528201929092526040019020600481015490915060ff1680156103a357506103a381610c8d565b80156103b3575080600101544710155b1561047c5760038101805442909155815460018301546040516000926001600160a01b031691908381818185875af1925050503d8060008114610412576040519150601f19603f3d011682016040523d82523d6000602084013e610417565b606091505b5050905080156104715782546001840154604080519182524260208301526001600160a01b03909216917f07d56d06d59e708b4db4f68fd102036f1f8441c3f1ce450e350c21fed38d0287910160405180910390a2610479565b600383018290555b50505b50600101610343565b5050505050565b606060028054806020026020016040519081016040528092919081815260200182805480156104e457602002820191906000526020600020905b81546001600160a01b031681526001909101906020018083116104c6575b5050505050905090565b6000546001600160a01b031633146105215760405162461bcd60e51b815260040161051890610deb565b60405180910390fd5b6001600160a01b0381166000908152600160205260409020600481015460ff1661055d5760405162461bcd60e51b815260040161051890610e32565b80600101544710156105815760405162461bcd60e51b815260040161051890610e75565b42600382015560018101546040516000916001600160a01b038516918381818185875af1925050503d80600081146105d5576040519150601f19603f3d011682016040523d82523d6000602084013e6105da565b606091505b505090508061062b5760405162461bcd60e51b815260206004820181905260248201527f456d706c6f796572506179726f6c6c3a207472616e73666572206661696c65646044820152606401610518565b6001820154604080519182524260208301526001600160a01b038516917f07d56d06d59e708b4db4f68fd102036f1f8441c3f1ce450e350c21fed38d028791015b60405180910390a2505050565b6000546001600160a01b031633146106a35760405162461bcd60e51b815260040161051890610deb565b6001600160a01b03821660009081526001602052604090206004015460ff166106de5760405162461bcd60e51b815260040161051890610e32565b600081116107395760405162461bcd60e51b815260206004820152602260248201527f456d706c6f796572506179726f6c6c3a20626f6e7573206d757374206265203e604482015261020360f41b6064820152608401610518565b804710156107595760405162461bcd60e51b815260040161051890610e75565b6000826001600160a01b03168260405160006040518083038185875af1925050503d80600081146107a6576040519150601f19603f3d011682016040523d82523d6000602084013e6107ab565b606091505b50509050806107fc5760405162461bcd60e51b815260206004820181905260248201527f456d706c6f796572506179726f6c6c3a207472616e73666572206661696c65646044820152606401610518565b826001600160a01b03167f585aea9023b3d6418c7ef40da9891519064bb45db146787918f4a3c3103d55b68360405161066c91815260200190565b6000546001600160a01b031633146108615760405162461bcd60e51b815260040161051890610deb565b6001600160a01b0383166108b75760405162461bcd60e51b815260206004820152601d60248201527f456d706c6f796572506179726f6c6c3a207a65726f20616464726573730000006044820152606401610518565b600082116108d75760405162461bcd60e51b815260040161051890610eba565b600081116108f75760405162461bcd60e51b815260040161051890610efb565b6001600160a01b03831660009081526001602052604090206004015460ff16156109785760405162461bcd60e51b815260206004820152602c60248201527f456d706c6f796572506179726f6c6c3a20656d706c6f79656520616c7265616460448201526b1e481c9959da5cdd195c995960a21b6064820152608401610518565b6040805160a0810182526001600160a01b038581168083526020808401878152848601878152426060870190815260016080880181815260008781528287528a812099518a546001600160a01b031990811691909a16178a5594518983015592516002808a01919091559151600389015591516004909701805460ff191697151597909717909655855490810186559490527f405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace909301805490921681179091558251858152918201849052917f3471bd00dc2641caa82cce60672c0464bbf8691deb24e9cee3b4f9ba616f6fdd910161066c565b6001600160a01b0381166000908152600160205260408120600481015460ff168015610a9c5750610a9c81610c8d565b9392505050565b60405134815233907f543ba50a5eec5e6178218e364b1d0f396157b3c8fa278522c2cb7fd99407d4749060200160405180910390a2565b6000546001600160a01b03163314610b045760405162461bcd60e51b815260040161051890610deb565b6001600160a01b03811660009081526001602052604090206004015460ff16610b3f5760405162461bcd60e51b815260040161051890610e32565b6001600160a01b038116600081815260016020526040808220600401805460ff19169055517fabae6e64cb4315875c29d42347a312f5e9fce4ab564e9722b43dd78d0751135a9190a250565b6000546001600160a01b03163314610bb55760405162461bcd60e51b815260040161051890610deb565b6001600160a01b03831660009081526001602052604090206004015460ff16610bf05760405162461bcd60e51b815260040161051890610e32565b60008211610c105760405162461bcd60e51b815260040161051890610eba565b60008111610c305760405162461bcd60e51b815260040161051890610efb565b6001600160a01b038316600081815260016020818152604092839020918201869055600290910184905581518581529081018490527ff96043e56bb97677fe00c871c547d0f55e232644c237a2205d27a642f2f0261c910161066c565b600081600201548260030154610ca39190610dae565b42101592915050565b60008060408385031215610cbf57600080fd5b50508035926020909101359150565b602080825282518282018190526000918401906040840190835b81811015610d0f5783516001600160a01b0316835260209384019390920191600101610ce8565b509095945050505050565b80356001600160a01b0381168114610d3157600080fd5b919050565b600060208284031215610d4857600080fd5b610a9c82610d1a565b60008060408385031215610d6457600080fd5b610d6d83610d1a565b946020939093013593505050565b600080600060608486031215610d9057600080fd5b610d9984610d1a565b95602085013595506040909401359392505050565b80820180821115610dcf57634e487b7160e01b600052601160045260246000fd5b92915050565b634e487b7160e01b600052603260045260246000fd5b60208082526027908201527f456d706c6f796572506179726f6c6c3a2063616c6c6572206973206e6f74206560408201526636b83637bcb2b960c91b606082015260800190565b60208082526023908201527f456d706c6f796572506179726f6c6c3a20656d706c6f796565206e6f7420666f6040820152621d5b9960ea1b606082015260800190565b60208082526025908201527f456d706c6f796572506179726f6c6c3a20696e73756666696369656e742062616040820152646c616e636560d81b606082015260800190565b60208082526021908201527f456d706c6f796572506179726f6c6c3a2077616765206d757374206265203e206040820152600360fc1b606082015260800190565b6020808252602a908201527f456d706c6f796572506179726f6c6c3a20706179206672657175656e6379206d6040820152690757374206265203e20360b41b60608201526080019056fea26469706673582212200ff149d5dcf51edc5fe464da162c1368eea55974d66e5303a8861dc8a8d7a3dd64736f6c634300081a0033";

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

// ─────────────────────────────────────────────────────────────
//  Deploy a brand new payroll contract as the connected wallet
// ─────────────────────────────────────────────────────────────

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

        showToast(`Deployed new payroll contract at ${shortAddress(newAddress)}!`, "success");

        const input = document.getElementById("contract-addr-input");
        if (input) input.value = newAddress;

        await connectToContract(newAddress);
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
        const addrDisplay = document.getElementById("contract-address-display");
        addrDisplay.textContent = contractAddress;
        addrDisplay.title = "Click to copy";
        addrDisplay.onclick = () => copyAddressToClipboard(contractAddress);

        await renderEmployeeTable(employeeList);
        await loadFundsHistory();
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
//  Funds history (deposits + payouts)
// ─────────────────────────────────────────────────────────────

async function loadFundsHistory() {
    const tbody = document.getElementById("funds-history-tbody");
    if (!tbody || !payrollContract) return;

    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Loading…</td></tr>`;

    try {
        const latest = await provider.getBlockNumber();
        const fromBlock = Math.max(0, latest - 200_000);

        const [depositEvents, paymentEvents, bonusEvents] = await Promise.all([
            payrollContract.queryFilter(payrollContract.filters.FundsDeposited(), fromBlock, latest),
            payrollContract.queryFilter(payrollContract.filters.PaymentSent(), fromBlock, latest),
            payrollContract.queryFilter(payrollContract.filters.BonusSent(), fromBlock, latest)
        ]);

        const allEvents = [
            ...depositEvents.map(e => ({ type: "Deposit", addr: e.args.from, amount: e.args.amount, block: e.blockNumber })),
            ...paymentEvents.map(e => ({ type: "Payment", addr: e.args.employee, amount: e.args.amount, block: e.blockNumber })),
            ...bonusEvents.map(e => ({ type: "Bonus", addr: e.args.employee, amount: e.args.amount, block: e.blockNumber }))
        ].sort((a, b) => b.block - a.block);

        if (allEvents.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No funds activity found.</td></tr>`;
            return;
        }

        // Resolve block timestamps (dedupe to avoid redundant RPC calls)
        const blockNumbers = [...new Set(allEvents.map(e => e.block))];
        const blocks = await Promise.all(blockNumbers.map(bn => provider.getBlock(bn)));
        const tsByBlock = Object.fromEntries(blocks.map(b => [b.number, b.timestamp]));

        tbody.innerHTML = "";
        for (const ev of allEvents) {
            const isDeposit = ev.type === "Deposit";
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><span class="badge ${isDeposit ? "badge-success" : "badge-danger"}">${isDeposit ? "↓ Deposit" : (ev.type === "Payment" ? "↑ Payment" : "↑ Bonus")}</span></td>
                <td><span class="truncate" title="${ev.addr}">${shortAddress(ev.addr)}</span></td>
                <td>${formatWei(ev.amount)}</td>
                <td>${formatTimestamp(tsByBlock[ev.block])}</td>
            `;
            tbody.appendChild(tr);
        }
    } catch (err) {
        console.error("loadFundsHistory failed:", err);
        tbody.innerHTML = `<tr><td colspan="4" style="color:var(--accent-danger)">Error loading funds activity: ${err.message}</td></tr>`;
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
    if (!ethers.isAddress(address)) {
        showToast("Could not connect: that doesn't look like a valid address.", "error");
        return;
    }

    try {
        // Make sure there's actually contract bytecode at this address on the
        // currently-connected network. This is the #1 cause of the generic
        // "invalid contract address or wrong network" error — it happens
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

        payrollContract = getContract(address);
        // Verify it's a valid payroll contract by calling employer()
        await payrollContract.employer();
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

// ─────────────────────────────────────────────────────────────
//  Employee actions
// ─────────────────────────────────────────────────────────────

function showRegisterForm() {
    document.getElementById("register-card").style.display = "block";
}

function hideRegisterForm() {
    document.getElementById("register-card").style.display = "none";
    document.getElementById("register-form").reset();
}

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
        showToast("Processing all due payments…", "info");
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
}

function hideDepositForm() {
    document.getElementById("deposit-card").style.display = "none";
    document.getElementById("deposit-form").reset();
}

async function handleDeposit(e) {
    e.preventDefault();
    const ethAmount = document.getElementById("deposit-amount").value;
    try {
        showToast("Depositing funds…", "info");
        const tx = await payrollContract.deposit({ value: ethers.parseEther(ethAmount) });
        await tx.wait();
        showToast("Funds deposited!", "success");
        hideDepositForm();
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

    // Deploy a brand new payroll contract as the connected wallet
    const deployBtn = document.getElementById("deploy-new-btn");
    if (deployBtn) {
        deployBtn.addEventListener("click", handleDeployNewContract);
    }

    // Register employee form
    document.getElementById("register-form").addEventListener("submit", handleRegisterEmployee);

    // Toggle the register-employee form
    document.getElementById("show-register-btn").addEventListener("click", showRegisterForm);
    document.getElementById("hide-register-btn").addEventListener("click", hideRegisterForm);

    // Deposit form
    document.getElementById("deposit-form").addEventListener("submit", handleDeposit);

    // Toggle the deposit-funds form
    document.getElementById("show-deposit-btn").addEventListener("click", showDepositForm);
    document.getElementById("hide-deposit-btn").addEventListener("click", hideDepositForm);

    // Funds activity history refresh
    document.getElementById("refresh-funds-history-btn").addEventListener("click", loadFundsHistory);

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
