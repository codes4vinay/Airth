# Job Queue Management Dashboard

A production-quality full-stack Job Queue Management Dashboard built with **NestJS**, **Prisma ORM**, **PostgreSQL (Neon)**, **React**, **TypeScript**, **Vite**, **TailwindCSS**, and **TanStack Query**.

## Project Structure

```
job-queue-dashboard/
├── apps/
│   ├── backend/          # NestJS backend API with Prisma & PostgreSQL
│   └── frontend/         # React + Vite + TailwindCSS + TanStack Query UI
├── .env.example          # Sample environment variables
├── .gitignore            # Git ignore configuration
├── package.json          # Monorepo workspaces configuration
└── README.md             # Project documentation
```

## Tech Stack

- **Backend**: NestJS, TypeScript, Prisma ORM, PostgreSQL (Neon), class-validator, class-transformer, Swagger/OpenAPI, Jest, Supertest.
- **Frontend**: React, TypeScript, Vite, TailwindCSS, TanStack Query, Axios, Lucide React.
- **Database**: PostgreSQL (Neon Serverless PostgreSQL).

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended; v20+ / v24 supported)
- npm (v9 or higher)
- PostgreSQL database instance (e.g., Neon)

### Installation

Install all dependencies across the monorepo:

```bash
npm install
```

### Running Locally

Run backend and frontend development servers:

```bash
# Backend (NestJS on http://localhost:4000)
npm run dev:backend

# Frontend (Vite on http://localhost:5173)
npm run dev:frontend
```

### Building for Production

```bash
npm run build
```

## Milestone Status

- [x] **Milestone 1**: Project initialization, monorepo workspaces, TypeScript, linting, and basic scripts.
- [ ] **Milestone 2**: Prisma schema, models (`Job`, `JobStatusHistory`), and PostgreSQL migrations.
- [ ] **Milestone 3**: Jobs creation and listing with validation and Swagger documentation.
- [ ] **Milestone 4**: Atomic status transitions (`pending` -> `running`, `running` -> `completed`/`failed`) and job deletion.
- [ ] **Milestone 5**: Backend automated tests (Jest + Supertest) covering transitions and concurrency safety.
- [ ] **Milestone 6**: Frontend API client and TanStack Query hooks.
- [ ] **Milestone 7**: Frontend dashboard layout, job cards/table, status filters, action controls, and 10s polling.
- [ ] **Milestone 8**: Production verification and deployment setup.
