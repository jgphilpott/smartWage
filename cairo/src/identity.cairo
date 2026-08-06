//! Generic identity and membership proof primitives.

use core::poseidon::poseidon_hash_span;

pub fn start_date_commitment(start_year: u32, start_month: u8, start_day: u8) -> felt252 {
    poseidon_hash_span(array![start_year.into(), start_month.into(), start_day.into()].span())
}

pub fn assert_employer_membership(
    employer_contract: felt252,
    expected_employer_contract: felt252,
    employee_address: felt252,
    expected_employee_address: felt252,
    active: bool,
    start_year: u32,
    start_month: u8,
    start_day: u8,
    expected_start_date_commitment: felt252,
) {
    assert(active, 'Employment is not active');
    assert(employer_contract == expected_employer_contract, 'Wrong employer contract');
    assert(employee_address == expected_employee_address, 'Wrong employee address');

    let computed_start_date_commitment = start_date_commitment(start_year, start_month, start_day);
    assert(computed_start_date_commitment == expected_start_date_commitment, 'Invalid start date commitment');
}
