// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IEmployerPayroll
 * @notice Minimal interface used by EmployeePortal to read data from an EmployerPayroll contract.
 */
interface IEmployerPayroll {
    function employer() external view returns (address);
    function getEmployee(address addr)
        external
        view
        returns (
            address,   // addr
            uint256,   // wageWei
            uint256,   // payFrequency
            uint256,   // lastPaid
            bool       // active
        );
}

/**
 * @title EmployeePortal
 * @notice Deployed by an individual employee.  It lets them maintain a list of
 *         employer payroll contracts, and provides a single place to read their
 *         contract details across multiple employers.
 *
 *         Pay history is queryable off-chain by filtering the PaymentSent events
 *         emitted by each EmployerPayroll contract for the employee's address.
 */
contract EmployeePortal {

    // ─────────────────────────────────────────────
    //  State
    // ─────────────────────────────────────────────

    address public employee;

    address[] private _employerContracts;
    mapping(address => bool) private _registered;

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    event EmployerAdded(address indexed employerContract);
    event EmployerRemoved(address indexed employerContract);

    // ─────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────

    modifier onlyEmployee() {
        require(msg.sender == employee, "EmployeePortal: caller is not the employee");
        _;
    }

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    constructor() {
        employee = msg.sender;
    }

    // ─────────────────────────────────────────────
    //  Employer management
    // ─────────────────────────────────────────────

    /**
     * @notice Register an EmployerPayroll contract as one of your employers.
     * @param employerContract Address of the deployed EmployerPayroll contract.
     */
    function registerEmployer(address employerContract) external onlyEmployee {
        require(employerContract != address(0), "EmployeePortal: zero address");
        require(!_registered[employerContract], "EmployeePortal: employer already registered");

        _employerContracts.push(employerContract);
        _registered[employerContract] = true;

        emit EmployerAdded(employerContract);
    }

    /**
     * @notice Unregister an employer contract (removes it from your tracked list).
     * @param employerContract Address of the deployed EmployerPayroll contract.
     */
    function removeEmployer(address employerContract) external onlyEmployee {
        require(_registered[employerContract], "EmployeePortal: employer not registered");
        _registered[employerContract] = false;
        emit EmployerRemoved(employerContract);
    }

    // ─────────────────────────────────────────────
    //  Views
    // ─────────────────────────────────────────────

    /**
     * @notice Fetch this employee's contract details from a specific EmployerPayroll.
     * @param employerContract Address of the deployed EmployerPayroll contract.
     * @return addr          The employee address stored in the employer's contract.
     * @return wageWei       Wage per cycle in wei.
     * @return payFrequency  Seconds between pay cycles.
     * @return lastPaid      Unix timestamp of last payment.
     * @return active        Whether the employee record is active.
     */
    function getContractDetails(address employerContract)
        external
        view
        returns (
            address addr,
            uint256 wageWei,
            uint256 payFrequency,
            uint256 lastPaid,
            bool    active
        )
    {
        return IEmployerPayroll(employerContract).getEmployee(employee);
    }

    /**
     * @notice Fetch the employer wallet address from a registered EmployerPayroll contract.
     * @param employerContract Address of the deployed EmployerPayroll contract.
     */
    function getEmployerAddress(address employerContract)
        external
        view
        returns (address)
    {
        return IEmployerPayroll(employerContract).employer();
    }

    /**
     * @notice Return all registered EmployerPayroll contract addresses.
     */
    function getEmployerContracts() external view returns (address[] memory) {
        return _employerContracts;
    }

    /// @notice Total number of employer contracts ever registered (including removed).
    function getEmployerCount() external view returns (uint256) {
        return _employerContracts.length;
    }

    /// @notice Check whether a specific employer contract is currently registered.
    function isRegistered(address employerContract) external view returns (bool) {
        return _registered[employerContract];
    }
}
