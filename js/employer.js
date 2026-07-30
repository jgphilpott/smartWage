/**
 * employer.js — Employer dashboard logic
 * Requires app.js (provider, signer, userAddress, helpers) and ethers.js to be loaded first.
 */

// ─────────────────────────────────────────────────────────────
//  ABI (inline — same as abis/EmployerPayroll.json)
// ─────────────────────────────────────────────────────────────

const EMPLOYER_ABI = [
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"employee","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"BonusSent","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"employee","type":"address"}],"name":"EmployeeMetaUpdated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"employee","type":"address"},{"indexed":false,"internalType":"uint256","name":"wageWei","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"payFrequency","type":"uint256"}],"name":"EmployeeRegistered","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"employee","type":"address"}],"name":"EmployeeRemoved","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"employee","type":"address"},{"indexed":false,"internalType":"uint256","name":"wageWei","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"payFrequency","type":"uint256"}],"name":"EmployeeUpdated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"FundsDeposited","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"employee","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"PaymentSent","type":"event"},
  {"inputs":[],"name":"deposit","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[],"name":"employer","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"getEmployee","outputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getEmployeeCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getEmployeeList","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"getEmployeeMeta","outputs":[{"internalType":"string","name":"","type":"string"},{"internalType":"string","name":"","type":"string"},{"internalType":"string","name":"","type":"string"},{"internalType":"string","name":"","type":"string"},{"internalType":"string","name":"","type":"string"},{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"isPaymentDue","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"payEmployee","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"start","type":"uint256"},{"internalType":"uint256","name":"count","type":"uint256"}],"name":"processDuePayments","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"addr","type":"address"},{"internalType":"uint256","name":"wageWei","type":"uint256"},{"internalType":"uint256","name":"payFrequency","type":"uint256"}],"name":"registerEmployee","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"removeEmployee","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"addr","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"sendBonus","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"addr","type":"address"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"department","type":"string"},{"internalType":"string","name":"jobTitle","type":"string"},{"internalType":"string","name":"jobDescription","type":"string"},{"internalType":"string","name":"employmentType","type":"string"},{"internalType":"string","name":"startDate","type":"string"}],"name":"setEmployeeMeta","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"addr","type":"address"},{"internalType":"uint256","name":"wageWei","type":"uint256"},{"internalType":"uint256","name":"payFrequency","type":"uint256"}],"name":"updateEmployee","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"stateMutability":"payable","type":"receive"}
];

