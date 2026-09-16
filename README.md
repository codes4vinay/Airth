# Job Queue Management Dashboard

A full-stack job queue management dashboard built with a React frontend, NestJS backend, and PostgreSQL persistence. The system handles job lifecycle management with backend-enforced status transitions and row-level concurrency protection. It also provides an audit history trail and tab-aware polling for synchronized dashboard views across open browser tabs.

---

## Live Demo

- **Frontend**: https://airth-frontend.vercel.app
- **Backend API**: https://airth-job-queue-backend-q1fp.onrender.com
- **Swagger**: https://airth-job-queue-backend-q1fp.onrender.com/docs

---

## Features

- **Create Jobs**: Submit new jobs with a title and worker type (includes common preset categories). Initial status is always `pending`.
- **View & Monitor Jobs**: View all jobs in a responsive table (with mobile card view) sorted by newest first, displaying short UUIDs, status badges, and timestamps.
- **Filter by Status**: Filter the queue by status (`pending`, `running`, `completed`, `failed`) via backend query parameters and frontend tab controls.
- **Status Transitions**: Advance or fail jobs through contextual action buttons that respect allowed lifecycle transitions.
- **Delete Jobs**: Delete jobs with inline confirmation. Cascade foreign keys automatically remove associated audit records.
- **Status Count Metrics**: Live counts for total, pending, running, completed, and failed jobs displayed on the filter bar.
- **Loading & Error Feedback**: Pulse skeletons during initial fetch, contextual error banners with auto-dismiss, and user-friendly messages for API errors.
- **Backend Validation**: Authoritative request validation on all inputs and query parameters using NestJS `ValidationPipe` and `class-validator`.
- **Concurrency-Safe Updates**: Row-level conditional updates prevent race conditions when two clients attempt to transition the same job at the same time.
- **Transition Audit History**: Dedicated history records capturing previous status, next status, and timestamp for every successful transition.
- **Tab-Aware Polling**: Periodic 10-second polling that automatically pauses when the browser tab is hidden and resumes immediately when active.
- **Swagger / OpenAPI**: Interactive API documentation available locally at `/docs`.

---

## Status Transition Rules

Job transitions are governed by a strict state machine enforced authoritatively by the backend:

```
           ┌───────────┐
           │  pending  │
           └─────┬─────┘
                 │
            ┌────┴────┐
            │         │
            ▼         ▼
         ┌─────────┐ ┌────────┐
         │ running │ │ failed │ (terminal)
         └───┬─────┘ └────────┘
             │
          ┌──┴──┐
          │     │
          ▼     ▼
     ┌───────────┐ ┌────────┐
     │ completed │ │ failed │ (terminal)
     └───────────┘ └────────┘
      (terminal)
```

- `pending` can transition to `running` or `failed`.
- `running` can transition to `completed` or `failed`.
- `completed` and `failed` are terminal states. Once reached, a job cannot be transitioned to any other status.
- Any unsupported transition (e.g. `completed → running`, `pending → completed`, or `failed → running`) is rejected by the backend with HTTP `409 Conflict`.
- Frontend action buttons are conditionally displayed for user convenience, but all transition validation is enforced authoritatively on the backend.

---

## Concurrency Handling

Handling simultaneous transition requests is a core requirement of this assignment.

### The Two-Tab Race Condition
Suppose a job is currently in `pending` status. Two users (or two browser tabs) view the job and click "Start" at nearly the same millisecond:
1. If the server were to perform a naive `SELECT` followed by an `UPDATE`, both requests would read `pending`.
2. Both would see that `pending → running` is valid.
3. Both would execute an update, causing duplicate state transitions and conflicting worker actions.

