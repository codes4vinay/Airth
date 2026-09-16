# Mini Job Queue Dashboard

A lightweight, full-stack Job Queue Management Dashboard built for the Airth React + NestJS Intern Assignment. The system manages job lifecycles with backend-enforced state transitions, PostgreSQL persistence, and row-level concurrency protection for simultaneous browser requests.

---

## Live Links & Repository

- **Live Frontend (Vercel)**: https://airth-frontend.vercel.app
- **Live Backend API (Render)**: https://airth-job-queue-backend-q1fp.onrender.com
- **Swagger Documentation**: https://airth-job-queue-backend-q1fp.onrender.com/docs
- **GitHub Repository**: https://github.com/codes4vinay/Airth

---

## Assignment Requirements Checklist

### Backend (NestJS + PostgreSQL)
- [x] `POST /jobs` — Create a new job (`pending` status by default)
- [x] `GET /jobs` — Fetch all jobs (with optional `?status=` filter, newest first)
- [x] `PATCH /jobs/:id/status` — Update job status with backend state validation
- [x] `DELETE /jobs/:id` — Delete a job (cascades linked records)
- [x] Each job contains: `id` (UUID), `title`, `type`, `status`, `createdAt`
- [x] Allowed statuses: `pending`, `running`, `completed`, `failed`
- [x] PostgreSQL persistence via Prisma ORM (hosted on Neon)
- [x] Authoritative backend DTO validation (`class-validator`) and global error handling

### Frontend (React + Vite + Tailwind)
- [x] Displays all jobs in a responsive table (card layout on mobile)
- [x] Filters jobs by status (`all`, `pending`, `running`, `completed`, `failed`)
- [x] Create job modal with input validation and preset types
- [x] Action buttons for valid lifecycle transitions (`Start`, `Complete`, `Fail`)
- [x] Deletes job with confirmation
- [x] Status count metric cards
- [x] Loading skeletons, empty states, and dismissible API error banners

---

## State Transition Rules

A job strictly follows this lifecycle:

```
           pending
          /       \
         v         v
     running     failed (terminal)
     /     \
    v       v
completed  failed (both terminal)
```

1. `pending` → `running` or `failed`
2. `running` → `completed` or `failed`
3. `completed` and `failed` are **terminal states**. Once reached, a job can never transition again.
4. Any illegal transition (e.g. `completed` → `running`, `pending` → `completed`) is rejected by the backend with HTTP `409 Conflict`.

---

## Concurrency & Edge Cases

### 1. Where should this rule be enforced?
**On the backend at the database layer.** The frontend UI conditionally displays action buttons for user convenience, but client-side logic is never trusted. The backend service and database transaction authoritatively determine whether a transition is allowed.

### 2. What happens if someone bypasses the React application and calls the API directly?
The backend validates every incoming request independently:
- Payload schema and enum validation are enforced via NestJS `ValidationPipe` and `class-validator`.
- Lifecycle transition validity is checked against the state machine.
- Direct cURL / Postman requests attempting invalid transitions receive HTTP `409 Conflict` or HTTP `400 Bad Request`. Bypassing the frontend cannot corrupt data integrity.

### 3. What happens when two requests arrive at nearly the same time? (Two Browser Tabs)
**Scenario**: User A and User B both view a `pending` job in separate tabs and click "Start" at the same millisecond.

If the server did a naive `SELECT` followed by `UPDATE`, both requests would read `pending`, both would consider the transition valid, and both would write `running`.

**Our Implementation**: The update is executed as a conditional write inside a Prisma database transaction:

```typescript
const updateResult = await tx.job.updateMany({
  where: {
    id,
    status: expectedPrevious, // e.g. 'pending'
  },
  data: {
    status: targetStatus, // e.g. 'running'
  },
});

if (updateResult.count === 0) {
  throw new ConflictException(
    'Concurrent update conflict on job. Status was modified by another request.'
  );
}
```

### 4. How would you prevent an invalid or inconsistent state?
PostgreSQL provides row-level locking during the `UPDATE`.
- **Request 1** acquires the row lock. Because status is `'pending'`, it updates the row (`count === 1`), logs the history entry, and commits.
- **Request 2** waits for Request 1 to complete. When evaluated, the row's status is already `'running'`. The clause `WHERE status = 'pending'` matches zero rows (`count === 0`).
- The service detects `count === 0`, rolls back the transaction, and returns HTTP `409 Conflict`.
- Only one request succeeds. The other is cleanly rejected without orphaned records or corrupted state.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite | UI component tree, responsive layout, fast client build |
| | Tailwind CSS | Utility-first responsive styling |
| | Axios | REST client with error transformation |
| | Lucide React | Clean icon set |
| **Backend** | NestJS 10, TypeScript | Modular architecture (Controllers, Services, DTOs) |
| | class-validator, class-transformer | Request payload validation |
| | Swagger / OpenAPI | Interactive API documentation at `/docs` |
| **Database** | PostgreSQL (Neon) | Relational storage with ACID transactions |
| | Prisma ORM v6 | Schema migrations, type-safe queries, connection pooling |
| **Deployment** | Vercel | Frontend static hosting |
| | Render | Backend Node.js web service |

