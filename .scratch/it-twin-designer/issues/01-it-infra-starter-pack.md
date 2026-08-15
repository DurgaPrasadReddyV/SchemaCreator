# 01 — IT-infra starter pack: Types, fields, canonical access relations, capability flags, and classification vocabulary

Type: grilling
Status: resolved
Blocked by:

## Question

Define exactly what ships in the seeded **IT-infra starter pack** — the pre-built Types and relation types that let a user model the SSN-column-to-user access chain out of the box, plus the vocabularies the reachability engine and badges depend on. This is the foundation ticket: tickets 03 (visualization) and 04 (architecture) both depend on knowing the entity/relation/capability shape.

Resolve, with the user (grilling; may produce a prototype draft of the starter-pack definition):

1. **Entity Types** to seed and their **Sections + Fields**. Candidate set: `Database`, `Table`, `Column`, `DatabaseUser`, `Role`, `SqlLogin`, `WebService` (with a Data Layer section), `ApiEndpoint`, `UiApp`, `User` (human at PC), and possibly `MessageQueue`. For each: which Sections, which Fields (incl. the `classification` + `data-category` fields on `Column`), required flags, icons, labels.
2. **Canonical access relation types** — the typed, directed edges with a "propagates reachability" flag. Worked example to cover fully: `Column <-accesses- DatabaseUser`, `DatabaseUser <-mapsTo- SqlLogin`, `SqlLogin <-usedAsServiceAccountBy- WebService`, `WebService -exposes-> ApiEndpoint`, `ApiEndpoint -returns-> Column/Table`, `UiApp -calls-> ApiEndpoint`, `User -uses-> UiApp`. Decide the exact set, their parent/child Type constraints, direction labels (parent→child and child→parent human names), and which propagate reachability.
3. **Capability-flag set** — the per-node protections shown as badges: masking, encryption, tokenization, logging/audit, access-control, etc. Decide the vocabulary and whether flags live on object Types, on relation types, or both.
4. **Classification + data-category vocabulary** — confirm the classification levels (Public / Internal / Confidential / Restricted) and the data-category tag set (SSN, Email, CreditCard, Phone, Address, …), and how a field declares them.

A worked, end-to-end instance (the SSN example: one `Customer.SSN` column reachable by a database user, a SQL login, a web service service account, an API endpoint, a UI app, and a human user) should be expressible entirely with starter-pack Types and relations — use it as the acceptance check.

Assets: link any prototype starter-pack definition (e.g. `research/starter-pack-draft.md` or JSON) from the resolution.

## Answer

Full definition: [`research/starter-pack-draft.md`](../research/starter-pack-draft.md). Decided via grilling (no prototype needed — the model was fully specified in conversation). Summary:

1. **Entity Types — 11** (Server added for real topology): `Server`, `Database`, `Table`, `Column`, `DatabaseUser`, `Role`, `SqlLogin`, `WebService` (with Data Layer section), `ApiEndpoint`, `UiApp`, `User`. Each has an `Identity` section (`name` + `description`) + `Security`/`Classification` sections; `Column` alone carries `classification` + `dataCategory`. Full Sections/Fields in the asset.

2. **Relation types — 9:** `contains` (structural, parent→child, **non-propagating**); `accesses`, `memberOf`, `mapsTo`, `usedAsServiceAccountBy`, `exposes`, `returns`, `calls`, `uses` (all propagating). Orientations, labels, and `contains` parent→child pairs in the asset.

3. **Reachability rule:** all access edges traverse bidirectionally **except `memberOf`**, which is mode-dependent — `DatabaseUser→Role` in user→what, `Role→DatabaseUser` in data→who (avoids the false "role reaches via member's direct grant"). Plus **descendant-flood-on-access**: reaching a node via `accesses` floods reachability down its `contains` subtree (access a Table ⇒ reach its Columns). `contains` alone never propagates.

4. **Capability flags — 14** (`masking`, `encryption-at-rest`, `tokenization`, `hashing`, `row-level-security`, `tls`, `mtls`, `mfa`, `auth-required`, `rbac`, `sso`, `vpn-required`, `audit-logging`, `rate-limiting`); live on **nodes and edges** (nodes default); **purely annotate** — never remove a node from the reachable set. User-extensible.

5. **Classification** — 4-tier (Public/Internal/Confidential/Restricted), single-select, optional (default Unclassified), Column-only, no propagation. **Reachability roots = non-Public or tagged fields.** **Data-categories — 14** (`SSN`, `NationalID`, `PassportNumber`, `Email`, `Phone`, `Address`, `FullName`, `DateOfBirth`, `CreditCard`, `BankAccount`, `Salary`, `HealthData`, `IPAddress`, `Credentials`), each carrying **implied default classification + recommended capabilities** applied on tag, overridable.

6. **Acceptance check — SSN example passes:** fully expressible with the 11 Types + 9 relations; both reachability directions (data→who, user→what) resolve correctly; the `memberOf` mode-dependent rule and descendant-flood-on-access fire as designed; capability badges annotate the path (mfa+vpn+sso / tls+auth+rate-limit / masking+encryption+audit). ✓

**Unblocks:** tickets 03 (visualization), 04 (architecture), 05 (UI structure) — all were blocked on the entity/relation/capability shape now decided.