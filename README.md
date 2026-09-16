# Job Queue Management Dashboard

A production-grade, full-stack Job Queue Management Dashboard built with **NestJS**, **Prisma ORM**, **PostgreSQL (Neon)**, **React**, **TypeScript**, **Vite**, **TailwindCSS**, and **TanStack Query**.

Designed and engineered to enforce strict, concurrency-safe job lifecycle state transitions with row-level PostgreSQL conditional atomicity, comprehensive audit history, and low-latency client synchronization.

---

## Live Links (Deployment Placeholders)

- **Production Frontend**: `https://job-queue-dashboard.vercel.app` (Placeholder)
- **Production Backend API**: `https://job-queue-api.onrender.com` (Placeholder)
- **Interactive Swagger OpenAPI**: `https://job-queue-api.onrender.com/docs` (Placeholder)
- **Health Check Endpoint**: `https://job-queue-api.onrender.com/health` (Placeholder)

---

## Features

- **End-to-End Job Queue Lifecycle**: Create jobs in `pending` status, advance them through `running`, and terminate in `completed` or `failed`.
- **Concurrency-Safe Atomic State Transitions**: Prevents race conditions when multiple browser tabs or distributed workers attempt to modify the same job simultaneously.
- **Strict Business Invariant Enforcement**: Invalid transitions are rejected at the database and application boundary with `409 Conflict`. Terminal states (`completed`, `failed`) can never be re-activated.
- **Full Audit History (Bonus 1)**: Every valid transition records an immutable log entry in `JobStatusHistory` containing previous status, next status, and exact timestamp—executed within the same database transaction.
- **Background Polling & Live Sync (Bonus 2)**: TanStack Query automatically polls the jobs list every 10 seconds while the dashboard is active, immediately stopping when the tab is blurred or unmounted to preserve network bandwidth and battery life.
- **Metric Summary Cards**: Aggregated counts for Total, Pending, Running, Completed, and Failed jobs that double as quick filters.
- **Internal Engineering Console Aesthetics**: Restrained, accessible TailwindCSS design focusing on utility, clarity, visible focus states, and responsive layout for mobile and desktop.
- **Exhaustive Automated Testing**: 29 unit, integration, validation, and concurrency tests covering all 15 business specification requirements using Jest and Supertest.
- **OpenAPI / Swagger Documentation**: Available at `/docs` with detailed request/response schemas, DTOs, and HTTP status codes.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite 6, TailwindCSS 3, TanStack Query v5, Axios, Lucide React, clsx |
| **Backend** | NestJS 10, TypeScript, Express, class-validator, class-transformer, Swagger OpenAPI |
| **Database** | PostgreSQL, Neon Serverless PostgreSQL (Pooled & Direct connections) |
| **ORM & Migrations** | Prisma ORM v6 with SQL migrations |
| **Testing** | Jest, ts-jest, Supertest |
| **Monorepo** | npm workspaces |

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Client["Frontend Client (React + Vite)"]
        UI[Dashboard UI & Summary Cards]
        TQ["TanStack Query (useJobs, useUpdateJobStatus)"]
        AxiosClient["Axios HTTP Client"]
        Poll["10s Visibility-Aware Polling"]
        UI --> TQ
        Poll -.-> TQ
        TQ --> AxiosClient
    end

    subgraph Server["Backend API (NestJS)"]
        Controller["JobsController (/jobs)"]
        Pipe["Global ValidationPipe (DTOs)"]
        Filter["HttpExceptionFilter & Logging"]
        Service["JobsService"]
        Controller --> Pipe --> Service
        Filter -.-> Controller
    end

    subgraph Storage["Database (PostgreSQL / Neon)"]
        Tx["Prisma $transaction"]
        AtomicUpdate["Row-Level Conditional UPDATE"]
        HistoryInsert["INSERT INTO JobStatusHistory"]
        TableJobs[("jobs table")]
        TableHistory[("job_status_histories table")]

        Service --> Tx
        Tx --> AtomicUpdate --> TableJobs
        Tx --> HistoryInsert --> TableHistory
    end

    AxiosClient -->|HTTP REST / JSON| Controller
