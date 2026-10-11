import { useState } from "react";
import { Check, FileCheck2, Lightbulb, Upload, X } from "lucide-react";
import { Alert, Bar, Field, PageHeader, ScoreScale, StatusBadge, scoreTone } from "../components/ui";

const asList = (value) => (Array.isArray(value) ? value : []);
const isNum = (value) => typeof value === "number" && !Number.isNaN(value);
const label = (key) => {
  const text = key.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

function verdict(score) {
  if (score >= 75) return ["success", "Strong match", "Your resume covers this role well. Close the remaining gaps and apply."];
  if (score >= 50) return ["warning", "Moderate match", "You meet a good part of the requirements. Closing the gaps below will noticeably improve your chances."];
  return ["danger", "Needs work", "Several key requirements were not found in your resume. Focus on the missing skills before applying."];
}

export default function ResumeAnalyzer({
  drives,
  resume,
  handleResumeChange,
  jobDescription,
  setJobDescription,
  analysis,
  analysisError,
  analyzing,
  handleAnalyzeResume
}) {
  const [driveId, setDriveId] = useState("");
  const [drag, setDrag] = useState(false);

  const applyDrive = (id) => {
    setDriveId(id);
    const drive = drives.find((d) => d._id === id);
    if (!drive) return;
    setJobDescription(
      `${drive.jobTitle} — ${drive.companyName}\n\nRequired Skills:\n${(drive.requiredSkills || []).join(", ")}\n\n${drive.description || ""}`.trim()
    );
  };

  return (
    <>
      <PageHeader
        title="Resume analyzer"
        description="Compare your resume with a job description to see your match score, the skills you already have and the gaps to close."
      />

      <form className="grid grid-main-side" onSubmit={handleAnalyzeResume}>
        <div className="panel">
          <div className="panel-head"><div><h2>Resume</h2><p>PDF or DOCX, up to 5 MB.</p></div></div>
          <div className="panel-body">
            <div
              className={`dropzone ${resume ? "has-file" : ""} ${drag ? "drag" : ""}`}
              onDragEnter={() => setDrag(true)}
              onDragLeave={() => setDrag(false)}
              onDrop={() => setDrag(false)}
            >
              <div className="dz-icon">{resume ? <FileCheck2 size={20} /> : <Upload size={20} />}</div>
              <div style={{ minWidth: 0 }}>
                <strong>{resume ? resume.name : "Choose a file or drag it here"}</strong>
                <span>{resume ? `${Math.max(1, Math.round(resume.size / 1024))} KB · ready to analyze` : "PDF or DOCX"}</span>
              </div>
              <input
                id="resume-file"
                type="file"
                aria-label="Resume file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleResumeChange}
              />
            </div>
          </div>
          <div className="panel-section">
            <h3>Job description</h3>
            <p>Pick one of your college's drives, or paste any job description.</p>
            <div className="stack">
              {drives.length > 0 && (
                <Field label="Placement drive" hint="Optional" htmlFor="ra-drive">
                  <select id="ra-drive" className="select" value={driveId} onChange={(e) => applyDrive(e.target.value)}>
                    <option value="">Select a drive to fill in its requirements</option>
                    {drives.map((d) => <option key={d._id} value={d._id}>{d.companyName} — {d.jobTitle}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Description" hint={`${jobDescription.length} characters`} htmlFor="job-description">
                <textarea
                  id="job-description"
                  className="textarea"
                  rows={9}
                  value={jobDescription}
                  onChange={(e) => { setJobDescription(e.target.value); setDriveId(""); }}
                  placeholder="Paste the job description, including the required skills"
                  required
                />
              </Field>
              <Alert tone="error">{analysisError}</Alert>
            </div>
          </div>
          <div className="panel-foot">
            <button className="btn btn-primary" type="submit" disabled={analyzing}>
              {analyzing ? <><span className="spinner" /> Analyzing…</> : "Analyze resume"}
            </button>
          </div>
        </div>

        <aside className="panel">
          <div className="panel-head"><h2>How the score works</h2></div>
          <div className="panel-body stack" style={{ gap: 12 }}>
            <p className="muted" style={{ fontSize: 13.5, color: "var(--text-2)" }}>
              Skills are extracted from your resume and from the job description, then compared. Required skills weigh most,
              followed by preferred skills and overall content similarity.
            </p>
            <ul className="checks">
              <li><Check size={15} className="ok" />Match score out of 100</li>
              <li><Check size={15} className="ok" />Skills found in both</li>
              <li><Check size={15} className="ok" />Skills missing from your resume</li>
              <li><Check size={15} className="ok" />Resume sections detected</li>
            </ul>
            <Alert tone="info">This is an estimate to guide your preparation, not an official ATS result.</Alert>
          </div>
        </aside>
      </form>

      {analyzing && (
        <div className="panel panel-body stack" aria-hidden="true">
          <span className="sk" style={{ width: "30%", height: 16 }} />
          <span className="sk" style={{ height: 56 }} />
          <span className="sk" style={{ width: "70%" }} />
        </div>
      )}

      {analysis && !analyzing && <Report analysis={analysis} />}
    </>
  );
}

function Report({ analysis }) {
  const score = Number(analysis.ats_compatibility_score ?? analysis.match_score ?? analysis.score ?? 0);
  const [tone, title, text] = verdict(score);
  const matched = asList(analysis.matched_skills);
  const missing = asList(analysis.missing_job_skills ?? analysis.missing_skills);
  const missingRequired = asList(analysis.missing_required_skills);
  const resumeSkills = asList(analysis.resume_skills);
  const suggestions = asList(analysis.suggestions);
  const checks = analysis.structure_checks && typeof analysis.structure_checks === "object" ? Object.entries(analysis.structure_checks) : [];

  const meters = [
    ["Required skills", analysis.required_skill_score],
    ["Preferred skills", analysis.preferred_skill_score],
    ["Overall skill match", analysis.skill_match_score],
    ["Content similarity", analysis.text_similarity_score],
    ["Resume structure", analysis.resume_structure_score]
  ].filter(([, value]) => isNum(value));

  return (
    <section className="panel" aria-live="polite">
      <div className="panel-head">
        <div><h2>Analysis report</h2><p>{matched.length} matching skill{matched.length === 1 ? "" : "s"} · {missing.length} gap{missing.length === 1 ? "" : "s"}</p></div>
        {analysis.trained_model_prediction && (
          <span className="muted">
            Relevance model: {label(analysis.trained_model_prediction).toLowerCase()}
            {isNum(analysis.trained_model_relevance_score) ? ` (${Math.round(analysis.trained_model_relevance_score)}%)` : ""}
          </span>
        )}
      </div>

      <div className="report-head">
        <div>
          <ScoreScale value={score} />
          <div style={{ marginTop: 14 }}><StatusBadge status={tone === "success" ? "selected" : tone === "warning" ? "shortlisted" : "rejected"} label={title} /></div>
          <p>{text}</p>
        </div>
        {meters.length > 0 && (
          <div className="meters">
            {meters.map(([name, value]) => (
              <div className="meter-row" key={name}>
                <span>{name}</span><strong>{Math.round(value)}%</strong>
                <Bar value={value} tone={scoreTone(value)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-section grid grid-2" style={{ gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 14, marginBottom: 10 }}>Matching skills</h3>
          {matched.length ? (
            <div className="tags">{matched.map((s) => <span className="tag tag-match" key={s}><Check size={13} /> {s}</span>)}</div>
          ) : <p className="muted">No matching skills were detected.</p>}
        </div>
        <div>
          <h3 style={{ fontSize: 14, marginBottom: 10 }}>Skill gaps</h3>
          {missing.length ? (
            <div className="tags">{missing.map((s) => <span className="tag tag-miss" key={s}><X size={13} /> {s}</span>)}</div>
          ) : <p className="muted">No skill gaps found for this role.</p>}
          {missingRequired.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Alert tone="warning">Required for this role: <strong>{missingRequired.join(", ")}</strong>.</Alert>
            </div>
          )}
        </div>
      </div>

      <div className="panel-section grid grid-main-side" style={{ gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 14, marginBottom: 10 }}>Suggestions</h3>
          {suggestions.length ? (
            <ul className="suggestions">{suggestions.map((s, i) => <li key={i}><Lightbulb size={15} />{typeof s === "string" ? s : JSON.stringify(s)}</li>)}</ul>
          ) : <p className="muted">No suggestions. Your resume is well prepared for this role.</p>}
        </div>
        {checks.length > 0 && (
          <div>
            <h3 style={{ fontSize: 14, marginBottom: 6 }}>Resume sections</h3>
            <ul className="checks checks-2">
              {checks.map(([key, ok]) => (
                <li key={key} className={ok ? "" : "pending"}>{ok ? <Check size={15} className="ok" /> : <X size={15} className="no" />}{label(key)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {resumeSkills.length > 0 && (
        <div className="panel-section">
          <h3>Skills found in your resume</h3>
          <p>{resumeSkills.length} detected. Update your resume and analyze again to see a new score.</p>
          <div className="tags">{resumeSkills.map((s) => <span className="tag" key={s}>{s}</span>)}</div>
        </div>
      )}
    </section>
  );
}
