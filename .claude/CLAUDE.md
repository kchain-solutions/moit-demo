# CLAUDE.md - Trade Corridor Demo

## Project Overview

Corridor-agnostic two-node trade corridor simulation (Alpha = Export, Beta = Import) with Express backend, React SPA frontend, WebSocket P2P peering. All corridor-specific data (orgs, documents, geography, branding) is driven by a JSON config in `configs/`. Demonstrates DID registration, document notarization, consignment management, permission control, and trade finance. Default config: `configs/vietnam-us.json`.

## Commands

```bash
npm run demo          # Start both nodes + proxy (ports 4000, 4001, 4002)
npm run build         # Build React client (Vite)
npm run dev           # Dev mode with hot reload

# Individual nodes
node server/index.js --port=4000 --ws=4010 --id=alpha --name="Node Alpha" --peer=ws://localhost:4011
node server/index.js --port=4001 --ws=4011 --id=beta --name="Node Beta" --peer=ws://localhost:4010
```

## Tech Stack

- **Backend:** Node.js 22, Express, WebSocket (`ws`), PDFKit
- **Frontend:** React 18, Vite, lucide-react icons, react-simple-maps
- **Styling:** Single CSS file (`client/src/index.css`), CSS custom properties
- **Deployment:** Docker Compose with Traefik reverse proxy

## Project Structure

```
server/
  index.js            # Main server (Express + WebSocket + in-memory store)
  proxy.js            # Cookie-based routing proxy (port 4002)
client/
  src/
    App.jsx           # Root component with sidebar navigation
    context/
      NodeContext.jsx  # Auth + WebSocket state management
    components/
      Login.jsx       # Login + quick sign-in
      Dashboard.jsx   # Stats, recent consignments, activity feed
      Consignments.jsx # Full consignment management
      Network.jsx     # Geographic trade network map
      TradeFinance.jsx # Letters of credit + smart contracts
      Identity.jsx    # DID registration + credential validation
      Permissions.jsx # Access control matrix
      Payments.jsx    # Payment tracking
      LedgerExplorer.jsx # Immutable ledger event log
    data/
      countries.js    # Geographic data for map rendering
    utils/
      api.js          # REST API client
  public/
    vietnam.png       # Corridor logo (config-driven)
configs/              # Corridor configuration files (Phase 1+)
docs/                 # Internal documentation
docker-compose.yml
Dockerfile
```

## Coding Conventions

- Functional React components (no classes)
- CSS custom properties for theming (`:root` variables in `index.css`)
- No TypeScript (plain JSX)
- Express routes in single `server/index.js` (monolith, to be refactored)
- WebSocket messages are JSON with `type` field for routing

---

## Task Management

### File Structure

```
.claude/
  board.md              # Read-only index (regenerated from task files)
  tasks/
    backlog/            # Tasks not yet started
      T-101.md
      T-102.md
      ...
    in-progress/        # Tasks currently being worked on
    done/               # Completed tasks
      T-121.md
      T-122.md
      ...
    blocked/            # Tasks that cannot proceed (reason in Notes)
    cancelled/          # Tasks removed from scope
```

- **`.claude/tasks/{status}/{id}.md`** is the source of truth for each task. The folder determines the task status.
- **`.claude/board.md`** is a summary index with links to task files. Regenerate it with `node scripts/regen-board.cjs`.
- Agents move task files between status folders to update status (e.g., `mv tasks/backlog/T-101.md tasks/in-progress/`).
- Agents edit **only their assigned task file**, never the board or other agents' task files. This enables safe parallel development.

### Task File Format

```markdown
# T-101 | Create JSON Schema for demo config

- **Status:** backlog
- **Phase:** 1
- **Priority:** P0
- **Category:** config
- **Effort:** M
- **Dependencies:** none
- **Branch:** feat/T-101-config-schema
- **Assignee:** Valerio Mellini
- **Notes:** (optional, used for blockers or context)
- **Section:** 1A. Configuration Schema and Infrastructure

## Description

Author `configs/demo-config.schema.json` with all constraints...
```

### Task Statuses

| Status | Meaning |
|--------|---------|
| `backlog` | Task defined but not started. No branch created yet. |
| `in_progress` | Work has begun. A feature branch exists. |
| `blocked` | Work started but cannot continue. Reason documented in task notes. |
| `done` | Work complete. Feature branch merged into `develop` and deleted. |

### Task Lifecycle

```
backlog/ --> in-progress/ --> done/
                  |
                  v
             blocked/ --> in-progress/ --> done/

             cancelled/  (removed from scope)
```

