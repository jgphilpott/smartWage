// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IEmployerPayroll
 * @notice Minimal interface used by EmployeePortal to interact with the linked EmployerPayroll contract.
 */
interface IEmployerPayroll {
    function activateEmployeeFromPortal(address addr) external;

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

    function getEmployeeMeta(address addr)
        external
        view
        returns (
            string memory, // name
            string memory, // department
            string memory, // jobTitle
            string memory, // jobDescription
            string memory, // employmentType
            string memory  // startDate
        );
}

/**
 * @title EmployeePortal
 * @notice Deployed by an employer during registration and permanently linked to
 *         one EmployerPayroll contract and one employee wallet. The employee can
 *         connect to this contract, review the linked job details, and sign to
 *         activate the employment relationship.
 */
contract EmployeePortal {

    // ─────────────────────────────────────────────
    //  State
    // ─────────────────────────────────────────────

    address public immutable employerPayroll;
    address public immutable employer;
    address public immutable employee;
    bool public signed;

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    event ContractSigned(address indexed employee, address indexed employerPayroll);

    // ─────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────

    modifier onlyEmployee() {
        require(msg.sender == employee, "EmployeePortal: caller is not the employee");
        _;
    }

    /// @dev Grants access to the employee or the employer.
    modifier onlyParties() {
        require(
            msg.sender == employee || msg.sender == employer,
            "EmployeePortal: access denied"
        );
        _;
    }

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    constructor(address employerPayroll_, address employer_, address employee_) {
        require(employerPayroll_ != address(0), "EmployeePortal: zero payroll");
        require(employer_ != address(0), "EmployeePortal: zero employer");
        require(employee_ != address(0), "EmployeePortal: zero employee");

        employerPayroll = employerPayroll_;
        employer = employer_;
        employee = employee_;
    }

    // ─────────────────────────────────────────────
    //  Agreement lifecycle
    // ─────────────────────────────────────────────

    /**
     * @notice Sign the linked employment agreement and activate the employee in payroll.
     */
    function signContract() external onlyEmployee {
        require(!signed, "EmployeePortal: contract already signed");
        signed = true;
        IEmployerPayroll(employerPayroll).activateEmployeeFromPortal(employee);
        emit ContractSigned(employee, employerPayroll);
    }

    // ─────────────────────────────────────────────
    //  Views
    // ─────────────────────────────────────────────

    /**
     * @notice Fetch this employee's contract details from the linked EmployerPayroll.
     * @return addr          The employee address stored in the employer's contract.
     * @return wageWei       Wage per cycle in wei.
     * @return payFrequency  Seconds between pay cycles.
     * @return lastPaid      Unix timestamp of last payment.
     * @return active        Whether the employee record is active.
     */
    function getContractDetails()
        external
        view
        onlyParties
        returns (
            address addr,
            uint256 wageWei,
            uint256 payFrequency,
            uint256 lastPaid,
            bool    active
        )
    {
        return IEmployerPayroll(employerPayroll).getEmployee(employee);
    }

    /**
     * @notice Fetch the linked employee metadata from EmployerPayroll.
     */
    function getEmployeeMeta()
        external
        view
        onlyParties
        returns (
            string memory,
            string memory,
            string memory,
            string memory,
            string memory,
            string memory
        )
    {
        return IEmployerPayroll(employerPayroll).getEmployeeMeta(employee);
    }

    /**
     * @notice Return whether the employee has signed and whether the linked payroll record is active.
     */
    function getAgreementStatus() external view onlyParties returns (bool contractSigned, bool active) {
        (, , , , active) = IEmployerPayroll(employerPayroll).getEmployee(employee);
        return (signed, active);
    }
}