```

---

## State Transition Rules

The backend acts as the authoritative source of truth. Transition rules are defined in a single location ([jobs.constants.ts](file:///c:/Users/kumar/OneDrive/Desktop/Airth/apps/backend/src/jobs/jobs.constants.ts)):

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

| Source Status | Allowed Target Statuses | Disallowed Targets (Returns 409) |
|---|---|---|
| `pending` | `running`, `failed` | `completed`, `pending` |
| `running` | `completed`, `failed` | `pending`, `running` |
| `completed` | *None (Terminal)* | `pending`, `running`, `failed` |
| `failed` | *None (Terminal)* | `pending`, `running`, `completed` |

---

## Concurrency Handling & Row-Level Atomic Updates

### The Problem
If two browser tabs or workers read a job in `pending` status at nearly the same millisecond and both attempt to transition it to `running`, a naive "read-then-write" approach creates an unsafe race condition:
1. Tab A reads status (`pending`).
2. Tab B reads status (`pending`).
3. Tab A writes status (`running`) and logs history.
4. Tab B writes status (`running`) and logs duplicate history, corrupting worker assignment.

### The Solution: Row-Level Conditional Atomic Update
Instead of checking status in memory, the backend executes a row-level conditional SQL update inside a database transaction:

```sql
UPDATE "jobs"
SET "status" = $toStatus, "updatedAt" = NOW()
WHERE "id" = $id AND "status" = $expectedPreviousStatus
RETURNING *;
```

In PostgreSQL, an `UPDATE` statement acquires an exclusive row-level write lock:
1. **Request 1** locks the row, finds `status = 'pending'`, updates to `'running'`, and commits. The update count is `1`. A status history record is inserted in the same transaction.
2. **Request 2** waits for Request 1's lock to release. Once released, PostgreSQL re-evaluates the `WHERE` condition. Because the row's status is now `'running'`, the condition `status = 'pending'` evaluates to false!
3. The update count for Request 2 is `0`.
4. The backend detects `count === 0`, queries the row to see if it exists, and responds immediately with `409 Conflict`:
   > *"Cannot transition job from 'running' to 'running'. Transition is invalid or was already updated concurrently."*
5. Only one concurrent request can ever succeed. Failed requests do not produce orphaned history records.

---

## Direct Answers to Assignment Questions ("3. Think About This")

| Question | Answer & Architectural Decision |
|---|---|
| **Where should this rule be enforced?** | **In the backend and the database engine.** While the React UI conditionally renders valid action buttons for a smooth user experience, client-side logic can be bypassed. The authoritative invariant enforcement lives in the NestJS service layer ([jobs.service.ts](file:///c:/Users/kumar/OneDrive/Desktop/Airth/apps/backend/src/jobs/jobs.service.ts)) backed by PostgreSQL conditional updates. |
| **What happens if someone bypasses the React application and calls the API directly?** | The backend rejects invalid requests with **`409 Conflict`** (or `400 Bad Request` if payload schema/enums are invalid). Bypassing the frontend via `curl`, Postman, or rogue scripts cannot violate state transitions because the backend verifies the transition against the state machine ([jobs.constants.ts](file:///c:/Users/kumar/OneDrive/Desktop/Airth/apps/backend/src/jobs/jobs.constants.ts)) before touching data. |
| **What happens when two requests arrive at nearly the same time?** | Both requests enter PostgreSQL transactions. PostgreSQL issues a row-level lock to the first request, which executes `UPDATE jobs SET status = 'running' WHERE id = :id AND status = 'pending'`. The second request acquires the lock immediately after, but the `WHERE status = 'pending'` condition now evaluates to false. Exactly **one request updates 1 row and succeeds (200 OK)**, while the concurrent duplicate updates 0 rows and returns **`409 Conflict`**. |
| **How would you prevent an invalid or inconsistent state?** | Using **row-level atomic conditional updates** inside an ACID **database transaction** (`prisma.$transaction`). State transitions and history recording succeed or fail as an atomic unit. There is no unprotected window between reading state and writing state. |

---

## Production-Ready Bonus Improvements

The assignment invites adding a small improvement that makes the system more production-ready:

### Bonus 1: Immutable Status Transition Audit History (`JobStatusHistory`)
- **What was added**: A dedicated PostgreSQL table `job_status_histories` tracking `id`, `jobId`, `fromStatus`, `toStatus`, and `changedAt`.
- **Why chosen**: Real-world job queues and distributed worker pipelines require auditability. When background jobs fail or get stuck, engineers need to see the exact progression of states and timestamps rather than just the final state. Executing the history insertion in the same transaction as the job status update guarantees that every successful transition has an audit trail and no failed transition produces orphaned logs.

### Bonus 2: Tab-Aware Background Polling with TanStack Query
- **What was added**: 10-second automatic polling with `refetchIntervalInBackground: false` and centralized `POLLING_INTERVAL_MS` constant.
- **Why chosen**: In production dashboards, engineers leave monitoring tabs open for days. Naive `setInterval` implementations cause memory leaks, battery drain, and uncoordinated requests. TanStack Query automatically halts network requests when the browser tab is inactive or minimized, immediately syncing the latest data upon refocus.

---

## Database Design & Schema Explanation

### Why PostgreSQL?
- **ACID Compliance**: Crucial for coordinating multi-step transactions (updating a job and recording history simultaneously).
- **Strong Row-Level Locking**: Atomic conditional `UPDATE ... WHERE ...` primitives avoid distributed lock managers (like Redis Redlock) for this workload.
- **Native Enums**: The `JobStatus` enum prevents arbitrary or malformed strings from entering storage at the database engine level.

### Why Neon?
- **Serverless PostgreSQL**: Instant branching, autoscaling, and zero idle costs make Neon ideal for modern web backends.
- **Connection Pooling**: Built-in PgBouncer pooling via the pooled connection string (`DATABASE_URL`) handles connection surges from serverless platforms, while the direct connection (`DIRECT_URL`) safely executes DDL migrations.

### Schema Details

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

- **Indexes**:
  - `jobs(status)`: Accelerates filtering jobs by state (`GET /jobs?status=running`).
  - `jobs(createdAt)`: Optimizes sorting newest jobs first.
  - `job_status_histories(jobId)`: Accelerates fetching audit history for a single job.
- **Foreign Key Cascade**: Deleting a job automatically cascades to remove its historical records, maintaining referential integrity.

---

## API Documentation

Interactive Swagger documentation is available locally at:
`http://localhost:4000/docs`

