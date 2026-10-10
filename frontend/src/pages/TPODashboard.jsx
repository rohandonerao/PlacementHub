import { useCallback, useEffect, useState } from "react";
import { getPendingStudents, approveStudent, rejectStudent, getPlacementDrives, createPlacementDrive, getDriveApplications, updateApplicationStatus, deletePlacementDrive } from "../api.js";
import {
  LayoutDashboard,
  Users,
  BriefcaseBusiness,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  GraduationCap,
  Plus,
  RefreshCw,
  Trash2,
  Download
} from "lucide-react";

export default function TPODashboard({ user, logout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const [studentsMessage, setStudentsMessage] = useState("");
  const [processingStudentId, setProcessingStudentId] = useState("");
  const [drives, setDrives] = useState([]);
  const [drivesLoading, setDrivesLoading] = useState(false);
  const [drivesError, setDrivesError] = useState("");
  const [drivesMessage, setDrivesMessage] = useState("");
  const [creatingDrive, setCreatingDrive] = useState(false);
  const [showDriveForm, setShowDriveForm] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [driveSearch, setDriveSearch] = useState("");
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");
  const [applicationsMessage, setApplicationsMessage] = useState("");
  const [selectedDriveId, setSelectedDriveId] = useState("");
  const [applicationSearch, setApplicationSearch] = useState("");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState("all");
  const [processingApplicationId, setProcessingApplicationId] = useState("");
  const [deletingDriveId, setDeletingDriveId] = useState("");
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState("");
  const [reportsMessage, setReportsMessage] = useState("");
  const [driveForm, setDriveForm] = useState({
    companyName: "", jobTitle: "", description: "", packageLPA: "",
    minimumCgpa: "", maximumBacklogs: "0", eligibleDepartments: "",
    eligibleGraduationYears: "", requiredSkills: "", applicationDeadline: ""
  });

  const loadPendingStudents = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setStudentsError("Your session has expired. Please log in again.");
      setStudents([]);
      return;
    }

    setStudentsLoading(true);
    setStudentsError("");

    try {
      const result = await getPendingStudents(token);
      const studentList = Array.isArray(result)
  ? result
  : Array.isArray(result?.students)
    ? result.students
    : Array.isArray(result?.data)
      ? result.data
      : [];

setStudents(studentList);
    } catch (error) {
      setStudentsError(error.message || "Failed to load pending students.");
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  const loadPlacementDrives = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setDrivesError("Your session has expired. Please log in again.");
      return;
    }
    setDrivesLoading(true);
    setDrivesError("");
    try {
      const result = await getPlacementDrives(token);
      setDrives(Array.isArray(result) ? result : []);
    } catch (error) {
      setDrivesError(error.message || "Failed to load placement drives.");
    } finally {
      setDrivesLoading(false);
    }
  }, []);

  const handleDeleteDrive = async (drive) => {
    if (!drive?._id) return;
    const expired = drive.applicationDeadline && new Date(drive.applicationDeadline).getTime() < Date.now();
    const message = `Delete ${drive.companyName || "this company"} — ${drive.jobTitle || "placement drive"}? This action may also remove related applications and cannot be undone.`;
    if (!window.confirm(message)) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setDrivesError("Your session has expired. Please log in again.");
      return;
    }

    setDeletingDriveId(drive._id);
    setDrivesError("");
    setDrivesMessage("");
    try {
      const result = await deletePlacementDrive(token, drive._id);
      setDrives((current) => current.filter((item) => item._id !== drive._id));
      if (selectedDriveId === drive._id) {
        setSelectedDriveId("");
        setApplications([]);
      }
      setDrivesMessage(result?.message || (expired ? "Expired placement drive deleted." : "Placement drive deleted."));
    } catch (error) {
      setDrivesError(error.message || "Unable to delete placement drive.");
    } finally {
      setDeletingDriveId("");
    }
  };

  const loadReports = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setReportsError("Your session has expired. Please log in again.");
      return;
    }
    setReportsLoading(true);
    setReportsError("");
    setReportsMessage("");
    try {
      let availableDrives = drives;
      if (!availableDrives.length) {
        const result = await getPlacementDrives(token);
        availableDrives = Array.isArray(result) ? result : Array.isArray(result?.drives) ? result.drives : [];
        setDrives(availableDrives);
      }
      const results = await Promise.all(availableDrives.map(async (drive) => {
        try {
          const result = await getDriveApplications(token, drive._id);
          const records = Array.isArray(result) ? result : Array.isArray(result?.applications) ? result.applications : Array.isArray(result?.data) ? result.data : [];
          return { drive, applications: records, error: "" };
        } catch (error) {
          return { drive, applications: [], error: error.message || "Could not load applications" };
        }
      }));
      setReports(results);
      const failed = results.filter((item) => item.error).length;
      if (failed) setReportsError(`Applications could not be loaded for ${failed} drive${failed === 1 ? "" : "s"}. Some report totals may be incomplete.`);
    } catch (error) {
      setReportsError(error.message || "Failed to load placement analytics.");
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  }, [drives]);

  useEffect(() => {
    if (activeTab === "reports") {
      loadReports();
    }
  // Load once when opening the Reports tab; loadReports updates drives state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadDriveApplications = useCallback(async (driveId, availableDrives = []) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setApplicationsError("Your session has expired. Please log in again.");
      setApplications([]);
      return;
    }
    if (!driveId) {
      setApplications([]);
      setApplicationsError(availableDrives.length ? "Select a placement drive to view its applicants." : "Create a placement drive before viewing applications.");
      return;
    }
    setApplicationsLoading(true);
    setApplicationsError("");
    setApplicationsMessage("");
    try {
      const result = await getDriveApplications(token, driveId);
      const records = Array.isArray(result) ? result : Array.isArray(result?.applications) ? result.applications : Array.isArray(result?.data) ? result.data : [];
      setApplications(records);
    } catch (error) {
      setApplicationsError(error.message || "Failed to load applications for this drive.");
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  }, []);

  const loadApplicationsWorkspace = useCallback(async () => {
    setApplicationsError("");
    let availableDrives = drives;
    if (!availableDrives.length) {
      const token = localStorage.getItem("token");
      if (!token) {
        setApplicationsError("Your session has expired. Please log in again.");
        return;
      }
      setApplicationsLoading(true);
      try {
        const result = await getPlacementDrives(token);
        availableDrives = Array.isArray(result) ? result : Array.isArray(result?.drives) ? result.drives : [];
        setDrives(availableDrives);
      } catch (error) {
        setApplicationsError(error.message || "Failed to load placement drives.");
        setApplicationsLoading(false);
        return;
      }
    }
    const driveId = selectedDriveId && availableDrives.some((drive) => drive._id === selectedDriveId)
      ? selectedDriveId
      : availableDrives[0]?._id || "";
    setSelectedDriveId(driveId);
    await loadDriveApplications(driveId, availableDrives);
  }, [drives, selectedDriveId, loadDriveApplications]);

  useEffect(() => {
    if (activeTab === "applications") {
      loadApplicationsWorkspace();
    }
  // Load once when opening Applications; the loader updates drives and selectedDriveId.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleApplicationStatus = async (applicationId, status) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setApplicationsError("Your session has expired. Please log in again.");
      return;
    }
    setProcessingApplicationId(applicationId);
    setApplicationsError("");
    setApplicationsMessage("");
    try {
      const result = await updateApplicationStatus(token, applicationId, status);
      setApplications((current) => current.map((application) => application._id === applicationId
        ? { ...application, status: result?.application?.status || result?.status || status }
        : application));
      setApplicationsMessage(result?.message || `Application status updated to ${status}.`);
    } catch (error) {
      setApplicationsError(error.message || "Unable to update application status.");
    } finally {
      setProcessingApplicationId("");
    }
  };

  useEffect(() => {
    if (activeTab === "drives") {
      setDrivesMessage("");
      loadPlacementDrives();
    }
  }, [activeTab, loadPlacementDrives]);

  const handleDriveInput = (event) => {
    const { name, value } = event.target;
    setDriveForm((current) => ({ ...current, [name]: value }));
  };

  const handleCreateDrive = async (event) => {
    event.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      setDrivesError("Your session has expired. Please log in again.");
      return;
    }
    setCreatingDrive(true);
    setDrivesError("");
    setDrivesMessage("");
    const splitList = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);
    const payload = {
      companyName: driveForm.companyName.trim(),
      jobTitle: driveForm.jobTitle.trim(),
      description: driveForm.description.trim(),
      packageLPA: driveForm.packageLPA === "" ? null : Number(driveForm.packageLPA),
      minimumCgpa: Number(driveForm.minimumCgpa),
      maximumBacklogs: Number(driveForm.maximumBacklogs),
      eligibleDepartments: splitList(driveForm.eligibleDepartments),
      eligibleGraduationYears: splitList(driveForm.eligibleGraduationYears).map(Number),
      requiredSkills: splitList(driveForm.requiredSkills),
      applicationDeadline: new Date(driveForm.applicationDeadline).toISOString()
    };
    try {
      const result = await createPlacementDrive(token, payload);
      setDrives((current) => [result.drive, ...current]);
      setDrivesMessage(result.message || "Placement drive created successfully.");
      setDriveForm({ companyName: "", jobTitle: "", description: "", packageLPA: "", minimumCgpa: "", maximumBacklogs: "0", eligibleDepartments: "", eligibleGraduationYears: "", requiredSkills: "", applicationDeadline: "" });
      setShowDriveForm(false);
    } catch (error) {
      setDrivesError(error.message || "Failed to create placement drive.");
    } finally {
      setCreatingDrive(false);
    }
  };

  useEffect(() => {
    if (activeTab === "students") {
      setStudentsMessage("");
      loadPendingStudents();
    }
  }, [activeTab, loadPendingStudents]);

  const handleStudentAction = async (studentId, action) => {
    const token = localStorage.getItem("token");

    if (!token) {
      setStudentsError("Your session has expired. Please log in again.");
      return;
    }

    const student = students.find((item) => item._id === studentId);
    const actionLabel = action === "approve" ? "approve" : "reject and delete";

    if (!window.confirm(`Are you sure you want to ${actionLabel} ${student?.name || "this student"}?`)) {
      return;
    }

    setProcessingStudentId(studentId);
    setStudentsError("");
    setStudentsMessage("");

    try {
      const result = action === "approve"
        ? await approveStudent(token, studentId)
        : await rejectStudent(token, studentId);

      setStudents((current) => current.filter((item) => item._id !== studentId));
      setStudentsMessage(result.message || (action === "approve" ? "Student approved successfully." : "Registration rejected successfully."));
    } catch (error) {
      setStudentsError(error.message || "Unable to process this student.");
    } finally {
      setProcessingStudentId("");
    }
  };

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "students", label: "Student Approvals", icon: Users },
    { id: "drives", label: "Placement Drives", icon: BriefcaseBusiness },
    { id: "applications", label: "Applications", icon: FileText },
    { id: "reports", label: "Reports & Analytics", icon: BarChart3 }
  ];

  const activeItem = menuItems.find((item) => item.id === activeTab);
  const ActiveIcon = activeItem?.icon || LayoutDashboard;

  const filteredStudents = students.filter((student) => {
    const query = studentSearch.trim().toLowerCase();
    return !query || [student.name, student.email, student.department, student.college]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const filteredDrives = drives.filter((drive) => {
    const query = driveSearch.trim().toLowerCase();
    return !query || [drive.companyName, drive.jobTitle, drive.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const filteredApplications = applications.filter((application) => {
    const applicant = application.student || application.user || application.studentId || {};
    const query = applicationSearch.trim().toLowerCase();
    const matchesQuery = !query || [
      applicant.name, applicant.email, applicant.department, applicant.college,
      application.name, application.email, application.status
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
    const status = String(application.status || "applied").toLowerCase();
    return matchesQuery && (applicationStatusFilter === "all" || status === applicationStatusFilter);
  });

  return (
    <div className="tpo-layout">
      {sidebarOpen && (
        <button
          className="tpo-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <aside className={`tpo-sidebar ${sidebarOpen ? "tpo-sidebar-open" : ""}`}>
        <div className="tpo-brand">
          <div className="tpo-brand-icon">
            <GraduationCap size={24} />
          </div>

          <div className="tpo-brand-text">
            <strong>PlacementHub</strong>
            <span>Management Portal</span>
          </div>

          <button
            className="tpo-close-mobile"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="tpo-sidebar-label">WORKSPACE</div>

        <nav className="tpo-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={`tpo-menu-item ${
                  activeTab === item.id ? "tpo-menu-active" : ""
                }`}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={19} />
                <span>{item.label}</span>

                {activeTab === item.id && (
                  <span className="tpo-active-indicator" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="tpo-sidebar-help">
          <div className="tpo-help-icon">
            <GraduationCap size={22} />
          </div>

          <strong>Placement Season</strong>

          <p>Manage recruitment activities from one workspace.</p>
        </div>

        <div className="tpo-sidebar-user">
          <div className="tpo-avatar">
            {(user?.name || "T").charAt(0).toUpperCase()}
          </div>

          <div className="tpo-user-details">
            <strong>{user?.name || "Placement Officer"}</strong>
            <span>Training & Placement</span>
          </div>

          <button
            className="tpo-logout-button"
            onClick={logout}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="tpo-main">
        <header className="tpo-topbar">
          <div className="tpo-topbar-left">
            <button
              className="tpo-mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>

            <div>
              <div className="tpo-breadcrumb">
                Workspace <span>/</span> {activeItem?.label}
              </div>

              <h1>{activeItem?.label}</h1>
            </div>
          </div>

          <div className="tpo-topbar-right">
            <div className="tpo-system-status">
              <span />
              Portal Active
            </div>

            <button
              className="tpo-notification"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={20} />
            </button>

            <div className="tpo-topbar-profile">
              <div className="tpo-avatar tpo-avatar-small">
                {(user?.name || "T").charAt(0).toUpperCase()}
              </div>

              <div>
                <strong>{user?.name || "Placement Officer"}</strong>
                <span>Administrator</span>
              </div>
            </div>
          </div>
        </header>

        {activeTab === "overview" ? (
          <div className="tpo-content">
            <section className="tpo-welcome">
              <div className="tpo-welcome-content">
                <span className="tpo-welcome-tag">
                  TRAINING & PLACEMENT OFFICE
                </span>

                <h2>
                  Welcome back, {user?.name?.split(" ")[0] || "Officer"}!
                </h2>

                <p>
                  Your central workspace for student placement activities,
                  recruitment drives, and application management.
                </p>

                <button
                  className="tpo-welcome-button"
                  onClick={() => setActiveTab("drives")}
                >
                  Manage Placement Drives
                  <ArrowUpRight size={18} />
                </button>
              </div>

              <div className="tpo-welcome-visual">
                <div className="tpo-visual-circle tpo-circle-one" />
                <div className="tpo-visual-circle tpo-circle-two" />

                <div className="tpo-visual-card">
                  <div className="tpo-visual-card-icon">
                    <GraduationCap size={30} />
                  </div>

                  <strong>PlacementHub</strong>
                  <span>Placement Management System</span>

                  <div className="tpo-visual-progress">
                    <span />
                  </div>

                  <small>One workspace. Every placement.</small>
                </div>
              </div>
            </section>

            <div className="tpo-section-title">
              <div>
                <h2>Dashboard Overview</h2>
                <p>Monitor your placement activities at a glance.</p>
              </div>

              <span className="tpo-live-badge">
                <span />
                Live workspace
              </span>
            </div>

            <section className="tpo-stat-grid">
              <article className="tpo-stat-card">
                <div className="tpo-stat-top">
                  <div className="tpo-stat-icon tpo-icon-blue">
                    <BriefcaseBusiness size={22} />
                  </div>
                  <ArrowUpRight size={18} className="tpo-stat-arrow" />
                </div>

                <span className="tpo-stat-label">Total Placement Drives</span>
                <strong className="tpo-stat-value">{drives.length || "—"}</strong>
                <span className="tpo-stat-caption">
                  Recruitment opportunities
                </span>
              </article>

              <article className="tpo-stat-card">
                <div className="tpo-stat-top">
                  <div className="tpo-stat-icon tpo-icon-orange">
                    <Users size={22} />
                  </div>
                  <ArrowUpRight size={18} className="tpo-stat-arrow" />
                </div>

                <span className="tpo-stat-label">Pending Approvals</span>
                <strong className="tpo-stat-value">{students.length || "—"}</strong>
                <span className="tpo-stat-caption">
                  Student registrations
                </span>
              </article>

              <article className="tpo-stat-card">
                <div className="tpo-stat-top">
                  <div className="tpo-stat-icon tpo-icon-purple">
                    <FileText size={22} />
                  </div>
                  <ArrowUpRight size={18} className="tpo-stat-arrow" />
                </div>

                <span className="tpo-stat-label">Total Applications</span>
                <strong className="tpo-stat-value">—</strong>
                <span className="tpo-stat-caption">
                  Submitted applications
                </span>
              </article>

              <article className="tpo-stat-card">
                <div className="tpo-stat-top">
                  <div className="tpo-stat-icon tpo-icon-green">
                    <CheckCircle2 size={22} />
                  </div>
                  <ArrowUpRight size={18} className="tpo-stat-arrow" />
                </div>

                <span className="tpo-stat-label">Selected Students</span>
                <strong className="tpo-stat-value">—</strong>
                <span className="tpo-stat-caption">
                  Successful selections
                </span>
              </article>
            </section>

            <section className="tpo-bottom-grid">
              <div className="tpo-panel tpo-quick-panel">
                <div className="tpo-panel-heading">
                  <div>
                    <h2>Quick Actions</h2>
                    <p>Access your most-used modules.</p>
                  </div>
                </div>

                <div className="tpo-quick-list">
                  {menuItems.slice(1).map((item) => {
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        className="tpo-quick-item"
                        onClick={() => setActiveTab(item.id)}
                      >
                        <div className="tpo-quick-item-icon">
                          <Icon size={20} />
                        </div>

                        <div className="tpo-quick-item-text">
                          <strong>{item.label}</strong>
                          <span>Open and manage this module</span>
                        </div>

                        <ArrowUpRight
                          size={18}
                          className="tpo-quick-arrow"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="tpo-panel tpo-overview-panel">
                <div className="tpo-panel-heading">
                  <div>
                    <h2>Workspace Information</h2>
                    <p>Your account and portal details.</p>
                  </div>
                </div>

                <div className="tpo-information-list">
                  <div className="tpo-information-row">
                    <div className="tpo-information-icon">
                      <Users size={19} />
                    </div>

                    <div>
                      <span>Account</span>
                      <strong>{user?.name || "Placement Officer"}</strong>
                    </div>
                  </div>

                  <div className="tpo-information-row">
                    <div className="tpo-information-icon">
                      <FileText size={19} />
                    </div>

                    <div>
                      <span>Registered email</span>
                      <strong>{user?.email || "Not available"}</strong>
                    </div>
                  </div>

                  <div className="tpo-information-row">
                    <div className="tpo-information-icon">
                      <Clock size={19} />
                    </div>

                    <div>
                      <span>Portal status</span>
                      <strong className="tpo-status-text">
                        <span />
                        Active
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="tpo-information-footer">
                  <GraduationCap size={20} />
                  <span>AI-Driven Placement Management System</span>
                </div>
              </div>
            </section>
          </div>
        ) : activeTab === "students" ? (
          <div className="tpo-content">
            <section className="tpo-module-header">
              <div className="tpo-module-icon">
                <Users size={28} />
              </div>
              <div>
                <span className="tpo-welcome-tag">STUDENT MANAGEMENT</span>
                <h2>Pending Student Approvals</h2>
                <p>Review student registrations and approve eligible accounts.</p>
              </div>
              <button
                type="button"
                className="tpo-module-back"
                onClick={loadPendingStudents}
                disabled={studentsLoading}
              >
                {studentsLoading ? "Refreshing..." : "Refresh list"}
              </button>
            </section>

            {studentsError && (
              <div className="tpo-alert tpo-alert-error" role="alert">{studentsError}</div>
            )}
            {studentsMessage && (
              <div className="tpo-alert tpo-alert-success" role="status">{studentsMessage}</div>
            )}

            <section className="tpo-panel tpo-students-panel">
              <div className="tpo-panel-heading">
                <div>
                  <h2>Pending Registrations</h2>
                  <p>{students.length} student{students.length === 1 ? "" : "s"} awaiting review</p>
                </div>
                <label className="tpo-search">
                  <Search size={17} />
                  <input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search students" aria-label="Search students" />
                </label>
              </div>

              {studentsLoading ? (
                <div className="tpo-empty-state">Loading pending students...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="tpo-empty-state">
                  <CheckCircle2 size={34} />
                  <h3>{students.length ? "No matching students" : "No pending approvals"}</h3>
                  <p>{students.length ? "Try another name, email, department, or college." : "All student registrations have been reviewed."}</p>
                </div>
              ) : (
                <div className="tpo-student-list">
                  {filteredStudents.map((student) => (
                    <article className="tpo-student-card" key={student._id}>
                      <div className="tpo-student-heading">
                        <div className="tpo-avatar">{(student.name || "S").charAt(0).toUpperCase()}</div>
                        <div className="tpo-student-identity">
                          <h3>{student.name || "Name not provided"}</h3>
                          <p>{student.email || "Email not provided"}</p>
                        </div>
                        <span className="tpo-pending-badge">Pending</span>
                      </div>

                      <div className="tpo-student-details">
                        <div><span>Department</span><strong>{student.department || "Not provided"}</strong></div>
                        <div><span>CGPA</span><strong>{student.cgpa ?? "Not provided"}</strong></div>
                        <div><span>Graduation year</span><strong>{student.graduationYear ?? "Not provided"}</strong></div>
                        <div><span>Backlogs</span><strong>{student.backlogs ?? "Not provided"}</strong></div>
                        <div><span>College</span><strong>{student.college || "Not provided"}</strong></div>
                        <div><span>Phone</span><strong>{student.phone || "Not provided"}</strong></div>
                      </div>

                      <div className="tpo-student-actions">
                        <button
                          type="button"
                          className="tpo-approve-button"
                          onClick={() => handleStudentAction(student._id, "approve")}
                          disabled={Boolean(processingStudentId)}
                        >
                          {processingStudentId === student._id ? "Processing..." : "Approve student"}
                        </button>
                        <button
                          type="button"
                          className="tpo-reject-button"
                          onClick={() => handleStudentAction(student._id, "reject")}
                          disabled={Boolean(processingStudentId)}
                        >
                          Reject registration
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : activeTab === "drives" ? (
          <div className="tpo-content">
            <section className="tpo-module-header">
              <div className="tpo-module-icon"><BriefcaseBusiness size={28} /></div>
              <div>
                <span className="tpo-welcome-tag">RECRUITMENT MANAGEMENT</span>
                <h2>Placement Drives</h2>
                <p>Create recruitment opportunities and manage the drives available to students.</p>
              </div>
              <div className="tpo-drive-header-actions">
                <button type="button" className="tpo-module-back" onClick={loadPlacementDrives} disabled={drivesLoading}>
                  <RefreshCw size={16} /> {drivesLoading ? "Refreshing..." : "Refresh"}
                </button>
                <button type="button" className="tpo-drive-primary" onClick={() => setShowDriveForm((current) => !current)}>
                  <Plus size={17} /> {showDriveForm ? "Cancel" : "Create Drive"}
                </button>
              </div>
            </section>

            {drivesError && <div className="tpo-alert tpo-alert-error" role="alert">{drivesError}</div>}
            {drivesMessage && <div className="tpo-alert tpo-alert-success" role="status">{drivesMessage}</div>}

            {showDriveForm && (
              <section className="tpo-panel tpo-drive-form-panel">
                <div className="tpo-panel-heading"><div><h2>Create Placement Drive</h2><p>Fields marked * are required. Separate multiple values with commas.</p></div></div>
                <form className="tpo-drive-form" onSubmit={handleCreateDrive}>
                  <label>Company name *<input name="companyName" value={driveForm.companyName} onChange={handleDriveInput} required maxLength={120} /></label>
                  <label>Job title *<input name="jobTitle" value={driveForm.jobTitle} onChange={handleDriveInput} required maxLength={120} /></label>
                  <label className="tpo-drive-full">Job description *<textarea name="description" value={driveForm.description} onChange={handleDriveInput} required rows={3} /></label>
                  <label>Package (LPA)<input name="packageLPA" type="number" min="0" step="0.1" value={driveForm.packageLPA} onChange={handleDriveInput} placeholder="e.g. 6.5" /></label>
                  <label>Minimum CGPA *<input name="minimumCgpa" type="number" min="0" max="10" step="0.01" value={driveForm.minimumCgpa} onChange={handleDriveInput} required /></label>
                  <label>Maximum backlogs *<input name="maximumBacklogs" type="number" min="0" step="1" value={driveForm.maximumBacklogs} onChange={handleDriveInput} required /></label>
                  <label>Eligible departments<input name="eligibleDepartments" value={driveForm.eligibleDepartments} onChange={handleDriveInput} placeholder="Computer Engineering, IT" /></label>
                  <label>Graduation years<input name="eligibleGraduationYears" value={driveForm.eligibleGraduationYears} onChange={handleDriveInput} placeholder="2027, 2028" /></label>
                  <label>Required skills<input name="requiredSkills" value={driveForm.requiredSkills} onChange={handleDriveInput} placeholder="Java, SQL, React" /></label>
                  <label>Application deadline *<input name="applicationDeadline" type="datetime-local" value={driveForm.applicationDeadline} onChange={handleDriveInput} required /></label>
                  <div className="tpo-drive-full tpo-drive-form-actions">
                    <button type="button" className="tpo-module-back" onClick={() => setShowDriveForm(false)}>Cancel</button>
                    <button type="submit" className="tpo-drive-primary" disabled={creatingDrive}>{creatingDrive ? "Creating..." : "Create Placement Drive"}</button>
                  </div>
                </form>
              </section>
            )}

            <section className="tpo-panel tpo-drive-list-panel">
              <div className="tpo-panel-heading">
                <div><h2>All Placement Drives</h2><p>{drives.length} drive{drives.length === 1 ? "" : "s"} found</p></div>
                <label className="tpo-search">
                  <Search size={17} />
                  <input value={driveSearch} onChange={(event) => setDriveSearch(event.target.value)} placeholder="Search drives" aria-label="Search placement drives" />
                </label>
              </div>
              {drivesLoading ? <div className="tpo-empty-state">Loading placement drives...</div> : filteredDrives.length === 0 ? (
                <div className="tpo-empty-state"><BriefcaseBusiness size={34} /><h3>{drives.length ? "No matching drives" : "No placement drives yet"}</h3><p>{drives.length ? "Try searching by company or job title." : "Create your first drive to make it available to students."}</p></div>
              ) : (
                <div className="tpo-drive-list">
                  {filteredDrives.map((drive) => (
                    <article className="tpo-drive-card" key={drive._id}>
                      <div className="tpo-drive-card-top"><div><h3>{drive.companyName}</h3><p>{drive.jobTitle}</p></div><span className={`tpo-drive-status ${drive.status === "closed" || (drive.applicationDeadline && new Date(drive.applicationDeadline).getTime() < Date.now()) ? "tpo-drive-status-closed" : ""}`}>{drive.applicationDeadline && new Date(drive.applicationDeadline).getTime() < Date.now() ? "Expired" : (drive.status || "open")}</span></div>
                      <p className="tpo-drive-description">{drive.description}</p>
                      <div className="tpo-drive-details">
                        <div><span>Package</span><strong>{drive.packageLPA == null ? "Not specified" : `${drive.packageLPA} LPA`}</strong></div>
                        <div><span>Minimum CGPA</span><strong>{drive.minimumCgpa}</strong></div>
                        <div><span>Maximum backlogs</span><strong>{drive.maximumBacklogs}</strong></div>
                        <div><span>Deadline</span><strong>{drive.applicationDeadline ? new Date(drive.applicationDeadline).toLocaleString() : "Not specified"}</strong></div>
                        <div><span>Departments</span><strong>{drive.eligibleDepartments?.length ? drive.eligibleDepartments.join(", ") : "All departments"}</strong></div>
                        <div><span>Graduation years</span><strong>{drive.eligibleGraduationYears?.length ? drive.eligibleGraduationYears.join(", ") : "All years"}</strong></div>
                        <div className="tpo-drive-full"><span>Required skills</span><strong>{drive.requiredSkills?.length ? drive.requiredSkills.join(", ") : "Not specified"}</strong></div>
                      </div>
                      <div className="tpo-student-actions">
                        <button type="button" className="tpo-reject-button" onClick={() => handleDeleteDrive(drive)} disabled={Boolean(deletingDriveId)}>
                          <Trash2 size={16} /> {deletingDriveId === drive._id ? "Deleting..." : "Delete Drive"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : activeTab === "applications" ? (
          <div className="tpo-content">
            <section className="tpo-module-header">
              <div className="tpo-module-icon"><FileText size={28} /></div>
              <div>
                <span className="tpo-welcome-tag">RECRUITMENT MANAGEMENT</span>
                <h2>Application Management</h2>
                <p>Review applicants and update their recruitment status for each placement drive.</p>
              </div>
              <button type="button" className="tpo-module-back" onClick={loadApplicationsWorkspace} disabled={applicationsLoading}>
                <RefreshCw size={16} /> {applicationsLoading ? "Refreshing..." : "Refresh"}
              </button>
            </section>

            {applicationsError && <div className="tpo-alert tpo-alert-error" role="alert">{applicationsError}</div>}
            {applicationsMessage && <div className="tpo-alert tpo-alert-success" role="status">{applicationsMessage}</div>}

            <section className="tpo-panel tpo-drive-list-panel">
              <div className="tpo-panel-heading">
                <div><h2>Select Placement Drive</h2><p>Choose a drive to see its submitted applications.</p></div>
                <select
                  className="tpo-application-drive-select"
                  value={selectedDriveId}
                  onChange={(event) => {
                    const driveId = event.target.value;
                    setSelectedDriveId(driveId);
                    loadDriveApplications(driveId, drives);
                  }}
                  aria-label="Select placement drive"
                >
                  <option value="">Select a drive</option>
                  {drives.map((drive) => <option key={drive._id} value={drive._id}>{drive.companyName} — {drive.jobTitle}</option>)}
                </select>
              </div>

              <div className="tpo-application-filters">
                <label className="tpo-search">
                  <Search size={17} />
                  <input value={applicationSearch} onChange={(event) => setApplicationSearch(event.target.value)} placeholder="Search applicants" aria-label="Search applicants" />
                </label>
                <select className="tpo-application-status-filter" value={applicationStatusFilter} onChange={(event) => setApplicationStatusFilter(event.target.value)} aria-label="Filter by application status">
                  <option value="all">All statuses</option>
                  <option value="applied">Applied</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="rejected">Rejected</option>
                  <option value="selected">Selected</option>
                </select>
              </div>

              {applicationsLoading ? <div className="tpo-empty-state">Loading applications...</div> : filteredApplications.length === 0 ? (
                <div className="tpo-empty-state">
                  <FileText size={34} />
                  <h3>{applications.length ? "No matching applications" : "No applications found"}</h3>
                  <p>{applications.length ? "Try changing your search or status filter." : "Applications submitted for the selected drive will appear here."}</p>
                </div>
              ) : (
                <div className="tpo-student-list">
                  {filteredApplications.map((application) => {
                    const applicant = application.student || application.user || application.studentId || {};
                    const applicantName = applicant.name || application.name || "Student";
                    const applicantEmail = applicant.email || application.email || "Email not provided";
                    const status = String(application.status || "applied").toLowerCase();
                    const applicationId = application._id;
                    return (
                      <article className="tpo-student-card" key={applicationId}>
                        <div className="tpo-student-heading">
                          <div className="tpo-avatar">{applicantName.charAt(0).toUpperCase()}</div>
                          <div className="tpo-student-identity"><h3>{applicantName}</h3><p>{applicantEmail}</p></div>
                          <span className={`tpo-pending-badge tpo-application-status-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                        </div>
                        <div className="tpo-student-details">
                          <div><span>Department</span><strong>{applicant.department || "Not provided"}</strong></div>
                          <div><span>CGPA</span><strong>{applicant.cgpa ?? "Not provided"}</strong></div>
                          <div><span>Graduation year</span><strong>{applicant.graduationYear ?? "Not provided"}</strong></div>
                          <div><span>Backlogs</span><strong>{applicant.backlogs ?? "Not provided"}</strong></div>
                          <div><span>College</span><strong>{applicant.college || "Not provided"}</strong></div>
                          <div><span>Applied on</span><strong>{application.appliedAt || application.createdAt ? new Date(application.appliedAt || application.createdAt).toLocaleDateString() : "Not available"}</strong></div>
                        </div>
                        <div className="tpo-student-actions">
                          <button type="button" className="tpo-approve-button" onClick={() => handleApplicationStatus(applicationId, "shortlisted")} disabled={Boolean(processingApplicationId) || status === "shortlisted" || !applicationId}>
                            {processingApplicationId === applicationId ? "Updating..." : "Shortlist"}
                          </button>
                          <button type="button" className="tpo-drive-primary" onClick={() => handleApplicationStatus(applicationId, "selected")} disabled={Boolean(processingApplicationId) || status === "selected" || !applicationId}>Select</button>
                          <button type="button" className="tpo-reject-button" onClick={() => handleApplicationStatus(applicationId, "rejected")} disabled={Boolean(processingApplicationId) || status === "rejected" || !applicationId}>Reject</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : activeTab === "reports" ? (
          <div className="tpo-content">
            <section className="tpo-module-header">
              <div className="tpo-module-icon"><BarChart3 size={28} /></div>
              <div>
                <span className="tpo-welcome-tag">PLACEMENT INSIGHTS</span>
                <h2>Reports & Analytics</h2>
                <p>Review application volume, selection outcomes, and performance by placement drive.</p>
              </div>
              <button type="button" className="tpo-module-back" onClick={loadReports} disabled={reportsLoading}>
                <RefreshCw size={16} /> {reportsLoading ? "Analyzing..." : "Refresh analysis"}
              </button>
            </section>

            {reportsError && <div className="tpo-alert tpo-alert-error" role="alert">{reportsError}</div>}
            {reportsMessage && <div className="tpo-alert tpo-alert-success" role="status">{reportsMessage}</div>}

            {reportsLoading ? <section className="tpo-panel"><div className="tpo-empty-state">Collecting applications and generating placement analysis...</div></section> : (
              <>
                <section className="tpo-stat-grid">
                  {[
                    { label: "Placement Drives", value: reports.length, caption: "Drives included in this report", icon: BriefcaseBusiness, color: "tpo-icon-blue" },
                    { label: "Total Applications", value: reports.reduce((sum, item) => sum + item.applications.length, 0), caption: "Applications across all drives", icon: FileText, color: "tpo-icon-purple" },
                    { label: "Shortlisted", value: reports.reduce((sum, item) => sum + item.applications.filter((app) => String(app.status || "applied").toLowerCase() === "shortlisted").length, 0), caption: "Candidates progressing", icon: Users, color: "tpo-icon-orange" },
                    { label: "Selected", value: reports.reduce((sum, item) => sum + item.applications.filter((app) => String(app.status || "").toLowerCase() === "selected").length, 0), caption: "Successful placements", icon: CheckCircle2, color: "tpo-icon-green" }
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return <article className="tpo-stat-card" key={stat.label}><div className="tpo-stat-top"><div className={`tpo-stat-icon ${stat.color}`}><Icon size={22} /></div></div><span className="tpo-stat-label">{stat.label}</span><strong className="tpo-stat-value">{stat.value}</strong><span className="tpo-stat-caption">{stat.caption}</span></article>;
                  })}
                </section>

                <section className="tpo-panel tpo-drive-list-panel">
                  <div className="tpo-panel-heading"><div><h2>Drive-wise Analysis</h2><p>Application status breakdown and selection rate for each drive.</p></div></div>
                  {reports.length === 0 ? <div className="tpo-empty-state"><BarChart3 size={34} /><h3>No report data available</h3><p>Create a placement drive and receive applications to see analytics.</p></div> : (
                    <div className="tpo-drive-list">
                      {reports.map(({ drive, applications: apps, error }) => {
                        const count = (status) => apps.filter((app) => String(app.status || "applied").toLowerCase() === status).length;
                        const selected = count("selected");
                        const rate = apps.length ? Math.round((selected / apps.length) * 100) : 0;
                        return <article className="tpo-drive-card" key={drive._id}>
                          <div className="tpo-drive-card-top"><div><h3>{drive.companyName || "Company"}</h3><p>{drive.jobTitle || "Placement drive"}</p></div><span className="tpo-drive-status">{apps.length} applications</span></div>
                          {error && <p className="tpo-alert tpo-alert-error">{error}</p>}
                          <div className="tpo-drive-details">
                            <div><span>Applied</span><strong>{count("applied")}</strong></div>
                            <div><span>Shortlisted</span><strong>{count("shortlisted")}</strong></div>
                            <div><span>Rejected</span><strong>{count("rejected")}</strong></div>
                            <div><span>Selected</span><strong>{selected}</strong></div>
                            <div><span>Selection rate</span><strong>{rate}%</strong></div>
                            <div><span>Package</span><strong>{drive.packageLPA == null ? "Not specified" : `${drive.packageLPA} LPA`}</strong></div>
                          </div>
                          <div className="tpo-student-actions"><button type="button" className="tpo-module-back" onClick={() => { setActiveTab("applications"); setSelectedDriveId(drive._id); }}>View applications</button></div>
                        </article>;
                      })}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        ) : (
          <div className="tpo-content">
            <section className="tpo-module-header"><div className="tpo-module-icon"><ActiveIcon size={28} /></div><div><span className="tpo-welcome-tag">MANAGEMENT MODULE</span><h2>{activeItem?.label}</h2><p>Manage and review information in the {activeItem?.label.toLowerCase()} workspace.</p></div></section>
            <section className="tpo-panel tpo-module-panel"><div className="tpo-module-panel-icon"><Search size={27} /></div><h3>{activeItem?.label}</h3><p>This section needs to be connected to the corresponding backend functionality before it can display and manage live records.</p><button className="tpo-module-back" onClick={() => setActiveTab("overview")}><LayoutDashboard size={17} />Back to Overview</button></section>
          </div>
        )}

        <footer className="tpo-footer">
          <span>© PlacementHub</span>
          <span>AI-Driven Placement Management System</span>
        </footer>
      </main>
    </div>
  );
}