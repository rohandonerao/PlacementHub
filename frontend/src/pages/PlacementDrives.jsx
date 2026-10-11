import { useState } from "react";
import { BriefcaseBusiness, Check, CheckCircle2, CircleX, ClipboardList, Clock3, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import {
  Alert,
  Empty,
  OrgMark,
  PageHeader,
  SkeletonRows,
  StatusBadge,
  daysUntil,
  deadlineLabel,
  driveStatus,
  formatDate,
  isOpen
} from "../components/ui";

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "Not set";
  return Array.isArray(value) ? value.join(", ") : String(value);
};

export default function PlacementDrives({
  tab,
  setTab,
  placementError,
  placementMessage,
  placementLoading,
  drives,
  eligibility,
  loadEligibility,
  handleApply,
  applications,
  loadPlacementData
}) {
  const [query, setQuery] = useState("");
  const [driveFilter, setDriveFilter] = useState("open");
  const [appFilter, setAppFilter] = useState("all");
  const [busy, setBusy] = useState("");

  const appliedIds = new Set(applications.map((app) => app.drive?._id || app.drive).filter(Boolean));
  const q = query.trim().toLowerCase();

  const visibleDrives = drives.filter((drive) => {
    const open = isOpen(drive);
    if (driveFilter === "open" && !open) return false;
    if (driveFilter === "closed" && open) return false;
    return !q || [drive.companyName, drive.jobTitle, ...(drive.requiredSkills || [])]
      .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
  });

  const statusOf = (app) => String(app.status || "applied").toLowerCase();
  const visibleApps = applications.filter((app) => {
    if (appFilter !== "all" && statusOf(app) !== appFilter) return false;
    return !q || [app.drive?.companyName, app.drive?.jobTitle].filter(Boolean).some((v) => v.toLowerCase().includes(q));
  });

  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(""); }
  };

  const isDrives = tab === "drives";

  return (
    <>
      <PageHeader
        title={isDrives ? "Placement drives" : "My applications"}
        description={isDrives
          ? "Check your eligibility for each drive before applying. Requirements are compared with your saved profile."
          : "Follow each application from submission to the final decision."}
        actions={<button className="btn btn-secondary" onClick={loadPlacementData} disabled={placementLoading}><RefreshCw size={15} /> Refresh</button>}
      />

      <Alert tone="error">{placementError}</Alert>
      <Alert tone="success">{placementMessage}</Alert>

      <div className="panel">
        <div className="tabs" role="tablist" style={{ padding: "0 8px" }}>
          {isDrives ? (
            [["open", "Open", drives.filter(isOpen).length], ["closed", "Closed", drives.filter((d) => !isOpen(d)).length], ["all", "All", drives.length]].map(([value, label, n]) => (
              <button key={value} role="tab" aria-selected={driveFilter === value} className={driveFilter === value ? "active" : ""} onClick={() => setDriveFilter(value)}>
                {label} <span className="count">{n}</span>
              </button>
            ))
          ) : (
            [["all", "All"], ["applied", "Applied"], ["shortlisted", "Interview"], ["selected", "Selected"], ["rejected", "Rejected"]].map(([value, label]) => (
              <button key={value} role="tab" aria-selected={appFilter === value} className={appFilter === value ? "active" : ""} onClick={() => setAppFilter(value)}>
                {label} <span className="count">{value === "all" ? applications.length : applications.filter((a) => statusOf(a) === value).length}</span>
              </button>
            ))
          )}
        </div>
        <div className="panel-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <label className="input-icon">
            <Search size={15} />
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isDrives ? "Search by company, role or skill" : "Search by company or role"} aria-label="Search" />
          </label>
        </div>
      </div>

      {placementLoading ? (
        <div className="panel"><SkeletonRows rows={4} /></div>
      ) : isDrives ? (
        visibleDrives.length === 0 ? (
          <div className="panel">
            <Empty
              icon={BriefcaseBusiness}
              title={drives.length ? "No drives match this view" : "No placement drives yet"}
              text={drives.length ? "Try another search term or switch between open and closed drives." : "Drives published by your placement office will appear here."}
            />
          </div>
        ) : (
          <div className="grid grid-auto">
            {visibleDrives.map((drive) => {
              const result = eligibility[drive._id];
              const applied = appliedIds.has(drive._id);
              const days = daysUntil(drive.applicationDeadline);
              const status = driveStatus(drive);
              const checks = Array.isArray(result?.checks) ? result.checks : [];
              return (
                <article className="panel drive" key={drive._id}>
                  <div className="drive-head">
                    <OrgMark name={drive.companyName} large />
                    <div className="dh-main">
                      <h3>{drive.jobTitle || "Placement opportunity"}</h3>
                      <p>{drive.companyName || "Company"}</p>
                    </div>
                    {applied ? <StatusBadge status="applied" label="Applied" /> : <StatusBadge status={status} />}
                  </div>
                  {drive.description && <p className="drive-desc">{drive.description}</p>}
                  <div className="drive-facts">
                    <div><span>Package</span><strong>{drive.packageLPA != null ? `${drive.packageLPA} LPA` : "—"}</strong></div>
                    <div><span>Min. CGPA</span><strong>{drive.minimumCgpa ?? "—"}</strong></div>
                    <div>
                      <span>Deadline</span>
                      <strong className={status === "open" && days <= 3 ? "urgent" : ""}>{formatDate(drive.applicationDeadline)}</strong>
                    </div>
                  </div>
                  {drive.requiredSkills?.length > 0 && (
                    <div className="drive-skills tags">
                      {drive.requiredSkills.map((skill) => <span className="tag" key={skill}>{skill}</span>)}
                    </div>
                  )}

                  {result && (
                    <div className={`elig ${result.canApply ? "elig-pass" : "elig-fail"}`}>
                      <div className="elig-head">
                        {result.canApply ? <CheckCircle2 size={16} /> : <CircleX size={16} />}
                        {result.canApply ? "You are eligible for this drive" : result.eligible ? "This drive is no longer accepting applications" : "You do not meet all criteria"}
                      </div>
                      {checks.length > 0 && (
                        <table>
                          <tbody>
                            {checks.map((check) => (
                              <tr key={check.criterion}>
                                <td className="ico">{check.passed ? <Check size={15} className="pass" aria-label="Met" /> : <X size={15} className="fail" aria-label="Not met" />}</td>
                                <td>
                                  <strong style={{ fontWeight: 600 }}>{check.criterion}</strong>
                                  <div className="muted">You: {formatValue(check.actual)} · Required: {formatValue(check.required)}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  <div className="drive-foot">
                    {status === "open" && <span className="note"><Clock3 size={14} /> {deadlineLabel(drive.applicationDeadline)}</span>}
                    <span className="spacer" />
                    {applied ? (
                      <button className="btn btn-secondary btn-sm" onClick={() => setTab("applications")}>View application</button>
                    ) : (
                      <>
                        <button className="btn btn-secondary btn-sm" disabled={busy === `e-${drive._id}`} onClick={() => run(`e-${drive._id}`, () => loadEligibility(drive._id))}>
                          <ShieldCheck size={15} /> {result ? "Check again" : "Check eligibility"}
                        </button>
                        {result && (
                          <button className="btn btn-primary btn-sm" disabled={!result.canApply || busy === `a-${drive._id}`} onClick={() => run(`a-${drive._id}`, () => handleApply(drive._id))}>
                            {busy === `a-${drive._id}` ? "Applying…" : "Apply now"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : visibleApps.length === 0 ? (
        <div className="panel">
          <Empty
            icon={ClipboardList}
            title={applications.length ? "No applications match this view" : "No applications yet"}
            text={applications.length ? "Try another search term or status." : "Once you apply to a drive, you can follow its progress here."}
            action={!applications.length && <button className="btn btn-primary btn-sm" onClick={() => setTab("drives")}>Browse drives</button>}
          />
        </div>
      ) : (
        <div className="panel">
          {visibleApps.map((app) => (
            <div className="app-row" key={app._id}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                <OrgMark name={app.drive?.companyName} />
                <div className="row-main">
                  <strong>{app.drive?.jobTitle || "Placement drive"}</strong>
                  <span>{app.drive?.companyName || "Company"} · Applied {formatDate(app.appliedAt)}</span>
                </div>
              </div>
              <StatusTrack status={app.status} />
              <StatusBadge status={app.status} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function StatusTrack({ status }) {
  const s = String(status || "applied").toLowerCase();
  const reached = { applied: 1, shortlisted: 2, selected: 3, rejected: 1 }[s] || 1;
  const steps = ["Applied", "Interview", s === "rejected" ? "Not selected" : "Selected"];
  return (
    <div className="steps-track" aria-label={`Application status: ${s}`}>
      {steps.map((label, index) => {
        const n = index + 1;
        let cls = n <= reached ? "done" : "";
        if (s === "rejected" && n === 3) cls = "fail";
        if (s === "selected" && n === 3) cls = "win";
        const current = (s === "rejected" && n === 3) || (s !== "rejected" && n === reached);
        return (
          <div key={label} style={{ display: "contents" }}>
            {index > 0 && <span className={`ln ${n <= reached ? "done" : ""}`} />}
            <span className={`st ${cls} ${current ? "current" : ""}`}>
              <span className="dot">{cls === "fail" ? <X size={10} /> : cls ? <Check size={10} /> : null}</span>
              <span className="lbl">{label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
