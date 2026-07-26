// scripts/deploy.js
// Deploy EmployerPayroll and EmployeePortal (local development helper)
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);

  // Employer payroll contract
  const EmployerFactory = await ethers.getContractFactory('EmployerPayroll');
  const employer = await EmployerFactory.deploy();
  await employer.waitForDeployment();
  console.log('EmployerPayroll deployed to:', employer.target);

  // Employee portal (example deployment — portals are usually deployed per-employee)
  const EmployeeFactory = await ethers.getContractFactory('EmployeePortal');
  const employeePortal = await EmployeeFactory.deploy();
  await employeePortal.waitForDeployment();
  console.log('EmployeePortal deployed to:', employeePortal.target);

  const out = {
    deployer: deployer.address,
    EmployerPayroll: employer.target,
    EmployeePortal: employeePortal.target
  };

  const outPath = path.join(__dirname, '..', 'deployed.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Wrote deployment addresses to', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
