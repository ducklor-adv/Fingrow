# Prompt for Claude Code — Build Real Admin Earnings (#earnings-content) & Wire ACF to Real Registration

You are **Claude Code** acting as a **full‑stack engineer** for the Fingrow V3 system. Implement the following by **modifying the real codebase** (not the mock). The blueprint file `FINGROW_SYSTEM_BLUEPRINT.md` is the source of truth for architecture and database structure.

---

## Goals

1. **Admin Earnings Report** implemented inside `` under the section ``, powered by backend endpoints and SQLite ``.
2. **Remove the mock registration simulator** and **wire ACF (Auto‑Connect Follower)** logic to the **real registration** flow so allocation happens at signup time.

Business constraints to respect:

- Max **5** direct followers per user.
- Max **7** levels depth **(hard stop at registration)**.
- Allocation policy: **Layer‑first (closest to invitor) → Earliest‑first (fill earliest parents to 5 first) → runNumber**.
- If invitor’s direct slot is full, allocate **within the invitor’s child subtree only** (exclude the invitor node itself), still observing the policy above. The **invitor is always recorded** as the inviter, regardless of the physical parent chosen.
- Registration types: **NIC** (root as invitor) and **BIC** (explicit invitor by code).

> “invitor” is the person who invited; **parent** is where the node is attached (may be a descendant of the invitor due to allocation rules).

---

## Project Files to Touch

- **Backend**: `server.js`, migrations/indices for `data/fingrow.db`.
- **Admin Frontend**: `admin/index.html`, `admin/js/admin.js`, optional `admin/css/admin.css`.
- **Mobile (registration)**: `mobile/index.html` (only if needed to reflect new responses).

---

## Database Assumptions

- Use existing tables `users`, `earnings`, `orders`, `order_items` per blueprint.
- **Root user for NIC**: choose the first row where `users.invitor_id IS NULL` (e.g., `25AAA0000`). If none exists at runtime, create one **once** with `id='25AAA0000'` (configurable) and `username='Anatta999'`.
- **totalFinpoint**: sum **earnings.amount\_local** (if present, else fallback to `earnings.amount`) across the entire **subtree including self** within the 7‑level cap.
- If missing, add `users.parent_id` to persist the actual parent separate from `invitor_id` (invitation source).

---

## Server — Endpoints & Logic

### 1) Recursive Subtree Helper (7‑level cap)

Return a user’s subtree (including self) limited to **7 levels from that user**:

```sql
-- users(id TEXT PRIMARY KEY, invitor_id TEXT, created_at TEXT, username TEXT, ...)
WITH RECURSIVE subtree(level, id, invitor_id, created_at) AS (
  SELECT 0, u.id, u.invitor_id, u.created_at
  FROM users u WHERE u.id = @root
  UNION ALL
  SELECT s.level + 1, u.id, u.invitor_id, u.created_at
  FROM users u
  JOIN subtree s ON u.invitor_id = s.id
  WHERE s.level + 1 <= 7
)
SELECT * FROM subtree;
```

### 2) ACF Allocation at Registration

Implement `allocateParent(invitorId)` (pure backend) that:

- Builds **BFS layers** from `invitorId` using **parent edges only**.
- **Scope rules**:
  - NIC: `invitorId = ROOT_ID` (first `invitor_id IS NULL`).
  - BIC: `invitorId` resolved from invite code.
  - Primary scope **FILE** (direct child) → if **Full**, fallback to **NETWORK** (child subtree), still respecting 7‑level cap.
- **Candidate ordering** (after picking the nearest layer):
  1. Earliest `created_at` (fill earliest parents to 5 first).
  2. Lowest `childCount` (count of direct children).
  3. Lowest `runNumber` (or synthetic created sequence if runNumber not stored).
- Returns `{ parentId, parentLevel }` or throws when no slot exists under 5×7 constraints.

Wire this inside `POST /api/register` **after** user creation and invitor resolution:

1. Resolve `invitorId` (or ROOT for NIC).
2. `const { parentId, parentLevel } = allocateParent(invitorId)`.
3. Persist **structure**: keep `users.invitor_id = invitorId`, set ``.
4. Enforce: `parentLevel + 1 <= 7`.
5. Update parent’s child count; mark full when it reaches 5 (if such a flag is persisted).

### 3) Admin Earnings API

Create endpoints under `/api/admin/earnings`:

- `GET /api/admin/earnings/summary?userId=&from=&to=` → `{ totalSelf, totalSubtree, totalAll, currency, members, depth, generatedAt }`.\
  `totalSubtree` includes self; `members` counts all nodes in subtree including self.

- `GET /api/admin/earnings/top?limit=20&from=&to=` → top users by **subtree earnings (self + downline)** with pagination.

- `GET /api/admin/earnings/user/:userId?from=&to=` → per‑user breakdown: `{ self, byGeneration: {1..7}, subtreeTotal, ordersLinked, lastEarningAt }`.

- `GET /api/admin/earnings/export.csv?from=&to=` → CSV columns:\
  `user_id,username,level,subtree_total,self_total,members,first_join,last_join`

**Sums using the subtree CTE (prefer **``**):**