// Compiled bytecode for EmployerPayroll (kept in sync with contracts/employer/EmployerPayroll.sol).
// Lets employers deploy a brand new contract directly from the dashboard instead of
// requiring an external tool like Remix or the Hardhat CLI.
const EMPLOYER_BYTECODE = "0x608080604052346026575f80546001600160a01b031916331790556116e8908161002b8239f35b5f80fdfe60806040526004361015610022575b3615610018575f80fd5b6100206115ca565b005b5f3560e01c806301664948146110ea5780630b9362a21461102257806312065fe0146110075780631f50ad1614610f5957806332648e0914610ee95780635921476514610dec57806362817afd146105b95780637dd1bf11146103a257806397ad7e0214610349578063ae200e7914610322578063c2a63e3b14610305578063d0e30db0146102f2578063d108177a14610262578063e65b830d1461017c5763e7c45cf70361000e57346101785760407ff96043e56bb97677fe00c871c547d0f55e232644c237a2205d27a642f2f0261c6100fc36611248565b939161011260018060a01b035f5416331461134e565b60018060a01b031693845f52600160205261013560ff6004855f200154166113aa565b610140821515611515565b61014b81151561156b565b845f526001602052816001845f200155845f526001602052806002845f20015582519182526020820152a2005b5f80fd5b34610178576020366003190112610178576001600160a01b0361019d611205565b165f52600260205261021860405f2061025e6101b8826115f8565b916102506101c8600183016115f8565b916102426101d8600283016115f8565b6102346101e7600385016115f8565b9161022661020360056101fc600489016115f8565b97016115f8565b976040519b8c9b60c08d5260c08d0190611272565b908b820360208d0152611272565b9089820360408b0152611272565b908782036060890152611272565b908582036080870152611272565b9083820360a0850152611272565b0390f35b346101785760203660031901126101785761027b611205565b61028f60018060a01b035f5416331461134e565b6001600160a01b03165f818152600160205260409020600401546102b59060ff166113aa565b805f526001602052600460405f200160ff1981541690557fabae6e64cb4315875c29d42347a312f5e9fce4ab564e9722b43dd78d0751135a5f80a2005b5f366003190112610178576100206115ca565b34610178575f366003190112610178576020600354604051908152f35b34610178575f366003190112610178575f546040516001600160a01b039091168152602090f35b34610178576020366003190112610178576001600160a01b0361036a611205565b165f526001602052602060405f2060ff6004820154169081610392575b506040519015158152f35b61039c9150611698565b82610387565b34610178576103b036611248565b90916103c660018060a01b035f5416331461134e565b6001600160a01b0316918215610574576103e1811515611515565b6103ec82151561156b565b825f52600160205260ff600460405f2001541661051a5760405160a081018181106001600160401b038211176105065760405283815260046020820191838352604081018581526060820190428252608083019460018652885f52600160205260405f209360018060a01b039051166bffffffffffffffffffffffff60a01b855416178455516001840155516002830155516003820155019051151560ff801983541691161790556003549068010000000000000000821015610506577f3471bd00dc2641caa82cce60672c0464bbf8691deb24e9cee3b4f9ba616f6fdd926104dd836001604095016003556112b7565b81546001600160a01b0360039290921b91821b19169087901b17905582519182526020820152a2005b634e487b7160e01b5f52604160045260245ffd5b60405162461bcd60e51b815260206004820152602c60248201527f456d706c6f796572506179726f6c6c3a20656d706c6f79656520616c7265616460448201526b1e481c9959da5cdd195c995960a21b6064820152608490fd5b60405162461bcd60e51b815260206004820152601d60248201527f456d706c6f796572506179726f6c6c3a207a65726f20616464726573730000006044820152606490fd5b346101785760e0366003190112610178576105d2611205565b6024356001600160401b038111610178576105f190369060040161121b565b906044356001600160401b0381116101785761061190369060040161121b565b90916064356001600160401b0381116101785761063290369060040161121b565b9590936084356001600160401b0381116101785761065490369060040161121b565b92909460a4356001600160401b0381116101785761067690369060040161121b565b9560c4356001600160401b0381116101785761069690369060040161121b565b9890946106ad60018060a01b035f5416331461134e565b60018060a01b03169a8b5f5260016020526106d160ff600460405f200154166113aa565b6040519a60c08c01918c83106001600160401b038411176105065761075398610744978e61070e61073598610717956107269860405236916114a7565b905236916114a7565b9d60208d019e8f5236916114a7565b9660408b0197885236916114a7565b956060890196875236916114a7565b946080870195865236916114a7565b9560a08501968752855f52600260205260405f2094518051906001600160401b03821161050657819061078688546114dd565b601f8111610d9c575b50602090601f8311600114610d39575f92610d2e575b50508160011b915f199060031b1c19161785555b51805160018601916001600160401b0382116105065781906107db84546114dd565b601f8111610cde575b50602090601f8311600114610c7b575f92610c70575b50508160011b915f199060031b1c19161790555b51805160028501916001600160401b03821161050657819061083084546114dd565b601f8111610c20575b50602090601f8311600114610bbd575f92610bb2575b50508160011b915f199060031b1c19161790555b51805160038401916001600160401b03821161050657819061088584546114dd565b601f8111610b62575b50602090601f8311600114610aff575f92610af4575b50508160011b915f199060031b1c19161790555b51805160048301916001600160401b038211610506576108d883546114dd565b601f8111610aaf575b50602090601f8311600114610a48576005949392915f9183610a3d575b50508160011b915f199060031b1c19161790555b0191519182516001600160401b0381116105065761093082546114dd565b601f81116109f8575b506020601f821160011461099757819293945f9261098c575b50508160011b915f199060031b1c19161790555b7f42ca9ea11990d0c8fc50ece82fb0a8f636104257335872a6b42151c45fafe93d5f80a2005b015190508480610952565b601f19821690835f52805f20915f5b8181106109e0575095836001959697106109c8575b505050811b019055610966565b01515f1960f88460031b161c191690558480806109bb565b9192602060018192868b0151815501940192016109a6565b825f5260205f20601f830160051c81019160208410610a33575b601f0160051c01905b818110610a285750610939565b5f8155600101610a1b565b9091508190610a12565b0151905087806108fe565b90601f19831691845f52815f20925f5b818110610a97575091600193918560059897969410610a7f575b505050811b019055610912565b01515f1960f88460031b161c19169055878080610a72565b92936020600181928786015181550195019301610a58565b835f5260205f20601f840160051c81019160208510610aea575b601f0160051c01905b818110610adf57506108e1565b5f8155600101610ad2565b9091508190610ac9565b0151905087806108a4565b5f8581528281209350601f198516905b818110610b4a5750908460019594939210610b32575b505050811b0190556108b8565b01515f1960f88460031b161c19169055878080610b25565b92936020600181928786015181550195019301610b0f565b909150835f5260205f20601f840160051c81019160208510610ba8575b90601f859493920160051c01905b818110610b9a575061088e565b5f8155849350600101610b8d565b9091508190610b7f565b01519050888061084f565b5f8581528281209350601f198516905b818110610c085750908460019594939210610bf0575b505050811b019055610863565b01515f1960f88460031b161c19169055888080610be3565b92936020600181928786015181550195019301610bcd565b909150835f5260205f20601f840160051c81019160208510610c66575b90601f859493920160051c01905b818110610c585750610839565b5f8155849350600101610c4b565b9091508190610c3d565b0151905089806107fa565b5f8581528281209350601f198516905b818110610cc65750908460019594939210610cae575b505050811b01905561080e565b01515f1960f88460031b161c19169055898080610ca1565b92936020600181928786015181550195019301610c8b565b909150835f5260205f20601f840160051c81019160208510610d24575b90601f859493920160051c01905b818110610d1657506107e4565b5f8155849350600101610d09565b9091508190610cfb565b0151905089806107a5565b5f8981528281209350601f198516905b818110610d845750908460019594939210610d6c575b505050811b0185556107b9565b01515f1960f88460031b161c19169055898080610d5f565b92936020600181928786015181550195019301610d49565b909150875f5260205f20601f840160051c81019160208510610de2575b90601f859493920160051c01905b818110610dd4575061078f565b5f8155849350600101610dc7565b9091508190610db9565b3461017857604036600319011261017857610e05611205565b60243590610e1d60018060a01b035f5416331461134e565b60018060a01b031690815f526001602052610e4160ff600460405f200154166113aa565b8015610e9957602081610e777f585aea9023b3d6418c7ef40da9891519064bb45db146787918f4a3c3103d55b693471015611402565b610e905f80808085895af1610e8a61131f565b5061145c565b604051908152a2005b60405162461bcd60e51b815260206004820152602260248201527f456d706c6f796572506179726f6c6c3a20626f6e7573206d757374206265203e604482015261020360f41b6064820152608490fd5b34610178576020366003190112610178576001600160a01b03610f0a611205565b165f52600160205260a060405f20600180831b0381541690600181015490600281015460ff60046003840154930154169260405194855260208501526040840152606083015215156080820152f35b3461017857602036600319011261017857610f72611205565b610f8660018060a01b035f5416331461134e565b60018060a01b0316805f5260016020527f07d56d06d59e708b4db4f68fd102036f1f8441c3f1ce450e350c21fed38d02876040805f20610fcc60ff6004830154166113aa565b610ff85f808080476001870196610fe7885480931015611402565b600342910155895af1610e8a61131f565b548151908152426020820152a2005b34610178575f36600319011261017857602047604051908152f35b34610178575f366003190112610178576040518060206003549283815201809260035f527fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b905f5b8181106110cb57505050816110809103826112e3565b604051918291602083019060208452518091526040830191905f5b8181106110a9575050500390f35b82516001600160a01b031684528594506020938401939092019160010161109b565b82546001600160a01b031684526020909301926001928301920161106a565b346101785760403660031901126101785760035460043561110d60243582611296565b918083116111fd575b505b81811061112157005b8061112d6001926112b7565b838060a01b0391549060031b1c165f528160205260405f2060ff600482015416806111ee575b806111e1575b611165575b5001611118565b60038101908154428355848060a01b03825416925f808080898701978854905af161118e61131f565b50156111d857505060407f07d56d06d59e708b4db4f68fd102036f1f8441c3f1ce450e350c21fed38d028791858060a01b0390541692548151908152426020820152a25b8361115e565b55506111d29050565b5047838201541115611159565b506111f881611698565b611153565b915082611116565b600435906001600160a01b038216820361017857565b9181601f84011215610178578235916001600160401b038311610178576020838186019501011161017857565b6060906003190112610178576004356001600160a01b038116810361017857906024359060443590565b805180835260209291819084018484015e5f828201840152601f01601f1916010190565b919082018092116112a357565b634e487b7160e01b5f52601160045260245ffd5b6003548110156112cf5760035f5260205f2001905f90565b634e487b7160e01b5f52603260045260245ffd5b90601f801991011681019081106001600160401b0382111761050657604052565b6001600160401b03811161050657601f01601f191660200190565b3d15611349573d9061133082611304565b9161133e60405193846112e3565b82523d5f602084013e565b606090565b1561135557565b60405162461bcd60e51b815260206004820152602760248201527f456d706c6f796572506179726f6c6c3a2063616c6c6572206973206e6f74206560448201526636b83637bcb2b960c91b6064820152608490fd5b156113b157565b60405162461bcd60e51b815260206004820152602360248201527f456d706c6f796572506179726f6c6c3a20656d706c6f796565206e6f7420666f6044820152621d5b9960ea1b6064820152608490fd5b1561140957565b60405162461bcd60e51b815260206004820152602560248201527f456d706c6f796572506179726f6c6c3a20696e73756666696369656e742062616044820152646c616e636560d81b6064820152608490fd5b1561146357565b606460405162461bcd60e51b815260206004820152602060248201527f456d706c6f796572506179726f6c6c3a207472616e73666572206661696c65646044820152fd5b9291926114b382611304565b916114c160405193846112e3565b829481845281830111610178578281602093845f960137010152565b90600182811c9216801561150b575b60208310146114f757565b634e487b7160e01b5f52602260045260245ffd5b91607f16916114ec565b1561151c57565b60405162461bcd60e51b815260206004820152602160248201527f456d706c6f796572506179726f6c6c3a2077616765206d757374206265203e206044820152600360fc1b6064820152608490fd5b1561157257565b60405162461bcd60e51b815260206004820152602a60248201527f456d706c6f796572506179726f6c6c3a20706179206672657175656e6379206d6044820152690757374206265203e20360b41b6064820152608490fd5b6040513481527f543ba50a5eec5e6178218e364b1d0f396157b3c8fa278522c2cb7fd99407d47460203392a2565b9060405191825f82549261160b846114dd565b80845293600181169081156116765750600114611632575b50611630925003836112e3565b565b90505f9291925260205f20905f915b81831061165a575050906020611630928201015f611623565b6020919350806001915483858901015201910190918492611641565b90506020925061163094915060ff191682840152151560051b8201015f611623565b6116ac906002600382015491015490611296565b4210159056fea264697066735822122027f45a9c940500381cc2bd5659e5f62f7dac3af23bdb526b8619cadb0bc35eaa64736f6c634300081a0033";

