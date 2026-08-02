# smartWage — Monetization Research & Strategy

## Background

smartWage is an open-source, free-to-use, permissionless Ethereum payroll dApp.
The goal of this document is to explore how the project could generate meaningful
revenue — enough to support one senior developer salary (~$100K USD/year) — without
compromising any of those founding principles.

---

## Guiding Constraints

Any revenue model must respect all three properties simultaneously:

| Constraint | What it means in practice |
|---|---|
| **Open source** | All smart contract and frontend code stays public and auditable |
| **Free to use** | Deploying contracts and running payroll costs nothing beyond gas |
| **Permissionless** | Anyone can fork, self-host, or extend without asking permission |

The key insight is that _the protocol_ can remain entirely free while _optional
value-added services_ built on top of the protocol can be monetised. This is the
same model used by Uniswap (open contracts, fee switch off by default), The Graph
(open protocol, hosted service fees), and Infura (open spec, managed node fees).

---

## Revenue Strategies

### 1. ZK Proof-as-a-Service (highest potential)

The ZK-STARK proof system described in [zk-starks.md](zk-starks.md) is the single
most compelling commercial opportunity in the project. Generating a STARK proof is
computationally intensive and is explicitly noted as "not feasible in-browser" for
production use. That creates a natural, legitimate gap between "use the protocol
for free" and "pay for managed proof generation."

**How it works:**

- Employee authenticates with their wallet on a hosted proving portal.
- They select the proof type (minimum income, employment duration, salary range, etc.)
  and the public threshold.
- The proving service generates the STARK proof off-chain, signs the result, and
  returns a shareable proof package (proof file + public inputs + on-chain commitment
  reference).
- The employee downloads the proof and presents it to a third party (bank, landlord,
  embassy, HR background-check vendor).

**Pricing model:**

| Tier | Price | Who pays |
|---|---|---|
| Employee self-serve (pay-per-proof) | $2–5 / proof | Employee |
| Employer bundle (bulk proofs for staff) | $50–200 / month / employer | Employer |
| Third-party verifier API (per call) | $0.50–1.00 / verification | Bank / landlord platform |
| Enterprise SLA | $1,000–5,000 / month | Large HR vendor or fintech |

**Why this doesn't violate the open-source ethos:** the Cairo proof programs remain
open source. Any sophisticated user can run their own STARK prover (STWO,
stone-prover) for free. The hosted service is a convenience product, not a lock-in.

**Revenue path to $100K:**
- 200 employer bundles at $50/month = $120K/year, OR
- ~55,000 employee proofs at $2 each = $110K/year, OR
- 2 enterprise API customers at $5K/month = $120K/year
- A realistic mix of all three tiers reaches this goal with a modest user base.

---

### 2. Optional Protocol Fee (low friction, scales with usage)

The `processDuePayments` function is permissionless and callable by anyone.
A small, optional protocol fee (e.g., 0.1–0.5% of each payment processed through
the _official_ frontend) is arguably the most "DeFi native" monetisation method.

**How it works:**

- A fee recipient address (a multisig or ENS-named treasury) would be embedded in
  a future factory/registry contract added to the official UI deployment flow.
- Users who deploy contracts through that official dApp path would have this fee
  applied.
- The _open-source_ contracts would still not hard-code the fee — anyone forking
  the repo and deploying independently would pay nothing.

**Revenue path to $100K:**
- 0.25% fee on $40M total payroll processed annually.
- $40M annual payroll ≈ 200 employers each running $16K/month in wages — very
  achievable once adoption reaches small-to-medium crypto-native teams.

**Risk:** this slightly changes the value proposition for employers who compare costs
against zero-fee self-deployment. Transparency (publishing the fee prominently) and
keeping the rate very low are essential.

---

### 3. Managed Keeper / Automation Service

`processDuePayments` must be called by someone. For small employers, setting up
their own cron job or keeper bot is a friction point.

**How it works:**

- A subscription service would monitor `EmployerPayroll` contracts that opt in to
  automation, with a registry/discovery layer introduced as part of that plan,
  and call `processDuePayments` on the correct schedule.
- The employer would pay a flat monthly fee; gas costs are either included
  (subscription covers gas) or passed through at cost.

**Pricing model:**

