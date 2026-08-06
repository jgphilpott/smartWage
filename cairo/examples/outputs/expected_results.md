# Example proof outcomes

- `minimum_income_input.json`: should verify when `wage_commitment` is replaced with the real Poseidon commitment and wage is >= min.
- `maximum_income_input.json`: should verify when `wage_commitment` is replaced with the real Poseidon commitment and wage is <= max.
- `salary_range_input.json`: should verify when `wage_commitment` is replaced with the real Poseidon commitment and min <= wage <= max.
- `employment_duration_input.json`: should verify as-is.
- `employer_membership_input.json`: should verify when `start_date_commitment` is replaced with the real Poseidon commitment.
