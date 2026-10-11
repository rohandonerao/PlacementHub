# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- Students (final-year undergraduates) preparing for campus placements: build a profile, upload a resume, check eligibility, apply to drives, track applications.
- Training & Placement Officers (TPOs): run placement drives, approve student registrations, manage applicants and interview shortlists, read placement reports.
- College administrators: register the college, create and manage TPO accounts and departments.
- (Inferred) Also shown to faculty and evaluators as an academic project; it must read as a credible institutional product.

## Product Purpose
Automate a college placement cell's work and help students prepare for suitable jobs. Success: less manual coordination for TPOs, students apply only where eligible and know which skills to build.

## Positioning
Resume-to-requirement skill matching inside the placement workflow: a drive's required skills (e.g. Java, SQL, Spring Boot) are compared with a student's resume to produce a match score, matching skills and skill gaps.

## Capabilities and Constraints
- React (Vite) frontend; Node/Express + MongoDB backend; Python FastAPI resume-analysis service.
- Roles: student, tpo, admin. Students need TPO approval; college admins verify by email.
- Application statuses: applied, shortlisted (interview stage), selected, rejected. Drives: open/closed with deadline.
- Resume score is a heuristic estimate, not an official ATS score; the UI must say so.
- No backend yet for interview scheduling, activity logs or a separate companies entity.

## Brand Commitments
- Name: PlacementHub. No logo asset exists.
- Landing page sections and copy are kept.

## Evidence on Hand
No real customers, testimonials, statistics or college logos. Do not fabricate them.

## Product Principles
- Trustworthy over flashy: it represents a college's placement office.
- Eligibility and status must be unambiguous at a glance.
- Show students what to do next, not just data.
