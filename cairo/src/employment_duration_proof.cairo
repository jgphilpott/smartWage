//! # Example: Employment Duration Proof
//!
//! This executable demonstrates the stable v1 interface for proving:
//! 1) Active employment status.
//! 2) Minimum active tenure.
//! 3) Bounded latest payment gap.
//!
//! Public inputs: all fields except those your application decides to keep private.
//! In smartWage these values are anchored to `getEmploymentProofContext()`.

use workforce_attestation_proofs::adapters::assert_smartwage_employment_duration;

fn main(
    active: bool,
    activated_at: u64,
    last_paid: u64,
    pay_frequency: u64,
    current_time: u64,
    min_duration_seconds: u64,
    max_gap_seconds: u64,
) {
    assert_smartwage_employment_duration(
        active,
        activated_at,
        last_paid,
        pay_frequency,
        current_time,
        min_duration_seconds,
        max_gap_seconds,
    );
}
