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
  {"inputs":[{"internalType":"address","name":"addr","type":"address"},{"internalType":"uint256","name":"wageWei","type":"uint256"},{"internalType":"uint256","name":"payFrequency","type":"uint256"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"department","type":"string"},{"internalType":"string","name":"jobTitle","type":"string"},{"internalType":"string","name":"jobDescription","type":"string"},{"internalType":"string","name":"employmentType","type":"string"},{"internalType":"string","name":"startDate","type":"string"}],"name":"registerEmployee","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"removeEmployee","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"addr","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"sendBonus","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"addr","type":"address"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"department","type":"string"},{"internalType":"string","name":"jobTitle","type":"string"},{"internalType":"string","name":"jobDescription","type":"string"},{"internalType":"string","name":"employmentType","type":"string"},{"internalType":"string","name":"startDate","type":"string"}],"name":"setEmployeeMeta","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"addr","type":"address"},{"internalType":"uint256","name":"wageWei","type":"uint256"},{"internalType":"uint256","name":"payFrequency","type":"uint256"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"department","type":"string"},{"internalType":"string","name":"jobTitle","type":"string"},{"internalType":"string","name":"jobDescription","type":"string"},{"internalType":"string","name":"employmentType","type":"string"},{"internalType":"string","name":"startDate","type":"string"}],"name":"updateEmployee","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"stateMutability":"payable","type":"receive"}
];

