//! # Example: Maximum Income Proof
//!
//! This executable demonstrates the stable v1 interface for proving:
//! 1) The prover knows a wage matching the public commitment.
//! 2) That wage is at or below a public threshold.
//!
//! Public inputs: `max_income_low`, `max_income_high`, `wage_commitment`
//! Private inputs: `wage_low`, `wage_high`, `salt`

use workforce_attestation_proofs::adapters::{
    assert_smartwage_income_maximum, assert_smartwage_wage_commitment,
};

fn main(
    wage_low: u128,
    wage_high: u128,
    salt: felt252,
    max_income_low: u128,
    max_income_high: u128,
    wage_commitment: felt252,
) {
    assert_smartwage_wage_commitment(wage_low, wage_high, salt, wage_commitment);
    assert_smartwage_income_maximum(wage_low, wage_high, max_income_low, max_income_high);
}