1. **Pick a task from backlog/:** Choose the highest-priority unblocked task. Check that all dependencies are in `done/`.
2. **Move to `in-progress/`:** Move the file from `tasks/backlog/` to `tasks/in-progress/`. Update Status, Branch, Assignee inside the file.
3. **Create a feature branch:** Branch from `develop` using the task ID (see Git Workflow below).
4. **Do the work:** Implement, test, commit to the feature branch.
5. **Move to `done/`:** Move the file from `tasks/in-progress/` to `tasks/done/`. Update Status to `Done`. Merge the feature branch into `develop`. Delete the feature branch.
6. **If blocked:** Move to `tasks/blocked/`, set Status to `Blocked`, document the reason in the Notes field. Pick another task.
7. **If cancelled:** Move to `tasks/cancelled/`, set Status to `Cancelled`, document the reason in the Notes field.

### Parallel Development

Multiple agents can work on independent tasks simultaneously. Each agent:
1. Claims a task by moving it from `tasks/backlog/` to `tasks/in-progress/` and setting `Assignee` in the task file.
2. Works on its own feature branch (e.g., `feat/T-101-config-schema`).
3. Only edits its own task file. Never touches other task files.
4. Merges to `develop` when done, moves its task file to `tasks/done/`.

**Conflict avoidance:**
- Each agent edits exactly ONE file (its own task).
- The board index is regenerated on demand, not during parallel work.
- Feature branches are independent; merge conflicts (if any) happen only at `develop` merge time.
- Before starting, verify dependencies by checking that required tasks exist in `tasks/done/`.

### Rules

- Only ONE task should be `in_progress` at a time (per agent/developer).
- Always check dependencies before starting a task. All listed dependencies must be `done`.
- When a task is moved to `done`, immediately update its `.claude/tasks/{id}.md` before doing anything else.
- When blocked, always document WHY in the Notes field.
- Work order follows Priority and Dependencies, not file order.
- After a batch of task updates, regenerate board: `node scripts/regen-board.cjs`.

---

## Git Workflow

### Branch Model

```
main          stable releases, tagged versions
  └── develop     integration branch, all features merge here
        └── feat/T-101-config-schema    feature branches per task
        └── feat/T-102-vietnam-config
        └── fix/T-XXX-description       bugfix branches
```

### Feature Branch Flow

1. **Start work on a task:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/T-101-config-schema
   ```

2. **Work and commit:**
   ```bash
   git add <files>
   git commit -m "feat(config): create JSON Schema for demo config"
   ```

3. **Complete the task (merge to develop):**
   ```bash
   git checkout develop
   git pull origin develop
   git merge --no-ff feat/T-101-config-schema
   git push origin develop
   git branch -d feat/T-101-config-schema
   git push origin --delete feat/T-101-config-schema
   ```

### Branch Naming

- Features: `feat/T-{id}-{short-description}`
- Bugfixes: `fix/T-{id}-{short-description}`
- Examples: `feat/T-101-config-schema`, `fix/T-120-hex-color-replace`

### Commit Messages

Use conventional commits:

```
feat(scope): description      # New feature
fix(scope): description       # Bug fix
refactor(scope): description  # Code restructuring
docs(scope): description      # Documentation
test(scope): description      # Tests
chore(scope): description     # Tooling, config, dependencies
```

Scopes: `config`, `server`, `frontend`, `mobile`, `theming`, `adapter`, `infra`, `docs`

### Releases (merge to main)

When a set of features on `develop` is ready for release:

1. **Merge develop into main:**
   ```bash
   git checkout main
   git pull origin main
   git merge --no-ff develop
   ```

2. **Create a tag:**
   ```bash
   git tag -a v{X.Y.Z} -m "Release v{X.Y.Z}: short description"
   git push origin main --tags
   ```

3. **Update CHANGELOG.md:** Add a new section at the top with the version, date, and list of changes grouped by type (Added, Changed, Fixed, Removed).

### Version Numbering

- **Major (X):** Breaking changes, phase completion (e.g., v1.0.0 = Phase 1 complete)
- **Minor (Y):** New features within a phase
- **Patch (Z):** Bug fixes, small improvements

### Rules

- NEVER commit directly to `main`. Always merge from `develop`.
- NEVER commit directly to `develop`. Always merge from a feature branch.
- NEVER force push to `main` or `develop`.
- NEVER use `--no-verify` to skip hooks.
- NEVER sign commits with `Co-Authored-By`. No co-author lines in commit messages.
- Every merge to `main` MUST have a tag and CHANGELOG entry.
- Feature branches are deleted after merge. Do not keep stale branches.
- Use `--no-ff` for all merges to preserve branch history.

---

## Architecture References

- **Evolution Plan:** `docs/technical/partners/twin-vietnam/demo-evolution-plan.md` (in parent kchain-website repo)
- **Integration Analysis:** `docs/technical/partners/twin-vietnam/twin-vietnam-integration-analysis.md` (in parent repo)
- **Topology Tracker:** `docs/technical/partners/twin-vietnam/topology-tracker.md` (in parent repo)

## Key Constants

- Alpha port: 4000, WS: 4010
- Beta port: 4001, WS: 4011
- Proxy port: 4002
- All passwords in demo mode: `demo`
- Node identity determined by `--id` flag or `?node=` query parameter
