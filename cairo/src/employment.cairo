//! Generic employment-proof primitives.

pub fn assert_active_employment(active: bool) {
    assert(active, 'Employment is not active');
}

pub fn assert_employment_duration_and_gap(
    active: bool,
    activated_at: u64,
    last_paid: u64,
    pay_frequency: u64,
    current_time: u64,
    min_duration_seconds: u64,
    max_gap_seconds: u64,
) {
    assert_active_employment(active);
    assert(current_time >= activated_at, 'Current time before activation');

    let employment_duration = current_time - activated_at;
    assert(employment_duration >= min_duration_seconds, 'Employment duration too short');

    assert(last_paid >= activated_at, 'Invalid payment timeline');
    assert(pay_frequency <= max_gap_seconds, 'Pay frequency exceeds max gap');

    assert(current_time >= last_paid, 'Current time before last pay');
    let gap_since_last_payment = current_time - last_paid;
    assert(gap_since_last_payment <= max_gap_seconds, 'Latest payment gap too large');
}
