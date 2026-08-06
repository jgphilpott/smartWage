//! Generic income-proof primitives.

use core::poseidon::poseidon_hash_span;

pub fn wage_commitment(wage_low: u128, wage_high: u128, salt: felt252) -> felt252 {
    poseidon_hash_span(array![wage_low.into(), wage_high.into(), salt].span())
}

pub fn assert_wage_commitment(
    wage_low: u128,
    wage_high: u128,
    salt: felt252,
    expected_commitment: felt252,
) {
    let computed_commitment = wage_commitment(wage_low, wage_high, salt);
    assert(computed_commitment == expected_commitment, 'Invalid wage commitment');
}

pub fn assert_min_income(wage: u256, min_income: u256) {
    assert(wage >= min_income, 'Income below minimum threshold');
}

pub fn assert_max_income(wage: u256, max_income: u256) {
    assert(wage <= max_income, 'Income exceeds maximum threshold');
}

/// Asserts an inclusive income range and validates `min_income <= max_income`.
pub fn assert_income_range(wage: u256, min_income: u256, max_income: u256) {
    assert(min_income <= max_income, 'Invalid income range');
    assert_min_income(wage, min_income);
    assert_max_income(wage, max_income);
}
