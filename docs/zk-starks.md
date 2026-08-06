# ZK-STARKs in smartWage

## Background

This document captures an exploratory conversation about applying Zero-Knowledge
STARKs (via the Cairo programming language and Starknet) to the smartWage payroll
dApp, and records the design decisions that followed from it.

---

## The core idea

Payroll data is highly sensitive — salary, employment tenure, job title — yet
employees frequently need to prove facts about that data to third parties: banks,
landlords, insurers, visa authorities.  Today this requires handing over full
documents (payslips, employment letters), disclosing far more than necessary.

ZK proofs solve this exactly: an employee can prove a *property* of their
employment data (e.g. "my monthly income is above £3,000") without revealing the
underlying data itself.  Because smartWage stores authoritative payroll records
on-chain, those records become the trusted ground-truth that the proof is anchored
to — no employer letter required.

---

## Why ZK-STARKs (and Cairo)?

Both ZK-SNARKs (Circom/SnarkJS, Groth16/PLONK on Ethereum) and ZK-STARKs (Cairo/
Starknet) can express the proofs described below.  The key trade-offs are:

| Property              | ZK-SNARKs              | ZK-STARKs (Cairo)          |
|-----------------------|------------------------|----------------------------|
| Trusted setup         | Required               | **Not required**           |
| Proof size            | Very small (~200 bytes) | Larger (~100 KB+)          |
| Verification cost     | Low                    | Higher                     |
| Post-quantum security | No                     | **Yes** (hash-based)       |
| Developer ergonomics  | Circom DSL             | Cairo (Rust-like language) |

For a payroll dApp, the **no trusted setup** property of STARKs is a strong
argument.  A trusted setup ceremony introduces a risk that anyone who participated
(or who obtained the toxic waste) could forge proofs.  Employees and third-party
verifiers should not need to trust that such a ceremony was conducted correctly.

Cairo 2 is also a full Turing-complete language, making it straightforward to
express the range proofs and commitment checks described in this document.

---

## Potential applications

### 1. Minimum income proof *(implemented)*

**Statement proven:** "My wage per pay cycle is at or above amount X."

**Use cases:** Mortgage applications, rental agreements, loan applications, credit
assessments.

**What the verifier learns:** Only that the wage is ≥ X.  The exact salary, pay
frequency, employer name, and all other employment details remain hidden.

### 2. Maximum income proof *(implemented)*

**Statement proven:** "My wage per pay cycle is at or below amount X."

**Use cases:** Tax bracket eligibility, food subsidy or benefit scheme applications,
means-tested programme qualification.

**What the verifier learns:** Only that the wage is ≤ X.  All other employment
details remain hidden.

### 3. Salary range proof *(implemented)*

**Statement proven:** "My wage (per pay cycle) is between £A and £B."

**Use cases:** Income-based benefit eligibility, tax bracket confirmation,
insurance premium calculation.

### 4. Employment duration proof

**Statement proven:** "I have been on this payroll for at least N consecutive
months with no gap longer than D days."

**Use cases:** Visa applications, probationary period confirmation, mortgage
qualification ("employed for 12+ months").

### 5. Employer membership proof

**Statement proven:** "I am currently employed by the organisation that deployed
contract address 0x…"

**Use cases:** Membership-gated services, professional body verification, background
checks where the verifier knows the employer's contract address but should not
learn the employee's salary.

### 6. Tax compliance proof

**Statement proven:** "My employer has made payroll tax withholdings on my behalf
for every pay cycle in the last 12 months."

**Use cases:** Immigration/tax residency applications, audits.

### 7. Payroll regularity proof

**Statement proven:** "I received at least N payments with no gap longer than D
days in the last 12 months."

**Use cases:** Proving stable employment to insurers or financial institutions
without disclosing salary amounts.

---

## Architecture

### On-chain component (Solidity / EVM)

The `EmployerPayroll` contract stores a Poseidon **commitment** to each employee's
wage alongside the (private) wage itself:

```
wage_commitment = poseidon_hash(wage_low, wage_high, salt)
```

where `wage_low` / `wage_high` are the lower and upper 128-bit limbs of the
`uint256` wage in wei, and `salt` is a random `felt252` shared privately between
employer and employee.

The commitment is stored via `setWageCommitment()` and is **publicly readable**
via `getWageCommitment()` so that any verifier can confirm a ZK proof is anchored
to the correct on-chain record.  The actual wage is stored privately and only
readable by the employer or the employee's linked portal contract.

### Off-chain proving component (Cairo 2)

The Cairo package in `/cairo/` now exposes reusable proof modules plus
smartWage-specific example executables.
When the employee wants to prove their income to a third party:

1. The employee (or a proving service acting on their behalf) runs the Cairo
   program locally with their **private inputs** (actual wage, salt) and the
   **public inputs** (minimum threshold, on-chain commitment).
