import {
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardList,
  FileSearch,
  LayoutDashboard,
  Lightbulb,
  Save,
  UserRound,
  X
} from "lucide-react";
import {
  Alert,
  AppShell,
  Avatar,
  Bar,
  Empty,
  Field,
  OrgMark,
  PageHeader,
  SkeletonRows,
  StatusBadge,
  Summary,
  daysUntil,
  deadlineLabel,
  formatDate,
  isOpen
} from "../components/ui";
import PlacementDrives from "./PlacementDrives";
import ResumeAnalyzer from "./ResumeAnalyzer";

const profileFields = [
  ["name", "Full name"],
  ["phone", "Phone number"],
  ["college", "College"],
  ["department", "Department"],
  ["graduationYear", "Graduation year"],
  ["cgpa", "CGPA"],
  ["backlogs", "Backlogs"]
];

const filled = (value) => value !== null && value !== undefined && value !== "";

function completionOf(profile, skills) {
  if (!profile) return { percent: 0, items: [] };
  const items = [
    ...profileFields.map(([key, label]) => [label, filled(profile[key])]),
    ["Skills", skills.length > 0]
  ];
  return { percent: Math.round((items.filter(([, ok]) => ok).length / items.length) * 100), items };
}

export default function StudentWorkspace(props) {
  const { user, profile, profileLoading, logout, tab, setTab, drives, applications, skillsInput } = props;
  const skills = (skillsInput || "").split(",").map((s) => s.trim()).filter(Boolean);
  const completion = completionOf(profile, skills);
  const openDrives = drives.filter(isOpen);

  const nav = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "drives", label: "Placement drives", icon: BriefcaseBusiness, count: openDrives.length },
    { id: "applications", label: "My applications", icon: ClipboardList, count: applications.length },
    { id: "resume", label: "Resume analyzer", icon: FileSearch },
    { id: "profile", label: "My profile", icon: UserRound }
  ];

  let body;
  if (profileLoading) body = <div className="panel"><SkeletonRows rows={5} /></div>;
  else if (!profile) body = <Alert tone="error">{props.error || "We couldn't load your profile. Please sign in again."}</Alert>;
  else if (tab === "overview") body = <Overview {...props} skills={skills} completion={completion} openDrives={openDrives} />;
  else if (tab === "profile") body = <Profile {...props} skills={skills} completion={completion} />;
  else if (tab === "drives" || tab === "applications") body = <PlacementDrives {...props} />;
  else body = <ResumeAnalyzer {...props} />;

  return (
    <AppShell nav={nav} active={tab} onNavigate={setTab} user={user} roleLabel="Student" section="Student portal" onLogout={logout}>
      {body}
    </AppShell>
  );
}

