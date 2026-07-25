// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

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
        uint256 wageWei;       // amount paid each cycle (in wei)
        uint256 payFrequency;  // seconds between payments (e.g. 604800 = weekly)
        uint256 lastPaid;      // unix timestamp of last payment (0 = never)
        bool    active;
    }

    mapping(address => Employee) private _employees;
    address[] private _employeeList;

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    event FundsDeposited(address indexed from, uint256 amount);
    event EmployeeRegistered(address indexed employee, uint256 wageWei, uint256 payFrequency);
    event EmployeeUpdated(address indexed employee, uint256 wageWei, uint256 payFrequency);
    event EmployeeRemoved(address indexed employee);
    event PaymentSent(address indexed employee, uint256 amount, uint256 timestamp);
    event BonusSent(address indexed employee, uint256 amount);

    // ─────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────

    modifier onlyEmployer() {
        require(msg.sender == employer, "EmployerPayroll: caller is not employer");
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
     * @notice Register a new employee.
     * @param addr         Employee wallet address.
     * @param wageWei      Amount (in wei) to pay each cycle.
     * @param payFrequency Seconds between pay cycles.
     */
    function registerEmployee(
        address addr,
        uint256 wageWei,
        uint256 payFrequency
    ) external onlyEmployer {
        require(addr != address(0), "EmployerPayroll: zero address");
        require(wageWei > 0, "EmployerPayroll: wage must be > 0");
        require(payFrequency > 0, "EmployerPayroll: pay frequency must be > 0");
        require(!_employees[addr].active, "EmployerPayroll: employee already registered");

        _employees[addr] = Employee({
            addr: addr,
            wageWei: wageWei,
            payFrequency: payFrequency,
            lastPaid: block.timestamp,   // first payment due after one full cycle
            active: true
        });
        _employeeList.push(addr);

        emit EmployeeRegistered(addr, wageWei, payFrequency);
    }

    /**
     * @notice Update an existing employee's wage and/or pay frequency.
     * @param addr         Employee wallet address.
     * @param wageWei      New wage amount in wei.
     * @param payFrequency New seconds between pay cycles.
     */
    function updateEmployee(
        address addr,
        uint256 wageWei,
        uint256 payFrequency
    ) external onlyEmployer {
        require(_employees[addr].active, "EmployerPayroll: employee not found");
        require(wageWei > 0, "EmployerPayroll: wage must be > 0");
        require(payFrequency > 0, "EmployerPayroll: pay frequency must be > 0");

        _employees[addr].wageWei = wageWei;
        _employees[addr].payFrequency = payFrequency;

        emit EmployeeUpdated(addr, wageWei, payFrequency);
    }

    /**
     * @notice Remove an employee from the payroll.
     * @param addr Employee wallet address.
     */
    function removeEmployee(address addr) external onlyEmployer {
        require(_employees[addr].active, "EmployerPayroll: employee not found");
        _employees[addr].active = false;
        emit EmployeeRemoved(addr);
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
        require(emp.active, "EmployerPayroll: employee not found");
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
            if (emp.active && _isDue(emp) && address(this).balance >= emp.wageWei) {
                uint256 prevLastPaid = emp.lastPaid;
                emp.lastPaid = block.timestamp;
                (bool ok, ) = payable(emp.addr).call{value: emp.wageWei}("");
                if (ok) {
                    emit PaymentSent(emp.addr, emp.wageWei, block.timestamp);
                } else {
                    emp.lastPaid = prevLastPaid;
                }
            }
            unchecked { ++i; }
        }
    }

    /**
     * @notice Send a one-off bonus to an active employee.
     * @param addr   Employee wallet address.
     * @param amount Amount in wei.
     */
    function sendBonus(address addr, uint256 amount) external onlyEmployer {
        require(_employees[addr].active, "EmployerPayroll: employee not found");
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
        returns (
            address,
            uint256,
            uint256,
            uint256,
            bool
        )
    {
        Employee storage emp = _employees[addr];
        return (emp.addr, emp.wageWei, emp.payFrequency, emp.lastPaid, emp.active);
    }

    /// @notice Return the list of all employee addresses (including removed ones).
    function getEmployeeList() external view returns (address[] memory) {
        return _employeeList;
    }

    /// @notice Total number of employee addresses ever registered.
    function getEmployeeCount() external view returns (uint256) {
        return _employeeList.length;
    }

    /// @notice Current ETH balance held by this contract.
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Whether a given employee is currently due for payment.
    function isPaymentDue(address addr) external view returns (bool) {
        Employee storage emp = _employees[addr];
        return emp.active && _isDue(emp);
    }

    // ─────────────────────────────────────────────
    //  Internals
    // ─────────────────────────────────────────────

    function _isDue(Employee storage emp) internal view returns (bool) {
        return block.timestamp >= emp.lastPaid + emp.payFrequency;
    }
}
