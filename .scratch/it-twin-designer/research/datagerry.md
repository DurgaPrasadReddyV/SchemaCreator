# DataGerry — Research Report

Compiled during charting from the GitHub repo, the docs site, and the source `requirements.txt`.

## 1. What DataGerry Is

DataGerry is an **enterprise-grade, open-source CMDB (Configuration Management Database) and Asset Management tool** with an integrated **ISMS** (Information Security Management System) module. Its defining philosophy: it "completely leaves the definition of a data model to the user" — there are no rigid predefined schemas. Users define their own object types (router, server, location, contract, IoT device, etc.) through a web frontend.

- **License:** GNU Affero General Public License v3.0 (**AGPL-3.0**) — 100% open source, no license fees, but the AGPL network clause is a real constraint for anyone embedding it in a hosted product.
- **Maintainer:** Becon GmbH, Germany. GitHub org `DataGerry`. Actively maintained — latest release **3.1.0 (Feb 2026)**, 42 total releases, ~170 stars, created April 2018.
- **Target users:** IT Service Management / CMDB teams, network management (IPAM, network/OT/IoT documentation), compliance & security teams (ISO 27001, NIS2, SIEM/XDR contexts), and non-IT use cases (medical devices, plant inventory, fleet, service inventory).
- **Editions:** Community Edition (free, self-host) and a EU-hosted cloud edition (adds multi-tenancy, premium features via license management).

## 2. Core Concepts / Domain Model

First-class entities (from the CMDB Concepts page):

| Entity | Role |
|---|---|
| **Object** | An instance representing a real-world asset (a specific router, server, building). Always based on a Type. The core unit of the system. |
| **Type** | The schema/definition of a kind of object. Defines the set of fields/attributes. Built in a 4-step wizard (see §5). The smallest valid Type = **one Section + one Field**. |
| **Category** | A grouping mechanism for Types/Objects (high-level classification). |
| **Section** | A container that groups fields inside a Type. Three kinds: **Section** (plain group), **Multi Data Section (MDS)** (saves multiple repeating value sets for the same fields), **Reference Section** (binds a section with fields of a referencing object). |
| **Field / Control** | An individual attribute on a Type. Always lives inside a Section. |
| **ObjectGroup / Person / PersonGroup** | Additional first-class entities for grouping objects and managing people. |
| **Section Template** | A reusable, pre-defined Section that can be dragged into multiple Type configurations. |
| **Relation Type** | The schema for an n:m relationship between Objects (see §4). |

**Field types** available when building a Type (the "Basic & Special Controls"):

| Control | Notes |
|---|---|
| Text | Regex validation possible |
| Number | Numeric field |
| Password | Password field with built-in generator and content hiding (sensitive value) |
| Textarea | Multi-line text |
| Checkbox | True/False |
| Radio | Single choice from options |
| Select | Dropdown selection |
| Date | Date picker |
| Reference | Reference to another Object of a specific Type (the 1:1 / single-target link primitive) |
| Location | Special field, only usable once per Type |

**How a user defines a new resource type:** via the Type creation wizard (Framework → Types → Add):
- **Step 1 — Basic Information:** Name (unique identifier), Label, Icon.
- **Step 2 — Content:** Drag-and-drop Sections and Fields onto the canvas. Fields must always sit inside a Section. This is where the schema is actually composed.
- **Step 3 — Meta (optional):** Summary fields (shown in object list views) and External Links.
- **Step 4 — ACL (optional):** Per-Type advanced permissions.

When a Type's schema later changes (fields/sections added/removed) and Objects of that Type already exist, the UI flags the Type as "Unclean" and the user runs a **"Clean"** function to propagate the schema change to all existing Objects — a manual migration step.

**Section Templates** (Framework → Section Templates) add reuse. Three template types:
- **Standard** — droppable multiple times into the same Type, editable after drop, changes don't affect existing instances; no live link back to the template.
- **Global** — droppable only once per Type, not editable after drop, and changes to the template propagate to all existing instances (deleting a Global template removes the section and its data from all Types/Objects — destructive).
- **Predefined** — shipped by DataGerry, not editable/deletable; users can clone them (clone becomes Standard or Global).

## 3. Architecture & Tech Stack

Note: the backend is **Flask**, not Django (despite the common assumption). Confirmed from the source `requirements.txt`.