### The Solution: Row-Level Conditional Updates
Instead of relying on memory checks, the backend issues a conditional update inside a database transaction (`JobsService.updateJobStatus`):

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
```

Here is how PostgreSQL handles this:
1. **Request 1** begins an update transaction and acquires an exclusive row-level lock on the row. Because the status is still `'pending'`, it matches 1 row (`updateResult.count === 1`), updates the status to `'running'`, inserts the history record, and commits.
2. **Request 2** waits for Request 1's lock to release. Once released, PostgreSQL evaluates the `WHERE status = 'pending'` clause against the current row. Because the status was already changed to `'running'`, zero rows match (`updateResult.count === 0`).
3. The service detects `count === 0`, rolls back the transaction, and returns HTTP `409 Conflict`:
   > *"Concurrent update conflict on job. Status was modified by another request."*

This guarantees that only one request can succeed. The other receives a clean conflict response without producing orphaned audit records or corrupting state.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 | UI component tree and state management |
| | TypeScript | End-to-end type safety |
| | Vite 6 | Development server and production build |
| | Tailwind CSS | Utility-first responsive styling |
| | Axios | HTTP client for backend REST communication |
| | Lucide React | Minimal UI icons |
| **Backend** | NestJS 10 | Structured backend framework (controllers, services, modules) |
| | TypeScript | Type safety and DTO contracts |
| | class-validator & class-transformer | Request payload validation and transformation |
| | Swagger / OpenAPI | Interactive API documentation |
| **Database** | PostgreSQL | Relational database with ACID transaction support |
| | Prisma ORM v6 | Schema definition, migrations, and query builder |
| | Neon | Serverless PostgreSQL hosting |
| **Monorepo** | npm workspaces | Multi-package project management (`apps/backend`, `apps/frontend`) |

---

## API Endpoints

### Core Assignment Endpoints

- **`POST /jobs`**
  - Creates a new job in `pending` status.
  - **Body**: `{ "title": "Export user data", "type": "DATA_EXPORT" }`
  - **Response**: `201 Created` with the created job object.

- **`GET /jobs`**
  - Returns a list of all jobs, sorted newest first.
  - **Query param**: `?status=pending|running|completed|failed` (optional filter).
  - **Response**: `200 OK` with an array of jobs.

- **`PATCH /jobs/:id/status`**
  - Atomically updates job status and appends an audit history entry.
  - **Body**: `{ "status": "running", "currentStatus": "pending" }` (`currentStatus` is optional but verified if provided).
  - **Response**: `200 OK` on success, `400 Bad Request` if payload is invalid, `404 Not Found` if job does not exist, `409 Conflict` if transition is invalid or failed due to concurrency conflict.

- **`DELETE /jobs/:id`**
  - Deletes a job. Associated history records are automatically deleted via database cascade.
  - **Response**: `200 OK` with `{ "success": true, "message": "..." }`, or `404 Not Found`.

### Additional Endpoints

- **`GET /jobs/counts`**
  - Returns aggregated metrics: `{ "total": 10, "pending": 2, "running": 4, "completed": 2, "failed": 2 }`.
- **`GET /jobs/:id`**
  - Retrieves details for a specific job by UUID.
- **`GET /jobs/:id/history`**
  - Retrieves chronological status transition history for a specific job.

---

## Database Design

The schema is defined in Prisma (`apps/backend/prisma/schema.prisma`):

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

### Design Notes:
- **UUID Keys**: UUIDv4 identifiers avoid exposing sequential integers and prevent identifier enumeration.
- **PostgreSQL Enum**: The `JobStatus` enum guarantees that invalid status strings are rejected at the database level.
- **Foreign Key Cascade**: Deleting a job automatically cascades to delete all linked status history entries.
- **Indexes**:
  - `jobs(status)`: Optimizes filtering by status (`GET /jobs?status=...`).
  - `jobs(createdAt)`: Optimizes ordering newest jobs first (`orderBy: { createdAt: 'desc' }`).
  - `job_status_histories(jobId)`: Optimizes history lookups for a specific job.

---

## Status History

Every time a valid status change succeeds:
1. The job row status is updated.
2. A new `JobStatusHistory` record is inserted with `jobId`, `fromStatus`, `toStatus`, and `changedAt`.

Both operations execute inside the same `prisma.$transaction`. If either step fails, the entire transaction rolls back, guaranteeing that the audit trail is never inconsistent with the current job state.

---

## Polling

The frontend hook (`useJobs`) periodically refreshes the job list and status counts:
- **Interval**: 10 seconds (`JOB_POLL_INTERVAL = 10_000` ms).
- **Tab Visibility Awareness**: Listens to the browser's `visibilitychange` event. Polling pauses when the tab is hidden or minimized (`document.visibilityState !== 'visible'`), and immediately refetches and resumes when the tab becomes visible again.
- **Cleanup**: Cleans up interval timers and event listeners when the hook unmounts to prevent memory leaks.
- **Resilience**: If a background polling request fails due to a temporary network issue, the dashboard preserves existing jobs on screen rather than blanking out the view.

*Note: Polling is designed solely for keeping the dashboard reasonably fresh across open tabs. Concurrency correctness does not rely on polling; it is enforced by atomic database transactions on the backend.*

---

## Local Development Setup

### 1. Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- A PostgreSQL database (e.g. [Neon](https://neon.tech) or a local PostgreSQL instance)

### 2. Clone & Install
```bash
git clone <REPOSITORY_URL>
cd Airth
npm install
```

### 3. Environment Variables
Create `.env` files in both apps using the provided `.env.example` templates:

**Backend (`apps/backend/.env`)**:
```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Neon PostgreSQL connection strings
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

