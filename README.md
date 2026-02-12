# MyBlock — Universal Youth Credential Schema

A shared credential ledger where:

- Any approved issuer (school, nonprofit, rec center, workforce program) can award digital micro-credentials
- Teens can store and present credentials as proof of skills
- Employers and mentors can verify authenticity without needing to call the issuer

**No crypto. No coins. No speculation.** Just a straightforward database and API.

## How It Works

```
  Issuer (school, nonprofit, etc.)
       |
       | awards credential
       v
  Credential Ledger (SQLite DB)
       |
       |--- Youth sees their "wallet" (list of earned credentials)
       |
       |--- Employer/Mentor verifies by code (GET /api/verify/ABC123)
```

### The Four Core Entities

| Entity | What it is |
|---|---|
| **Issuer** | An organization approved to award credentials (school, nonprofit, rec center, workforce program) |
| **Youth** | A teen participant who earns and holds credentials |
| **Credential Definition** | A template describing what can be awarded (e.g. "CPR Certified", "Web Dev Fundamentals") |
| **Credential** | An actual awarded credential — links a youth to a definition, with a unique verification code |

## Quick Start

```bash
# Install dependencies
npm install

# Seed the database with example data
npm run seed

# Start the API server
npm start
# => MyBlock Credential API running on port 3000
```

## API Endpoints

### Issuers

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/issuers` | Register a new issuer (starts as "pending") |
| `GET` | `/api/issuers` | List all issuers (filter: `?status=approved`) |
| `GET` | `/api/issuers/:id` | Get a single issuer |
| `POST` | `/api/issuers/:id/approve` | Approve a pending issuer |
| `POST` | `/api/issuers/:id/suspend` | Suspend an approved issuer |
| `POST` | `/api/issuers/:id/revoke` | Revoke an issuer |

### Youth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/youth` | Register a new youth participant |
| `GET` | `/api/youth` | List all youth |
| `GET` | `/api/youth/:id` | Get a youth profile |
| `PATCH` | `/api/youth/:id` | Update a youth profile |
| `GET` | `/api/youth/:id/wallet` | Get active credentials (the "wallet") |
| `GET` | `/api/youth/:id/credentials` | Full credential history |

### Credentials

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/credentials/definitions` | Create a credential definition |
| `GET` | `/api/credentials/definitions` | List definitions (filter: `?issuer_id=...`) |
| `GET` | `/api/credentials/definitions/:id` | Get a single definition |
| `POST` | `/api/credentials` | Issue a credential to a youth |
| `GET` | `/api/credentials/:id` | Get a credential by ID |
| `POST` | `/api/credentials/:id/revoke` | Revoke a credential |

### Verification (Public)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/verify/:code` | Verify a credential by its 8-character code |

## Example: Full Workflow

```bash
# 1. Register an issuer
curl -X POST http://localhost:3000/api/issuers \
  -H "Content-Type: application/json" \
  -d '{"name": "Code4Youth", "type": "nonprofit", "contact_email": "hello@code4youth.org"}'

# 2. Approve the issuer (returns the issuer with status: "approved")
curl -X POST http://localhost:3000/api/issuers/<ISSUER_ID>/approve \
  -H "Content-Type: application/json" \
  -d '{"approved_by": "city_admin"}'

# 3. Register a youth
curl -X POST http://localhost:3000/api/youth \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Maria", "last_name": "Garcia", "date_of_birth": "2008-03-15"}'

# 4. Create a credential definition
curl -X POST http://localhost:3000/api/credentials/definitions \
  -H "Content-Type: application/json" \
  -d '{"issuer_id": "<ISSUER_ID>", "name": "Web Dev Fundamentals", "category": "skill", "hours_required": 40}'

# 5. Issue the credential
curl -X POST http://localhost:3000/api/credentials \
  -H "Content-Type: application/json" \
  -d '{"credential_def_id": "<DEF_ID>", "issuer_id": "<ISSUER_ID>", "youth_id": "<YOUTH_ID>"}'

# 6. Verify (anyone can do this — no auth needed)
curl http://localhost:3000/api/verify/DFDFEF11
```

## Credential Categories

| Category | Use case |
|---|---|
| `skill` | Learned a specific skill (coding, carpentry, etc.) |
| `completion` | Finished a program or course |
| `certification` | Passed a formal certification (CPR, food safety, etc.) |
| `badge` | Earned a digital badge for demonstrated competency |
| `hours` | Completed a certain number of service/work hours |
| `other` | Anything that doesn't fit the above |

## Issuer Types

`school` | `nonprofit` | `rec_center` | `workforce_program` | `government` | `other`

## Project Structure

```
src/
  index.js                  # Express server entry point
  db.js                     # SQLite setup and schema
  seed.js                   # Example data seeder
  models/
    issuer.js               # Issuer CRUD + approval workflow
    youth.js                # Youth CRUD
    credentialDefinition.js # Credential template CRUD
    credential.js           # Issue, verify, revoke credentials
  routes/
    issuers.js              # /api/issuers routes
    youth.js                # /api/youth routes
    credentials.js          # /api/credentials routes
    verify.js               # /api/verify (public)
```

## Design Decisions

- **SQLite** — zero-config, single-file database. Easy to deploy, back up, and inspect. Swap to Postgres when you need to scale.
- **Verification codes** — 8-character hex codes that are easy to type, share on paper, or put on a resume. Employers hit one GET endpoint to verify.
- **Issuer approval workflow** — issuers start as "pending" and must be approved before they can issue credentials. Prevents unauthorized orgs from minting credentials.
- **No auth layer included** — this is the schema and business logic layer. Add your own auth (API keys, OAuth, etc.) on top based on your deployment needs.
- **No blockchain** — a regular database with proper access controls is simpler, faster, and more appropriate for this use case.
