// scripts/deploy.js
// Deploy EmployerPayroll and register one sample employee agreement (local development helper)
const fs = require('fs');
const path = require('path');

async function main() {
  const [employer, employee] = await ethers.getSigners();
  console.log('Deploying contracts with employer account:', employer.address);

  // Employer payroll contract
  const EmployerFactory = await ethers.getContractFactory('EmployerPayroll');
  const payroll = await EmployerFactory.connect(employer).deploy();
  await payroll.waitForDeployment();
  console.log('EmployerPayroll deployed to:', payroll.target);

  await employer.sendTransaction({
    to: payroll.target,
    value: ethers.parseEther('1')
  });

  await (await payroll.registerEmployee(
    employee.address,
    ethers.parseEther('0.01'),
    7 * 24 * 60 * 60,
    'Sample Employee',
    'Engineering',
    'Developer',
    'Example development agreement',
    'Full-time',
    '2025-01-15'
  )).wait();

  const employeePortalAddress = await payroll.getEmployeePortal(employee.address);
  console.log('Linked EmployeePortal deployed to:', employeePortalAddress);

  const out = {
    employer: employer.address,
    employee: employee.address,
    EmployerPayroll: payroll.target,
    EmployeePortal: employeePortalAddress
  };

  const outPath = path.join(__dirname, '..', 'deployed.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Wrote deployment addresses to', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