**Frontend (`apps/frontend/.env`)**:
```env
VITE_API_BASE_URL=http://localhost:4000
```

### 4. Database Setup
```bash
# Generate Prisma Client
npm --workspace=apps/backend run prisma:generate

# Apply migrations to your PostgreSQL database
npm --workspace=apps/backend run prisma:deploy
```

### 5. Start Development Servers
In two separate terminals:

```bash
# Terminal 1: Start backend (runs on http://localhost:4000)
npm run dev:backend

# Terminal 2: Start frontend (runs on http://localhost:5173)
npm run dev:frontend
```

Once running, open:
- Frontend Dashboard: `http://localhost:5173`
- Swagger Documentation: `http://localhost:4000/docs`

---

## Environment Variables Reference

### Backend (`apps/backend/.env`)
| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Port the NestJS HTTP server listens on | `4000` |
| `FRONTEND_URL` | Allowed CORS origin for the frontend | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string (pooled if using PgBouncer/Neon) | `postgresql://...` |
| `DIRECT_URL` | Direct PostgreSQL connection string for Prisma migrations | `postgresql://...` |
| `NODE_ENV` | Environment mode | `development` / `production` |

### Frontend (`apps/frontend/.env`)
| Variable | Description | Default / Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API | `http://localhost:4000` |

---

## Deployment

### Backend (e.g. Render, Railway)
- **Root Directory**: `apps/backend` (or project root with workspace flags)
- **Build Command**: `npm install && npm --workspace=apps/backend run prisma:generate && npm --workspace=apps/backend run prisma:deploy && npm --workspace=apps/backend run build`
- **Start Command**: `node apps/backend/dist/main`
- **Environment Variables**: Set `DATABASE_URL`, `DIRECT_URL`, `PORT`, `FRONTEND_URL`, and `NODE_ENV=production`.

### Frontend (e.g. Vercel, Netlify)
- **Root Directory**: `apps/frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: Set `VITE_API_BASE_URL` pointing to your deployed backend URL.

### Database (Neon PostgreSQL)
- Create a project on [Neon](https://neon.tech).
- Provide the pooled connection string to `DATABASE_URL` and direct connection string to `DIRECT_URL`.
- Run `npm --workspace=apps/backend run prisma:deploy` to apply migrations.

---

## Assumptions & Trade-offs

1. **Job State Dashboard vs. Background Worker Engine**: This project implements job lifecycle tracking and state management. It is not an asynchronous worker system executing real compute tasks (like BullMQ or Celery). Transitions are triggered via API / UI actions.
2. **PostgreSQL Conditional Updates vs. Redis Distributed Locks**: PostgreSQL row-level locks via conditional updates (`updateMany` with `status: expectedPrevious`) provide ACID concurrency guarantees without introducing external caching infrastructure like Redis.
3. **Controlled Polling vs. WebSockets**: 10-second tab-aware polling provides a simple, dependable way to keep dashboard views synchronized without the connection management and state overhead of WebSocket servers.
4. **Standard React State vs. External Store**: Normal React hooks (`useState`, `useEffect`, `useCallback`) with Axios keep the frontend lightweight, readable, and easy to trace. No external state library (Redux, Zustand, TanStack Query) is needed for this application scope.

---

## Production Improvements (Assignment Bonus)

The assignment suggested adding a small improvement that makes the system more production-ready:

1. **Status History Audit Trail (`JobStatusHistory`)**:
   - *Why*: Real-world operations require visibility into how and when a job changed status, not just its current state. By recording each transition within the database transaction, an immutable audit trail is guaranteed.
2. **Tab-Aware Lifecycle Polling**:
   - *Why*: Dashboard users frequently leave monitoring tabs open. By pausing polling when the browser tab is hidden and resuming when focused, the dashboard prevents unnecessary server load and client battery drain.

---

## Future Improvements

If this were extended into a high-throughput production system:
- **Server-Sent Events (SSE) or WebSockets**: Push instant status updates to connected clients rather than polling.
- **Worker Execution Integration**: Integrate with a background worker engine (such as BullMQ) where worker processes claim pending jobs and report completion.
- **Pagination & Sorting**: Add cursor-based pagination and flexible sorting for queues with tens of thousands of records.
- **Authentication & Roles**: Role-based access control to restrict which users can trigger status transitions or delete jobs.

---

## Verification Commands

The project can be validated with the following scripts:

```bash
# Run linter across both backend and frontend
npm run lint

# Typecheck frontend code
npm --workspace=apps/frontend run typecheck

# Validate Prisma schema
npx prisma validate --schema=./apps/backend/prisma/schema.prisma

# Build both backend and frontend production bundles
npm run build
```