- **Backend:** Python + **Flask 3.1.2** (WSGI via **gunicorn 25.1.0**, **Werkzeug**, **Jinja2**, **Flask-Cors**). Runs on port 4000. **No ORM** — data access is direct via **pymongo 4.16.0**. Validation is app-level via **Cerberus 1.3.8** (not DB-enforced). Auth via **Authlib** + **ldap3** + **pyOpenSSL**. AI features (document generator) use **openai** and **google-generativeai** SDKs. PDF/Excel export via **reportlab / xhtml2pdf / openpyxl / Pillow**. Config in an INI-style `cmdb.conf`; most runtime config is itself stored in MongoDB. Env overrides use the pattern `DATAGERRY_<section>_<option>` (e.g. `DATAGERRY_Database_port=27018`).
- **Database:** **MongoDB 7.0 or 8.0** only — a schema-free document store, which is what makes the user-defined data model possible. No PostgreSQL/SQL option.
- **Frontend:** **Angular / TypeScript** (TypeScript is 41.8% of the codebase; Python 41.6%; HTML 11.7%; SCSS 4.8%). Separate frontend image, served behind Nginx. Connects to backend via `app-config.json`.
- **Deployment:** Docker Compose (three containers: DataGerry, MongoDB, Nginx) is the recommended path; also RPM (RHEL/CentOS 9), DEB (Debian), or ZIP with a setup script (Ubuntu 22.04/24.04, systemd). Linux-only.
- **REST API:** A single **OpenAPI** specification, rendered through four viewers (Swagger UI, ReDoc, Spotlight Elements, RapiDoc). The overview page itself is just a hub — actual endpoints live in the spec. Auth via access tokens and identity providers. Webhooks for event-driven automation. There's a **Postman Collection** repo (`DataGerry/Postman-Collection`) and an integration platform called **OpenCelium** with connectors to 100+ applications (NetBox, Wazuh, ITSM/monitoring/IAM/SIEM).
- **Schema persistence:** Types and their field definitions are themselves stored as MongoDB documents (schema-as-data). Because there's no relational schema and no ORM, the "schema" is just nested documents; validation happens in the Flask layer with Cerberus.

## 4. Relations / Graph Modeling

DataGerry has two relationship primitives:

**a) Reference field** — a field type that points to one Object of a specific Type (a typed single-target link inside a Type's schema).

**b) n:m Relations** — the heavyweight relationship system. Key properties:
- **Typed:** constrained to specific parent Type × child Type combinations. A Relation Type is the schema for an n:m relationship (created via Framework → Relations → Add). You must specify at least one Allowed Parent Type and one Allowed Child Type; a single Type can appear in both lists.
- **Directed:** parent→child and child→parent each get their own human-readable label, icon, and color. Example: an Application linked to a Server via a "runs on" relation shows a "hosts" tab on the Server side.
- **Metadata-carrying:** a Relation Type can define optional custom fields/sections (status, purpose, notes) that are filled in per object-relation instance.
- **Bidirectional UI:** each saved relation appears as a tab on both Objects' detail views, with View/Edit/Copy/Delete/Add actions.

Concrete examples from docs: Servers↔Applications (deployment details), People↔Projects (roles/responsibilities), Devices↔Networks (usage context).

**CI Explorer (graph visualization):** an interactive, read-only graph viewer opened from any Object's detail view. Hierarchical layout — selected object centered, parents above, children below. Interactivity: click a node → side panel with object details; click an arrow → relationship breakdown; right-click context menu offers **Set as root node**, **Expand** (load next level), **Focus**. Exploration can continue "indefinitely" up/down the tree. Tools: zoom, Focus Mode (dims background), Minimap, and a **Profile Manager** that filters the graph by object types and relation types (saveable/switchable profiles). Use cases: dependency mapping, impact analysis, change/release planning, troubleshooting, security/audit.

**Storage/traversal:** relations are stored in MongoDB (no graph database). There is **no graph query language** — traversal is UI click-driven, one level at a time. Relations are not editable from within the CI Explorer.

## 5. The Schema / Type Builder UX

The Type builder is a **drag-and-drop wizard** (Framework → Types → Add), four steps:

1. **Basic Information** — Name (unique), Label, Icon.
2. **Content** — the actual schema canvas. Drag Sections (Section / MDS / Reference Section) and Fields (Text, Number, Password, Textarea, Checkbox, Radio, Select, Date, Reference, Location) from a palette. Fields must be placed inside a Section. Field ordering is by drag position. Text fields support regex validation; Password fields have a generator and content-hiding. Summary fields (Step 3) control which fields show in object list views.
3. **Meta** (optional) — summary fields and external links.
4. **ACL** (optional) — per-Type permission control.

Reuse is provided by **Section Templates**: a palette of pre-built sections you drag into a Type. Standard templates are flexible; Global templates propagate changes everywhere (and their deletion is destructive across all Types/Objects).

**Schema-change handling:** editing an in-use Type marks it "Unclean"; the user must explicitly run "Clean" to migrate existing Objects to the new schema. This is a deliberate but manual migration step — a friction point.

The docs note required flags, default values, and validation per field type (e.g. regex on Text) but the public docs pages do not give a complete per-field option matrix; the OpenAPI spec and the app itself are the source of truth for the full field-options schema.