function Overview({ user, profile, setTab, applications, openDrives, completion, placementLoading }) {
  const count = (status) => applications.filter((app) => String(app.status || "applied").toLowerCase() === status).length;
  const upcoming = [...openDrives].sort((a, b) => new Date(a.applicationDeadline) - new Date(b.applicationDeadline)).slice(0, 5);
  const recent = [...applications]
    .sort((a, b) => new Date(b.appliedAt || b.createdAt || 0) - new Date(a.appliedAt || a.createdAt || 0))
    .slice(0, 5);
  const missing = completion.items.filter(([, ok]) => !ok);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.name?.split(" ")[0] || "Student"}. Here is where your placements stand today.`}
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setTab("resume")}><FileSearch size={16} /> Analyze resume</button>
            <button className="btn btn-primary" onClick={() => setTab("drives")}>Browse drives</button>
          </>
        }
      />

      <Summary
        loading={placementLoading}
        items={[
          ["Open drives", openDrives.length, "Accepting applications"],
          ["Applications", applications.length, "Submitted by you"],
          ["In interview", count("shortlisted"), "Shortlisted by recruiters"],
          ["Selected", count("selected"), "Offers received"]
        ]}
      />

      <section className="grid grid-main-side">
        <div className="panel">
          <div className="panel-head">
            <div><h2>Upcoming deadlines</h2><p>Open drives, closing soonest first.</p></div>
            <button className="btn btn-ghost btn-sm" onClick={() => setTab("drives")}>All drives</button>
          </div>
          {placementLoading ? <SkeletonRows rows={3} /> : upcoming.length === 0 ? (
            <Empty icon={CalendarClock} title="No open drives right now" text="New opportunities appear here as soon as your placement office publishes them." />
          ) : (
            <div className="rows">
              {upcoming.map((drive) => {
                const days = daysUntil(drive.applicationDeadline);
                return (
                  <button className="row row-link" key={drive._id} onClick={() => setTab("drives")}>
                    <OrgMark name={drive.companyName} />
                    <div className="row-main">
                      <strong>{drive.jobTitle}</strong>
                      <span>{drive.companyName}{drive.packageLPA != null ? ` · ${drive.packageLPA} LPA` : ""} · Min. CGPA {drive.minimumCgpa}</span>
                    </div>
                    <span className={`row-meta ${days <= 3 ? "urgent" : ""}`}>{deadlineLabel(drive.applicationDeadline)}</span>
                    <ChevronRight size={16} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <div><h2>Your profile</h2><p>Used for every eligibility check.</p></div>
            <button className="btn btn-ghost btn-sm" onClick={() => setTab("profile")}>Edit</button>
          </div>
          <div className="panel-body stack">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={profile.name} size="lg" />
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: 15 }}>{profile.name}</strong>
                <span className="muted">{profile.department || "Department not set"}</span>
              </div>
            </div>
            <div className="kv">
              <div><span>CGPA</span><strong>{profile.cgpa ?? "—"}</strong></div>
              <div><span>Backlogs</span><strong>{profile.backlogs ?? "—"}</strong></div>
              <div><span>Batch</span><strong>{profile.graduationYear ?? "—"}</strong></div>
            </div>
            <div className="meter-row">
              <span>Profile completion</span><strong>{completion.percent}%</strong>
              <Bar value={completion.percent} tone={completion.percent === 100 ? "success" : ""} />
            </div>
            {missing.length > 0 && (
              <p className="muted">Missing: {missing.map(([label]) => label).join(", ")}.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-main-side">
        <div className="panel">
          <div className="panel-head">
            <div><h2>Recent applications</h2><p>Latest status from recruiters.</p></div>
            <button className="btn btn-ghost btn-sm" onClick={() => setTab("applications")}>All applications</button>
          </div>
          {placementLoading ? <SkeletonRows rows={3} /> : recent.length === 0 ? (
            <Empty icon={ClipboardList} title="No applications yet" text="Check your eligibility for an open drive, then apply in one click." action={<button className="btn btn-primary btn-sm" onClick={() => setTab("drives")}>Find drives</button>} />
          ) : (
            <div className="rows">
              {recent.map((app) => (
                <div className="row" key={app._id}>
                  <OrgMark name={app.drive?.companyName} />
                  <div className="row-main">
                    <strong>{app.drive?.jobTitle || "Placement drive"}</strong>
                    <span>{app.drive?.companyName || "Company"} · Applied {formatDate(app.appliedAt)}</span>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Next steps</h2></div>
          <div className="rows">
            {[
              ["resume", FileSearch, "Analyze your resume", "Match score and skill gaps for a role"],
              ["drives", BriefcaseBusiness, "Check eligibility", "See which drives you qualify for"],
              ["profile", UserRound, "Update your profile", "CGPA, skills and contact details"]
            ].map(([id, Icon, title, text]) => (
              <button className="row row-link" key={id} onClick={() => setTab(id)}>
                <Icon size={18} color="var(--accent)" />
                <div className="row-main"><strong>{title}</strong><span>{text}</span></div>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Profile({ profile, error, message, loading, skillsInput, setSkillsInput, saveProfile, updateProfileField, skills, completion }) {
  return (
    <>
      <PageHeader
        title="My profile"
        description="Keep your academic and technical details current. They are checked against every drive's eligibility rules."
      />

      <Alert tone="error">{error}</Alert>
      <Alert tone="success">{message}</Alert>

      <form className="grid grid-main-side" onSubmit={saveProfile}>
        <div className="panel">
          <div className="panel-head"><div><h2>Personal details</h2><p>Fields marked * are required.</p></div></div>
          <div className="panel-body form-grid">
            <Field label="Full name *" htmlFor="pf-name">
              <input id="pf-name" className="input" name="name" value={profile.name || ""} onChange={updateProfileField} required />
            </Field>
            <Field label="Email address" hint="Cannot be changed" htmlFor="pf-email">
              <input id="pf-email" className="input" value={profile.email || ""} readOnly />
            </Field>
            <Field label="Phone number" htmlFor="pf-phone">
              <input id="pf-phone" className="input" name="phone" value={profile.phone || ""} onChange={updateProfileField} placeholder="+91 98765 43210" inputMode="tel" />
            </Field>
            <Field label="College / Institute" htmlFor="pf-college">
              <input id="pf-college" className="input" name="college" value={profile.college || ""} onChange={updateProfileField} />
            </Field>
          </div>
          <div className="panel-section">
            <h3>Academic details</h3>
            <p>Recruiters filter applicants using these values.</p>
            <div className="form-grid">
              <Field label="Department" htmlFor="pf-dept">
                {profile.collegeDepartments?.length > 0 ? (
                  <select id="pf-dept" className="select" name="department" value={profile.department || ""} onChange={updateProfileField}>
                    <option value="">Select your department</option>
                    {profile.department && !profile.collegeDepartments.includes(profile.department) && (
                      <option value={profile.department}>{profile.department} (not on college list)</option>
                    )}
                    {profile.collegeDepartments.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                ) : (
                  <input id="pf-dept" className="input" name="department" value={profile.department || ""} onChange={updateProfileField} placeholder="e.g. Computer Engineering" />
                )}
              </Field>
              <Field label="Graduation year" htmlFor="pf-year">
                <input id="pf-year" className="input" type="number" name="graduationYear" min="2000" max="2100" value={profile.graduationYear ?? ""} onChange={updateProfileField} placeholder="e.g. 2027" />
              </Field>
              <Field label="CGPA" hint="Out of 10" htmlFor="pf-cgpa">
                <input id="pf-cgpa" className="input" type="number" name="cgpa" min="0" max="10" step="0.01" value={profile.cgpa ?? ""} onChange={updateProfileField} placeholder="e.g. 8.50" />
              </Field>
              <Field label="Active backlogs" htmlFor="pf-backlogs">
                <input id="pf-backlogs" className="input" type="number" name="backlogs" min="0" step="1" value={profile.backlogs ?? ""} onChange={updateProfileField} placeholder="0" />
              </Field>
            </div>
          </div>
          <div className="panel-section">
            <h3>Technical skills</h3>
            <p>Separate skills with commas, written as they appear in job descriptions.</p>
            <textarea className="textarea" rows={3} value={skillsInput} onChange={(event) => setSkillsInput(event.target.value)} placeholder="Java, SQL, Spring Boot, React, Git" aria-label="Technical skills" />
            {skills.length > 0 && <div className="tags" style={{ marginTop: 12 }}>{skills.map((s) => <span className="tag" key={s}>{s}</span>)}</div>}
          </div>
          <div className="panel-foot">
            <button className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Saving…</> : <><Save size={16} /> Save changes</>}
            </button>
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <div className="panel-head"><h2>Completeness</h2><strong className="num">{completion.percent}%</strong></div>
            <div className="panel-body">
              <Bar value={completion.percent} tone={completion.percent === 100 ? "success" : ""} />
              <ul className="checks" style={{ marginTop: 12 }}>
                {completion.items.map(([label, ok]) => (
                  <li key={label} className={ok ? "" : "pending"}>
                    {ok ? <Check size={15} className="ok" /> : <X size={15} className="no" />}{label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h2>Tips</h2></div>
            <div className="panel-body">
              <ul className="suggestions">
                <li><Lightbulb size={15} />List skills exactly as job descriptions write them, e.g. “Spring Boot”.</li>
                <li><Lightbulb size={15} />Keep CGPA and backlogs accurate. Eligibility is checked automatically.</li>
                <li><Lightbulb size={15} />Run the resume analyzer to find missing skills for a role.</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
