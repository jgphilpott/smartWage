//! # Employer Membership Proof
//!
//! A Cairo 2 program that proves an employee is currently employed by a known
//! employer payroll contract, without revealing salary data.
//!
//! ## Public data the proof is anchored to
//!
//! This proof is intended to be checked alongside `EmployerPayroll.getEmploymentProofContext()`
//! and the known payroll contract address supplied by the verifier.
//!
//! ## What the proof attests to
//!
//! 1. The target payroll contract address matches the verifier's expected employer.
//! 2. The employee address in the proof matches the on-chain employment record.
//! 3. The employee is currently active.
//! 4. The employment start date commitment matches the public on-chain start date.
//!
//! The start date is hashed into a commitment so the verifier can bind the proof to
//! a specific employment record field without introducing salary data into the proof.

use core::poseidon::poseidon_hash_span;

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
    assert(active, 'Employment is not active');
    assert(employer_contract == expected_employer_contract, 'Wrong employer contract');
    assert(employee_address == expected_employee_address, 'Wrong employee address');

    let computed_start_date_commitment = poseidon_hash_span(
        array![start_year.into(), start_month.into(), start_day.into()].span(),
    );
    assert(computed_start_date_commitment == start_date_commitment, 'Invalid start date commitment');
}
