import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  FileSearch,
  GraduationCap,
  ShieldCheck,
  Target,
  Users,
  X
} from "lucide-react";
import { Bar, Brand, OrgMark, ScoreScale } from "../components/ui";

const roles = [
  {
    icon: GraduationCap,
    title: "Students",
    text: "A personal placement workspace from profile to offer letter.",
    points: ["Build an academic & skills profile", "Analyze your resume against any job", "Check eligibility before applying", "Track every application in one place"]
  },
  {
    icon: BriefcaseBusiness,
    title: "Training & Placement Officers",
    text: "Run recruitment drives without the spreadsheets.",
    points: ["Publish drives with eligibility rules", "Approve student registrations", "Shortlist, select or reject applicants", "Drive-wise placement reports"]
  },
  {
    icon: ShieldCheck,
    title: "College Admins",
    text: "Control access and keep the system organised.",
    points: ["Create and manage TPO accounts", "Activate or deactivate users", "Organise departments", "Oversee system activity"]
  }
];

const features = [
  { icon: FileSearch, title: "AI resume analysis", text: "Extracts skills from PDF/DOCX resumes and scores them against a job description." },
  { icon: Target, title: "Skill-gap detection", text: "Highlights matching skills and the exact skills a student still needs to learn." },
  { icon: CheckCircle2, title: "Instant eligibility", text: "CGPA, backlogs, department and batch rules are checked automatically." },
  { icon: BarChart3, title: "Placement analytics", text: "Live counts of applications, shortlists and selections for every drive." },
  { icon: Users, title: "Role-based portals", text: "Separate, focused workspaces for students, TPOs and administrators." },
  { icon: Building2, title: "Multi-college ready", text: "Each college registers, verifies and manages its own placement cell." }
];

const steps = [
  { title: "Register & get approved", text: "Students sign up under their verified college; the TPO approves them." },
  { title: "Complete your profile", text: "Add CGPA, department, batch and skills to unlock eligible drives." },
  { title: "Analyze & improve", text: "Upload your resume, see your match score and close skill gaps." },
  { title: "Apply & track", text: "Apply in one click and follow each stage until selection." }
];

function MatchPreview() {
  return (
    <div className="preview" aria-label="Example resume match report">
      <div className="preview-bar">
        <b>Resume analyzer</b> · Match report
        <span className="preview-label">Example data</span>
      </div>
      <div className="row" style={{ borderBottom: "1px solid var(--line-2)" }}>
        <OrgMark name="Nova Systems" />
        <div className="row-main">
          <strong>Java Backend Developer</strong>
          <span>Nova Systems · 8.5 LPA · Min. CGPA 7.0</span>
        </div>
        <span className="badge badge-status badge-success">open</span>
      </div>
      <div className="panel-body grid grid-2" style={{ gap: 24 }}>
        <ScoreScale value={78} />
        <div className="meters">
          <div className="meter-row"><span>Required skills</span><strong>2 / 3</strong><Bar value={67} tone="warning" /></div>
          <div className="meter-row"><span>Content similarity</span><strong>81%</strong><Bar value={81} tone="success" /></div>
        </div>
      </div>
      <div className="panel-section" style={{ paddingTop: 14 }}>
        <div className="tags">
          <span className="tag tag-match"><Check size={13} /> Java</span>
          <span className="tag tag-match"><Check size={13} /> SQL</span>
          <span className="tag tag-miss"><X size={13} /> Spring Boot</span>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>1 skill gap found. Learn Spring Boot to reach 90%+.</p>
      </div>
    </div>
  );
}

export default function Landing({ go }) {
  return (
    <div className="public">
      <header className="pub-nav">
        <div className="wrap pub-nav-inner">
          <Brand />
          <nav className="pub-links" aria-label="Sections">
            <a href="#roles">Who it's for</a>
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
          </nav>
          <div className="pub-nav-actions">
            <button className="btn btn-ghost" onClick={() => go("register-college")}>For colleges</button>
            <button className="btn btn-secondary" onClick={() => go("login")}>Sign in</button>
            <button className="btn btn-primary" onClick={() => go("register")}>Get started</button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1>Every placement drive, <em>one smart platform.</em></h1>
            <p className="hero-lead">
              PlacementHub automates college placements — from student profiles and eligibility checks to
              AI-powered resume matching, application tracking and placement reports.
            </p>
            <div className="hero-cta">
              <button className="btn btn-primary btn-lg" onClick={() => go("register")}>
                Create student account <ArrowRight size={17} />
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => go("login")}>Sign in to portal</button>
            </div>
            <div className="hero-facts">
              <div><strong>3 portals</strong><span>Student, TPO and admin</span></div>
              <div><strong>PDF / DOCX</strong><span>Resume parsing</span></div>
              <div><strong>Real-time</strong><span>Eligibility checks</span></div>
            </div>
          </div>
          <MatchPreview />
        </div>
      </section>

      <section className="section" id="roles">
        <div className="wrap">
          <div className="section-head">
            <h2>One system, three focused workspaces</h2>
            <p>Each role sees exactly what it needs — nothing more, nothing less.</p>
          </div>
          <div className="columns">
            {roles.map(({ icon: Icon, title, text, points }) => (
              <article key={title}>
                <h3><Icon size={18} /> {title}</h3>
                <p>{text}</p>
                <ul>
                  {points.map((point) => <li key={point}><Check size={15} />{point}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="features">
        <div className="wrap">
          <div className="match-demo">
            <div>
              <h2>Know exactly where you stand before you apply.</h2>
              <p>
                If a company asks for Java, SQL and Spring Boot, PlacementHub compares those requirements with
                your resume, shows the skills you already have and flags the gaps you should close first.
              </p>
              <div className="hero-cta">
                <button className="btn btn-primary" onClick={() => go("register")}>Try the resume analyzer <ArrowRight size={16} /></button>
              </div>
            </div>
            <div className="panel">
              <div className="panel-head"><h3>Skills for Java Backend Developer</h3><span className="muted">Example</span></div>
              <div className="panel-body grid grid-2">
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>Matching skills · 4</div>
                  <div className="tags">{["Java", "SQL", "Git", "REST APIs"].map((s) => <span className="tag tag-match" key={s}>{s}</span>)}</div>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>Skill gaps · 2</div>
                  <div className="tags">{["Spring Boot", "Docker"].map((s) => <span className="tag tag-miss" key={s}>{s}</span>)}</div>
                </div>
              </div>
              <div className="panel-section">
                <div className="meter-row"><span>Required skills covered</span><strong>4 / 6</strong><Bar value={66} tone="warning" /></div>
              </div>
            </div>
          </div>

          <div className="feature-list">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title}>
                <Icon size={19} />
                <div><h3>{title}</h3><p>{text}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="wrap">
          <div className="section-head">
            <h2>From registration to offer in four steps</h2>
          </div>
          <ol className="process">
            {steps.map((step) => (
              <li key={step.title}><h3>{step.title}</h3><p>{step.text}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="cta-band">
        <div className="wrap">
          <div>
            <h2>Bring your placement cell online</h2>
            <p>Register your college, invite your TPOs and let students start preparing today.</p>
          </div>
          <div className="hero-cta">
            <button className="btn btn-on-navy btn-lg" onClick={() => go("register-college")}>Register your college</button>
            <button className="btn btn-outline-navy btn-lg" onClick={() => go("login")}>Sign in</button>
          </div>
        </div>
      </section>

      <footer className="pub-footer">
        <div className="wrap">
          <Brand />
          <span>© {new Date().getFullYear()} PlacementHub · AI-Driven Placement Management System</span>
        </div>
      </footer>
    </div>
  );
}
