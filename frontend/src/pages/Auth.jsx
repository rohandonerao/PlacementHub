import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  Eye,
  EyeOff,
  FileSearch,
  RefreshCw,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { Alert, Brand, Field } from "../components/ui";
import { forgotPassword, resetPassword } from "../api";

function AuthLayout({ onBack, children, wide = false }) {
  return (
    <div className="auth">
      <aside className="auth-aside">
        <Brand light sub="Training & Placement Management" />
        <div className="auth-aside-body">
          <h2>Your campus placements, organised and intelligent.</h2>
          <p>One secure portal for students, placement officers and college administrators.</p>
          <ul className="auth-points">
            <li>
              <FileSearch size={16} />
              <div><strong>AI resume matching</strong>See your match score and missing skills for every role.</div>
            </li>
            <li>
              <BriefcaseBusiness size={16} />
              <div><strong>Placement drives</strong>Check eligibility and apply in a single click.</div>
            </li>
            <li>
              <ShieldCheck size={16} />
              <div><strong>Verified access</strong>Every college and student is approved before access.</div>
            </li>
          </ul>
        </div>
        <small>© {new Date().getFullYear()} PlacementHub</small>
      </aside>
      <main className="auth-main">
        <div className="auth-top">
          <Brand />
          {onBack && (
            <button className="btn btn-ghost btn-sm" onClick={onBack}>
              <ArrowLeft size={15} /> Back to home
            </button>
          )}
        </div>
        <div className={`auth-form-wrap ${wide ? "wide" : ""}`}>{children}</div>
      </main>
    </div>
  );
}

function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="pw-wrap">
      <input {...props} className="input" type={visible ? "text" : "password"} />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function SubmitButton({ loading, children }) {
  return (
    <button className="btn btn-primary btn-lg btn-block" disabled={loading}>
      {loading ? <><span className="spinner" /> Please wait...</> : <>{children} <ArrowRight size={17} /></>}
    </button>
  );
}

