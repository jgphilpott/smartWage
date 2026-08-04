//! # Salary Range Proof
//!
//! A Cairo 2 program that proves an employee's wage falls within a stated
//! salary range **without revealing the actual wage amount**.
//!
//! ## Background
//!
//! This proof combines the minimum and maximum income checks into a single
//! range assertion.  See `/docs/zk-starks.md` for the full design rationale
//! and commitment scheme.
//!
//! ## Commitment scheme
//!
//! The commitment is identical to the other income proofs:
//!
//! ```
//! wage_commitment = poseidon_hash(wage_low, wage_high, salt)
//! ```
//!
//! where `wage_low` and `wage_high` are the lower and upper 128-bit limbs of
//! the `uint256` wage value, and `salt` is a random `felt252` shared privately
//! between employer and employee.
//!
//! ## Proof inputs
//!
//! | Input              | Visibility | Description                                          |
//! |--------------------|------------|------------------------------------------------------|
//! | `wage_low`         | Private    | Lower 128 bits of the wage in wei                    |
//! | `wage_high`        | Private    | Upper 128 bits of the wage in wei                    |
//! | `salt`             | Private    | Random salt used when computing the commitment       |
//! | `min_income_low`   | Public     | Lower 128 bits of the lower bound of the range       |
//! | `min_income_high`  | Public     | Upper 128 bits of the lower bound of the range       |
//! | `max_income_low`   | Public     | Lower 128 bits of the upper bound of the range       |
//! | `max_income_high`  | Public     | Upper 128 bits of the upper bound of the range       |
//! | `wage_commitment`  | Public     | Poseidon commitment stored on-chain by the employer  |
//!
//! ## What the proof attests to
//!
//! 1. The prover knows a wage value whose Poseidon commitment equals
//!    `wage_commitment` (tying the proof to the on-chain payroll record).
//! 2. That wage is greater than or equal to `min_income`.
//! 3. That wage is less than or equal to `max_income`.
//!
//! The verifier (benefits office, tax authority, insurance provider, etc.)
//! learns only these three facts.  The actual wage amount is never revealed.
//!
//! ## How to run
//!
//! Install the [Scarb](https://docs.swmansion.com/scarb/) toolchain, then:
//!
//! ```sh
//! # From the /cairo directory:
//! scarb build
//!
//! # Run with cairo-run (STWO or stone-prover for actual proof generation):
//! cairo-run --program target/dev/salary_range_proof \
//!           --layout all_cairo \
//!           --program-input input.json
//! ```
//!
//! Example `input.json` (employee earning 0.03 ETH/week, proving in [0.01, 0.05] ETH):
//!
//! ```json
//! {
//!   "wage_low":         "30000000000000000",
//!   "wage_high":        "0",
//!   "salt":             "0x1a2b3c4d",
//!   "min_income_low":   "10000000000000000",
//!   "min_income_high":  "0",
//!   "max_income_low":   "50000000000000000",
//!   "max_income_high":  "0",
//!   "wage_commitment":  "<poseidon_hash(wage_low, wage_high, salt)>"
//! }
//! ```

use core::poseidon::poseidon_hash_span;

/// Entry point for the salary range proof.
///
/// The Cairo VM executes this function and produces an execution trace.
/// A STARK prover (e.g. STWO or stone-prover) then generates a succinct
/// proof of that trace.  The verifier checks the proof against the public
/// inputs without ever seeing the private witness values.
///
/// # Arguments
///
/// * `wage_low`         — Lower 128 bits of the employee's wage in wei (private witness).
/// * `wage_high`        — Upper 128 bits of the employee's wage in wei (private witness).
/// * `salt`             — Random `felt252` used when computing the on-chain commitment (private witness).
/// * `min_income_low`   — Lower 128 bits of the lower bound of the salary range in wei (public input).
/// * `min_income_high`  — Upper 128 bits of the lower bound of the salary range in wei (public input).
/// * `max_income_low`   — Lower 128 bits of the upper bound of the salary range in wei (public input).
/// * `max_income_high`  — Upper 128 bits of the upper bound of the salary range in wei (public input).
/// * `wage_commitment`  — Poseidon commitment to the wage stored on-chain by the employer (public input).
fn main(
    wage_low: u128,
    wage_high: u128,
    salt: felt252,
    min_income_low: u128,
    min_income_high: u128,
    max_income_low: u128,
    max_income_high: u128,
    wage_commitment: felt252,
) {
    let wage = u256 { low: wage_low, high: wage_high };
    let min_income = u256 { low: min_income_low, high: min_income_high };
    let max_income = u256 { low: max_income_low, high: max_income_high };

    // ── Step 1: Verify the wage commitment ───────────────────────────────────
    //
    // Recompute the Poseidon hash from the private inputs and assert it matches
    // the public commitment stored on-chain by the employer.
    //
    // Without this check a dishonest prover could claim any wage within the
    // range.  The commitment anchors the proof to the specific wage record
    // that the employer published.
    let computed_commitment = poseidon_hash_span(
        array![wage_low.into(), wage_high.into(), salt].span(),
    );
    assert(computed_commitment == wage_commitment, 'Invalid wage commitment');

    // ── Step 2: Prove the lower bound ────────────────────────────────────────
    //
    // Assert the private wage meets or exceeds the public minimum threshold.
    assert(wage >= min_income, 'Income below minimum threshold');

    // ── Step 3: Prove the upper bound ────────────────────────────────────────
    //
    // Assert the private wage is at or below the public maximum threshold.
    assert(wage <= max_income, 'Income exceeds maximum threshold');
}