// Compiled bytecode for EmployerPayroll (kept in sync with contracts/employer/EmployerPayroll.sol).
// Lets employers deploy a brand new contract directly from the dashboard instead of
// requiring an external tool like Remix or the Hardhat CLI.
const EMPLOYER_BYTECODE = "0x608080604052346026575f80546001600160a01b03191633179055612638908161002b8239f35b5f80fdfe60806040526004361015610022575b3615610018575f80fd5b61002061251a565b005b5f3560e01c80630166494814611f525780630b9362a214611e8a57806312065fe014611e6f5780631f50ad1614611dc157806332648e0914611d515780635921476514611c5457806362817afd1461142a578063737374a214610b0157806397ad7e0214610aa857806397bd6c341461029c578063ae200e7914610275578063c2a63e3b14610258578063d0e30db014610245578063d108177a146101b55763e65b830d0361000e57346101b15760203660031901126101b1576001600160a01b036100ec61206d565b165f52600260205261016760405f206101ad61010782612548565b9161019f61011760018301612548565b9161019161012760028301612548565b61018361013660038501612548565b91610175610152600561014b60048901612548565b9701612548565b976040519b8c9b60c08d5260c08d01906121a7565b908b820360208d01526121a7565b9089820360408b01526121a7565b9087820360608901526121a7565b9085820360808701526121a7565b9083820360a08501526121a7565b0390f35b5f80fd5b346101b15760203660031901126101b1576101ce61206d565b6101e260018060a01b035f5416331461229e565b6001600160a01b03165f818152600160205260409020600401546102089060ff166122fa565b805f526001602052600460405f200160ff1981541690557fabae6e64cb4315875c29d42347a312f5e9fce4ab564e9722b43dd78d0751135a5f80a2005b5f3660031901126101b15761002061251a565b346101b1575f3660031901126101b1576020600354604051908152f35b346101b1575f3660031901126101b1575f546040516001600160a01b039091168152602090f35b346101b1576102aa366120b0565b98919790959d600160a09e9d9c9e98949695981b600190035f541633146102d09061229e565b6001600160a01b03165f81815260016020526040902060040154909d906102f99060ff166122fa565b6103048d1515612465565b61030f8c15156124bb565b5f8e8152600160208190526040918290209081018f90556002018d9055519a6103378c612218565b3690610342926123f7565b8a52369061034f926123f7565b9b602089019c8d523690610362926123f7565b93604088019485523690610375926123f7565b93606087019485523690610388926123f7565b9360808601948552369061039b926123f7565b9760a08501988952875f52600260205260405f2094518051906001600160401b0382116106e55781906103ce885461242d565b601f8111610a58575b50602090601f83116001146109f5575f926109ea575b50508160011b915f199060031b1c19161785555b51805160018601916001600160401b0382116106e5578190610423845461242d565b601f811161099a575b50602090601f8311600114610937575f9261092c575b50508160011b915f199060031b1c19161790555b51805160028501916001600160401b0382116106e5578190610478845461242d565b601f81116108dc575b50602090601f8311600114610879575f9261086e575b50508160011b915f199060031b1c19161790555b51805160038401916001600160401b0382116106e55781906104cd845461242d565b601f811161081e575b50602090601f83116001146107bb575f926107b0575b50508160011b915f199060031b1c19161790555b51805160048301916001600160401b0382116106e557610520835461242d565b601f811161076b575b50602090601f8311600114610704576005949392915f91836106f9575b50508160011b915f199060031b1c19161790555b0193519384516001600160401b0381116106e557610578825461242d565b95601f87116106a0575b859650602090601f83116001146106145791807ff96043e56bb97677fe00c871c547d0f55e232644c237a2205d27a642f2f0261c969492604096945f92610609575b50508160011b915f199060031b1c19161790555b82519182526020820152a27f42ca9ea11990d0c8fc50ece82fb0a8f636104257335872a6b42151c45fafe93d5f80a2005b0151905089806105c4565b90601f19831691845f52815f20925f5b8181106106855750926001928592604098967ff96043e56bb97677fe00c871c547d0f55e232644c237a2205d27a642f2f0261c9a98961061066d575b505050811b0190556105d8565b01515f1960f88460031b161c19169055898080610660565b8284015185558a995060019094019360209384019301610624565b825f5260205f20601f830160051c810197602084106106db575b601f0160051c01965b8781106106d05750610582565b5f81556001016106c3565b90975087906106ba565b634e487b7160e01b5f52604160045260245ffd5b015190508980610546565b90601f19831691845f52815f20925f5b81811061075357509160019391856005989796941061073b575b505050811b01905561055a565b01515f1960f88460031b161c1916905589808061072e565b92936020600181928786015181550195019301610714565b835f5260205f20601f840160051c810191602085106107a6575b601f0160051c01905b81811061079b5750610529565b5f815560010161078e565b9091508190610785565b0151905089806104ec565b5f8581528281209350601f198516905b81811061080657509084600195949392106107ee575b505050811b019055610500565b01515f1960f88460031b161c191690558980806107e1565b929360206001819287860151815501950193016107cb565b909150835f5260205f20601f840160051c81019160208510610864575b90601f859493920160051c01905b81811061085657506104d6565b5f8155849350600101610849565b909150819061083b565b015190508a80610497565b5f8581528281209350601f198516905b8181106108c457509084600195949392106108ac575b505050811b0190556104ab565b01515f1960f88460031b161c191690558a808061089f565b92936020600181928786015181550195019301610889565b909150835f5260205f20601f840160051c81019160208510610922575b90601f859493920160051c01905b8181106109145750610481565b5f8155849350600101610907565b90915081906108f9565b015190508b80610442565b5f8581528281209350601f198516905b818110610982575090846001959493921061096a575b505050811b019055610456565b01515f1960f88460031b161c191690558b808061095d565b92936020600181928786015181550195019301610947565b909150835f5260205f20601f840160051c810191602085106109e0575b90601f859493920160051c01905b8181106109d2575061042c565b5f81558493506001016109c5565b90915081906109b7565b015190508b806103ed565b5f8981528281209350601f198516905b818110610a405750908460019594939210610a28575b505050811b018555610401565b01515f1960f88460031b161c191690558b8080610a1b565b92936020600181928786015181550195019301610a05565b909150875f5260205f20601f840160051c81019160208510610a9e575b90601f859493920160051c01905b818110610a9057506103d7565b5f8155849350600101610a83565b9091508190610a75565b346101b15760203660031901126101b1576001600160a01b03610ac961206d565b165f526001602052602060405f2060ff6004820154169081610af1575b506040519015158152f35b610afb91506125e8565b82610ae6565b346101b157610b0f366120b0565b98919790959d610b3260019c9e9d9c8060a09a9698979a1b035f5416331461229e565b6001600160a01b03169c8d156113e557610b4d8d1515612465565b610b588c15156124bb565b8d5f52600160205260ff600460405f2001541661138b5760405160a081018181106001600160401b038211176106e5578f918f8f600493604052848352602083019182526040830190815260608301914283526080840195600187525f52600160205260405f209360018060a01b039051166bffffffffffffffffffffffff60a01b855416178455516001840155516002830155516003820155019051151560ff80198354169116179055600354680100000000000000008110156106e557808f91600101600355610c29906121ec565b81546001600160a01b0360039290921b91821b191692901b9190911790556040519a610c548c612218565b3690610c5f926123f7565b8a523690610c6c926123f7565b9b602089019c8d523690610c7f926123f7565b93604088019485523690610c92926123f7565b93606087019485523690610ca5926123f7565b93608086019485523690610cb8926123f7565b9760a08501988952875f52600260205260405f2094518051906001600160401b0382116106e5578190610ceb885461242d565b601f811161133b575b50602090601f83116001146112d8575f926112cd575b50508160011b915f199060031b1c19161785555b51805160018601916001600160401b0382116106e5578190610d40845461242d565b601f811161127d575b50602090601f831160011461121a575f9261120f575b50508160011b915f199060031b1c19161790555b51805160028501916001600160401b0382116106e5578190610d95845461242d565b601f81116111bf575b50602090601f831160011461115c575f92611151575b50508160011b915f199060031b1c19161790555b51805160038401916001600160401b0382116106e5578190610dea845461242d565b601f8111611101575b50602090601f831160011461109e575f92611093575b50508160011b915f199060031b1c19161790555b51805160048301916001600160401b0382116106e557610e3d835461242d565b601f811161104e575b50602090601f8311600114610fe7576005949392915f9183610fdc575b50508160011b915f199060031b1c19161790555b0193519384516001600160401b0381116106e557610e95825461242d565b95601f8711610f97575b859650602090601f8311600114610f245791807f3471bd00dc2641caa82cce60672c0464bbf8691deb24e9cee3b4f9ba616f6fdd969492604096945f926106095750508160011b915f199060031b1c191617905582519182526020820152a27f42ca9ea11990d0c8fc50ece82fb0a8f636104257335872a6b42151c45fafe93d5f80a2005b90601f19831691845f52815f20925f5b818110610f7c5750926001928592604098967f3471bd00dc2641caa82cce60672c0464bbf8691deb24e9cee3b4f9ba616f6fdd9a98961061066d57505050811b0190556105d8565b8284015185558a995060019094019360209384019301610f34565b825f5260205f20601f830160051c81019760208410610fd2575b601f0160051c01965b878110610fc75750610e9f565b5f8155600101610fba565b9097508790610fb1565b015190508980610e63565b90601f19831691845f52815f20925f5b81811061103657509160019391856005989796941061101e575b505050811b019055610e77565b01515f1960f88460031b161c19169055898080611011565b92936020600181928786015181550195019301610ff7565b835f5260205f20601f840160051c81019160208510611089575b601f0160051c01905b81811061107e5750610e46565b5f8155600101611071565b9091508190611068565b015190508980610e09565b5f8581528281209350601f198516905b8181106110e957509084600195949392106110d1575b505050811b019055610e1d565b01515f1960f88460031b161c191690558980806110c4565b929360206001819287860151815501950193016110ae565b909150835f5260205f20601f840160051c81019160208510611147575b90601f859493920160051c01905b8181106111395750610df3565b5f815584935060010161112c565b909150819061111e565b015190508a80610db4565b5f8581528281209350601f198516905b8181106111a7575090846001959493921061118f575b505050811b019055610dc8565b01515f1960f88460031b161c191690558a8080611182565b9293602060018192878601518155019501930161116c565b909150835f5260205f20601f840160051c81019160208510611205575b90601f859493920160051c01905b8181106111f75750610d9e565b5f81558493506001016111ea565b90915081906111dc565b015190508b80610d5f565b5f8581528281209350601f198516905b818110611265575090846001959493921061124d575b505050811b019055610d73565b01515f1960f88460031b161c191690558b8080611240565b9293602060018192878601518155019501930161122a565b909150835f5260205f20601f840160051c810191602085106112c3575b90601f859493920160051c01905b8181106112b55750610d49565b5f81558493506001016112a8565b909150819061129a565b015190508b80610d0a565b5f8981528281209350601f198516905b818110611323575090846001959493921061130b575b505050811b018555610d1e565b01515f1960f88460031b161c191690558b80806112fe565b929360206001819287860151815501950193016112e8565b909150875f5260205f20601f840160051c81019160208510611381575b90601f859493920160051c01905b8181106113735750610cf4565b5f8155849350600101611366565b9091508190611358565b60405162461bcd60e51b815260206004820152602c60248201527f456d706c6f796572506179726f6c6c3a20656d706c6f79656520616c7265616460448201526b1e481c9959da5cdd195c995960a21b6064820152608490fd5b60405162461bcd60e51b815260206004820152601d60248201527f456d706c6f796572506179726f6c6c3a207a65726f20616464726573730000006044820152606490fd5b346101b15760e03660031901126101b15761144361206d565b6024356001600160401b0381116101b157611462903690600401612083565b6044356001600160401b0381116101b157611481903690600401612083565b90936064356001600160401b0381116101b1576114a2903690600401612083565b9590916084356001600160401b0381116101b1576114c4903690600401612083565b929060a4356001600160401b0381116101b1576114e5903690600401612083565b95909260c4356001600160401b0381116101b157611507903690600401612083565b989095600160a01b600190035f541633146115219061229e565b6001600160a01b03165f81815260016020526040902060040154909b9061154a9060ff166122fa565b6040519a6115578c612218565b3690611562926123f7565b8a52369061156f926123f7565b99602089019a8b523690611582926123f7565b93604088019485523690611595926123f7565b936060870194855236906115a8926123f7565b936080860194855236906115bb926123f7565b9560a08501968752855f52600260205260405f2094518051906001600160401b0382116106e55781906115ee885461242d565b601f8111611c04575b50602090601f8311600114611ba1575f92611b96575b50508160011b915f199060031b1c19161785555b51805160018601916001600160401b0382116106e5578190611643845461242d565b601f8111611b46575b50602090601f8311600114611ae3575f92611ad8575b50508160011b915f199060031b1c19161790555b51805160028501916001600160401b0382116106e5578190611698845461242d565b601f8111611a88575b50602090601f8311600114611a25575f92611a1a575b50508160011b915f199060031b1c19161790555b51805160038401916001600160401b0382116106e55781906116ed845461242d565b601f81116119ca575b50602090601f8311600114611967575f9261195c575b50508160011b915f199060031b1c19161790555b51805160048301916001600160401b0382116106e557611740835461242d565b601f8111611917575b50602090601f83116001146118b0576005949392915f91836118a5575b50508160011b915f199060031b1c19161790555b0191519182516001600160401b0381116106e557611798825461242d565b601f8111611860575b506020601f82116001146117ff57819293945f926117f4575b50508160011b915f199060031b1c19161790555b7f42ca9ea11990d0c8fc50ece82fb0a8f636104257335872a6b42151c45fafe93d5f80a2005b0151905084806117ba565b601f19821690835f52805f20915f5b81811061184857509583600195969710611830575b505050811b0190556117ce565b01515f1960f88460031b161c19169055848080611823565b9192602060018192868b01518155019401920161180e565b825f5260205f20601f830160051c8101916020841061189b575b601f0160051c01905b81811061189057506117a1565b5f8155600101611883565b909150819061187a565b015190508780611766565b90601f19831691845f52815f20925f5b8181106118ff5750916001939185600598979694106118e7575b505050811b01905561177a565b01515f1960f88460031b161c191690558780806118da565b929360206001819287860151815501950193016118c0565b835f5260205f20601f840160051c81019160208510611952575b601f0160051c01905b8181106119475750611749565b5f815560010161193a565b9091508190611931565b01519050878061170c565b5f8581528281209350601f198516905b8181106119b2575090846001959493921061199a575b505050811b019055611720565b01515f1960f88460031b161c1916905587808061198d565b92936020600181928786015181550195019301611977565b909150835f5260205f20601f840160051c81019160208510611a10575b90601f859493920160051c01905b818110611a0257506116f6565b5f81558493506001016119f5565b90915081906119e7565b0151905088806116b7565b5f8581528281209350601f198516905b818110611a705750908460019594939210611a58575b505050811b0190556116cb565b01515f1960f88460031b161c19169055888080611a4b565b92936020600181928786015181550195019301611a35565b909150835f5260205f20601f840160051c81019160208510611ace575b90601f859493920160051c01905b818110611ac057506116a1565b5f8155849350600101611ab3565b9091508190611aa5565b015190508980611662565b5f8581528281209350601f198516905b818110611b2e5750908460019594939210611b16575b505050811b019055611676565b01515f1960f88460031b161c19169055898080611b09565b92936020600181928786015181550195019301611af3565b909150835f5260205f20601f840160051c81019160208510611b8c575b90601f859493920160051c01905b818110611b7e575061164c565b5f8155849350600101611b71565b9091508190611b63565b01519050898061160d565b5f8981528281209350601f198516905b818110611bec5750908460019594939210611bd4575b505050811b018555611621565b01515f1960f88460031b161c19169055898080611bc7565b92936020600181928786015181550195019301611bb1565b909150875f5260205f20601f840160051c81019160208510611c4a575b90601f859493920160051c01905b818110611c3c57506115f7565b5f8155849350600101611c2f565b9091508190611c21565b346101b15760403660031901126101b157611c6d61206d565b60243590611c8560018060a01b035f5416331461229e565b60018060a01b031690815f526001602052611ca960ff600460405f200154166122fa565b8015611d0157602081611cdf7f585aea9023b3d6418c7ef40da9891519064bb45db146787918f4a3c3103d55b693471015612352565b611cf85f80808085895af1611cf261226f565b506123ac565b604051908152a2005b60405162461bcd60e51b815260206004820152602260248201527f456d706c6f796572506179726f6c6c3a20626f6e7573206d757374206265203e604482015261020360f41b6064820152608490fd5b346101b15760203660031901126101b1576001600160a01b03611d7261206d565b165f52600160205260a060405f20600180831b0381541690600181015490600281015460ff60046003840154930154169260405194855260208501526040840152606083015215156080820152f35b346101b15760203660031901126101b157611dda61206d565b611dee60018060a01b035f5416331461229e565b60018060a01b0316805f5260016020527f07d56d06d59e708b4db4f68fd102036f1f8441c3f1ce450e350c21fed38d02876040805f20611e3460ff6004830154166122fa565b611e605f808080476001870196611e4f885480931015612352565b600342910155895af1611cf261226f565b548151908152426020820152a2005b346101b1575f3660031901126101b157602047604051908152f35b346101b1575f3660031901126101b1576040518060206003549283815201809260035f527fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b905f5b818110611f335750505081611ee8910382612233565b604051918291602083019060208452518091526040830191905f5b818110611f11575050500390f35b82516001600160a01b0316845285945060209384019390920191600101611f03565b82546001600160a01b0316845260209093019260019283019201611ed2565b346101b15760403660031901126101b157600354600435611f75602435826121cb565b91808311612065575b505b818110611f8957005b80611f956001926121ec565b838060a01b0391549060031b1c165f528160205260405f2060ff60048201541680612056575b80612049575b611fcd575b5001611f80565b60038101908154428355848060a01b03825416925f808080898701978854905af1611ff661226f565b501561204057505060407f07d56d06d59e708b4db4f68fd102036f1f8441c3f1ce450e350c21fed38d028791858060a01b0390541692548151908152426020820152a25b83611fc6565b555061203a9050565b5047838201541115611fc1565b50612060816125e8565b611fbb565b915082611f7e565b600435906001600160a01b03821682036101b157565b9181601f840112156101b1578235916001600160401b0383116101b157602083818601950101116101b157565b906101206003198301126101b1576004356001600160a01b03811681036101b1579160243591604435916064356001600160401b0381116101b157816120f891600401612083565b929092916084356001600160401b0381116101b1578161211a91600401612083565b9290929160a4356001600160401b0381116101b1578161213c91600401612083565b9290929160c4356001600160401b0381116101b1578161215e91600401612083565b9290929160e4356001600160401b0381116101b1578161218091600401612083565b9290929161010435906001600160401b0382116101b1576121a391600401612083565b9091565b805180835260209291819084018484015e5f828201840152601f01601f1916010190565b919082018092116121d857565b634e487b7160e01b5f52601160045260245ffd5b6003548110156122045760035f5260205f2001905f90565b634e487b7160e01b5f52603260045260245ffd5b60c081019081106001600160401b038211176106e557604052565b90601f801991011681019081106001600160401b038211176106e557604052565b6001600160401b0381116106e557601f01601f191660200190565b3d15612299573d9061228082612254565b9161228e6040519384612233565b82523d5f602084013e565b606090565b156122a557565b60405162461bcd60e51b815260206004820152602760248201527f456d706c6f796572506179726f6c6c3a2063616c6c6572206973206e6f74206560448201526636b83637bcb2b960c91b6064820152608490fd5b1561230157565b60405162461bcd60e51b815260206004820152602360248201527f456d706c6f796572506179726f6c6c3a20656d706c6f796565206e6f7420666f6044820152621d5b9960ea1b6064820152608490fd5b1561235957565b60405162461bcd60e51b815260206004820152602560248201527f456d706c6f796572506179726f6c6c3a20696e73756666696369656e742062616044820152646c616e636560d81b6064820152608490fd5b156123b357565b606460405162461bcd60e51b815260206004820152602060248201527f456d706c6f796572506179726f6c6c3a207472616e73666572206661696c65646044820152fd5b92919261240382612254565b916124116040519384612233565b8294818452818301116101b1578281602093845f960137010152565b90600182811c9216801561245b575b602083101461244757565b634e487b7160e01b5f52602260045260245ffd5b91607f169161243c565b1561246c57565b60405162461bcd60e51b815260206004820152602160248201527f456d706c6f796572506179726f6c6c3a2077616765206d757374206265203e206044820152600360fc1b6064820152608490fd5b156124c257565b60405162461bcd60e51b815260206004820152602a60248201527f456d706c6f796572506179726f6c6c3a20706179206672657175656e6379206d6044820152690757374206265203e20360b41b6064820152608490fd5b6040513481527f543ba50a5eec5e6178218e364b1d0f396157b3c8fa278522c2cb7fd99407d47460203392a2565b9060405191825f82549261255b8461242d565b80845293600181169081156125c65750600114612582575b5061258092500383612233565b565b90505f9291925260205f20905f915b8183106125aa575050906020612580928201015f612573565b6020919350806001915483858901015201910190918492612591565b90506020925061258094915060ff191682840152151560051b8201015f612573565b6125fc9060026003820154910154906121cb565b4210159056fea2646970667358221220da5b619cbca2d7a988c6ca564bbc4472477956edf069243e123983ccc7d08c8764736f6c634300081a0033";

// ─────────────────────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────────────────────

let payrollContract = null;
let contractAddress = null;
const STORAGE_KEY = "smartwage_employer_contract";

// ─────────────────────────────────────────────────────────────
//  On-chain employee metadata helpers
// ─────────────────────────────────────────────────────────────

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
        showToast("Registering employee…", "info");
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
        showToast("Updating employee…", "info");
        const tx = await payrollContract.updateEmployee(
            editTarget,
            ethers.parseEther(wageEth),
            BigInt(freqSeconds),
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