## 6. Data Flow / Lineage

**DataGerry does NOT model data movement, data flow, pipelines, or lineage.** It is a **static asset/CI registry plus a dependency graph and an ISMS/compliance module.** What it offers:

- Static modeling of assets (Objects) and their typed relationships (References + n:m Relations).
- Dependency/impact visualization via the CI Explorer (which of your systems is affected if a component changes).
- Outbound **automations/exports** push asset data to external systems (monitoring, ticketing, DNS, backup, config management) and **webhooks** fire on events — but these are data-sync/notification mechanisms, not an internal model of data flowing between systems.
- The **OpenCelium** integration platform connects DataGerry to 100+ external apps, again for synchronization, not for modeling pipelines.

There is **no data-flow simulation, no lineage tracking, no pipeline/DAG concept, and no "data moved from system A to system B" modeling.** A browser-based reimagining focused on data flow/lineage would be filling a gap DataGerry explicitly does not cover.

## 7. Limitations / Friction (opportunities for a browser-only reimagining)

- **Heavy server install.** Real deployment needs MongoDB + a Python/Flask backend + an Angular frontend + Nginx, on Linux. There is no in-browser, zero-install, or single-file mode. A browser-only app (local IndexedDB / OPFS / SQLite-WASM / exported JSON) would remove this barrier entirely for individual users.
- **AGPL-3.0** is restrictive for anyone wanting to embed or repackage; a fresh project could choose a permissive license.
- **Two-language split** (Python/Flask + Angular/TypeScript) raises the contribution and build barrier; a single-language, browser-only stack is simpler.
- **No offline / local-only mode** — every action round-trips to the Flask/Mongo backend.
- **CI Explorer is read-only** — you cannot create or edit relationships directly in the graph; you must leave the explorer and use the object detail tabs. A reimagining could make the graph a first-class editing surface.
- **No graph query / traversal language** — exploration is manual, one level at a time, via clicks. Programmatic traversal requires custom MongoDB queries against the relation store.
- **Manual "Clean" migration step** when a Type's schema changes — schema evolution is not automatic and can leave objects in an "unclean" state until the user acts. A reimagining could auto-migrate or version schemas.
- **Global Section Template deletion is destructive** across all Types/Objects — a sharp edge that a fresh design could soften with versioning/soft-delete.
- **n:m relations require a predefined Relation Type schema** before you can link anything — heavier than ad-hoc/typed-on-the-fly linking. A browser app could let users link first and infer/define the relation type as they go.
- **No data-flow / lineage modeling** at all (per §6) — a clear greenfield opportunity.
- **Validation is app-level only (Cerberus)** because MongoDB is schema-free; there's no DB-level integrity guarantee. A browser app using SQLite-WASM or a typed store could enforce schema at the storage layer.
- **Documentation gaps:** no dedicated architecture page, no published field-options matrix, and the REST API overview page is just a redirect to OpenAPI viewers — you have to read the spec to learn the endpoints. Single-field option docs (required/default/validation) are incomplete in the public docs.
- **Multi-tenancy is cloud-only**, and premium features are gated behind license management — friction for self-hosters who want those features.

## Sources

- GitHub repo (main): https://github.com/DATAGerry/DATAGerry
- GitHub org: https://github.com/DataGerry (also Docker repo `DataGerry/DataGerry-docker` and `DataGerry/Postman-Collection`)
- Docs site root: https://docs.datagerry.com/en/latest/
- CMDB Concepts (Types, Objects, Categories, Sections, Fields): https://docs.datagerry.com/en/latest/usage/cmdb_concepts.html
- Section Templates: https://docs.datagerry.com/en/latest/usage/section_templates.html
- Multi Data Sections: https://docs.datagerry.com/en/latest/usage/multi_data_sections.html
- n:m Relations: https://docs.datagerry.com/en/latest/usage/n_m_relations.html
- CI Explorer: https://docs.datagerry.com/en/latest/usage/ci_explorer.html
- Installation / requirements (MongoDB 7.0/8.0, port 4000, `cmdb.conf`, env overrides): https://docs.datagerry.com/en/latest/getting_started/dg_installation.html
- Docker images (frontend/backend): https://docs.datagerry.com/en/latest/sources/docker.html
- REST API overview (links to Swagger/ReDoc/Spotlight/RapiDoc): https://docs.datagerry.com/en/latest/rest_api/overview.html
- Product / features marketing: https://datagerry.com/en/features/ and https://datagerry.com
- Source `requirements.txt` (confirms Flask 3.1.2, pymongo 4.16.0, Cerberus, gunicorn, Jinja2, openai, google-generativeai, ldap3, reportlab, openpyxl): https://raw.githubusercontent.com/DATAGerry/DATAGerry/master/requirements.txt