export function LoginRegister({ mode, form, updateForm, submitForm, colleges, collegeLoading, error, message, loading, go }) {
  const isLogin = mode === "login";
  const collegeList = Array.isArray(colleges) ? colleges : [];
  const departmentOptions = collegeList.find((college) => college._id === form.collegeId)?.departments || [];
  const changeCollege = (event) => {
    updateForm(event);
    // Departments differ per college, so a previous choice no longer applies.
    updateForm({ target: { name: "department", value: "" } });
  };
  return (
    <AuthLayout onBack={() => go("home")}>
      <h1>{isLogin ? "Welcome back" : "Create your student account"}</h1>
      <p>{isLogin ? "Sign in to continue to your placement workspace." : "Register under your college. Your TPO will verify your account."}</p>

      <form className="auth-form" onSubmit={submitForm}>
        {!isLogin && (
          <>
            <Field htmlFor="s-name" label="Full name">
              <input id="s-name" className="input" name="name" value={form.name} onChange={updateForm} placeholder="e.g. Priya Sharma" autoComplete="name" required />
            </Field>
            <div className="form-grid">
              <Field htmlFor="s-collegeId" label="College">
                <select id="s-collegeId" className="select" name="collegeId" value={form.collegeId} onChange={changeCollege} required disabled={collegeLoading}>
                  <option value="">{collegeLoading ? "Loading colleges..." : "Select your college"}</option>
                  {collegeList.map((college) => (
                    <option key={college._id} value={college._id}>{college.name}</option>
                  ))}
                </select>
              </Field>
              <Field htmlFor="s-department" label="Department">
                {departmentOptions.length > 0 ? (
                  <select id="s-department" className="select" name="department" value={form.department} onChange={updateForm} required>
                    <option value="">Select your department</option>
                    {departmentOptions.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                ) : (
                  <input id="s-department" className="input" name="department" value={form.department} onChange={updateForm} placeholder={form.collegeId ? "e.g. Computer Engineering" : "Select your college first"} disabled={!form.collegeId} required />
                )}
              </Field>
            </div>
            {!collegeLoading && colleges.length === 0 && (
              <Alert tone="info">No verified colleges are available yet. Ask your college to register first.</Alert>
            )}
          </>
        )}
        <Field htmlFor="s-email" label="Email address">
          <input id="s-email" className="input" name="email" type="email" value={form.email} onChange={updateForm} placeholder="you@college.edu" autoComplete="email" required />
        </Field>
        <Field htmlFor="s-password" label="Password" hint={isLogin ? "" : "Minimum 8 characters"}>
          <PasswordInput id="s-password" name="password" minLength={8} value={form.password} onChange={updateForm} placeholder="••••••••" autoComplete={isLogin ? "current-password" : "new-password"} required />
        </Field>
        {isLogin && (
          <div style={{ textAlign: "right", marginTop: -6 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => go("forgot-password")}>Forgot password?</button>
          </div>
        )}

        <Alert tone="error">{error}</Alert>
        <Alert tone="success">{message}</Alert>

        <SubmitButton loading={loading}>{isLogin ? "Sign in" : "Submit registration"}</SubmitButton>
      </form>

      <div className="auth-switch">
        {isLogin ? "New student?" : "Already registered?"}
        <button onClick={() => go(isLogin ? "register" : "login")}>{isLogin ? "Create an account" : "Sign in"}</button>
      </div>
      {isLogin && (
        <div className="auth-alt">
          Setting up PlacementHub for your institution?
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-secondary btn-block" onClick={() => go("register-college")}>Register your college</button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export function CollegeRegister({ collegeForm, updateCollegeForm, submitCollegeRegistration, error, message, loading, go }) {
  return (
    <AuthLayout onBack={() => go("home")} wide>
      <h1>Register your college</h1>
      <p>Create your institution and its administrator account. Access is enabled after email verification.</p>

      <form className="auth-form form-grid" onSubmit={submitCollegeRegistration}>
        <div className="form-section">Institution details</div>
        <Field htmlFor="c-collegeName" label="College name" full>
          <input id="c-collegeName" className="input" name="collegeName" value={collegeForm.collegeName} onChange={updateCollegeForm} placeholder="e.g. Government College of Engineering" required />
        </Field>
        <Field htmlFor="c-officialEmail" label="Official college email">
          <input id="c-officialEmail" className="input" name="officialEmail" type="email" value={collegeForm.officialEmail} onChange={updateCollegeForm} placeholder="placements@college.edu" required />
        </Field>
        <Field htmlFor="c-principalName" label="Principal name">
          <input id="c-principalName" className="input" name="principalName" value={collegeForm.principalName} onChange={updateCollegeForm} required />
        </Field>
        <Field htmlFor="c-address" label="College address" full>
          <input id="c-address" className="input" name="address" value={collegeForm.address} onChange={updateCollegeForm} placeholder="City, State" required />
        </Field>

        <div className="form-section">Administrator account</div>
        <Field htmlFor="c-name" label="Full name">
          <input id="c-name" className="input" name="name" value={collegeForm.name} onChange={updateCollegeForm} autoComplete="name" required />
        </Field>
        <Field htmlFor="c-email" label="Email address">
          <input id="c-email" className="input" name="email" type="email" value={collegeForm.email} onChange={updateCollegeForm} autoComplete="email" required />
        </Field>
        <Field htmlFor="c-password" label="Password" hint="Minimum 8 characters" full>
          <PasswordInput id="c-password" name="password" minLength={8} value={collegeForm.password} onChange={updateCollegeForm} autoComplete="new-password" required />
        </Field>

        <div className="field-full stack" style={{ gap: 12 }}>
          <Alert tone="error">{error}</Alert>
          <Alert tone="success">{message}</Alert>
          <SubmitButton loading={loading}>Register college</SubmitButton>
        </div>
      </form>

      <div className="auth-switch">
        Already registered?<button onClick={() => go("login")}>Sign in</button>
      </div>
    </AuthLayout>
  );
}

export function ApprovalStatus({ user, logout, onCheck, checking, error, message }) {
  const rejected = user.approvalStatus === "rejected";
  return (
    <AuthLayout>
      <div className="status-card">
        <div className={`status-icon tone-${rejected ? "danger" : "warning"}`}>
          {rejected ? <XCircle size={32} /> : <Clock3 size={32} />}
        </div>
        <h1>{rejected ? "Registration not approved" : "Awaiting TPO approval"}</h1>
        <p style={{ color: "var(--text-3)", marginTop: 10 }}>
          {rejected
            ? "Your student registration was rejected. Please contact your college's Training & Placement Office for details."
            : "Your college TPO needs to approve your account before you can access drives, applications and the resume analyzer. Check back soon."}
        </p>
        <div className="panel" style={{ marginTop: 24, padding: 16, textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ display: "block" }}>{user.name}</strong>
            <span className="muted" style={{ overflowWrap: "anywhere" }}>{user.email}</span>
          </div>
          <span className={`badge badge-status badge-${rejected ? "danger" : "warning"}`}>{rejected ? "Rejected" : "Pending"}</span>
        </div>
        <div style={{ marginTop: 16 }}>
          <Alert tone="error">{error}</Alert>
          <Alert tone="info">{message}</Alert>
        </div>
        {!rejected && (
          <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 20 }} onClick={onCheck} disabled={checking}>
            {checking ? <><span className="spinner" /> Checking...</> : <><RefreshCw size={16} /> Check approval status</>}
          </button>
        )}
        <button className="btn btn-secondary btn-lg btn-block" style={{ marginTop: 12 }} onClick={logout}>
          Sign out
        </button>
      </div>
    </AuthLayout>
  );
}

export function ForgotPassword({ go }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await forgotPassword(email);
      setMessage(result.message);
    } catch (err) {
      setError(err.message || "Could not send the reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout onBack={() => go("home")}>
      <h1>Forgot your password?</h1>
      <p>Enter the email you sign in with. We'll send you a link to choose a new password.</p>
      <form className="auth-form" onSubmit={submit}>
        <Field htmlFor="fp-email" label="Email address">
          <input id="fp-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" autoComplete="email" required />
        </Field>
        <Alert tone="error">{error}</Alert>
        <Alert tone="success">{message}</Alert>
        <SubmitButton loading={loading}>Send reset link</SubmitButton>
      </form>
      <div className="auth-switch">
        Remembered it?<button onClick={() => go("login")}>Sign in</button>
      </div>
    </AuthLayout>
  );
}

export function ResetPassword({ token, go }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message || "Could not reset your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout onBack={() => go("home")}>
      <h1>Choose a new password</h1>
      {done ? (
        <>
          <Alert tone="success">Your password has been reset. You can now sign in with it.</Alert>
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary btn-lg btn-block" onClick={() => go("login")}>Go to sign in <ArrowRight size={17} /></button>
          </div>
        </>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <Field htmlFor="rp-password" label="New password" hint="Minimum 8 characters">
            <PasswordInput id="rp-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          </Field>
          <Field htmlFor="rp-confirm" label="Confirm new password">
            <PasswordInput id="rp-confirm" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
          </Field>
          <Alert tone="error">{error}</Alert>
          <SubmitButton loading={loading}>Reset password</SubmitButton>
          <div className="auth-switch">
            Link expired?<button type="button" onClick={() => go("forgot-password")}>Request a new one</button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
