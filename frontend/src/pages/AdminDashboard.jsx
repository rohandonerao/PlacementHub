import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  LayoutDashboard,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X
} from "lucide-react";
import {
  getTpoAccounts,
  createTpoAccount,
  updateTpoAccount,
  updateTpoAccountStatus,
  getDepartments,
  addDepartment,
  removeDepartment,
  getPendingStudents,
  approveStudent,
  rejectStudent
} from "../api";
import {
  Alert,
  AppShell,
  Avatar,
  Bar,
  Empty,
  Field,
  PageHeader,
  SkeletonRows,
  StatusBadge,
  Summary
} from "../components/ui";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  department: "",
  phone: "",
  college: ""
};

export default function AdminDashboard({ user, logout }) {
  const [tpos, setTpos] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [departmentList, setDepartmentList] = useState([]);
  const [newDepartment, setNewDepartment] = useState("");
  const [pendingStudents, setPendingStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [processingStudentId, setProcessingStudentId] = useState("");

  const token = sessionStorage.getItem("token");

  const loadDepartments = async () => {
    try {
      const result = await getDepartments(token);
      setDepartmentList(result.departments || []);
    } catch (err) {
      setError(err.message || "Unable to load departments.");
    }
  };

  const loadPendingStudents = async () => {
    setStudentsLoading(true);
    try {
      const result = await getPendingStudents(token);
      setPendingStudents(Array.isArray(result) ? result : result.students || []);
    } catch (err) {
      setError(err.message || "Unable to load pending students.");
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleAddDepartment = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const result = await addDepartment(token, newDepartment);
      setDepartmentList(result.departments || []);
      setNewDepartment("");
      setMessage(result.message);
    } catch (err) {
      setError(err.message || "Unable to add department.");
    }
  };

  const handleRemoveDepartment = async (name) => {
    if (!window.confirm(`Remove ${name} from your department list?`)) return;
    setError("");
    setMessage("");
    try {
      const result = await removeDepartment(token, name);
      setDepartmentList(result.departments || []);
      setMessage(result.message);
    } catch (err) {
      setError(err.message || "Unable to remove department.");
    }
  };

  const handleStudentAction = async (student, action) => {
    if (!window.confirm(`Are you sure you want to ${action} ${student.name}?`)) return;
    setProcessingStudentId(student._id);
    setError("");
    setMessage("");
    try {
      const result = action === "approve"
        ? await approveStudent(token, student._id)
        : await rejectStudent(token, student._id);
      setPendingStudents((current) => current.filter((item) => item._id !== student._id));
      setMessage(result.message);
    } catch (err) {
      setError(err.message || "Unable to process this student.");
    } finally {
      setProcessingStudentId("");
    }
  };

  const loadTpos = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getTpoAccounts(token);
      setTpos(Array.isArray(result) ? result : result.tpos || []);
    } catch (err) {
      setError(err.message || "Unable to load TPO accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTpos();
    loadDepartments();
    loadPendingStudents();
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const openCreateForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setMessage("");
    setShowForm(true);
  };

  const openEditForm = (tpo) => {
    setForm({
      name: tpo.name || "",
      email: tpo.email || "",
      password: "",
      department: tpo.department || "",
      phone: tpo.phone || "",
      college: tpo.college || ""
    });

    setEditingId(tpo._id);
    setError("");
    setMessage("");
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        const { password, ...updatedData } = form;
        await updateTpoAccount(token, editingId, updatedData);
        setMessage("TPO account updated successfully.");
      } else {
        await createTpoAccount(token, form);
        setMessage("TPO account created successfully.");
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await loadTpos();
    } catch (err) {
      setError(err.message || "Unable to save TPO account.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (tpo) => {
    const nextStatus = tpo.isActive === false;

    if (
      !window.confirm(
        `Are you sure you want to ${
          nextStatus ? "activate" : "deactivate"
        } ${tpo.name}'s account?`
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await updateTpoAccountStatus(token, tpo._id, nextStatus);
      setMessage(
        `TPO account ${nextStatus ? "activated" : "deactivated"} successfully.`
      );
      await loadTpos();
    } catch (err) {
      setError(err.message || "Unable to update account status.");
    }
  };

  const filteredTpos = tpos.filter((tpo) =>
    [tpo.name, tpo.email, tpo.department, tpo.college]
      .filter(Boolean)
      .some((value) =>
        value.toLowerCase().includes(search.trim().toLowerCase())
      )
  );

  const activeCount = tpos.filter(
    (tpo) => tpo.isActive !== false
  ).length;


  const [activeTab, setActiveTab] = useState("overview");

  const sameDepartment = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

  // Every listed department, with its officers and pending requests.
  const departments = departmentList.map((name) => {
    const officers = tpos.filter((tpo) => sameDepartment(tpo.department, name));
    return {
      name,
      officers,
      active: officers.filter((tpo) => tpo.isActive !== false).length,
      pending: pendingStudents.filter((student) => sameDepartment(student.department, name)).length
    };
  });
  const isListed = (value) => departmentList.some((name) => sameDepartment(name, value));
  const unassignedOfficers = tpos.filter((tpo) => !isListed(tpo.department));
  const unassignedStudents = pendingStudents.filter((student) => !isListed(student.department));

  const filteredStudents = pendingStudents.filter((student) =>
    !departmentFilter ||
    (departmentFilter === "__none" ? !isListed(student.department) : sameDepartment(student.department, departmentFilter))
  );

  const nav = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "approvals", label: "Student approvals", icon: UserCheck, count: pendingStudents.length },
    { id: "tpos", label: "TPO accounts", icon: Users, count: tpos.length },
    { id: "departments", label: "Departments", icon: Building2, count: departmentList.length }
  ];

  const startCreate = () => { setActiveTab("tpos"); openCreateForm(); };
  const startEdit = (tpo) => { setActiveTab("tpos"); openEditForm(tpo); };

  const tpoTable = (rows) => (
    <div className="table-wrap">
      <table className="table table-cards">
        <thead>
          <tr><th>Officer</th><th>Department</th><th>Phone</th><th>Status</th><th className="right">Actions</th></tr>
        </thead>
        <tbody>
          {rows.map((tpo) => (
            <tr key={tpo._id}>
              <td className="td-main">
                <div className="cell-main">
                  <Avatar name={tpo.name} size="sm" />
                  <div style={{ minWidth: 0 }}><strong>{tpo.name}</strong><span>{tpo.email}</span></div>
                </div>
              </td>
              <td data-label="Department">{tpo.department || "—"}</td>
              <td data-label="Phone">{tpo.phone || "—"}</td>
              <td data-label="Status"><StatusBadge status={tpo.isActive === false ? "inactive" : "active"} /></td>
              <td data-label="Actions">
                <div className="row-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => startEdit(tpo)} aria-label={`Edit ${tpo.name}`}><Pencil size={14} /> Edit</button>
                  <button
                    className={`btn btn-sm ${tpo.isActive === false ? "btn-secondary" : "btn-danger"}`}
                    onClick={() => toggleStatus(tpo)}
                    aria-label={`${tpo.isActive === false ? "Activate" : "Deactivate"} ${tpo.name}`}
                  >
                    <Power size={14} /> {tpo.isActive === false ? "Activate" : "Deactivate"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <AppShell nav={nav} active={activeTab} onNavigate={setActiveTab} user={user} roleLabel="College administrator" section="Admin console" onLogout={logout}>
      <Alert tone="error">{!showForm && error}</Alert>
      <Alert tone="success">{message}</Alert>

      {activeTab === "overview" && (
        <>
          <PageHeader
            title="Overview"
            description={`Welcome, ${user?.name?.split(" ")[0] || "Administrator"}. Manage who runs placements at your college.`}
            actions={<button className="btn btn-primary" onClick={startCreate}><UserPlus size={16} /> Add TPO</button>}
          />

          <Summary
            loading={loading}
            items={[
              ["TPO accounts", tpos.length, "Placement officers"],
              ["Active", activeCount, "Can sign in"],
              ["Inactive", tpos.length - activeCount, "Access disabled"],
              ["Pending students", pendingStudents.length, "Awaiting approval"]
            ]}
          />

          <section className="grid grid-main-side">
            <div className="panel">
              <div className="panel-head">
                <div><h2>Placement officers</h2><p>Most recent accounts.</p></div>
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab("tpos")}>All accounts</button>
              </div>
              {loading ? <SkeletonRows rows={3} /> : tpos.length === 0 ? (
                <Empty icon={ShieldCheck} title="No TPO accounts yet" text="Create a TPO account so your placement cell can start publishing drives." action={<button className="btn btn-primary btn-sm" onClick={startCreate}><UserPlus size={15} /> Add TPO</button>} />
              ) : tpoTable(tpos.slice(0, 5))}
            </div>
            <div className="panel">
              <div className="panel-head">
                <div><h2>Pending by department</h2><p>Student registrations awaiting approval.</p></div>
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab("approvals")}>Review</button>
              </div>
              <div className="panel-body meters">
                {departments.length === 0 ? <p className="muted">Add your departments so student requests reach the right TPO.</p> : departments.slice(0, 6).map((dept) => (
                  <div className="meter-row" key={dept.name}>
                    <span>{dept.name}</span><strong>{dept.pending}</strong>
                    <Bar value={pendingStudents.length ? (dept.pending / pendingStudents.length) * 100 : 0} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === "approvals" && (
        <>
          <PageHeader
            title="Student approvals"
            description="Every department's pending registrations. Department TPOs see only their own department; you can approve or reject any student."
            actions={<button className="btn btn-secondary" onClick={loadPendingStudents} disabled={studentsLoading}><RefreshCw size={15} /> Refresh</button>}
          />
          {unassignedStudents.length > 0 && (
            <Alert tone="info">{`${unassignedStudents.length} pending student(s) have a department that is not on your list, so no department TPO sees them. Only you can approve them.`}</Alert>
          )}
          <div className="panel">
            <div className="panel-head">
              <div><h2>Pending registrations</h2><p>{filteredStudents.length} of {pendingStudents.length} shown</p></div>
              <select className="select" style={{ flex: "0 1 260px" }} value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} aria-label="Filter by department">
                <option value="">All departments</option>
                {departmentList.map((name) => <option key={name} value={name}>{name}</option>)}
                <option value="__none">Not on department list</option>
              </select>
            </div>
            {studentsLoading ? <SkeletonRows rows={4} /> : filteredStudents.length === 0 ? (
              <Empty icon={CheckCircle2} title="No pending approvals" text={pendingStudents.length ? "No pending students in this department." : "All student registrations have been reviewed."} />
            ) : (
              <div className="table-wrap">
                <table className="table table-cards">
                  <thead>
                    <tr><th>Student</th><th>Department</th><th>CGPA</th><th>Batch</th><th className="right">Decision</th></tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student._id}>
                        <td className="td-main">
                          <div className="cell-main">
                            <Avatar name={student.name} size="sm" />
                            <div style={{ minWidth: 0 }}><strong>{student.name}</strong><span>{student.email}</span></div>
                          </div>
                        </td>
                        <td data-label="Department">{student.department || "—"}</td>
                        <td data-label="CGPA">{student.cgpa ?? "—"}</td>
                        <td data-label="Batch">{student.graduationYear ?? "—"}</td>
                        <td data-label="Decision">
                          <div className="row-actions">
                            <button className="btn btn-danger btn-sm" onClick={() => handleStudentAction(student, "reject")} disabled={Boolean(processingStudentId)} aria-label={`Reject ${student.name}`}>Reject</button>
                            <button className="btn btn-success btn-sm" onClick={() => handleStudentAction(student, "approve")} disabled={Boolean(processingStudentId)} aria-label={`Approve ${student.name}`}>
                              {processingStudentId === student._id ? "Saving…" : "Approve"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "tpos" && (
        <>
          <PageHeader
            title="TPO accounts"
            description="Create officer accounts, update their details, and switch access on or off."
            actions={
              <>
                <button className="btn btn-secondary" onClick={loadTpos} disabled={loading}><RefreshCw size={15} /> Refresh</button>
                {!showForm && <button className="btn btn-primary" onClick={openCreateForm}><UserPlus size={16} /> Add TPO</button>}
              </>
            }
          />

          {showForm && (
            <form className="panel" onSubmit={handleSubmit}>
              <div className="panel-head">
                <div>
                  <h2>{editingId ? "Edit TPO account" : "New TPO account"}</h2>
                  <p>{editingId ? "Update the officer's details." : "The officer signs in with this email and password."}</p>
                </div>
                <button type="button" className="icon-btn icon-btn-plain" onClick={() => setShowForm(false)} aria-label="Close form"><X size={18} /></button>
              </div>
              <div className="panel-body form-grid">
                <Field label="Full name *" htmlFor="t-name"><input id="t-name" className="input" name="name" value={form.name} onChange={updateField} required /></Field>
                <Field label="Email address *" htmlFor="t-email"><input id="t-email" className="input" name="email" type="email" value={form.email} onChange={updateField} placeholder="officer@college.edu" required /></Field>
                {!editingId && (
                  <Field label="Password *" hint="Minimum 8 characters" htmlFor="t-pass">
                    <input id="t-pass" className="input" name="password" type="password" minLength={8} value={form.password} onChange={updateField} required />
                  </Field>
                )}
                <Field label="Department *" hint="Approves students of this department" htmlFor="t-dept">
                  <select id="t-dept" className="select" name="department" value={form.department} onChange={updateField} required>
                    <option value="">{departmentList.length ? "Select a department" : "Add departments first"}</option>
                    {form.department && !isListed(form.department) && <option value={form.department}>{form.department} (not on list)</option>}
                    {departmentList.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </Field>
                <Field label="Phone" htmlFor="t-phone"><input id="t-phone" className="input" name="phone" value={form.phone} onChange={updateField} inputMode="tel" /></Field>
                <Field label="College" htmlFor="t-college"><input id="t-college" className="input" name="college" value={form.college} onChange={updateField} /></Field>
                {error && <div className="field-full"><Alert tone="error">{error}</Alert></div>}
              </div>
              <div className="panel-foot">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Create account"}</button>
              </div>
            </form>
          )}

          <div className="panel">
            <div className="panel-head">
              <div><h2>All officers</h2><p>{activeCount} active · {tpos.length - activeCount} inactive</p></div>
              <label className="input-icon" style={{ flex: "0 1 320px", minWidth: 0, width: "100%" }}>
                <Search size={15} />
                <input className="input" type="search" placeholder="Search name, email or department" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search TPO accounts" />
              </label>
            </div>
            {loading ? <SkeletonRows rows={4} /> : filteredTpos.length === 0 ? (
              <Empty icon={ShieldCheck} title="No TPO accounts found" text={search ? "Try a different search term." : "Create a TPO account to get started."} action={!search && !showForm && <button className="btn btn-primary btn-sm" onClick={openCreateForm}><UserPlus size={15} /> Add TPO</button>} />
            ) : tpoTable(filteredTpos)}
          </div>
        </>
      )}

      {activeTab === "departments" && (
        <>
          <PageHeader title="Departments" description="Students choose one of these when they register, and their approval request goes to that department's TPO." />
          <form className="panel" onSubmit={handleAddDepartment}>
            <div className="panel-body" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 260px" }}>
                <Field label="New department" htmlFor="new-dept">
                  <input id="new-dept" className="input" value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} placeholder="e.g. Information Technology" maxLength={80} required />
                </Field>
              </div>
              <button type="submit" className="btn btn-primary"><Plus size={16} /> Add department</button>
            </div>
          </form>
          {unassignedOfficers.length > 0 && (
            <Alert tone="info">{`${unassignedOfficers.length} TPO account(s) have no department from your list (${unassignedOfficers.map((tpo) => tpo.name).join(", ")}). Edit them and pick a department so they receive approval requests.`}</Alert>
          )}
          {loading ? <div className="panel"><SkeletonRows rows={4} /></div> : departments.length === 0 ? (
            <div className="panel"><Empty icon={Building2} title="No departments yet" text="Add your college's departments above, then assign each TPO to one." /></div>
          ) : (
            <div className="grid grid-2">
              {departments.map((dept) => (
                <article className="panel" key={dept.name}>
                  <div className="panel-head">
                    <div><h3>{dept.name}</h3><p>{dept.officers.length} officer{dept.officers.length === 1 ? "" : "s"} · {dept.pending} pending student{dept.pending === 1 ? "" : "s"}</p></div>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveDepartment(dept.name)} disabled={dept.officers.length > 0} title={dept.officers.length ? "Move this department's TPOs first" : "Remove department"} aria-label={`Remove ${dept.name}`}><Trash2 size={14} /></button>
                  </div>
                  {dept.officers.length === 0 && <div className="panel-body"><p className="muted">No TPO yet. Requests from this department are visible only to you.</p></div>}
                  <div className="rows">
                    {dept.officers.map((tpo) => (
                      <div className="row" key={tpo._id}>
                        <Avatar name={tpo.name} size="sm" />
                        <div className="row-main"><strong>{tpo.name}</strong><span>{tpo.email}</span></div>
                        <StatusBadge status={tpo.isActive === false ? "inactive" : "active"} />
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