```sql
WITH RECURSIVE subtree(level, id) AS (
  SELECT 0, @root
  UNION ALL
  SELECT s.level+1, u.id
  FROM users u JOIN subtree s ON u.invitor_id = s.id
  WHERE s.level+1 <= 7
),
earn AS (
  SELECT user_id, COALESCE(amount_local, amount) AS amt, created_at FROM earnings
)
SELECT
  SUM(CASE WHEN e.user_id = @root THEN amt ELSE 0 END) AS totalSelf,
  SUM(amt) AS totalSubtree,
  COUNT(DISTINCT s.id) AS members
FROM subtree s
LEFT JOIN earn e ON e.user_id = s.id
WHERE (@from IS NULL OR e.created_at >= @from) AND (@to IS NULL OR e.created_at <= @to);
```

### 4) Indexes

Ensure indices exist:

- `CREATE INDEX IF NOT EXISTS idx_users_invitor_id ON users(invitor_id);`
- `CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);`
- `CREATE INDEX IF NOT EXISTS idx_earnings_user_id ON earnings(user_id);`
- `CREATE INDEX IF NOT EXISTS idx_earnings_created_at ON earnings(created_at);`

---

## Admin UI — `#earnings-content`

Implement components in `admin/index.html` + `admin/js/admin.js`:

### Layout

- Filters: `User selector (optional)`, `Date range (from/to)`, `Depth (fixed=7, read‑only)`, `Search`.
- KPI cards: **Total (Subtree)**, **Self Only**, **Members in Subtree**, **Max Depth Found**.
- Tables/Tabs:
  1. **Top Subtree Earners**: columns (user, username, members, subtree\_total, last\_earning\_at, actions).
  2. **Per‑User Breakdown**: generation G1..G7 sums, self, subtree total.
  3. **Raw Earnings**: user\_id, amount, source, order\_id, created\_at (paginated).
- Export: **CSV** via `/api/admin/earnings/export.csv`.

### JS Contract

Add functions into `admin/js/admin.js`:

- `loadAdminEarningsDashboard()` — called when `#earnings-content` is shown.
- `fetchEarningsSummary(params)`, `fetchTopEarners(params)`, `fetchUserEarnings(userId, params)`.
- `renderEarningsKPIs(data)`, `renderTopEarnersTable(list)`, `renderUserBreakdownTable(rows)`, `renderRawEarnings(rows)`.
- Debounced filter handlers and URL param sync.

### UX Notes

- Use Thai locale formatting for dates/numbers.
- Provide empty states, loading spinners, and error messages.
- Make tables client‑side sortable and paginated.

---

## Registration Flow Wiring (ACF)

- In `POST /api/register`:
  - Resolve `invitorId` from invite code (BIC) or use root (NIC).
  - Call `allocateParent(invitorId)` to get `parentId`.
  - Validate `parentLevel + 1 <= 7`.
  - Persist `users.parent_id = parentId`, keep `users.invitor_id = invitorId`.
  - Update derived counters/flags.
- **Remove the mock** registration pieces and rely only on backend allocation.

---

## Acceptance Criteria

1. `#earnings-content` shows KPI cards and Top Subtree Earners from server data.
2. Date filters update totals; CSV export matches visible totals.
3. Registration (NIC/BIC) triggers ACF and enforces **5×7** rules. If invitor is full, allocation goes into **invitor’s child subtree**, nearest layer first.
4. Subtree totals include **self earnings** and are capped to **7 levels**.
5. All new SQL uses prepared statements and returns within \~200ms for \~10k users / \~200k earnings on typical hardware.

---

## Tests (do not change existing tests; add more if absent)

- **Unit**: allocation ordering, nearest layer selection, 7‑level cap.
- **Unit**: subtree sum (self vs subtree), date boundary inclusivity.
- **Integration**: `POST /api/register` (NIC/BIC) → assert `parent_id` and depth constraint.
- **Integration**: admin endpoints return deterministic totals for seeded fixtures.
- **E2E (manual)**: seed 3 levels, generate earnings, verify UI totals and CSV.

Provide `scripts/dev-seed.js`:

- Creates a root (if missing), seeds 50 users in a balanced 5‑ary tree up to 3 levels.
- Generates random earnings across users and dates.
- Prints expected totals summary to console.

---

## Security & Ops

- Protect `/api/admin/*` with admin auth middleware.
- Validate inputs; rate‑limit admin endpoints; structured error messages.
- Log slow queries (>200ms) with parameters and user id.

---

## Open Questions (use sensible defaults if unanswered)

1. Which amount to totalize: prefer `earnings.amount_local` if present; otherwise `earnings.amount`.
2. Root selection: use first `invitor_id IS NULL`; allow auto‑create if none.
3. Add `users.parent_id` if missing — okay to run a migration?
4. Any currency conversion needed? If yes, provide rate source.
5. Use timezone **Asia/Bangkok** for date filters?

---

## Deliverables

- Updated `server.js` (admin earnings endpoints + ACF allocation).
- Updated `admin/index.html` & `admin/js/admin.js` for `#earnings-content`.
- Migration SQL (add `parent_id` if needed) and indices.
- `scripts/dev-seed.js` fixtures.
- Unit/Integration tests (e.g., Vitest/Mocha) and a short runbook.

