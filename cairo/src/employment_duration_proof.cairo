//! # Employment Duration Proof
//!
//! A Cairo 2 program that proves an employee has remained on payroll for at least
//! a required duration, while allowing a verifier to enforce a maximum tolerated
//! payment gap, without revealing salary information.
//!
//! ## Public data the proof is anchored to
//!
//! This proof uses public employment facts exposed by `EmployerPayroll`:
//!
//! - `activated_at` — the timestamp when the employee signed and became active
//! - `last_paid` — the latest successful payroll payment timestamp
//! - `pay_frequency` — the scheduled cadence between payroll cycles
//! - `active` — whether the employee is still active
//!
//! ## What the proof attests to
//!
//! 1. The employee is currently active on the target payroll.
//! 2. The employee has been active for at least `min_duration_seconds`.
//! 3. The latest observed payment gap does not exceed `max_gap_seconds`.
//!
//! ## Honest caveat
//!
//! This is an exploratory proof over the current data model. The contract does not
//! yet persist a full private pay-history trace, so it cannot prove *every* gap in
//! the employment timeline. It can currently prove a lower bound on tenure plus a
//! bounded latest gap using the public payroll schedule and timestamps.

fn main(
    active: bool,
    activated_at: u64,
    last_paid: u64,
    pay_frequency: u64,
    current_time: u64,
    min_duration_seconds: u64,
    max_gap_seconds: u64,
) {
    assert(active, 'Employment is not active');
    assert(current_time >= activated_at, 'Current time before activation');

    let employment_duration = current_time - activated_at;
    assert(employment_duration >= min_duration_seconds, 'Employment duration too short');

    assert(last_paid >= activated_at, 'Invalid payment timeline');
    assert(pay_frequency <= max_gap_seconds, 'Configured pay frequency exceeds allowed gap');

    let gap_since_last_payment = current_time - last_paid;
    assert(gap_since_last_payment <= max_gap_seconds, 'Latest payment gap too large');
}
