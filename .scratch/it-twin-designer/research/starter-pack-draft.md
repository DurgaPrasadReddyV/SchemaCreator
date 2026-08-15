# IT-infra starter pack (decided)

> Resolution asset for ticket **01 — IT-infra starter pack**. Decided via grilling; this is the canonical definition of what ships pre-built. The build is a separate, later effort.

## Conventions

- A **Type** = Sections + Fields (DataGerry-style). Field types: `text`, `enum`, `multi-tag`, `boolean`, `number`, `ref`.
- **Every Type has an `Identity` section** with `name` (required — the node label) + `description` (optional).
- **Links are edges, not fields.** Containment and access are relation instances (see Relations); a Type's fields are its own attributes only.
- **`capabilities`** is a multi-select field (vocabulary in §Capability flags); present on every Type for uniformity, pruned where it doesn't apply.
- Default icons (final styling in tickets 03/05): Server→server, Database→database, Table→grid, Column→bar, DatabaseUser→user-circle, Role→shield, SqlLogin→key, WebService→cloud, ApiEndpoint→link, UiApp→app-window, User→user.

## 1. Entity Types (11)

### Data / topology
| Type | Sections → Fields |
|---|---|
| `Server` | Identity: `name`, `host`, `instance?`, `environment` (Prod/Dev/Test), `serverType` (MSSQL/Postgres/MySQL/Oracle/Other), `description` · Security: `capabilities` |
| `Database` | Identity: `name`, `description` · Security: `capabilities` |
| `Table` | Identity: `name`, `schema` (dbo), `description` · Security: `capabilities` |
| `Column` | Identity: `name`, `dataType`, `nullable`, `isPartOfKey?`, `description` · **Classification**: `classification` (enum, optional), `dataCategory` (multi-tag) · Security: `capabilities` |

`Column` is the only Type carrying classification + data-category (sensitivity is field-level).

### DB principals
| Type | Sections → Fields |
|---|---|
| `DatabaseUser` | Identity: `name`, `description` · Security: `capabilities` |
| `Role` | Identity: `name`, `roleType` (standard/custom), `description` · Security: `capabilities` |
| `SqlLogin` | Identity: `name`, `loginType` (SQL/Windows/AzureAD), `description` · Security: `capabilities` |

### Service / exposure
| Type | Sections → Fields |
|---|---|
| `WebService` | Identity: `name`, `technology`, `description` · **Data Layer**: `dataAccessMode` (direct-SQL/ORM/stored-proc), `description` · Security: `capabilities` |
| `ApiEndpoint` | Identity: `name`, `httpMethod`, `path`, `description` · Security: `capabilities` |

### Consumption
| Type | Sections → Fields |
|---|---|
| `UiApp` | Identity: `name`, `technology`, `description` · Security: `capabilities` |
| `User` | Identity: `name`, `username`, `email`, `department`, `businessRole`, `description` · Security: `capabilities` |

## 2. Relation types (9)

Orientation = natural/semantic `from→to`. Both human labels given. `propagates` = whether the reachability engine uses the edge.

| # | Relation | from → to | Labels (from→to / to←from) | propagates |
|---|---|---|---|---|
| 1 | `contains` | parent → child (see pairs below) | "contains" / "contained in" | **No** (structural) |
| 2 | `accesses` | (DatabaseUser \| Role) → (Table \| Column) | "accesses" / "accessed by" | Yes |
| 3 | `memberOf` | DatabaseUser → Role | "member of" / "has member" | Yes |
| 4 | `mapsTo` | DatabaseUser → SqlLogin | "maps to" / "mapped by" | Yes |
| 5 | `usedAsServiceAccountBy` | WebService → SqlLogin | "uses service account" / "service account of" | Yes |
| 6 | `exposes` | WebService → ApiEndpoint | "exposes" / "exposed by" | Yes |
| 7 | `returns` | ApiEndpoint → (Column \| Table) | "returns" / "returned by" | Yes |
| 8 | `calls` | UiApp → ApiEndpoint | "calls" / "called by" | Yes |
| 9 | `uses` | User → UiApp | "uses" / "used by" | Yes |

**`contains` parent→child pairs (type constraints):** Server→Database, Server→SqlLogin, Database→Table, Database→DatabaseUser, Database→Role, Table→Column.

### Reachability-direction rules