// ─────────────────────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────────────────────

let payrollContract = null;
let contractAddress = null;
const STORAGE_KEY = "smartwage_employer_contract";

// ─────────────────────────────────────────────────────────────
//  On-chain employee metadata helpers
// ─────────────────────────────────────────────────────────────

async function saveEmployeeMeta(addr, meta) {
    await payrollContract.setEmployeeMeta(
        addr,
        meta.name            || "",
        meta.department      || "",
        meta.jobTitle        || "",
        meta.jobDescription  || "",
        meta.employmentType  || "",
        meta.startDate       || ""
    );
}

async function getEmployeeMeta(addr) {
    const [name, department, jobTitle, jobDescription, employmentType, startDate] =
        await payrollContract.getEmployeeMeta(addr);
    return { name, department, jobTitle, jobDescription, employmentType, startDate };
}

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
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No active employees. Register one below.</td></tr>`;
        return;
    }

    for (const addr of activeAddresses) {
        const [, wageWei, payFrequency, lastPaid] = await payrollContract.getEmployee(addr);
        const isDue = await payrollContract.isPaymentDue(addr);
        const meta = await getEmployeeMeta(addr);
        const displayName = meta.name || "—";
        const displayRole = [meta.jobTitle, meta.department].filter(Boolean).join(" · ") || "";
        const employmentBadge = meta.employmentType ? `<span class="badge" style="font-size:.7rem;background:var(--surface-raised);color:var(--text-muted)">${meta.employmentType}</span>` : "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <div style="font-weight:600">${displayName}</div>
                ${displayRole ? `<div style="font-size:.8rem;color:var(--text-muted)">${displayRole}</div>` : ""}
                ${employmentBadge}
            </td>
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
        showToast("Registering employee (1/2)…", "info");
        const tx = await payrollContract.registerEmployee(
            addr,
            ethers.parseEther(wageEth),
            BigInt(freqSeconds)
        );
        await tx.wait();

        // Save profile metadata on-chain (separate transaction)
        showToast("Saving profile data (2/2)…", "info");
        await saveEmployeeMeta(addr, {
            name: document.getElementById("reg-name").value.trim(),
            department: document.getElementById("reg-department").value.trim(),
            jobTitle: document.getElementById("reg-job-title").value.trim(),
            jobDescription: document.getElementById("reg-job-description").value.trim(),
            employmentType: document.getElementById("reg-employment-type").value,
            startDate: document.getElementById("reg-start-date").value,
        });

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

async function openEditModal(addr, wageWei, payFrequency) {
    editTarget = addr;
    document.getElementById("edit-addr-display").textContent = shortAddress(addr);
    document.getElementById("edit-wage").value = ethers.formatEther(wageWei);
    document.getElementById("edit-freq").value = payFrequency.toString();

    // Pre-populate on-chain metadata fields
    const meta = await getEmployeeMeta(addr);
    document.getElementById("edit-name").value = meta.name || "";
    document.getElementById("edit-department").value = meta.department || "";
    document.getElementById("edit-job-title").value = meta.jobTitle || "";
    document.getElementById("edit-job-description").value = meta.jobDescription || "";
    document.getElementById("edit-employment-type").value = meta.employmentType || "Full-time";
    document.getElementById("edit-start-date").value = meta.startDate || "";

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
        showToast("Updating payroll (1/2)…", "info");
        const tx = await payrollContract.updateEmployee(
            editTarget,
            ethers.parseEther(wageEth),
            BigInt(freqSeconds)
        );
        await tx.wait();

        // Save updated profile metadata on-chain (separate transaction)
        showToast("Saving profile data (2/2)…", "info");
        await saveEmployeeMeta(editTarget, {
            name: document.getElementById("edit-name").value.trim(),
            department: document.getElementById("edit-department").value.trim(),
            jobTitle: document.getElementById("edit-job-title").value.trim(),
            jobDescription: document.getElementById("edit-job-description").value.trim(),
            employmentType: document.getElementById("edit-employment-type").value,
            startDate: document.getElementById("edit-start-date").value,
        });

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
