//! # Example: Minimum Income Proof
//!
//! This executable demonstrates the stable v1 interface for proving:
//! 1) The prover knows a wage matching the public commitment.
//! 2) That wage is at or above a public threshold.
//!
//! Public inputs: `min_income_low`, `min_income_high`, `wage_commitment`
//! Private inputs: `wage_low`, `wage_high`, `salt`

use workforce_attestation_proofs::adapters::{
    assert_smartwage_income_minimum, assert_smartwage_wage_commitment,
};

fn main(
    wage_low: u128,
    wage_high: u128,
    salt: felt252,
    min_income_low: u128,
    min_income_high: u128,
    wage_commitment: felt252,
) {
    assert_smartwage_wage_commitment(wage_low, wage_high, salt, wage_commitment);
    assert_smartwage_income_minimum(wage_low, wage_high, min_income_low, min_income_high);
}
