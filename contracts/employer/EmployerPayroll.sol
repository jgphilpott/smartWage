// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../employee/EmployeePortal.sol";

/**
 * @title EmployerPayroll
 * @notice Deployed by an employer to manage payroll for their employees.
 *         The employer can register employees with a wallet address, wage (in wei),
 *         and a pay frequency (in seconds).  Payments can be triggered manually or
 *         by anyone calling processDuePayments() so that keepers / bots can automate
 *         the cycle.  One-off bonuses are also supported.
 */
contract EmployerPayroll {

    // ─────────────────────────────────────────────
    //  State
    // ─────────────────────────────────────────────

    address public employer;

    struct Employee {
        address addr;
        uint256 wageWei;           // amount paid each cycle (in wei)
        uint256 payFrequency;      // seconds between payments (e.g. 604800 = weekly)
        uint256 lastPaid;          // unix timestamp of last payment (0 = never)
        uint256 activatedAt;       // unix timestamp when the employee signed and became active
        bool    active;
        bytes32 wageCommitment;    // Poseidon commitment to wageWei, used for ZK proofs
    }

    struct EmployeeMeta {
        string name;
        string department;
        string jobTitle;
        string jobDescription;
        string employmentType;
        string startDate;      // ISO-8601 date string, e.g. "2025-01-15"
    }

    mapping(address => Employee)     private _employees;
    mapping(address => EmployeeMeta) private _employeeMeta;
    mapping(address => address)      private _employeeContracts;
    mapping(address => bool)         private _employeeRemoved;
    address[] private _employeeList;

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    event FundsDeposited(address indexed from, uint256 amount);
    event EmployeeRegistered(address indexed employee, address indexed employeeContract, uint256 wageWei, uint256 payFrequency);
    event EmployeeActivated(address indexed employee, address indexed employeeContract);
    event EmployeeUpdated(address indexed employee, uint256 wageWei, uint256 payFrequency);
    event EmployeeMetaUpdated(address indexed employee);
    event EmployeeRemoved(address indexed employee, address indexed employeeContract);
    event PaymentSent(address indexed employee, uint256 amount, uint256 timestamp);
    event BonusSent(address indexed employee, uint256 amount);

    // ─────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────

    modifier onlyEmployer() {
        require(msg.sender == employer, "EmployerPayroll: caller is not employer");
        _;
    }

    /// @dev Grants access to the employer or the linked EmployeePortal contract for a given employee.
    modifier onlyEmployerOrLinkedPortal(address addr) {
        require(
            msg.sender == employer || msg.sender == _employeeContracts[addr],
            "EmployerPayroll: access denied"
        );
        _;
    }

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    constructor() {
        employer = msg.sender;
    }

    // ─────────────────────────────────────────────
    //  Funding
    // ─────────────────────────────────────────────

    /// @notice Deposit ETH to fund the payroll contract.
    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }

    /// @notice Explicit deposit function for frontends that prefer it.
    function deposit() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }

    // ─────────────────────────────────────────────
    //  Employee management
    // ─────────────────────────────────────────────

    /**
     * @notice Register a new employee along with their profile metadata.
     * @param addr             Employee wallet address.
     * @param wageWei          Amount (in wei) to pay each cycle.
     * @param payFrequency     Seconds between pay cycles.
     * @param name             Full name.
     * @param department       Department name.
     * @param jobTitle         Job title.
     * @param jobDescription   Brief description of responsibilities.
     * @param employmentType   One of: Full-time, Part-time, Contract, Intern.
     * @param startDate        ISO-8601 date string (e.g. "2025-01-15").
     */
    function registerEmployee(
        address addr,
        uint256 wageWei,
        uint256 payFrequency,
        string calldata name,
        string calldata department,
        string calldata jobTitle,
        string calldata jobDescription,
        string calldata employmentType,
        string calldata startDate
    ) external onlyEmployer {
        require(addr != address(0), "EmployerPayroll: zero address");
        require(wageWei > 0, "EmployerPayroll: wage must be > 0");
        require(payFrequency > 0, "EmployerPayroll: pay frequency must be > 0");
        require(_employeeContracts[addr] == address(0), "EmployerPayroll: employee already registered");

        EmployeePortal employeePortal = new EmployeePortal(address(this), employer, addr);
        address employeeContract = address(employeePortal);

        _employees[addr] = Employee({
            addr: addr,
            wageWei: wageWei,
            payFrequency: payFrequency,
            lastPaid: 0,
            activatedAt: 0,
            active: false,
            wageCommitment: bytes32(0)
        });
        _employeeContracts[addr] = employeeContract;
        _employeeList.push(addr);

        _employeeMeta[addr] = EmployeeMeta({
            name: name,
            department: department,
            jobTitle: jobTitle,
            jobDescription: jobDescription,
            employmentType: employmentType,
            startDate: startDate
        });

        emit EmployeeRegistered(addr, employeeContract, wageWei, payFrequency);
        emit EmployeeMetaUpdated(addr);
    }

    /**
     * @notice Update an existing employee's wage, pay frequency, and profile metadata.
     * @param addr             Employee wallet address.
     * @param wageWei          New wage amount in wei.
     * @param payFrequency     New seconds between pay cycles.
     * @param name             Full name.
     * @param department       Department name.
     * @param jobTitle         Job title.
     * @param jobDescription   Brief description of responsibilities.
     * @param employmentType   One of: Full-time, Part-time, Contract, Intern.
     * @param startDate        ISO-8601 date string (e.g. "2025-01-15").
     */
    function updateEmployee(
        address addr,
        uint256 wageWei,
        uint256 payFrequency,
        string calldata name,
        string calldata department,
        string calldata jobTitle,
        string calldata jobDescription,
        string calldata employmentType,
        string calldata startDate
    ) external onlyEmployer {
        _requireCurrentEmployee(addr);
        require(wageWei > 0, "EmployerPayroll: wage must be > 0");
        require(payFrequency > 0, "EmployerPayroll: pay frequency must be > 0");

        _employees[addr].wageWei = wageWei;
        _employees[addr].payFrequency = payFrequency;

        _employeeMeta[addr] = EmployeeMeta({
            name: name,
            department: department,
            jobTitle: jobTitle,
            jobDescription: jobDescription,
            employmentType: employmentType,
            startDate: startDate
        });

        emit EmployeeUpdated(addr, wageWei, payFrequency);
        emit EmployeeMetaUpdated(addr);
    }

    /**
     * @notice Store or update the profile metadata for a registered employee.
     * @param addr             Employee wallet address.
     * @param name             Full name.
     * @param department       Department name.
     * @param jobTitle         Job title.
     * @param jobDescription   Brief description of responsibilities.
     * @param employmentType   One of: Full-time, Part-time, Contract, Intern.
     * @param startDate        ISO-8601 date string (e.g. "2025-01-15").
     */
    function setEmployeeMeta(
        address addr,
        string calldata name,
        string calldata department,
        string calldata jobTitle,
        string calldata jobDescription,
        string calldata employmentType,
        string calldata startDate
    ) external onlyEmployer {
        _requireCurrentEmployee(addr);

        _employeeMeta[addr] = EmployeeMeta({
            name: name,
            department: department,
            jobTitle: jobTitle,
            jobDescription: jobDescription,
            employmentType: employmentType,
            startDate: startDate
        });

        emit EmployeeMetaUpdated(addr);
    }

    /**
     * @notice Remove an employee from the payroll.
     * @param addr Employee wallet address.
     */
    function removeEmployee(address addr) external onlyEmployer {
        _requireCurrentEmployee(addr);
        _employees[addr].active = false;
        _employeeRemoved[addr] = true;
        delete _employeeMeta[addr];
        emit EmployeeRemoved(addr, _employeeContracts[addr]);
    }

    // ─────────────────────────────────────────────
    //  Payments
    // ─────────────────────────────────────────────

    /**
     * @notice Manually trigger a payment to a single employee (regardless of schedule).
     * @param addr Employee wallet address.
     */
    function payEmployee(address addr) external onlyEmployer {
        Employee storage emp = _employees[addr];
        require(emp.active && !_employeeRemoved[addr], "EmployerPayroll: employee not active");
        require(address(this).balance >= emp.wageWei, "EmployerPayroll: insufficient balance");

        emp.lastPaid = block.timestamp;
        (bool success, ) = payable(addr).call{value: emp.wageWei}("");
        require(success, "EmployerPayroll: transfer failed");

        emit PaymentSent(addr, emp.wageWei, block.timestamp);
    }

    /**
     * @notice Process a batch of overdue scheduled payments.
     *         Can be called by anyone (employer, keeper, cron bot, etc.).
     *         Skips employees where the balance is insufficient rather than reverting,
     *         so partial runs are possible.  Use pagination to avoid hitting block gas
     *         limits as the employee list grows.
     * @param start Index of the first employee in _employeeList to process.
     * @param count Maximum number of employees to process in this call.
     */
    function processDuePayments(uint256 start, uint256 count) external {
        uint256 len = _employeeList.length;
        uint256 end = start + count;
        if (end > len) end = len;
        for (uint256 i = start; i < end; ) {
            Employee storage emp = _employees[_employeeList[i]];
            if (emp.active && !_employeeRemoved[emp.addr]) {
                _processEmployeeDuePayment(emp);
            }
            unchecked { ++i; }
        }
    }

    /**
     * @notice Process overdue scheduled payments for one employee.
     *         Can be called by anyone (employee, employer, keeper, cron bot, etc.).
     * @param addr Employee wallet address.
     */
    function processDuePaymentFor(address addr) external {
        Employee storage emp = _employees[addr];
        if (emp.active && !_employeeRemoved[addr]) {
            _processEmployeeDuePayment(emp);
        }
    }

    /**
     * @notice Send a one-off bonus to an active employee.
     * @param addr   Employee wallet address.
     * @param amount Amount in wei.
     */
    function sendBonus(address addr, uint256 amount) external onlyEmployer {
        require(_employees[addr].active && !_employeeRemoved[addr], "EmployerPayroll: employee not active");
        require(amount > 0, "EmployerPayroll: bonus must be > 0");
        require(address(this).balance >= amount, "EmployerPayroll: insufficient balance");

        (bool success, ) = payable(addr).call{value: amount}("");
        require(success, "EmployerPayroll: transfer failed");
        emit BonusSent(addr, amount);
    }

    // ─────────────────────────────────────────────
    //  Views
    // ─────────────────────────────────────────────

    /**
     * @notice Get the details of a registered employee.
     * @param addr Employee wallet address.
     * @return Employee struct fields: addr, wageWei, payFrequency, lastPaid, active.
     */
    function getEmployee(address addr)
        external
        view
        onlyEmployerOrLinkedPortal(addr)
        returns (
            address,
            uint256,
            uint256,
            uint256,
            uint256,
            bool
        )
    {
        Employee storage emp = _employees[addr];
        return (emp.addr, emp.wageWei, emp.payFrequency, emp.lastPaid, emp.activatedAt, emp.active);
    }

    /**
     * @notice Get the profile metadata for a registered employee.
     * @param addr Employee wallet address.
     * @return name, department, jobTitle, jobDescription, employmentType, startDate.
     */
    function getEmployeeMeta(address addr)
        external
        view
        onlyEmployerOrLinkedPortal(addr)
        returns (
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            string memory
        )
    {
        EmployeeMeta storage m = _employeeMeta[addr];
        return (m.name, m.department, m.jobTitle, m.jobDescription, m.employmentType, m.startDate);
    }

    /// @notice Get the linked employee agreement contract and status flags.
    function getEmployeeAgreement(address addr)
        external
        view
        onlyEmployerOrLinkedPortal(addr)
        returns (address employeeContract, bool active, bool removed)
    {
        employeeContract = _employeeContracts[addr];
        active = _employees[addr].active;
        removed = _employeeRemoved[addr];
    }

    /// @notice Get the linked employee agreement contract address.
    function getEmployeePortal(address addr) external view onlyEmployerOrLinkedPortal(addr) returns (address) {
        return _employeeContracts[addr];
    }

    /// @notice Return the list of all employee addresses (including removed ones).
    function getEmployeeList() external view onlyEmployer returns (address[] memory) {
        return _employeeList;
    }

    /// @notice Total number of employee addresses ever registered.
    function getEmployeeCount() external view onlyEmployer returns (uint256) {
        return _employeeList.length;
    }

    /// @notice Current ETH balance held by this contract.
    function getBalance() external view onlyEmployer returns (uint256) {
        return address(this).balance;
    }

    /// @notice Whether a given employee is currently due for payment.
    function isPaymentDue(address addr) external view onlyEmployerOrLinkedPortal(addr) returns (bool) {
        Employee storage emp = _employees[addr];
        return emp.active && !_employeeRemoved[addr] && _isDue(emp);
    }

    // ─────────────────────────────────────────────
    //  ZK proof support
    // ─────────────────────────────────────────────

    /**
     * @notice Store a Poseidon commitment to an employee's wage for use in ZK proofs.
     *         The commitment is publicly readable so that third-party verifiers can
     *         confirm that an employee's ZK proof is anchored to the on-chain wage record.
     *
     *         Commitment scheme (computed off-chain by the employer in Cairo):
     *             wage_commitment = poseidon_hash(wage_low, wage_high, salt)
     *         where wage_low / wage_high are the low and high 128-bit limbs of wageWei.
     *
     * @param addr       Employee wallet address.
     * @param commitment Poseidon hash of the employee's wage and a random salt.
     */
    function setWageCommitment(address addr, bytes32 commitment) external onlyEmployer {
        _requireCurrentEmployee(addr);
        require(uint256(commitment) >> 252 == 0, "EmployerPayroll: commitment exceeds felt252 range");
        _employees[addr].wageCommitment = commitment;
    }

    /**
     * @notice Return the on-chain wage commitment for an employee.
     *         Intentionally public so that any verifier (bank, embassy, etc.) can
     *         confirm that a ZK proof is anchored to this employer's on-chain record.
     * @param addr Employee wallet address.
     * @return The Poseidon commitment to the employee's wage.
     */
    function getWageCommitment(address addr) external view returns (bytes32) {
        require(_employeeContracts[addr] != address(0), "EmployerPayroll: employee not registered");
        return _employees[addr].wageCommitment;
    }

    /**
     * @notice Return the public facts needed to anchor employment-related ZK proofs.
     * @param addr Employee wallet address.
     * @return employerAddress        The payroll contract deployer / employer address.
     * @return employeeAddress        The employee wallet address.
     * @return active                 Whether the employee is currently active.
     * @return activatedAt            Timestamp when the employee became active.
     * @return payFrequency           Scheduled pay frequency in seconds.
     * @return lastPaid               Timestamp of the latest successful payroll payment.
     * @return startDate             ISO-8601 employment start date string.
     */
    function getEmploymentProofContext(address addr)
        external
        view
        returns (
            address employerAddress,
            address employeeAddress,
            bool active,
            uint256 activatedAt,
            uint256 payFrequency,
            uint256 lastPaid,
            string memory startDate
        )
    {
        require(_employeeContracts[addr] != address(0), "EmployerPayroll: employee not registered");
        Employee storage emp = _employees[addr];
        EmployeeMeta storage meta = _employeeMeta[addr];
        return (employer, emp.addr, emp.active && !_employeeRemoved[addr], emp.activatedAt, emp.payFrequency, emp.lastPaid, meta.startDate);
    }

    /**
     * @notice Activate an employee after they sign their linked employee agreement.
     * @param addr Employee wallet address.
     */
    function activateEmployeeFromPortal(address addr) external {
        address employeeContract = _employeeContracts[addr];
        require(employeeContract != address(0), "EmployerPayroll: employee not found");
        require(!_employeeRemoved[addr], "EmployerPayroll: employee removed");
        require(msg.sender == employeeContract, "EmployerPayroll: caller is not employee contract");
        require(!_employees[addr].active, "EmployerPayroll: employee already active");

        _employees[addr].activatedAt = block.timestamp;
        _employees[addr].lastPaid = block.timestamp;
        _employees[addr].active = true;
        emit EmployeeActivated(addr, employeeContract);
    }

    // ─────────────────────────────────────────────
    //  Internals
    // ─────────────────────────────────────────────

    function _isDue(Employee storage emp) internal view returns (bool) {
        return _dueCycles(emp) > 0;
    }

    function _dueCycles(Employee storage emp) internal view returns (uint256) {
        if (block.timestamp <= emp.lastPaid) return 0;
        return (block.timestamp - emp.lastPaid) / emp.payFrequency;
    }

    function _processEmployeeDuePayment(Employee storage emp) internal {
        uint256 dueCycles = _dueCycles(emp);
        uint256 affordableCycles = address(this).balance / emp.wageWei;
        uint256 cyclesToPay = dueCycles < affordableCycles ? dueCycles : affordableCycles;
        if (cyclesToPay == 0) return;

        uint256 payout = cyclesToPay * emp.wageWei;
        uint256 prevLastPaid = emp.lastPaid;
        emp.lastPaid = prevLastPaid + (cyclesToPay * emp.payFrequency);
        (bool ok, ) = payable(emp.addr).call{value: payout}("");
        if (ok) {
            emit PaymentSent(emp.addr, payout, block.timestamp);
        } else {
            emp.lastPaid = prevLastPaid;
        }
    }

    function _requireCurrentEmployee(address addr) internal view {
        require(_employeeContracts[addr] != address(0) && !_employeeRemoved[addr], "EmployerPayroll: employee not found");
    }
}