- **All access edges (2–9) traverse bidirectionally**, with **one exception — `memberOf`**.
- **`memberOf` is mode-dependent** (one-way role→member privilege inheritance; members inherit a role's grants, a role does not inherit a member's *direct* grants):
  - **user→what** ("what can this user reach"): traverse `DatabaseUser → Role` (collect the user's roles, then their `accesses`).
  - **data→who** ("who can reach this data"): traverse `Role → DatabaseUser` (find a role's members).
  - Never the reverse in each mode. This is the "mode-specific adjacency" from the architecture research (ticket 02); it avoids the false positive of marking a role as reaching data that a member accesses only via a direct grant.
- **Container→contents ("descendant flood on access"):** `contains` never propagates on its own, but reaching a node via an `accesses` edge floods reachability down its `contains` subtree — `accesses` a Table ⇒ reaches all its Columns; `accesses` a Database ⇒ reaches all its Tables and their Columns. The flood is gated on arriving via an access edge.

## 3. Capability flags

**Where they live:** flags attach to **both nodes and edges**; nodes are the default home. Each flag definition carries a *default* home (node Type), not a hard constraint. Both render as badges.

**Semantics:** flags **purely annotate** — they never remove a node from the reachable set. Reachability is pure graph traversal; flags are surfaced as badges on reachable nodes/edges so the human judges whether a protection mitigates the exposure.

**Vocabulary (14, extensible):**

| Domain | Flag | Default home (node Types) | Meaning |
|---|---|---|---|
| Data-at-rest | `masking` | Column | dynamic data masking applied |
| | `encryption-at-rest` | Server, Database, Table, Column | encrypted where stored |
| | `tokenization` | Column | stored as a reversible token |
| | `hashing` | Column | one-way hashed |
| | `row-level-security` | Table, Database | RLS filters rows by principal |
| In-transit | `tls` | WebService, ApiEndpoint | TLS/HTTPS enforced |
| | `mtls` | WebService, ApiEndpoint, *(edge: `calls`/`accesses`)* | mutual TLS |
| Access control / authn | `mfa` | SqlLogin, User, UiApp | multi-factor required |
| | `auth-required` | ApiEndpoint | authenticated callers only |
| | `rbac` | Role, ApiEndpoint, WebService | role-based access enforced |
| | `sso` | UiApp, User | single sign-on integrated |
| | `vpn-required` | User, UiApp | VPN required to reach |
| Observability | `audit-logging` | any node or edge | access is audit-logged |
| | `rate-limiting` | ApiEndpoint | calls rate-limited |

Users can add their own flag (id + label + badge style + default home) in the schema builder.

## 4. Classification + data-category

### Classification (field-level, Column-only)
| Level | Rank | Color cue |
|---|---|---|
| `Public` | 0 (lowest) | green |
| `Internal` | 1 | blue |
| `Confidential` | 2 | amber |
| `Restricted` | 3 (highest) | red |

- `classification` is **single-select, optional**, default `Unclassified` (null).
- **Reachability roots = fields with a non-`Public` classification OR any `dataCategory` tag.** `Public`/`Unclassified`/untagged fields are not offered as query roots.
- Classification does **not** propagate up/down `contains`.

### Data-category vocabulary (14, multi-tag, extensible)
`SSN` · `NationalID` · `PassportNumber` · `Email` · `Phone` · `Address` · `FullName` · `DateOfBirth` · `CreditCard` · `BankAccount` · `Salary` · `HealthData` · `IPAddress` · `Credentials`

### Implied defaults (applied on tag, overridable)
Each category carries a default classification + recommended capabilities, applied as defaults when the tag is added.

| Category | Default classification | Recommended capabilities |
|---|---|---|
| SSN, CreditCard, BankAccount, Credentials, PassportNumber, NationalID | Restricted | masking, encryption-at-rest, audit-logging |
| Salary, HealthData, DateOfBirth | Confidential | masking, audit-logging |
| Email, Phone, Address, FullName, IPAddress | Internal | audit-logging |

### Declaration
On the `Column` Type's `Classification` section: `classification` (single enum) + `dataCategory` (multi-tag). No other Type declares sensitivity.

## 5. Acceptance check — the SSN example (fully expressible)

**Objects:** `PROD-SQL-01` (Server, caps: encryption-at-rest) ▸ `CustomerDB` (Database, caps: encryption-at-rest/audit-logging) ▸ `Customer` (Table, caps: row-level-security) ▸ `Customer.SSN` (Column, classification=Restricted, dataCategory=[SSN], caps: masking/encryption-at-rest/audit-logging); `app_reader` (DatabaseUser) ▸ `db_datareader` (Role, caps: rbac/audit-logging); `svc_customer_api` (SqlLogin, caps: mfa); `customer-api` (WebService, caps: tls/audit-logging); `GET /api/customers` (ApiEndpoint, caps: auth-required/rate-limiting/audit-logging); `customer-portal` (UiApp, caps: sso/tls); `Jane Doe` (User, caps: mfa/vpn-required/sso).

**Relations:** contains(PROD-SQL-01→CustomerDB→Customer→Customer.SSN; CustomerDB→app_reader; CustomerDB→db_datareader; PROD-SQL-01→svc_customer_api); accesses(app_reader→Customer; db_datareader→Customer); memberOf(app_reader→db_datareader); mapsTo(app_reader→svc_customer_api); usedAsServiceAccountBy(customer-api→svc_customer_api); exposes(customer-api→GET /api/customers); returns(GET /api/customers→Customer.SSN); calls(customer-portal→GET /api/customers); uses(Jane Doe→customer-portal).

**Trace A — "who can reach Customer.SSN?" (data→outward):**
`SSN` ←returns← `GET /api/customers` ←exposes← `customer-api` ←usedAsServiceAccountBy← `svc_customer_api` ←mapsTo← `app_reader` ←memberOf← `db_datareader` (which accesses Customer→SSN); and `GET /api/customers` ←calls← `customer-portal` ←uses← **`Jane Doe`**. Also `app_reader` accesses Customer→SSN directly. **Jane reaches SSN.** ✓

**Trace B — "what can Jane Doe reach?" (user→outward):**
`Jane Doe` →uses→ `customer-portal` →calls→ `GET /api/customers` →returns→ **`Customer.SSN`**; and →exposes→ `customer-api` →usedAsServiceAccountBy→ `svc_customer_api` →mapsTo→ `app_reader` →accesses→ `Customer` (→flood→ SSN + siblings); →memberOf→ `db_datareader` →accesses→ `Customer`. **Jane reaches SSN and the rest of Customer's columns.** ✓

**Capability badges along the path:** mfa+vpn-required+sso (Jane) · tls+auth-required+rate-limiting (endpoint) · masking+encryption-at-rest+audit-logging (column) — exposure judged mitigated; reachability unaltered. ✓