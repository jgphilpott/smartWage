# workforce_attestation_proofs

General-purpose attestation proofs for employment and adjacent eligibility use cases.

## Package scope

This package is structured as a reusable Cairo library with optional example executables.
It is designed so applications can reuse proof logic without inheriting smartWage-specific field names.

## Stable interface

Current proof interface version: `v1`.

Compatibility policy:
- Backward-compatible additions keep `v1`.
- Breaking changes increment the version and are documented before release.

## Proof catalog

### Income proofs (`src/income.cairo`)
- Minimum income (`wage >= min`)
- Maximum income (`wage <= max`)
- Salary range (`min <= wage <= max`)
- Commitment check (`poseidon(wage_low, wage_high, salt)`)

### Employment proofs (`src/employment.cairo`)
- Active employment assertions
- Duration + latest gap constraints

### Identity and membership proofs (`src/identity.cairo`)
- Employer/employee membership assertions
- Start-date commitment checks

### Adapter layer (`src/adapters.cairo`)
- Maps smartWage input names and context fields to generic library primitives.
- Downstream applications can replace this adapter with their own schema mapping.

## What proofs guarantee

Proofs guarantee only the predicates asserted by the executed Cairo program and its public inputs.

## What verifiers must still validate externally

Verifiers must still confirm public inputs are anchored to trusted source data (for example, on-chain contract state or a trusted registry).

## Layout

```
cairo/
├── Scarb.toml
├── README.md
├── examples/
│   ├── inputs/
│   │   ├── minimum_income_input.json
│   │   ├── maximum_income_input.json
│   │   ├── salary_range_input.json
│   │   ├── employment_duration_input.json
│   │   └── employer_membership_input.json
│   └── outputs/
│       └── expected_results.md
└── src/
    ├── lib.cairo
    ├── conventions.cairo
    ├── income.cairo
    ├── employment.cairo
    ├── identity.cairo
    ├── adapters.cairo
    ├── minimum_income_proof.cairo
    ├── maximum_income_proof.cairo
    ├── salary_range_proof.cairo
    ├── employment_duration_proof.cairo
    └── employer_membership_proof.cairo
```

## Build and run examples

From `/cairo`:

```sh
scarb build

cairo-run --program target/dev/example_minimum_income_proof --layout all_cairo --program-input examples/inputs/minimum_income_input.json
cairo-run --program target/dev/example_maximum_income_proof --layout all_cairo --program-input examples/inputs/maximum_income_input.json
cairo-run --program target/dev/example_salary_range_proof --layout all_cairo --program-input examples/inputs/salary_range_input.json
cairo-run --program target/dev/example_employment_duration_proof --layout all_cairo --program-input examples/inputs/employment_duration_input.json
cairo-run --program target/dev/example_employer_membership_proof --layout all_cairo --program-input examples/inputs/employer_membership_input.json
```
