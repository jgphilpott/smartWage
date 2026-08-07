# Example proof outcomes

- Input files are positional JSON arrays for `scarb execute`, using hex-encoded Cairo arguments.
- `minimum_income_input.json`: should verify when `wage_commitment` is replaced with the real Poseidon commitment hex value and wage is >= min.
- `maximum_income_input.json`: should verify when `wage_commitment` is replaced with the real Poseidon commitment hex value and wage is <= max.
- `salary_range_input.json`: should verify when `wage_commitment` is replaced with the real Poseidon commitment hex value and min <= wage <= max.
- `employment_duration_input.json`: should verify as-is.
- `employer_membership_input.json`: should verify when `start_date_commitment` is replaced with the real Poseidon commitment hex value.
