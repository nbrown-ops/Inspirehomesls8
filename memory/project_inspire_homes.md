---
name: Inspire Homes Platform — Project Context
description: Core context for the Inspire Homes care management platform — who it's for, regulations, tech stack, and architecture
type: project
---

Inspire Homes is a regulated care management web platform for a supported living provider in Leeds, UK.

**Who they support**: Young people aged 16–25 (looked after, care leavers, lone asylum seekers), and adults with mental health and learning disabilities.

**Regulations**: Ofsted, Children Act 1989/2004, Care Act 2014, Mental Capacity Act 2005, UK GDPR/DPA 2018, CQC.

**Tech stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth + Storage + RLS), React Hook Form + Zod, date-fns, Lucide React.

**Roles**: super_admin, manager, staff, social_worker (read-only, assigned residents only), auditor (read-only).

**Core modules planned**: Residents, Care Plans, Incidents, Medications (MAR charts), Daily Logs, Staff management, Reports (Ofsted/CQC exports), Documents, Admin/audit.

**Architecture**: Route groups — (auth) for login, (portal) for main app. Middleware validates sessions. RLS enforced at DB level. Social workers access only residents in resident_social_workers junction table.

**Working directory**: /Users/mac/Documents/InspirePortal

**Why**: This is a long-running project — context must persist across sessions.

**How to apply**: Always refer to this context when building new features — respect the regulatory requirements, role restrictions, and UK-specific conventions (dates as dd/MM/yyyy, Europe/London timezone, NHS number format, etc.)
