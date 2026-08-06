//! # Example: Employer Membership Proof
//!
//! This executable demonstrates the stable v1 interface for proving:
//! 1) The proof targets the expected employer contract.
//! 2) The proof targets the expected employee address.
//! 3) Employment is active.
//! 4) The start-date commitment is consistent with provided date fields.

use workforce_attestation_proofs::adapters::assert_smartwage_employer_membership;

fn main(
    employer_contract: felt252,
    expected_employer_contract: felt252,
    employee_address: felt252,
    expected_employee_address: felt252,
    active: bool,
    start_year: u32,
    start_month: u8,
    start_day: u8,
    start_date_commitment: felt252,
) {
    assert_smartwage_employer_membership(
        employer_contract,
        expected_employer_contract,
        employee_address,
        expected_employee_address,
        active,
        start_year,
        start_month,
        start_day,
        start_date_commitment,
    );
}