| Plan | Price | Gas coverage |
|---|---|---|
| Starter (≤ 10 employees) | $15 / month | Pass-through |
| Business (≤ 50 employees) | $49 / month | Included up to $20/month gas |
| Enterprise (unlimited) | $199 / month | Included |

**Revenue path to $100K:** ~170 Business-tier customers.

---

### 4. White-Label / Embedded Payroll SDK

HR platforms and crypto-native employment tools (payroll for DAOs, remote teams)
could embed smartWage's contracts under their own brand.

**How it works:**

- A licensable JavaScript SDK wraps the ABI interactions and UI components.
- Partners pay a monthly integration fee or revenue share.
- The underlying contracts remain open source; the SDK convenience layer is the
  commercial product.

**Pricing model:** $500–2,000 / month per integration partner.

**Revenue path to $100K:** 5–10 integration partners.

---

### 5. Grants & Ecosystem Funding (non-dilutive)

While not a long-term business model, grants can fund 1–2 years of development,
buying time to build the user base needed for the above strategies.

Relevant programs:

| Program | Focus | Typical grant size |
|---|---|---|
| [Ethereum Foundation ESP](https://esp.ethereum.foundation) | Public goods on Ethereum | $10K–$100K |
| [Starknet Foundation](https://www.starknet.io/grants/) | Cairo / Starknet ecosystem | $10K–$250K |
| [Gitcoin Grants](https://grants.gitcoin.co) | Open-source web3 | Community-funded, variable |
| [Optimism RetroPGF](https://app.optimism.io/retropgf) | Retroactive public good rewards | Variable, past rounds $5K–$500K |
| [ENS Ecosystem Grants](https://ensgrants.xyz) | ENS-integrated tooling | $5K–$50K |

The ZK proof-of-employment angle is a strong narrative for both Ethereum Foundation
ESP and the Starknet Foundation, given the use of Cairo and STWO/stone-prover.

---

### 6. Donations & Sponsorships

- Add a **"Sponsor this project"** button on the GitHub repo (GitHub Sponsors).
- Add a transparent **treasury address** to the README and dApp footer.
- Reach out to crypto-native companies that pay their own staff in ETH and would
  benefit from on-chain payroll (they have an incentive to keep the project alive).

---

## Marketing Strategy

### Core Narrative

> *smartWage turns on-chain payroll into privacy-preserving proof of income — no
> bank statements, no payslips, just a cryptographic proof that says exactly what
> needs to be said and nothing more.*

This narrative resonates across two very different audiences:

1. **Crypto-native employers** (DAOs, remote-first Web3 startups) who already pay
   staff in ETH and need a structured, auditable payroll system.
2. **Employees and gig workers** who want portable, private, verifiable proof of
   income for financial services (mortgages, rentals, visas).

### Target Channels

| Channel | Tactic |
|---|---|
| **GitHub / OSS community** | Maintain excellent documentation, respond promptly to issues, publish a changelog |
| **Twitter / X** | Short threads explaining ZK proof-of-income with real use cases (mortgage, rental); dev updates |
| **Farcaster / Lens** | Crypto-native social; announce deployments, milestones, and grant wins |
| **ETH Global hackathons** | Build integrations as sponsor bounties; recruit contributors |
| **YouTube / Loom demos** | Short walkthroughs for employers and employees; reduces support burden |
| **Developer blogs (Mirror, Substack)** | Deep dives on Cairo ZK proofs, payroll architecture |
| **Cold outreach to HR fintech** | LinkedIn / email campaigns targeting product managers at target companies (see below) |

### Content Calendar (first 6 months)

| Month | Content focus |
|---|---|
| 1 | "Why on-chain payroll?" explainer; announce ZK proof-of-income beta |
| 2 | Tutorial: deploying EmployerPayroll for a small DAO |
| 3 | Technical deep-dive: how the Cairo minimum-income proof works |
| 4 | Case study: crypto-native team reduces payroll admin with smartWage |
| 5 | Announcement: employment duration and salary-range proofs shipped |
| 6 | "One year of smartWage" retrospective; open grant applications publicly |

---

## Target Companies

### Tier 1 — Crypto-Native Employers (immediate product-market fit)

These organisations already pay staff in ETH/stablecoins and need structured payroll.

| Company | Why they're a fit |
|---|---|
| **Gitcoin** | Pays contributors in crypto; already cares about on-chain transparency and public goods |
| **Uniswap Labs** | Large team, crypto-native, would benefit from verifiable on-chain payroll records |
| **Optimism / OP Labs** | Mission-aligned with public goods; active RetroPGF ecosystem |
| **ENS Labs** | Small team, crypto-first; a case study here would be highly visible |
| **Safe (formerly Gnosis Safe)** | Multisig treasury product; natural integration point for payroll disbursements |
| **Superfluid** | Real-time token streaming payroll; complementary/competing — partnership or integration angle |
| **Request Finance** | Crypto invoicing and payroll for DAOs — integration or white-label opportunity |
| **Bitwage** | Bitcoin/crypto payroll provider — potential white-label SDK customer |

### Tier 2 — DAO Tooling & Remote-Work Platforms

| Company | Why they're a fit |
|---|---|
| **Coordinape** | DAO contributor compensation; integrating verifiable payroll records adds value |
| **Llama** | DAO treasury management; payroll is a recurring treasury expenditure |
| **Utopia Labs** | DAO payroll and accounting; direct integration opportunity |
| **Metropolis (formerly Orca Protocol)** | DAO pod/team structure; payroll at the pod level |
| **Deel** | Global remote payroll; a crypto payroll module would differentiate their product |
| **Remote.com** | Similar to Deel — global employment + contractor payments in crypto |

### Tier 3 — Financial Services (ZK Proof Verifiers)

These companies would pay for the third-party verifier API — they want to verify
income without handling sensitive payslip documents.

| Company | Why they're a fit |
|---|---|
| **Better.com** | Digital mortgage lender; income verification is a core underwriting step |
| **Rocket Mortgage (Quicken Loans)** | Largest US mortgage originator; any friction reduction in income verification is valuable |
| **Avant / Upstart / LendingClub** | AI-driven consumer lenders; ZK income proofs fit their data-driven underwriting |
| **Zillow / Apartments.com** | Rental platforms that run tenant income screening |
| **Plaid** | Open banking / income verification API; could integrate or acquire a ZK proof layer |
| **Argyle** | Employment data API used in mortgage/lending underwriting — natural partnership or competitive angle |
| **Stripe** | Offers financial services (Stripe Capital, Stripe Identity); a ZK payroll integration fits their roadmap |

### Tier 4 — Government / Immigration / Background Checks

Longer sales cycles but higher contract values.

| Company / Body | Why they're a fit |
|---|---|
| **Checkr** | Background screening; employment verification is a core product |
| **Sterling** | Background screening for enterprises |
| **USCIS / Embassy portals** | Visa income requirements — ZK proofs could replace pay-stub packages |
| **HMRC (UK) / IRS (US) equivalents** | Tax compliance proofs — longer-term government technology angle |

---

## Path to $100K — Summary

The fastest, most realistic route to $100K/year given the current state of the
project:

1. **Apply for Ethereum Foundation ESP and Starknet grants** (potential $50–150K,
   non-dilutive, buys 12–18 months of runway while building the user base).
2. **Ship the ZK Proof-as-a-Service beta** (proving portal + pay-per-proof pricing)
   and market it to the Tier 1 crypto-native employer list above.
3. **Launch the managed keeper subscription** as a low-touch recurring revenue
   product alongside the ZK service.
4. **Pursue one Tier 3 verifier API partnership** (e.g., Argyle or Plaid) — a
   single enterprise API deal at $2K–5K/month crosses the $100K threshold on its
   own.

At maturity, a realistic steady-state revenue mix might look like:

| Stream | Annual revenue |
|---|---|
| ZK Proof-as-a-Service (employee + employer bundles) | $40K |
| Managed keeper subscriptions | $25K |
| Verifier API (1–2 partners) | $30K |
| Donations / Gitcoin | $5K |
| **Total** | **~$100K** |

---

## Open Questions

- Should the proving service be incorporated as a separate legal entity (Ltd / LLC)
  to cleanly separate the commercial layer from the open-source project?
- Would a token / governance model (e.g., a fee switch controlled by token holders)
  add value, or does it introduce unnecessary complexity?
- Is there appetite from the Tier 2 DAO tooling companies for a white-label
  integration deal, and if so, what would the minimum viable SDK look like?
- For the verifier API Tier 3 targets, what compliance requirements (SOC 2, GDPR,
  CCPA) would need to be met before they could adopt a third-party proof service?
