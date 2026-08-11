# Inspire Homes — Care Management Platform

## What We're Building
A regulated, role-based care management web application for **Inspire Homes**, a supported living provider based in **Leeds, UK**.

## Who We Support
- Young people aged **16–25** who are looked after or care leavers
- **Lone asylum seekers** (unaccompanied minors and young adults)
- **Adults with mental health and learning disabilities**

## Regulatory Context
This platform handles sensitive personal data and must comply with:
- **Ofsted** regulations (for services supporting children/young people)
- **Children Act 1989 / 2004**
- **Care Act 2014**
- **Mental Capacity Act 2005** (MCA) — includes DoLS (Deprivation of Liberty Safeguards)
- **UK GDPR** and **Data Protection Act 2018**
- **Working Together to Safeguard Children 2023**
- **Care Quality Commission (CQC)** standards (for adult services)

## Tech Stack
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL, Auth, Storage, Row Level Security)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Utilities**: date-fns, clsx, tailwind-merge

## Roles & Permissions
| Role | Access Level |
|------|-------------|
| `super_admin` | Full access — manages all homes, users, system config |
| `manager` | Full access within their assigned home(s) |
| `staff` | Read/write for residents in their home; no admin |
| `social_worker` | Read-only access to specific assigned residents |
| `auditor` | Read-only access to all records in assigned home(s) |

All access is enforced via **Supabase Row Level Security (RLS)** policies, not just front-end guards.

## Core Modules
1. **Residents** — profiles, demographics, placement details, legal status
2. **Care Plans** — person-centred plans, goals, risk assessments
3. **Incidents** — incident reporting (safeguarding, behaviour, accidents), notifications
4. **Medications** — MAR charts, PRN logs, controlled drug records
5. **Daily Logs** — shift notes, handovers, wellbeing entries
6. **Staff** — profiles, training records, DBS checks, supervision logs
7. **Reports** — Ofsted/CQC-ready exports, custom reporting
8. **Documents** — secure file storage (referral packs, assessments, court orders)
9. **Admin** — user management, home/property configuration, audit logs

## Key Architecture Decisions
- **App Router** with route groups: `(auth)` for login pages, `(portal)` for the main app
- **Middleware** handles session validation and role-based redirects
- **Supabase SSR** client used server-side; browser client for client components
- All database access via Supabase with RLS — never bypass RLS with service role in user-facing routes
- Dates stored as **ISO 8601 UTC**, displayed in **Europe/London** timezone
- Audit trail on all sensitive record mutations (who changed what, when)

## Folder Structure
```
src/
  app/
    (auth)/           # Login, forgot password — no sidebar
    (portal)/         # Main app — with sidebar layout
      dashboard/
      residents/
      staff/
      incidents/
      medications/
      care-plans/
      reports/
      settings/
      admin/          # Super admin only
    api/              # Route handlers
  components/
    ui/               # Generic UI primitives (Button, Input, Badge, Modal...)
    layout/           # Sidebar, Header, PageWrapper
    forms/            # Shared form components
    residents/        # Resident-specific components
    incidents/        # Incident-specific components
    medications/      # Medication/MAR components
    care-plans/       # Care plan components
    staff/            # Staff-specific components
    shared/           # Cross-module shared components
  lib/
    supabase/         # Supabase client helpers (server + browser)
    validations/      # Zod schemas per module
    utils/            # Formatting, dates, permissions helpers
    hooks/            # Custom React hooks
    constants/        # Enums, lookup values (incident types, medication routes etc.)
  types/              # TypeScript types mirroring DB schema
supabase/
  migrations/         # SQL migration files
  seed/               # Seed data for dev/test
```

## Naming Conventions
- Components: PascalCase (`ResidentCard.tsx`)
- Hooks: camelCase prefixed with `use` (`useResidents.ts`)
- Utility functions: camelCase (`formatDate.ts`)
- DB tables: snake_case plural (`residents`, `care_plans`, `incident_reports`)
- Supabase migrations: `YYYYMMDD_description.sql`

## Sensitive Data Handling
- No resident PII in URLs — use opaque UUIDs only
- File uploads go to Supabase Storage with signed URLs (no public buckets for PII)
- All exports (PDF/CSV) logged in audit trail
- Social workers only see residents explicitly assigned to them via `resident_social_workers` junction table

## Development Notes
- Working directory: `/Users/mac/Documents/InspirePortal`
- Run dev: `npm run dev`
- Supabase config: `.env.local` (never commit — see `.env.example`)
