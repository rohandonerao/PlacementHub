
import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Pencil,
  Power,
  RefreshCw,
  LogOut,
  X,
  ShieldCheck
} from "lucide-react";
import {
  getTpoAccounts,
  createTpoAccount,
  updateTpoAccount,
  updateTpoAccountStatus
} from "./api";

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

  const token = localStorage.getItem("token");

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

  return (
    <main className="page">
      <nav className="navbar">
        <div className="brand-mark">P</div>
        <span className="brand">PlacementHub</span>
        <span className="nav-label">Admin Portal</span>
        <button className="secondary-button" onClick={logout}>
          <LogOut size={16} />
          Logout
        </button>
      </nav>

      <section className="dashboard-section">
        <div className="dashboard-heading">
          <div>
            <div className="eyebrow">ADMINISTRATION</div>
            <h1>Admin Dashboard</h1>
            <p>
              Welcome, {user?.name || "Administrator"}. Manage TPO accounts
              across your college.
            </p>
          </div>

          <button className="primary-button" onClick={openCreateForm}>
            <UserPlus size={17} />
            Add TPO
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}
        {message && <div className="form-success">{message}</div>}

        <div className="hero-panel">
          <div>
            <b>{tpos.length}</b>
            <span>Total TPO Accounts</span>
          </div>
          <div>
            <b>{activeCount}</b>
            <span>Active Accounts</span>
          </div>
          <div>
            <b>{tpos.length - activeCount}</b>
            <span>Inactive Accounts</span>
          </div>
        </div>

        {showForm && (
          <section className="auth-card admin-form-card">
            <div className="dashboard-heading">
              <div>
                <h2>{editingId ? "Edit TPO Account" : "Create TPO Account"}</h2>
                <p>
                  {editingId
                    ? "Update the TPO's account details."
                    : "Create login credentials for a new TPO."}
                </p>
              </div>

              <button
                type="button"
                className="back-button"
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
                aria-label="Close form"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>Full Name</label>
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Enter full name"
                required
              />

              <label>Email Address</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                placeholder="Enter email address"
                required
              />

              {!editingId && (
                <>
                  <label>Initial Password</label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={updateField}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                </>
              )}

              <label>Department</label>
              <input
                name="department"
                value={form.department}
                onChange={updateField}
                placeholder="Enter department"
              />

              <label>Phone Number</label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={updateField}
                placeholder="Enter phone number"
              />

              <label>College</label>
              <input
                name="college"
                value={form.college}
                onChange={updateField}
                placeholder="Enter college name"
              />

              <div className="hero-actions">
                <button
                  className="primary-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create TPO Account"}
                </button>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="auth-card admin-table-card">
          <div className="dashboard-heading">
            <div>
              <h2>
                <Users size={21} /> TPO Management
              </h2>
              <p>View and manage Training and Placement Officers.</p>
            </div>

            <button
              className="secondary-button"
              onClick={loadTpos}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          <div className="admin-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search name, email, department or college"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {loading ? (
            <p>Loading TPO accounts...</p>
          ) : filteredTpos.length === 0 ? (
            <div className="empty-state">
              <ShieldCheck size={32} />
              <h3>No TPO accounts found</h3>
              <p>
                {search
                  ? "Try a different search term."
                  : "Create a TPO account to get started."}
              </p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTpos.map((tpo) => (
                    <tr key={tpo._id}>
                      <td>{tpo.name}</td>
                      <td>{tpo.email}</td>
                      <td>{tpo.department || "—"}</td>
                      <td>
                        <span
                          className={
                            tpo.isActive === false
                              ? "status-inactive"
                              : "status-active"
                          }
                        >
                          {tpo.isActive === false ? "Inactive" : "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => openEditForm(tpo)}
                            title="Edit account"
                            aria-label={`Edit ${tpo.name}`}
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => toggleStatus(tpo)}
                            title={
                              tpo.isActive === false
                                ? "Activate account"
                                : "Deactivate account"
                            }
                            aria-label={`${
                              tpo.isActive === false ? "Activate" : "Deactivate"
                            } ${tpo.name}`}
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