### Endpoints

| Method | Path | Status | Description |
|---|---|---|---|
| `POST` | `/jobs` | 201 | Create a job in `pending` status. Accepts `{ title, type }`. |
| `GET` | `/jobs` | 200 | List all jobs sorted newest first. Supports query filter `?status=...`. |
| `GET` | `/jobs/counts` | 200 | Aggregated metrics `{ total, pending, running, completed, failed }`. |
| `GET` | `/jobs/:id` | 200 / 404 | Retrieve a specific job by UUID. |
| `PATCH` | `/jobs/:id/status` | 200 / 400 / 404 / 409 | Atomically advance job status. Accepts `{ status, currentStatus? }`. |
| `DELETE` | `/jobs/:id` | 200 / 404 | Delete a job and cascade delete history. |
| `GET` | `/jobs/:id/history` | 200 / 404 | Retrieve chronological status history entries for a job. |
| `GET` | `/health` | 200 | Health check for container/orchestrator liveness probes. |

---

## Polling & Real-Time Sync (Bonus 2)

- **Implementation**: Utilizes TanStack Query's `refetchInterval: 10000` (10 seconds).
- **Tab Visibility Awareness**: `refetchIntervalInBackground` is set to `false`. Polling automatically pauses when the browser tab loses focus or is minimized, preventing unnecessary server load.
- **Centralized Configuration**: The interval is defined once in [config.ts](file:///c:/Users/kumar/OneDrive/Desktop/Airth/apps/frontend/src/constants/config.ts) (`POLLING_INTERVAL_MS`).
- **User Feedback**: The header features an active pulse indicator showing "Auto-refresh (10s)", the timestamp of the last successful sync, and a manual refresh trigger.

---

## Local Development Setup

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd Airth
npm install
```

### 2. Environment Variables Configuration

Create `.env` files in both apps using the provided templates:

**apps/backend/.env**:
```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Neon / PostgreSQL connection strings:
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

**apps/frontend/.env**:
```env
VITE_API_BASE_URL=http://localhost:4000
```

### 3. Apply Database Migrations
```bash
# Generate Prisma Client
npm --workspace=apps/backend run prisma:generate

# Deploy migrations to your PostgreSQL database
npx --prefix apps/backend prisma migrate deploy
```

### 4. Start Development Servers
```bash
# Run backend (http://localhost:4000)
npm run dev:backend

# Run frontend (http://localhost:5173) in a second terminal
npm run dev:frontend
```

---

## Verification, Testing & Build Commands

### Automated Tests
Run the complete Jest & Supertest test suite:
```bash
npm test
```
*Outputs 29 passed tests across 3 test suites covering valid creation, input validation, state transitions, rejection of terminal re-activations, 404s, 409 conflicts, history recording, and concurrency simulations.*

### Linting & Type Checking
```bash
# Run ESLint across both frontend and backend
npm run lint

# Run frontend TypeScript typecheck
npm --workspace=apps/frontend run typecheck
```

### Production Build
```bash
# Build both frontend and backend bundles
npm run build
```

---

## Deployment Instructions

### 1. Database (Neon PostgreSQL)
1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **Pooled connection string** (for runtime queries) into `DATABASE_URL`.
3. Copy the **Direct connection string** into `DIRECT_URL`.
4. Run `npx --prefix apps/backend prisma migrate deploy` to provision tables and indexes.

### 2. Backend API (Render or Railway)
- **Root Directory**: `.` or `apps/backend`
- **Build Command**: `npm install && npm --workspace=apps/backend run build`
- **Start Command**: `npm --workspace=apps/backend run start:prod`
- **Environment Variables**:
  - `DATABASE_URL`: Neon pooled URL
  - `DIRECT_URL`: Neon direct URL
  - `PORT`: Provided by host (e.g. 10000 or 4000)
  - `FRONTEND_URL`: Deployed Vercel URL
  - `NODE_ENV`: `production`

### 3. Frontend Dashboard (Vercel)
- **Root Directory**: `apps/frontend`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_BASE_URL`: Deployed backend URL (e.g. `https://job-queue-api.onrender.com`)

---

## Assumptions & Trade-offs

1. **UUIDs for Identifiers**: UUIDv4 strings were selected over sequential integers to prevent enumeration attacks and simplify distributed job generation.
2. **PostgreSQL Row-Level Locking vs. Redis Distributed Locks**: For single-database deployments, PostgreSQL's row-level locking via conditional updates provides ACID-level guarantees without introducing external caching infrastructure.
3. **Optimistic Invalidation in TanStack Query**: Mutations invalidate queries rather than purely patching local cache, ensuring that any concurrent changes by other team members are immediately pulled and synchronized.

---

## Future Improvements for High-Scale Production

1. **WebSocket / Server-Sent Events (SSE)**: Replace or complement 10s polling with SSE to provide sub-100ms real-time event updates during high-throughput queue activity.
2. **Dedicated Background Workers (BullMQ / Celery)**: Separate the REST API tier from the compute workers by using Redis-backed queues or PostgreSQL `SKIP LOCKED` queues.
3. **Dead Letter Queue (DLQ) & Retry Policies**: Introduce configurable retry counts with exponential backoff before transitioning directly to `failed`.
4. **Pagination & Date Range Filtering**: Support cursor-based pagination for queues exceeding 100,000 active records.