2. A STARK prover (e.g. [STWO](https://github.com/starkware-libs/stwo) or
   [stone-prover](https://github.com/starkware-libs/stone-prover)) generates a
   succinct proof of the execution trace.
3. The proof, together with the public inputs, is presented to the verifier.

### Verification

The verifier checks:

1. The proof is valid (i.e. the Cairo program ran correctly with *some* private
   inputs that caused it to complete without panicking).
2. The public `wage_commitment` in the proof matches the value stored on-chain by
   the employer.
3. The `min_income` threshold in the proof matches the requirement they set.

If all three checks pass, the verifier is convinced that the employee's wage is
at or above the threshold, without learning anything else.

For the employment-oriented proof prototypes, the verifier additionally anchors
the proof to the public context returned by
`EmployerPayroll.getEmploymentProofContext()`, which exposes the employer
address, employee address, active flag, activation timestamp, pay frequency,
latest payment timestamp, and public start date.

For on-chain verification on Starknet, the proof can be submitted to a Starknet
verifier contract.  For off-chain verification (a bank's back-end system, an
embassy portal), the verifier runs the proof checker locally or via a verification
API.

---

## Commitment data flow

```
Employer                      On-chain                     Employee
   │                             │                             │
   │  registerEmployee(addr,     │                             │
   │    wageWei, ...)            │                             │
   │ ──────────────────────────► │                             │
   │                             │                             │
   │  setWageCommitment(addr,    │                             │
   │    poseidon(wage, salt))    │                             │
   │ ──────────────────────────► │  wageCommitment (public)    │
   │                             │ ◄──────────────────────────►│
   │                             │                             │
   │  (shares salt privately)    │                             │
   │ ──────────────────────────────────────────────────────►  │
   │                             │                             │
   │                             │           Employee proves:  │
   │                             │    wage >= min_income       │
   │                             │    AND hash(wage,salt)      │
   │                             │         == wageCommitment   │
   │                             │                      ───►  Verifier
```

---

## Privacy model and honest caveats

### Solidity `private` vs true privacy

The `private` keyword in Solidity prevents *other contracts* from reading storage
slots directly.  It does **not** prevent anyone from reading raw blockchain storage
via `eth_getStorageAt` or a block explorer.  For Ethereum/EVM deployments, "private"
payroll data is therefore only private in the contract-access sense.

True data privacy on a public EVM chain requires either:
- Storing only the commitment on-chain (the actual data is kept off-chain or
  encrypted), or
- Deploying on a privacy-focused chain or L2 with confidential state.

The ZK proof approach mitigates the practical risk: even if a sophisticated actor
read the raw wage from storage, the employee's *proofs* to third parties reveal
nothing extra — the proofs are anchored to the commitment, not the raw value.

### The oracle problem

A ZK proof is only as trustworthy as the data it commits to.  If an employer posts
a false wage commitment on-chain, the resulting proofs are proofs of a lie.  The
dApp's trust model (employer is the contract deployer, employee signs to
acknowledge terms) mitigates this but does not eliminate it.  Future work could
introduce employer-level attestations or multi-party commitments.

### Proof generation cost

Generating a STARK proof is computationally intensive.  For large Cairo programs
this may not be feasible in-browser.  A dedicated proving service (potentially
running on the employee's behalf with appropriate privacy guarantees) is the
expected deployment model for production use.

---

## Proof of concept

Five exploratory proofs are implemented as Cairo 2 example executables in:

```
cairo/
├── Scarb.toml                      # Scarb package manifest (`workforce_attestation_proofs`)
├── README.md                       # Package usage + interface docs
└── src/
    ├── lib.cairo                   # Reusable proof package entrypoint (v1 interface)
    ├── conventions.cairo           # Interface version + namespace conventions
    ├── income.cairo                # Generic income proof primitives
    ├── employment.cairo            # Generic employment proof primitives
    ├── identity.cairo              # Generic identity/membership proof primitives
    ├── adapters.cairo              # smartWage schema adapter layer
    ├── minimum_income_proof.cairo      # `example_minimum_income_proof`
    ├── maximum_income_proof.cairo      # `example_maximum_income_proof`
    ├── salary_range_proof.cairo        # `example_salary_range_proof`
    ├── employment_duration_proof.cairo # `example_employment_duration_proof`
    └── employer_membership_proof.cairo # `example_employer_membership_proof`
```

See `cairo/README.md` for build instructions, example inputs, and proof interface
stability notes.

### Current scaffolding status for applications 4 and 5

The repository now has enough scaffolding to prototype both proof types:

- `EmployerPayroll` now records `activatedAt` when the employee signs.
- `EmployerPayroll.getEmploymentProofContext()` exposes the public employment
  fields that a verifier can use to anchor these proofs.
- Cairo proof-of-concept executables exist for both employment duration and
  employer membership.

Current limitations still present in the data model:

- **Employment duration proof:** the contract does not persist a full historical
  sequence of pay-cycle checkpoints, so the prototype proves a lower bound on
  active tenure plus a bounded latest payment gap, not a proof that every
  historical gap was below `D`.
- **Employer membership proof:** the prototype proves active membership against
  a known payroll contract and a committed start-date tuple, but still depends
  on the verifier reading public employment context from the target contract.

---

## Next steps

1. **On-chain Starknet verifier** — a Starknet contract that accepts a STARK proof
   and public inputs, verifies the proof, and emits verification events
   (`MinimumIncomeVerified`, `MaximumIncomeVerified`, `SalaryRangeVerified`) that
   third parties can query.
2. **Additional proof types** — employment duration, employer membership, tax
   compliance, payroll regularity (see *Potential applications* above).
3. **Frontend integration** — a UI flow where the employee selects a proof type,
   enters the public threshold(s), and downloads a proof file to share with a verifier.
4. **Proving service** — an off-chain service that generates proofs on behalf of
   employees, with appropriate access controls so only the employee can trigger
   their own proof.
