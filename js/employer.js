/**
 * employer.js — Employer dashboard logic
 * Requires app.js (provider, signer, userAddress, helpers) and ethers.js to be loaded first.
 */

// ─────────────────────────────────────────────────────────────
//  ABI (inline — same as abis/EmployerPayroll.json)
// ─────────────────────────────────────────────────────────────

const EMPLOYER_ABI = [
  {"inputs": [], "stateMutability": "nonpayable", "type": "constructor"},
  {"anonymous": false, "inputs": [{"indexed": true, "internalType": "address", "name": "employee", "type": "address"}, {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "BonusSent", "type": "event"},
  {"anonymous": false, "inputs": [{"indexed": true, "internalType": "address", "name": "employee", "type": "address"}], "name": "EmployeeMetaUpdated", "type": "event"},
  {"anonymous": false, "inputs": [{"indexed": true, "internalType": "address", "name": "employee", "type": "address"}, {"indexed": false, "internalType": "uint256", "name": "wageWei", "type": "uint256"}, {"indexed": false, "internalType": "uint256", "name": "payFrequency", "type": "uint256"}], "name": "EmployeeRegistered", "type": "event"},
  {"anonymous": false, "inputs": [{"indexed": true, "internalType": "address", "name": "employee", "type": "address"}], "name": "EmployeeRemoved", "type": "event"},
  {"anonymous": false, "inputs": [{"indexed": true, "internalType": "address", "name": "employee", "type": "address"}, {"indexed": false, "internalType": "uint256", "name": "wageWei", "type": "uint256"}, {"indexed": false, "internalType": "uint256", "name": "payFrequency", "type": "uint256"}], "name": "EmployeeUpdated", "type": "event"},
  {"anonymous": false, "inputs": [{"indexed": true, "internalType": "address", "name": "from", "type": "address"}, {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "FundsDeposited", "type": "event"},
  {"anonymous": false, "inputs": [{"indexed": true, "internalType": "address", "name": "employee", "type": "address"}, {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}, {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}], "name": "PaymentSent", "type": "event"},
  {"inputs": [], "name": "deposit", "outputs": [], "stateMutability": "payable", "type": "function"},
  {"inputs": [], "name": "employer", "outputs": [{"internalType": "address", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"},
  {"inputs": [], "name": "getBalance", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
  {"inputs": [{"internalType": "address", "name": "addr", "type": "address"}], "name": "getEmployee", "outputs": [{"internalType": "address", "name": "", "type": "address"}, {"internalType": "uint256", "name": "", "type": "uint256"}, {"internalType": "uint256", "name": "", "type": "uint256"}, {"internalType": "uint256", "name": "", "type": "uint256"}, {"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "view", "type": "function"},
  {"inputs": [], "name": "getEmployeeCount", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
  {"inputs": [], "name": "getEmployeeList", "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}], "stateMutability": "view", "type": "function"},
  {"inputs": [{"internalType": "address", "name": "addr", "type": "address"}], "name": "getEmployeeMeta", "outputs": [{"internalType": "string", "name": "", "type": "string"}, {"internalType": "string", "name": "", "type": "string"}, {"internalType": "string", "name": "", "type": "string"}, {"internalType": "string", "name": "", "type": "string"}, {"internalType": "string", "name": "", "type": "string"}, {"internalType": "string", "name": "", "type": "string"}], "stateMutability": "view", "type": "function"},
  {"inputs": [{"internalType": "address", "name": "addr", "type": "address"}], "name": "isPaymentDue", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "view", "type": "function"},
  {"inputs": [{"internalType": "address", "name": "addr", "type": "address"}], "name": "payEmployee", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
  {"inputs": [{"internalType": "uint256", "name": "start", "type": "uint256"}, {"internalType": "uint256", "name": "count", "type": "uint256"}], "name": "processDuePayments", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
  {"inputs": [{"internalType": "address", "name": "addr", "type": "address"}, {"internalType": "uint256", "name": "wageWei", "type": "uint256"}, {"internalType": "uint256", "name": "payFrequency", "type": "uint256"}, {"internalType": "string", "name": "name", "type": "string"}, {"internalType": "string", "name": "department", "type": "string"}, {"internalType": "string", "name": "jobTitle", "type": "string"}, {"internalType": "string", "name": "jobDescription", "type": "string"}, {"internalType": "string", "name": "employmentType", "type": "string"}, {"internalType": "string", "name": "startDate", "type": "string"}], "name": "registerEmployee", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
  {"inputs": [{"internalType": "address", "name": "addr", "type": "address"}], "name": "removeEmployee", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
  {"inputs": [{"internalType": "address", "name": "addr", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "sendBonus", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
  {"inputs": [{"internalType": "address", "name": "addr", "type": "address"}, {"internalType": "string", "name": "name", "type": "string"}, {"internalType": "string", "name": "department", "type": "string"}, {"internalType": "string", "name": "jobTitle", "type": "string"}, {"internalType": "string", "name": "jobDescription", "type": "string"}, {"internalType": "string", "name": "employmentType", "type": "string"}, {"internalType": "string", "name": "startDate", "type": "string"}], "name": "setEmployeeMeta", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
  {"inputs": [{"internalType": "address", "name": "addr", "type": "address"}, {"internalType": "uint256", "name": "wageWei", "type": "uint256"}, {"internalType": "uint256", "name": "payFrequency", "type": "uint256"}, {"internalType": "string", "name": "name", "type": "string"}, {"internalType": "string", "name": "department", "type": "string"}, {"internalType": "string", "name": "jobTitle", "type": "string"}, {"internalType": "string", "name": "jobDescription", "type": "string"}, {"internalType": "string", "name": "employmentType", "type": "string"}, {"internalType": "string", "name": "startDate", "type": "string"}], "name": "updateEmployee", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
  {"stateMutability": "payable", "type": "receive"}
];

// Compiled bytecode for EmployerPayroll (kept in sync with contracts/employer/EmployerPayroll.sol).
// Lets employers deploy a brand new contract directly from the dashboard instead of
// requiring an external tool like Remix or the Hardhat CLI.
const EMPLOYER_BYTECODE = "0x608080604052346026575f80546001600160a01b031916331790556124bc908161002b8239f35b5f80fdfe60806040526004361015610022575b3615610018575f80fd5b610020612351565b005b5f3560e01c80630166494814611d735780630b9362a214611cab57806312065fe014611c905780631f50ad1614611be257806332648e0914611b725780635921476514611a7557806362817afd146112f2578063737374a214610ab557806397ad7e0214610a5c57806397bd6c34146102ec578063ae200e79146102c5578063c2a63e3b146102a8578063d0e30db014610295578063d108177a146101b55763e65b830d0361000e57346101b15760203660031901126101b1576001600160a01b036100ec611e8e565b165f52600260205261016760405f206101ad610107826123ce565b9161019f610117600183016123ce565b91610191610127600283016123ce565b610183610136600385016123ce565b91610175610152600561014b600489016123ce565b97016123ce565b976040519b8c9b60c08d5260c08d0190611fc8565b908b820360208d0152611fc8565b9089820360408b0152611fc8565b908782036060890152611fc8565b908582036080870152611fc8565b9083820360a0850152611fc8565b0390f35b5f80fd5b346101b15760203660031901126101b1576101ce611e8e565b6101e260018060a01b035f541633146120bf565b6001600160a01b03165f818152600160205260409020600401546102089060ff1661211b565b805f526001602052600460405f200160ff198154169055805f52600260205261026f600560405f206102398161237f565b6102456001820161237f565b6102516002820161237f565b61025d6003820161237f565b6102696004820161237f565b0161237f565b7fabae6e64cb4315875c29d42347a312f5e9fce4ab564e9722b43dd78d0751135a5f80a2005b5f3660031901126101b157610020612351565b346101b1575f3660031901126101b1576020600354604051908152f35b346101b1575f3660031901126101b1575f546040516001600160a01b039091168152602090f35b346101b1576102fa36611ed1565b98919790959c9b9a9d600160a098949695981b600190035f5416331461031f906120bf565b6001600160a01b03165f81815260016020526040902060040154909e908f9061034a9060ff1661211b565b6103558e151561229c565b6103608d15156122f2565b5f908152600160208190526040918290209081018f90556002018d9055519a6103888c612039565b369061039392612218565b8a5236906103a092612218565b9a602089019b8c5236906103b392612218565b936040880194855236906103c692612218565b936060870194855236906103d992612218565b936080860194855236906103ec92612218565b9660a08501978852885f52600260205260405f2094518051906001600160401b03821161074f5761041d875461224e565b601f8111610a2c575b50602090601f83116001146109c95761045692915f918361092b575b50508160011b915f199060031b1c19161790565b85555b51805160018601916001600160401b03821161074f57610479835461224e565b601f8111610999575b50602090601f8311600114610936576104b192915f918361092b5750508160011b915f199060031b1c19161790565b90555b51805160028501916001600160401b03821161074f576104d4835461224e565b601f81116108fb575b50602090601f83116001146108985761050c92915f918361088d5750508160011b915f199060031b1c19161790565b90555b51805160038401916001600160401b03821161074f5761052f835461224e565b601f811161085d575b50602090601f83116001146107fa5761056792915f918361067d5750508160011b915f199060031b1c19161790565b90555b51805160048301916001600160401b03821161074f5761058a835461224e565b601f81116107ca575b50602090601f83116001146107635791806105c79260059695945f9261067d5750508160011b915f199060031b1c19161790565b90555b0192519283516001600160401b03811161074f5785946105ea835461224e565b601f8111610714575b50602090601f83116001146106885782604095937ff96043e56bb97677fe00c871c547d0f55e232644c237a2205d27a642f2f0261c979593610649935f9261067d5750508160011b915f199060031b1c19161790565b90555b82519182526020820152a27f42ca9ea11990d0c8fc50ece82fb0a8f636104257335872a6b42151c45fafe93d5f80a2005b015190508a80610442565b90601f19831691845f52815f20925f5b8181106106f95750926001928592604098967ff96043e56bb97677fe00c871c547d0f55e232644c237a2205d27a642f2f0261c9a9896106106e1575b505050811b01905561064c565b01515f1960f88460031b161c191690558980806106d4565b8284015185558a995060019094019360209384019301610698565b61073f90845f5260205f20601f850160051c81019160208610610745575b601f0160051c0190612286565b876105f3565b9091508190610732565b634e487b7160e01b5f52604160045260245ffd5b90601f19831691845f52815f20925f5b8181106107b257509160019391856005989796941061079a575b505050811b0190556105ca565b01515f1960f88460031b161c1916905589808061078d565b92936020600181928786015181550195019301610773565b6107f490845f5260205f20601f850160051c8101916020861061074557601f0160051c0190612286565b88610593565b90601f19831691845f52815f20925f5b818110610845575090846001959493921061082d575b505050811b01905561056a565b01515f1960f88460031b161c19169055898080610820565b9293602060018192878601518155019501930161080a565b61088790845f5260205f20601f850160051c8101916020861061074557601f0160051c0190612286565b89610538565b015190508b80610442565b90601f19831691845f52815f20925f5b8181106108e357509084600195949392106108cb575b505050811b01905561050f565b01515f1960f88460031b161c191690558a80806108be565b929360206001819287860151815501950193016108a8565b61092590845f5260205f20601f850160051c8101916020861061074557601f0160051c0190612286565b8a6104dd565b015190508c80610442565b90601f19831691845f52815f20925f5b8181106109815750908460019594939210610969575b505050811b0190556104b4565b01515f1960f88460031b161c191690558b808061095c565b92936020600181928786015181550195019301610946565b6109c390845f5260205f20601f850160051c8101916020861061074557601f0160051c0190612286565b8b610482565b90601f19831691885f52815f20925f5b818110610a1457509084600195949392106109fc575b505050811b018555610459565b01515f1960f88460031b161c191690558b80806109ef565b929360206001819287860151815501950193016109d9565b610a5690885f5260205f20601f850160051c8101916020861061074557601f0160051c0190612286565b8b610426565b346101b15760203660031901126101b1576001600160a01b03610a7d611e8e565b165f526001602052602060405f2060ff6004820154169081610aa5575b506040519015158152f35b610aaf915061246c565b82610a9a565b346101b157610ac336611ed1565b98919790959c9b9a9d610ae560018060a09a9698979a1b035f541633146120bf565b6001600160a01b03169d8e156112ad578e610b018e151561229c565b610b0c8d15156122f2565b5f52600160205260ff600460405f20015416611253576040518060a08101106001600160401b0360a08301111761074f578f90808f8f60a060049401604052848352602083019182526040830190815260608301914283526080840195600187525f52600160205260405f209360018060a01b039051166bffffffffffffffffffffffff60a01b855416178455516001840155516002830155516003820155019051151560ff801983541691161790556003546801000000000000000081101561074f578f9060018101600355610be29061200d565b81546001600160a01b0360039290921b91821b191692901b9190911790556040519a610c0d8c612039565b3690610c1892612218565b8a523690610c2592612218565b9a602089019b8c523690610c3892612218565b93604088019485523690610c4b92612218565b93606087019485523690610c5e92612218565b93608086019485523690610c7192612218565b9660a08501978852885f52600260205260405f2094518051906001600160401b03821161074f57610ca2875461224e565b601f8111611223575b50602090601f83116001146111c057610cda92915f918361092b5750508160011b915f199060031b1c19161790565b85555b51805160018601916001600160401b03821161074f57610cfd835461224e565b601f8111611190575b50602090601f831160011461112d57610d3592915f918361092b5750508160011b915f199060031b1c19161790565b90555b51805160028501916001600160401b03821161074f57610d58835461224e565b601f81116110fd575b50602090601f831160011461109a57610d9092915f918361088d5750508160011b915f199060031b1c19161790565b90555b51805160038401916001600160401b03821161074f57610db3835461224e565b601f811161106a575b50602090601f831160011461100757610deb92915f918361067d5750508160011b915f199060031b1c19161790565b90555b51805160048301916001600160401b03821161074f57610e0e835461224e565b601f8111610fd7575b50602090601f8311600114610f70579180610e4b9260059695945f9261067d5750508160011b915f199060031b1c19161790565b90555b0192519283516001600160401b03811161074f578594610e6e835461224e565b601f8111610f40575b50602090601f8311600114610ecd5782604095937f3471bd00dc2641caa82cce60672c0464bbf8691deb24e9cee3b4f9ba616f6fdd979593610649935f9261067d5750508160011b915f199060031b1c19161790565b90601f19831691845f52815f20925f5b818110610f255750926001928592604098967f3471bd00dc2641caa82cce60672c0464bbf8691deb24e9cee3b4f9ba616f6fdd9a9896106106e157505050811b01905561064c565b8284015185558a995060019094019360209384019301610edd565b610f6a90845f5260205f20601f850160051c8101916020861061074557601f0160051c0190612286565b87610e77565b90601f19831691845f52815f20925f5b818110610fbf575091600193918560059897969410610fa7575b505050811b019055610e4e565b01515f1960f88460031b161c19169055898080610f9a565b92936020600181928786015181550195019301610f80565b61100190845f5260205f20601f850160051c8101916020861061074557601f0160051c0190612286565b88610e17565b90601f19831691845f52815f20925f5b818110611052575090846001959493921061103a575b505050811b019055610dee565b01515f1960f88460031b161c1916905589808061102d565b92936020600181928786015181550195019301611017565b61109490845f5260205f20601f850160051c8101916020861061074557601f0160051c0190612286565b89610dbc565b90601f19831691845f52815f20925f5b8181106110e557509084600195949392106110cd575b505050811b019055610d93565b01515f1960f88460031b161c191690558a80806110c0565b929360206001819287860151815501950193016110aa565b61112790845f5260205f20601f850160051c8101916020861061074557601f0160051c0190612286565b8a610d61565b90601f19831691845f52815f20925f5b8181106111785750908460019594939210611160575b505050811b019055610d38565b01515f1960f88460031b161c191690558b8080611153565b9293602060018192878601518155019501930161113d565b6111ba90845f5260205f20601f850160051c8101916020861061074557601f0160051c0190612286565b8b610d06565b90601f19831691885f52815f20925f5b81811061120b57509084600195949392106111f3575b505050811b018555610cdd565b01515f1960f88460031b161c191690558b80806111e6565b929360206001819287860151815501950193016111d0565b61124d90885f5260205f20601f850160051c8101916020861061074557601f0160051c0190612286565b8b610cab565b60405162461bcd60e51b815260206004820152602c60248201527f456d706c6f796572506179726f6c6c3a20656d706c6f79656520616c7265616460448201526b1e481c9959da5cdd195c995960a21b6064820152608490fd5b60405162461bcd60e51b815260206004820152601d60248201527f456d706c6f796572506179726f6c6c3a207a65726f20616464726573730000006044820152606490fd5b346101b15760e03660031901126101b15761130b611e8e565b6024356001600160401b0381116101b15761132a903690600401611ea4565b6044356001600160401b0381116101b157611349903690600401611ea4565b90936064356001600160401b0381116101b15761136a903690600401611ea4565b9590916084356001600160401b0381116101b15761138c903690600401611ea4565b929060a4356001600160401b0381116101b1576113ad903690600401611ea4565b95909260c4356001600160401b0381116101b1576113cf903690600401611ea4565b989095600160a01b600190035f541633146113e9906120bf565b6001600160a01b03165f81815260016020526040902060040154909b906114129060ff1661211b565b6040519a61141f8c612039565b369061142a92612218565b8a52369061143792612218565b99602089019a8b52369061144a92612218565b9360408801948552369061145d92612218565b9360608701948552369061147092612218565b9360808601948552369061148392612218565b9560a08501968752855f52600260205260405f2094518051906001600160401b03821161074f576114b4875461224e565b601f8111611a45575b50602090601f83116001146119e2576114ec92915f918361067d5750508160011b915f199060031b1c19161790565b85555b51805160018601916001600160401b03821161074f5761150f835461224e565b601f81116119b2575b50602090601f831160011461194f5761154792915f918361067d5750508160011b915f199060031b1c19161790565b90555b51805160028501916001600160401b03821161074f5761156a835461224e565b601f811161191f575b50602090601f83116001146118bc576115a292915f91836118b15750508160011b915f199060031b1c19161790565b90555b51805160038401916001600160401b03821161074f576115c5835461224e565b601f8111611881575b50602090601f831160011461181e576115fd92915f918361177c5750508160011b915f199060031b1c19161790565b90555b51805160048301916001600160401b03821161074f57611620835461224e565b601f81116117ee575b50602090601f831160011461178757918061165d9260059695945f9261177c5750508160011b915f199060031b1c19161790565b90555b0191519182516001600160401b03811161074f5761167e825461224e565b601f811161174c575b506020601f82116001146116eb5781906116b79394955f926116e05750508160011b915f199060031b1c19161790565b90555b7f42ca9ea11990d0c8fc50ece82fb0a8f636104257335872a6b42151c45fafe93d5f80a2005b015190508580610442565b601f19821690835f52805f20915f5b8181106117345750958360019596971061171c575b505050811b0190556116ba565b01515f1960f88460031b161c1916905584808061170f565b9192602060018192868b0151815501940192016116fa565b61177690835f5260205f20601f840160051c8101916020851061074557601f0160051c0190612286565b84611687565b015190508880610442565b90601f19831691845f52815f20925f5b8181106117d65750916001939185600598979694106117be575b505050811b019055611660565b01515f1960f88460031b161c191690558780806117b1565b92936020600181928786015181550195019301611797565b61181890845f5260205f20601f850160051c8101916020861061074557601f0160051c0190612286565b86611629565b90601f19831691845f52815f20925f5b8181106118695750908460019594939210611851575b505050811b019055611600565b01515f1960f88460031b161c19169055878080611844565b9293602060018192878601518155019501930161182e565b6118ab90845f5260205f20601f850160051c8101916020861061074557601f0160051c0190612286565b876115ce565b015190508980610442565b90601f19831691845f52815f20925f5b81811061190757509084600195949392106118ef575b505050811b0190556115a5565b01515f1960f88460031b161c191690558880806118e2565b929360206001819287860151815501950193016118cc565b61194990845f5260205f20601f850160051c8101916020861061074557601f0160051c0190612286565b88611573565b90601f19831691845f52815f20925f5b81811061199a5750908460019594939210611982575b505050811b01905561154a565b01515f1960f88460031b161c19169055898080611975565b9293602060018192878601518155019501930161195f565b6119dc90845f5260205f20601f850160051c8101916020861061074557601f0160051c0190612286565b89611518565b90601f19831691885f52815f20925f5b818110611a2d5750908460019594939210611a15575b505050811b0185556114ef565b01515f1960f88460031b161c19169055898080611a08565b929360206001819287860151815501950193016119f2565b611a6f90885f5260205f20601f850160051c8101916020861061074557601f0160051c0190612286565b896114bd565b346101b15760403660031901126101b157611a8e611e8e565b60243590611aa660018060a01b035f541633146120bf565b60018060a01b031690815f526001602052611aca60ff600460405f2001541661211b565b8015611b2257602081611b007f585aea9023b3d6418c7ef40da9891519064bb45db146787918f4a3c3103d55b693471015612173565b611b195f80808085895af1611b13612090565b506121cd565b604051908152a2005b60405162461bcd60e51b815260206004820152602260248201527f456d706c6f796572506179726f6c6c3a20626f6e7573206d757374206265203e604482015261020360f41b6064820152608490fd5b346101b15760203660031901126101b1576001600160a01b03611b93611e8e565b165f52600160205260a060405f20600180831b0381541690600181015490600281015460ff60046003840154930154169260405194855260208501526040840152606083015215156080820152f35b346101b15760203660031901126101b157611bfb611e8e565b611c0f60018060a01b035f541633146120bf565b60018060a01b0316805f5260016020527f07d56d06d59e708b4db4f68fd102036f1f8441c3f1ce450e350c21fed38d02876040805f20611c5560ff60048301541661211b565b611c815f808080476001870196611c70885480931015612173565b600342910155895af1611b13612090565b548151908152426020820152a2005b346101b1575f3660031901126101b157602047604051908152f35b346101b1575f3660031901126101b1576040518060206003549283815201809260035f527fc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b905f5b818110611d545750505081611d09910382612054565b604051918291602083019060208452518091526040830191905f5b818110611d32575050500390f35b82516001600160a01b0316845285945060209384019390920191600101611d24565b82546001600160a01b0316845260209093019260019283019201611cf3565b346101b15760403660031901126101b157600354600435611d9660243582611fec565b91808311611e86575b505b818110611daa57005b80611db660019261200d565b838060a01b0391549060031b1c165f528160205260405f2060ff60048201541680611e77575b80611e6a575b611dee575b5001611da1565b60038101908154428355848060a01b03825416925f808080898701978854905af1611e17612090565b5015611e6157505060407f07d56d06d59e708b4db4f68fd102036f1f8441c3f1ce450e350c21fed38d028791858060a01b0390541692548151908152426020820152a25b83611de7565b5550611e5b9050565b5047838201541115611de2565b50611e818161246c565b611ddc565b915082611d9f565b600435906001600160a01b03821682036101b157565b9181601f840112156101b1578235916001600160401b0383116101b157602083818601950101116101b157565b906101206003198301126101b1576004356001600160a01b03811681036101b1579160243591604435916064356001600160401b0381116101b15781611f1991600401611ea4565b929092916084356001600160401b0381116101b15781611f3b91600401611ea4565b9290929160a4356001600160401b0381116101b15781611f5d91600401611ea4565b9290929160c4356001600160401b0381116101b15781611f7f91600401611ea4565b9290929160e4356001600160401b0381116101b15781611fa191600401611ea4565b9290929161010435906001600160401b0382116101b157611fc491600401611ea4565b9091565b805180835260209291819084018484015e5f828201840152601f01601f1916010190565b91908201809211611ff957565b634e487b7160e01b5f52601160045260245ffd5b6003548110156120255760035f5260205f2001905f90565b634e487b7160e01b5f52603260045260245ffd5b60c081019081106001600160401b0382111761074f57604052565b90601f801991011681019081106001600160401b0382111761074f57604052565b6001600160401b03811161074f57601f01601f191660200190565b3d156120ba573d906120a182612075565b916120af6040519384612054565b82523d5f602084013e565b606090565b156120c657565b60405162461bcd60e51b815260206004820152602760248201527f456d706c6f796572506179726f6c6c3a2063616c6c6572206973206e6f74206560448201526636b83637bcb2b960c91b6064820152608490fd5b1561212257565b60405162461bcd60e51b815260206004820152602360248201527f456d706c6f796572506179726f6c6c3a20656d706c6f796565206e6f7420666f6044820152621d5b9960ea1b6064820152608490fd5b1561217a57565b60405162461bcd60e51b815260206004820152602560248201527f456d706c6f796572506179726f6c6c3a20696e73756666696369656e742062616044820152646c616e636560d81b6064820152608490fd5b156121d457565b606460405162461bcd60e51b815260206004820152602060248201527f456d706c6f796572506179726f6c6c3a207472616e73666572206661696c65646044820152fd5b92919261222482612075565b916122326040519384612054565b8294818452818301116101b1578281602093845f960137010152565b90600182811c9216801561227c575b602083101461226857565b634e487b7160e01b5f52602260045260245ffd5b91607f169161225d565b818110612291575050565b5f8155600101612286565b156122a357565b60405162461bcd60e51b815260206004820152602160248201527f456d706c6f796572506179726f6c6c3a2077616765206d757374206265203e206044820152600360fc1b6064820152608490fd5b156122f957565b60405162461bcd60e51b815260206004820152602a60248201527f456d706c6f796572506179726f6c6c3a20706179206672657175656e6379206d6044820152690757374206265203e20360b41b6064820152608490fd5b6040513481527f543ba50a5eec5e6178218e364b1d0f396157b3c8fa278522c2cb7fd99407d47460203392a2565b612389815461224e565b9081612393575050565b81601f5f93116001146123a55750555b565b818352602083206123c191601f0160051c810190600101612286565b8082528160208120915555565b9060405191825f8254926123e18461224e565b808452936001811690811561244a5750600114612406575b506123a392500383612054565b90505f9291925260205f20905f915b81831061242e5750509060206123a3928201015f6123f9565b6020919350806001915483858901015201910190918492612415565b9050602092506123a394915060ff191682840152151560051b8201015f6123f9565b612480906002600382015491015490611fec565b4210159056fea264697066735822122020beb737b8d49a2edccdc465efa072651ea576da4a4e33e866a9f59b8485160c64736f6c634300081a0033";

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

    const employeeData = await Promise.all(addresses.map(addr => payrollContract.getEmployee(addr)));
    const activeEntries = addresses
        .map((addr, i) => ({ addr, data: employeeData[i] }))
        .filter(({ data }) => data[4]);

    if (activeEntries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No active employees. Register one below.</td></tr>`;
        return;
    }

    const [isDueResults, metaResults] = await Promise.all([
        Promise.all(activeEntries.map(({ addr }) => payrollContract.isPaymentDue(addr))),
        Promise.all(activeEntries.map(({ addr }) => getEmployeeMeta(addr)))
    ]);

    activeEntries.forEach(({ addr, data }, i) => {
        const [, wageWei, payFrequency, lastPaid] = data;
        const isDue = isDueResults[i];
        const meta = metaResults[i];
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
    });
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

    // Show modal immediately so the user isn't left waiting
    document.getElementById("edit-modal").style.display = "flex";

    // Pre-populate on-chain metadata fields (fall back to empty strings on error)
    try {
        const meta = await getEmployeeMeta(addr);
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
