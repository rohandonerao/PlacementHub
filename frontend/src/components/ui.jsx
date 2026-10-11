import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronRight, Info, KeyRound, LogOut, Menu, TriangleAlert, X } from "lucide-react";
import { loader } from "../loader";
import { changePassword } from "../api";

function ChangePasswordDialog({ open, onClose }) {
  const dialogRef = useRef(null);
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setForm({ current: "", next: "", confirm: "" });
      setError("");
      setMessage("");
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (form.next !== form.confirm) {
      setError("The new passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const result = await changePassword(sessionStorage.getItem("token"), form.current, form.next);
      setMessage(result.message || "Password changed successfully.");
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setError(err.message || "Could not change your password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="dialog" onClose={onClose} aria-labelledby="cp-title">
      <form className="panel" onSubmit={submit}>
        <div className="panel-head">
          <div><h2 id="cp-title">Change password</h2><p>Use at least 8 characters.</p></div>
          <button type="button" className="icon-btn icon-btn-plain" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="panel-body stack" style={{ gap: 14 }}>
          <Field label="Current password" htmlFor="cp-current">
            <input id="cp-current" className="input" type="password" name="current" value={form.current} onChange={update} autoComplete="current-password" required />
          </Field>
          <Field label="New password" htmlFor="cp-next">
            <input id="cp-next" className="input" type="password" name="next" minLength={8} value={form.next} onChange={update} autoComplete="new-password" required />
          </Field>
          <Field label="Confirm new password" htmlFor="cp-confirm">
            <input id="cp-confirm" className="input" type="password" name="confirm" minLength={8} value={form.confirm} onChange={update} autoComplete="new-password" required />
          </Field>
          <Alert tone="error">{error}</Alert>
          <Alert tone="success">{message}</Alert>
        </div>
        <div className="panel-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Change password"}</button>
        </div>
      </form>
    </dialog>
  );
}

export function Brand({ sub, light = false }) {
  return (
    <div className={`brand ${light ? "brand-light" : ""}`}>
      <div className="brand-mark" aria-hidden="true">PH</div>
      <div>
        <div className="brand-name">PlacementHub</div>
        {sub && <div className="brand-sub">{sub}</div>}
      </div>
    </div>
  );
}

export function TopLoader() {
  const [state, setState] = useState("idle");

  useEffect(() => {
    let timer;
    const unsubscribe = loader.subscribe((active) => {
      clearTimeout(timer);
      if (active) {
        setState("loading");
      } else {
        setState((current) => (current === "loading" ? "done" : current));
        timer = setTimeout(() => setState("idle"), 500);
      }
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return <div className={`toploader ${state}`} aria-hidden="true"><span /></div>;
}

export function initials(name = "") {
  const parts = String(name).replace(/[^\p{L}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Avatar({ name, size = "" }) {
  return <div className={`avatar ${size ? `avatar-${size}` : ""}`} aria-hidden="true">{initials(name)}</div>;
}

export function OrgMark({ name, large = false }) {
  return <div className={`org ${large ? "org-lg" : ""}`} aria-hidden="true">{initials(name)}</div>;
}

/** Light sidebar on desktop; slide-in drawer below 1024px. */
export function AppShell({ nav, active, onNavigate, user, roleLabel, section, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const current = nav.find((item) => item.id === active);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    loader.pulse();
    window.scrollTo({ top: 0 });
  }, [active]);

  return (
    <div className={`shell ${open ? "nav-open" : ""}`}>
      <button className="scrim" aria-label="Close menu" onClick={() => setOpen(false)} />
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-top">
          <Brand sub={section} />
          <button className="icon-btn icon-btn-plain sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="nav">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${active === item.id ? "active" : ""}`}
                aria-current={active === item.id ? "page" : undefined}
                onClick={() => { onNavigate(item.id); setOpen(false); }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.count ? <span className="nav-count">{item.count}</span> : null}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-user">
            <Avatar name={user?.name} size="sm" />
            <div>
              <strong>{user?.name || "User"}</strong>
              <span>{user?.email || roleLabel}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 10, justifyContent: "flex-start" }} onClick={() => { setPasswordOpen(true); setOpen(false); }}>
            <KeyRound size={15} /> Change password
          </button>
        </div>
      </aside>
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <div className="crumbs">
            <span>{section}</span>
            <ChevronRight size={14} />
            <strong>{current?.label}</strong>
          </div>
          <div className="topbar-right">
            <div className="user-chip">
              <Avatar name={user?.name} size="sm" />
              <div>
                <strong>{user?.name || "User"}</strong>
                <span>{roleLabel}</span>
              </div>
            </div>
            <span className="topbar-divider" />
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>
              <LogOut size={15} /> <span>Sign out</span>
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="app-footer">
          <span>PlacementHub · Training &amp; Placement Management</span>
          <span>© {new Date().getFullYear()}</span>
        </footer>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

/** A single ruled strip of key figures. items: [label, value, note] */
export function Summary({ items, loading }) {
  return (
    <section className="summary" aria-label="Summary">
      {items.map(([label, value, note]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{loading ? <span className="sk" style={{ display: "block", width: 40, height: 22, marginTop: 4 }} /> : value}</strong>
          {note && <small>{note}</small>}
        </div>
      ))}
    </section>
  );
}

const alertIcons = { error: AlertCircle, success: CheckCircle2, warning: TriangleAlert, info: Info };

export function Alert({ tone = "info", children }) {
  if (!children) return null;
  const Icon = alertIcons[tone];
  return (
    <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon size={16} />
      <div>{children}</div>
    </div>
  );
}

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="empty">
      {Icon && <Icon size={28} strokeWidth={1.6} />}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="skeleton-rows" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="skeleton-row" key={index}>
          <span className="sk" style={{ width: 32, height: 32, borderRadius: 6 }} />
          <div style={{ flex: 1, display: "grid", gap: 7 }}>
            <span className="sk" style={{ width: `${55 - index * 6}%` }} />
            <span className="sk" style={{ width: `${35 - index * 3}%`, height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const statusTones = {
  applied: "info",
  shortlisted: "warning",
  selected: "success",
  rejected: "danger",
  open: "success",
  closed: "",
  expired: "",
  pending: "warning",
  active: "success",
  inactive: "danger"
};

const statusLabels = { shortlisted: "Interview" };

export function StatusBadge({ status, label }) {
  const value = String(status || "applied").toLowerCase();
  const tone = statusTones[value];
  const text = label || statusLabels[value] || value;
  return <span className={`badge badge-status ${tone ? `badge-${tone}` : ""}`}>{text.charAt(0).toUpperCase() + text.slice(1)}</span>;
}

export function Field({ label, hint, full, htmlFor, children }) {
  return (
    <div className={`field ${full ? "field-full" : ""}`}>
      {label && <label htmlFor={htmlFor}>{label}{hint && <span className="hint">{hint}</span>}</label>}
      {children}
    </div>
  );
}

export function scoreTone(value) {
  if (value >= 75) return "success";
  if (value >= 50) return "warning";
  return "danger";
}

export function Bar({ value = 0, tone = "" }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={`bar ${tone ? `bar-${tone}` : ""}`} role="progressbar" aria-valuenow={Math.round(safe)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ transform: `scaleX(${safe / 100})` }} />
    </div>
  );
}

/** Score out of 100 placed on a three-band scale (needs work / moderate / strong). */
export function ScoreScale({ value }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="score">
      <div className="score-figure"><strong>{Math.round(safe)}</strong><span>/ 100</span></div>
      <div className="score-scale" role="img" aria-label={`Score ${Math.round(safe)} out of 100`}>
        <i style={{ left: `${safe}%` }} />
      </div>
      <div className="score-legend"><span>Needs work</span><span>Moderate · 50</span><span>Strong · 75</span></div>
    </div>
  );
}

export const formatDate = (date, withTime = false) => {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {})
  });
};

export const daysUntil = (date) => {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
};

export const deadlineLabel = (date) => {
  const days = daysUntil(date);
  if (days == null) return "";
  if (days < 0) return "Closed";
  if (days === 0) return "Closes today";
  return `${days} day${days === 1 ? "" : "s"} left`;
};

export const isExpired = (drive) =>
  Boolean(drive?.applicationDeadline) && new Date(drive.applicationDeadline).getTime() < Date.now();

export const isOpen = (drive) => drive?.status !== "closed" && !isExpired(drive);

export const driveStatus = (drive) => (isExpired(drive) ? "expired" : drive?.status || "open");
