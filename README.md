<<<<<<< HEAD
# AI-Driven Placement Management System

Initial starter scaffold based on the technology plan. Development was listed as not started in the supplied plan.

## Stack
- React + Vite frontend
- Node.js + Express backend
- MongoDB with Mongoose
- JWT + bcrypt password hashing
- Python FastAPI resume analysis service
- ATS compatibility estimate using PDF/DOCX extraction, skill matching, TF-IDF/cosine similarity, and transparent weighted scoring

## Requirements
Install Node.js 20+, Python 3.10+, and have MongoDB running.

## Start backend
```bash
cd backend
copy .env.example .env
npm install
npm run dev
```
Use `cp .env.example .env` on macOS/Linux.

## Start frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```

## Start Python service (new terminal)
```bash
cd ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```
On macOS/Linux, activate with `source .venv/bin/activate`.

URLs: frontend http://localhost:5173, backend http://localhost:5000, Python service http://localhost:8000.

This is a starter scaffold, not a finished system. The ATS score is an initial heuristic, not an official company ATS score or a trained predictive model. The next steps are testing locally, completing authentication and role dashboards, connecting the frontend to APIs, and adding the placement workflows.
=======
# PlacementHub
Placement For Students
>>>>>>> 1f7254db462dfb50f84332f06dbb34ccaca35587
