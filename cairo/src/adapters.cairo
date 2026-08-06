//! smartWage adapter functions that map app-specific field names to generic modules.

pub fn assert_smartwage_wage_commitment(
    wage_low: u128,
    wage_high: u128,
    salt: felt252,
    wage_commitment: felt252,
) {
    crate::income::assert_wage_commitment(wage_low, wage_high, salt, wage_commitment);
}

pub fn assert_smartwage_income_minimum(
    wage_low: u128,
    wage_high: u128,
    min_income_low: u128,
    min_income_high: u128,
) {
    let wage = u256 { low: wage_low, high: wage_high };
    let min_income = u256 { low: min_income_low, high: min_income_high };
    crate::income::assert_min_income(wage, min_income);
}

pub fn assert_smartwage_income_maximum(
    wage_low: u128,
    wage_high: u128,
    max_income_low: u128,
    max_income_high: u128,
) {
    let wage = u256 { low: wage_low, high: wage_high };
    let max_income = u256 { low: max_income_low, high: max_income_high };
    crate::income::assert_max_income(wage, max_income);
}

pub fn assert_smartwage_income_range(
    wage_low: u128,
    wage_high: u128,
    min_income_low: u128,
    min_income_high: u128,
    max_income_low: u128,
    max_income_high: u128,
) {
    let wage = u256 { low: wage_low, high: wage_high };
    let min_income = u256 { low: min_income_low, high: min_income_high };
    let max_income = u256 { low: max_income_low, high: max_income_high };
    crate::income::assert_income_range(wage, min_income, max_income);
}

pub fn assert_smartwage_employment_duration(
    active: bool,
    activated_at: u64,
    last_paid: u64,
    pay_frequency: u64,
    current_time: u64,
    min_duration_seconds: u64,
    max_gap_seconds: u64,
) {
    crate::employment::assert_duration_and_gap(
        active,
        activated_at,
        last_paid,
        pay_frequency,
        current_time,
        min_duration_seconds,
        max_gap_seconds,
    );
}

pub fn assert_smartwage_employer_membership(
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
    crate::identity::assert_employer_membership(
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
