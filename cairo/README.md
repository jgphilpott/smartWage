# Smart Identity Proofs

Smart Identity Proofs (SIPs) is a reusable Cairo package for selective identity and
data disclosure. It starts with employment attestations and is intended to expand
to adjacent identity claims such as age, citizenship, or professional licenses.

## Package scope

This package is structured as a reusable Cairo library with optional example executables.
It is designed so applications can reuse proof logic without inheriting smartWage-specific
field names.

## Stable interface

Current proof interface version: `v1`.

Compatibility policy:
- Backward-compatible additions keep `v1`.
- Breaking changes increment the version and are documented before release.
- Shared version and namespace constants are defined in `src/conventions.cairo`.

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

### Shared conventions (`src/conventions.cairo`)
- Stable interface version constant.
- Reserved domain namespace constants for future proof expansion into broader identity proofs.

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

scarb execute --executable-name example_minimum_income_proof --arguments-file examples/inputs/minimum_income_input.json --layout all_cairo --output none
scarb execute --executable-name example_maximum_income_proof --arguments-file examples/inputs/maximum_income_input.json --layout all_cairo --output none
scarb execute --executable-name example_salary_range_proof --arguments-file examples/inputs/salary_range_input.json --layout all_cairo --output none
scarb execute --executable-name example_employment_duration_proof --arguments-file examples/inputs/employment_duration_input.json --layout all_cairo --output none
scarb execute --executable-name example_employer_membership_proof --arguments-file examples/inputs/employer_membership_input.json --layout all_cairo --output none
```

The example input files are ordered JSON arrays of Cairo-serialized arguments.
Numeric and boolean values are encoded as hex strings (`0x...`) in the same order
as each executable function signature.

## Publishing checklist

Once `scarb build`, the example executions above, and the repository CI jobs are all
passing:

```sh
# Inspect the exact files that will ship.
scarb package --list

# Build the publishable tarball locally.
scarb package

# Publish to the default registry once your Scarb registry credentials are configured.
scarb publish
```

The packaged archive is written to `target/package/`. If you want Scarb to skip the
pre-publish build verification step, `scarb publish --no-verify` is available, but
the recommended path is to publish only after the local build and CI checks succeed.
Both `scarb package` and `scarb publish` expect a clean working tree unless you
explicitly pass `--allow-dirty` for a local dry run.