---

## Bonus: Production Improvements

The assignment asked for small improvements that make the system more production-ready:

### 1. Status Transition Audit Trail (`JobStatusHistory`)
- **Why**: In real operations, seeing only the current status isn't enough; you need an immutable record of when and how a job changed states.
- **Implementation**: Every status change atomically creates a `JobStatusHistory` record (`fromStatus`, `toStatus`, `changedAt`) inside the same database transaction. If either step fails, the entire transaction rolls back. Accessible via `GET /jobs/:id/history`.

### 2. Tab-Aware Polling (`useJobs`)
- **Why**: Keeps multiple dashboard tabs synchronized without slamming the server.
- **Implementation**: The dashboard polls `GET /jobs` every 10 seconds. When the browser tab is hidden (`document.visibilityState === 'hidden'`), polling pauses to save bandwidth and CPU. As soon as the tab becomes active, it immediately triggers a refresh and resumes the timer.

---

## API Endpoints

### Assignment Endpoints
- **`POST /jobs`** — Creates a new job.
  ```json
  // Request
  { "title": "Nightly Data Sync", "type": "DATA_SYNC" }
  // Response: 201 Created
  { "id": "uuid", "title": "Nightly Data Sync", "type": "DATA_SYNC", "status": "pending", "createdAt": "..." }
  ```
- **`GET /jobs`** — Returns all jobs, sorted newest first. Supports `?status=pending|running|completed|failed`.
- **`PATCH /jobs/:id/status`** — Updates status with lifecycle validation.
  ```json
  // Request
  { "status": "running", "currentStatus": "pending" }
  // Response: 200 OK or 409 Conflict
  ```
- **`DELETE /jobs/:id`** — Deletes a job (associated audit history entries cascade automatically).

### Additional Endpoints
- **`GET /jobs/counts`** — Returns status breakdown `{ total, pending, running, completed, failed }`.
- **`GET /jobs/:id`** — Returns single job details.
- **`GET /jobs/:id/history`** — Returns transition audit history for a job.
- **`GET /health`** — Health check for monitoring and keep-alive.

---

## Database Design

Defined in `apps/backend/prisma/schema.prisma`:

```prisma
enum JobStatus {
  pending
  running
  completed
  failed
}

model Job {
  id        String             @id @default(uuid())
  title     String
  type      String
  status    JobStatus          @default(pending)
  createdAt DateTime           @default(now())
  updatedAt DateTime           @updatedAt
  history   JobStatusHistory[]

  @@index([status])
  @@index([createdAt])
  @@map("jobs")
}

model JobStatusHistory {
  id         String    @id @default(uuid())
  jobId      String
  fromStatus JobStatus
  toStatus   JobStatus
  changedAt  DateTime  @default(now())
  job        Job       @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId])
  @@map("job_status_histories")
}
```

---

## Local Development Setup

### 1. Prerequisites
- Node.js >= 18
- npm >= 9
- PostgreSQL instance (or free [Neon](https://neon.tech) database)

### 2. Clone & Install
```bash
git clone https://github.com/codes4vinay/Airth.git
cd Airth
npm install
```

### 3. Environment Variables

Create `.env` in `apps/backend`:
```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://user:password@ep-sample-pooler.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-sample.neon.tech/neondb?sslmode=require"
```

Create `.env` in `apps/frontend`:
```env
VITE_API_BASE_URL=http://localhost:4000
```

### 4. Database Setup
```bash
# Generate Prisma Client
npm --workspace=apps/backend run prisma:generate

# Run migrations
npm --workspace=apps/backend run prisma:deploy
```

### 5. Run the Application
In separate terminal windows:
```bash
# Start backend (http://localhost:4000)
npm run dev:backend

# Start frontend (http://localhost:5173)
npm run dev:frontend
```

---

## Assumptions & Trade-offs

1. **State Dashboard vs. Background Worker Engine**: This project manages job states and lifecycle transitions. It does not run background worker threads (like BullMQ or Celery). "Running" represents the job state recorded in the system.
2. **Conditional Updates vs. Redis Distributed Locks**: For a single database architecture, PostgreSQL row-level locks via conditional updates are simple, ACID-compliant, and avoid the operational overhead of a Redis cluster.
3. **Tab-Aware Polling vs. WebSockets**: 10-second tab-aware polling provides near-instant synchronization across tabs without requiring WebSocket state management or reconnection infrastructure.

---

## Future Improvements (With More Time)

- **WebSockets / SSE**: Push real-time status transitions directly to clients.
- **Worker Execution Service**: Connect to an actual job worker queue (e.g., BullMQ + Redis) to process jobs asynchronously.
- **Cursor Pagination**: Add pagination to handle queues with tens of thousands of jobs.
- **Role-Based Authentication**: Restrict transition and deletion permissions to authorized users.

---

## Verification

You can verify the codebase locally:
```bash
# Lint checks
npm run lint

# Frontend type check
npm --workspace=apps/frontend run typecheck

# Prisma schema validation
npx prisma validate --schema=./apps/backend/prisma/schema.prisma

# Build bundles
npm run build
```
