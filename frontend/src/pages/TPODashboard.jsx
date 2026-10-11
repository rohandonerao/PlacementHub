import { useCallback, useEffect, useState } from "react";
import { getPendingStudents, approveStudent, rejectStudent, getPlacementDrives, createPlacementDrive, getDriveApplications, updateApplicationStatus, deletePlacementDrive, getStudentProfile } from "../api.js";
import {
  BarChart3,
  Building2,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Trophy,
  UserCheck,
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
  driveStatus,
  formatDate,
  isExpired
} from "../components/ui";

export default function TPODashboard({ user, logout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collegeDepartments, setCollegeDepartments] = useState([]);

  // The college's department list, used for drive eligibility.
  useEffect(() => {
    getStudentProfile(sessionStorage.getItem("token"))
      .then((result) => setCollegeDepartments(result.collegeDepartments || []))
      .catch(() => setCollegeDepartments([]));
  }, []);
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
    const token = sessionStorage.getItem("token");

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
    const token = sessionStorage.getItem("token");
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

    const token = sessionStorage.getItem("token");
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
    const token = sessionStorage.getItem("token");
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
    const token = sessionStorage.getItem("token");
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
      const token = sessionStorage.getItem("token");
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
    const token = sessionStorage.getItem("token");
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
    const token = sessionStorage.getItem("token");
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
    const token = sessionStorage.getItem("token");

    if (!token) {
      setStudentsError("Your session has expired. Please log in again.");
      return;
    }

    const student = students.find((item) => item._id === studentId);
    const actionLabel = action === "approve" ? "approve" : "reject";

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

  // Overview needs drive and approval counts.
  useEffect(() => {
    if (activeTab === "overview") {
      loadPlacementDrives();
      loadPendingStudents();
    }
  }, [activeTab, loadPlacementDrives, loadPendingStudents]);

  const [companySearch, setCompanySearch] = useState("");

  const openDrives = drives.filter((drive) => drive.status !== "closed" && !isExpired(drive));

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "students", label: "Student approvals", icon: UserCheck, count: students.length },
    { id: "drives", label: "Placement drives", icon: BriefcaseBusiness },
    { id: "companies", label: "Companies", icon: Building2 },
    { id: "applications", label: "Applicants & interviews", icon: ClipboardList },
    { id: "reports", label: "Reports", icon: BarChart3 }
  ];

  const companies = Object.values(
    drives.reduce((acc, drive) => {
      const key = (drive.companyName || "Company").trim();
      const entry = acc[key.toLowerCase()] || (acc[key.toLowerCase()] = { name: key, drives: [], roles: new Set(), skills: new Set(), maxPackage: null });
      entry.drives.push(drive);
      if (drive.jobTitle) entry.roles.add(drive.jobTitle);
      (drive.requiredSkills || []).forEach((skill) => entry.skills.add(skill));
      if (drive.packageLPA != null) entry.maxPackage = Math.max(entry.maxPackage ?? 0, drive.packageLPA);
      return acc;
    }, {})
  )
    .sort((a, b) => b.drives.length - a.drives.length)
    .filter((company) => !companySearch.trim() || company.name.toLowerCase().includes(companySearch.trim().toLowerCase()));

  const reportTotals = {
    applications: reports.reduce((sum, item) => sum + item.applications.length, 0),
    status: (status) => reports.reduce((sum, item) => sum + item.applications.filter((app) => String(app.status || "applied").toLowerCase() === status).length, 0)
  };

  const resetDriveForm = () => setShowDriveForm(false);
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

  const firstName = user?.name?.split(" ")[0] || "Officer";
  const upcoming = [...openDrives].sort((a, b) => new Date(a.applicationDeadline) - new Date(b.applicationDeadline)).slice(0, 5);
  const statusCount = (status) => applications.filter((app) => String(app.status || "applied").toLowerCase() === status).length;
  const openCreate = () => { setActiveTab("drives"); setShowDriveForm(true); };

  return (
    <AppShell nav={menuItems} active={activeTab} onNavigate={setActiveTab} user={user} roleLabel="Placement officer" section="TPO portal" onLogout={logout}>
      {activeTab === "overview" && (
        <>
          <PageHeader
            title="Overview"
            description={`Welcome back, ${firstName}. Drives, approvals and deadlines for your placement cell.`}
            actions={
              <>
                <button className="btn btn-secondary" onClick={() => setActiveTab("students")}>Review approvals</button>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> New drive</button>
              </>
            }
          />

          <Summary
            loading={drivesLoading && !drives.length}
            items={[
              ["Total drives", drives.length, "All recruitment drives"],
              ["Open drives", openDrives.length, "Accepting applications"],
              ["Pending approvals", students.length, "Student registrations"],
              ["Companies", companies.length, "Recruiting this season"]
            ]}
          />

          <section className="grid grid-main-side">
            <div className="panel">
              <div className="panel-head">
                <div><h2>Upcoming deadlines</h2><p>Open drives, closing soonest first.</p></div>
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab("drives")}>All drives</button>
              </div>
              {drivesLoading && !drives.length ? <SkeletonRows rows={3} /> : upcoming.length === 0 ? (
                <Empty icon={CalendarDays} title="No open drives" text="Create a placement drive to start receiving applications." action={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={15} /> New drive</button>} />
              ) : (
                <div className="rows">
                  {upcoming.map((drive) => {
                    const days = daysUntil(drive.applicationDeadline);
                    return (
                      <button className="row row-link" key={drive._id} onClick={() => { setSelectedDriveId(drive._id); setActiveTab("applications"); }}>
                        <OrgMark name={drive.companyName} />
                        <div className="row-main">
                          <strong>{drive.jobTitle}</strong>
                          <span>{drive.companyName} · Min. CGPA {drive.minimumCgpa}{drive.packageLPA != null ? ` · ${drive.packageLPA} LPA` : ""}</span>
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
                <div><h2>Awaiting approval</h2><p>New student registrations.</p></div>
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab("students")}>Review all</button>
              </div>
              {studentsLoading && !students.length ? <SkeletonRows rows={3} /> : students.length === 0 ? (
                <Empty icon={CheckCircle2} title="All caught up" text="There are no registrations waiting for review." />
              ) : (
                <div className="rows">
                  {students.slice(0, 5).map((student) => (
                    <div className="row" key={student._id}>
                      <Avatar name={student.name} />
                      <div className="row-main">
                        <strong>{student.name}</strong>
                        <span>{[student.department, student.cgpa != null ? `CGPA ${student.cgpa}` : null].filter(Boolean).join(" · ") || student.email}</span>
                      </div>
                      <button className="btn btn-secondary btn-sm" disabled={Boolean(processingStudentId)} onClick={() => handleStudentAction(student._id, "approve")} aria-label={`Approve ${student.name}`}>
                        <Check size={14} /> Approve
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === "students" && (
        <>
          <PageHeader
            title="Student approvals"
            description={`Students from the ${user?.department || "your"} department who are waiting for approval. Approved students can view drives and apply; rejected students cannot.`}
            actions={<button className="btn btn-secondary" onClick={loadPendingStudents} disabled={studentsLoading}><RefreshCw size={15} /> Refresh</button>}
          />
          <Alert tone="error">{studentsError}</Alert>
          <Alert tone="success">{studentsMessage}</Alert>
          <div className="panel">
            <div className="panel-head">
              <div><h2>Pending registrations</h2><p>{students.length} waiting for review</p></div>
              <label className="input-icon" style={{ flex: "0 1 320px", minWidth: 0, width: "100%" }}>
                <Search size={15} />
                <input className="input" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Search name, email, department" aria-label="Search students" />
              </label>
            </div>
            {studentsLoading ? <SkeletonRows rows={4} /> : filteredStudents.length === 0 ? (
              <Empty icon={CheckCircle2} title={students.length ? "No matching students" : "No pending approvals"} text={students.length ? "Try another name, email, department or college." : "All student registrations have been reviewed."} />
            ) : (
              <div className="table-wrap">
                <table className="table table-cards">
                  <thead>
                    <tr><th>Student</th><th>Department</th><th>CGPA</th><th>Batch</th><th>Backlogs</th><th>Phone</th><th className="right">Decision</th></tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student._id}>
                        <td className="td-main">
                          <div className="cell-main">
                            <Avatar name={student.name} size="sm" />
                            <div style={{ minWidth: 0 }}><strong>{student.name || "Name not provided"}</strong><span>{student.email}</span></div>
                          </div>
                        </td>
                        <td data-label="Department">{student.department || "—"}</td>
                        <td data-label="CGPA">{student.cgpa ?? "—"}</td>
                        <td data-label="Batch">{student.graduationYear ?? "—"}</td>
                        <td data-label="Backlogs">{student.backlogs ?? "—"}</td>
                        <td data-label="Phone">{student.phone || "—"}</td>
                        <td data-label="Decision">
                          <div className="row-actions">
                            <button className="btn btn-danger btn-sm" onClick={() => handleStudentAction(student._id, "reject")} disabled={Boolean(processingStudentId)}>Reject</button>
                            <button className="btn btn-success btn-sm" onClick={() => handleStudentAction(student._id, "approve")} disabled={Boolean(processingStudentId)}>
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

      {activeTab === "drives" && (
        <>
          <PageHeader
            title="Placement drives"
            description="Publish drives with eligibility rules. Students can only apply when they meet every rule."
            actions={
              <>
                <button className="btn btn-secondary" onClick={loadPlacementDrives} disabled={drivesLoading}><RefreshCw size={15} /> Refresh</button>
                {!showDriveForm && <button className="btn btn-primary" onClick={() => setShowDriveForm(true)}><Plus size={16} /> New drive</button>}
              </>
            }
          />
          <Alert tone="error">{drivesError}</Alert>
          <Alert tone="success">{drivesMessage}</Alert>

          {showDriveForm && (
            <form className="panel" onSubmit={handleCreateDrive}>
              <div className="panel-head">
                <div><h2>New placement drive</h2><p>Fields marked * are required. Separate multiple values with commas.</p></div>
                <button type="button" className="icon-btn icon-btn-plain" onClick={resetDriveForm} aria-label="Close form"><X size={18} /></button>
              </div>
              <div className="panel-body form-grid">
                <div className="form-section">Role</div>
                <Field label="Company name *" htmlFor="d-company"><input id="d-company" className="input" name="companyName" value={driveForm.companyName} onChange={handleDriveInput} required maxLength={120} placeholder="e.g. Infosys" /></Field>
                <Field label="Job title *" htmlFor="d-title"><input id="d-title" className="input" name="jobTitle" value={driveForm.jobTitle} onChange={handleDriveInput} required maxLength={120} placeholder="e.g. Java Developer" /></Field>
                <Field label="Job description *" full htmlFor="d-desc"><textarea id="d-desc" className="textarea" name="description" value={driveForm.description} onChange={handleDriveInput} required rows={3} placeholder="Responsibilities and expectations" /></Field>
                <Field label="Package" hint="LPA" htmlFor="d-pkg"><input id="d-pkg" className="input" name="packageLPA" type="number" min="0" step="0.1" value={driveForm.packageLPA} onChange={handleDriveInput} placeholder="e.g. 6.5" /></Field>
                <Field label="Application deadline *" htmlFor="d-deadline"><input id="d-deadline" className="input" name="applicationDeadline" type="datetime-local" value={driveForm.applicationDeadline} onChange={handleDriveInput} required /></Field>
                <Field label="Required skills" hint="Used for resume matching" full htmlFor="d-skills"><input id="d-skills" className="input" name="requiredSkills" value={driveForm.requiredSkills} onChange={handleDriveInput} placeholder="Java, SQL, Spring Boot" /></Field>
                <div className="form-section">Eligibility</div>
                <Field label="Minimum CGPA *" htmlFor="d-cgpa"><input id="d-cgpa" className="input" name="minimumCgpa" type="number" min="0" max="10" step="0.01" value={driveForm.minimumCgpa} onChange={handleDriveInput} required placeholder="e.g. 7.0" /></Field>
                <Field label="Maximum backlogs *" htmlFor="d-backlogs"><input id="d-backlogs" className="input" name="maximumBacklogs" type="number" min="0" step="1" value={driveForm.maximumBacklogs} onChange={handleDriveInput} required /></Field>
                {collegeDepartments.length > 0 ? (
                  <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                    <legend style={{ marginBottom: 6 }}>Eligible departments <span className="hint">None ticked = all</span></legend>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
                      {collegeDepartments.map((name) => {
                        const selected = driveForm.eligibleDepartments.split(",").map((item) => item.trim()).filter(Boolean);
                        const checked = selected.includes(name);
                        return (
                          <label key={name} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setDriveForm((current) => {
                                const list = current.eligibleDepartments.split(",").map((item) => item.trim()).filter(Boolean);
                                const next = checked ? list.filter((item) => item !== name) : [...list, name];
                                return { ...current, eligibleDepartments: next.join(", ") };
                              })}
                            />
                            {name}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : (
                  <Field label="Eligible departments" hint="Blank = all" htmlFor="d-depts"><input id="d-depts" className="input" name="eligibleDepartments" value={driveForm.eligibleDepartments} onChange={handleDriveInput} placeholder="Computer Engineering, IT" /></Field>
                )}
                <Field label="Graduation years" hint="Blank = all" htmlFor="d-years"><input id="d-years" className="input" name="eligibleGraduationYears" value={driveForm.eligibleGraduationYears} onChange={handleDriveInput} placeholder="2026, 2027" /></Field>
              </div>
              <div className="panel-foot">
                <button type="button" className="btn btn-secondary" onClick={resetDriveForm}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creatingDrive}>{creatingDrive ? "Publishing…" : "Publish drive"}</button>
              </div>
            </form>
          )}

          <div className="panel">
            <div className="panel-head">
              <div><h2>All drives</h2><p>{drives.length} drive{drives.length === 1 ? "" : "s"}</p></div>
              <label className="input-icon" style={{ flex: "0 1 320px", minWidth: 0, width: "100%" }}>
                <Search size={15} />
                <input className="input" value={driveSearch} onChange={(e) => setDriveSearch(e.target.value)} placeholder="Search company or role" aria-label="Search placement drives" />
              </label>
            </div>
            {drivesLoading && !drives.length ? <SkeletonRows rows={4} /> : filteredDrives.length === 0 ? (
              <Empty icon={BriefcaseBusiness} title={drives.length ? "No matching drives" : "No placement drives yet"} text={drives.length ? "Try searching by company or job title." : "Publish your first drive to make it visible to eligible students."} action={!drives.length && !showDriveForm && <button className="btn btn-primary btn-sm" onClick={() => setShowDriveForm(true)}><Plus size={15} /> New drive</button>} />
            ) : (
              <div className="table-wrap">
                <table className="table table-cards">
                  <thead>
                    <tr><th>Drive</th><th>Package</th><th>Eligibility</th><th>Skills</th><th>Deadline</th><th>Status</th><th className="right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredDrives.map((drive) => (
                      <tr key={drive._id}>
                        <td className="td-main">
                          <div className="cell-main">
                            <OrgMark name={drive.companyName} />
                            <div style={{ minWidth: 0 }}><strong>{drive.jobTitle}</strong><span>{drive.companyName}</span></div>
                          </div>
                        </td>
                        <td data-label="Package">{drive.packageLPA == null ? "—" : `${drive.packageLPA} LPA`}</td>
                        <td data-label="Eligibility">
                          <span>CGPA ≥ {drive.minimumCgpa} · Backlogs ≤ {drive.maximumBacklogs}</span>
                          <span className="muted" style={{ display: "block" }}>{drive.eligibleDepartments?.length ? drive.eligibleDepartments.join(", ") : "All departments"}{drive.eligibleGraduationYears?.length ? ` · ${drive.eligibleGraduationYears.join(", ")}` : ""}</span>
                        </td>
                        <td data-label="Skills" style={{ maxWidth: 220 }}>{drive.requiredSkills?.length ? drive.requiredSkills.join(", ") : "—"}</td>
                        <td data-label="Deadline" style={{ whiteSpace: "nowrap" }}>{formatDate(drive.applicationDeadline)}</td>
                        <td data-label="Status"><StatusBadge status={driveStatus(drive)} /></td>
                        <td data-label="Actions">
                          <div className="row-actions">
                            <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedDriveId(drive._id); setActiveTab("applications"); }}>Applicants</button>
                            <button className="icon-btn" onClick={() => handleDeleteDrive(drive)} disabled={Boolean(deletingDriveId)} title="Delete drive" aria-label={`Delete ${drive.companyName} drive`} style={{ color: "var(--danger)" }}>
                              <Trash2 size={15} />
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

      {activeTab === "companies" && (
        <>
          <PageHeader
            title="Companies"
            description="Every company that has run a drive with your placement cell, with its roles, best package and skills sought."
            actions={<button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> New drive</button>}
          />
          <div className="panel">
            <div className="panel-head">
              <div><h2>Recruiting companies</h2><p>{companies.length} compan{companies.length === 1 ? "y" : "ies"}</p></div>
              <label className="input-icon" style={{ flex: "0 1 320px", minWidth: 0, width: "100%" }}>
                <Search size={15} />
                <input className="input" value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} placeholder="Search companies" aria-label="Search companies" />
              </label>
            </div>
            {drivesLoading && !drives.length ? <SkeletonRows rows={4} /> : companies.length === 0 ? (
              <Empty icon={Building2} title="No companies yet" text="Companies are listed here once you publish a drive for them." />
            ) : (
              <div className="table-wrap">
                <table className="table table-cards">
                  <thead><tr><th>Company</th><th>Roles</th><th>Drives</th><th>Best package</th><th>Skills sought</th></tr></thead>
                  <tbody>
                    {companies.map((company) => {
                      const active = company.drives.filter((d) => d.status !== "closed" && !isExpired(d)).length;
                      return (
                        <tr key={company.name}>
                          <td className="td-main">
                            <div className="cell-main">
                              <OrgMark name={company.name} />
                              <div style={{ minWidth: 0 }}><strong>{company.name}</strong><span>{active ? `${active} open drive${active === 1 ? "" : "s"}` : "No open drives"}</span></div>
                            </div>
                          </td>
                          <td data-label="Roles">{[...company.roles].join(", ")}</td>
                          <td data-label="Drives">{company.drives.length}</td>
                          <td data-label="Best package">{company.maxPackage == null ? "—" : `${company.maxPackage} LPA`}</td>
                          <td data-label="Skills sought" style={{ maxWidth: 280 }}>{company.skills.size ? [...company.skills].slice(0, 8).join(", ") : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "applications" && (
        <>
          <PageHeader
            title="Applicants & interviews"
            description="Shortlist applicants for interview, then record the final decision for each drive."
            actions={<button className="btn btn-secondary" onClick={loadApplicationsWorkspace} disabled={applicationsLoading}><RefreshCw size={15} /> Refresh</button>}
          />
          <Alert tone="error">{applicationsError}</Alert>
          <Alert tone="success">{applicationsMessage}</Alert>

          <div className="panel">
            <div className="panel-body toolbar" style={{ paddingBottom: 12 }}>
              <select
                className="select"
                style={{ flex: "1 1 300px" }}
                value={selectedDriveId}
                onChange={(event) => {
                  const driveId = event.target.value;
                  setSelectedDriveId(driveId);
                  loadDriveApplications(driveId, drives);
                }}
                aria-label="Placement drive"
              >
                <option value="">Select a placement drive</option>
                {drives.map((drive) => <option key={drive._id} value={drive._id}>{drive.companyName} — {drive.jobTitle}</option>)}
              </select>
              <label className="input-icon">
                <Search size={15} />
                <input className="input" value={applicationSearch} onChange={(e) => setApplicationSearch(e.target.value)} placeholder="Search applicants" aria-label="Search applicants" />
              </label>
            </div>
            <div className="tabs" role="tablist" aria-label="Filter by status" style={{ padding: "0 8px" }}>
              {[
                ["all", "All", applications.length],
                ["applied", "Applied", statusCount("applied")],
                ["shortlisted", "Interview", statusCount("shortlisted")],
                ["selected", "Selected", statusCount("selected")],
                ["rejected", "Rejected", statusCount("rejected")]
              ].map(([value, text, n]) => (
                <button key={value} role="tab" aria-selected={applicationStatusFilter === value} className={applicationStatusFilter === value ? "active" : ""} onClick={() => setApplicationStatusFilter(value)}>
                  {text} <span className="count">{n}</span>
                </button>
              ))}
            </div>

            {applicationsLoading ? <SkeletonRows rows={4} /> : filteredApplications.length === 0 ? (
              <Empty icon={ClipboardList} title={applications.length ? "No matching applicants" : "No applications yet"} text={applications.length ? "Try another search or status." : "Applications for the selected drive appear here."} />
            ) : (
              <div className="table-wrap">
                <table className="table table-cards">
                  <thead>
                    <tr><th>Applicant</th><th>Department</th><th>CGPA</th><th>Batch</th><th>Applied</th><th>Status</th><th className="right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((application) => {
                      const applicant = application.student || application.user || application.studentId || {};
                      const name = applicant.name || application.name || "Student";
                      const status = String(application.status || "applied").toLowerCase();
                      const id = application._id;
                      const busy = Boolean(processingApplicationId) || !id;
                      return (
                        <tr key={id}>
                          <td className="td-main">
                            <div className="cell-main">
                              <Avatar name={name} size="sm" />
                              <div style={{ minWidth: 0 }}><strong>{name}</strong><span>{applicant.email || application.email || "—"}</span></div>
                            </div>
                          </td>
                          <td data-label="Department">{applicant.department || "—"}</td>
                          <td data-label="CGPA">{applicant.cgpa ?? "—"}</td>
                          <td data-label="Batch">{applicant.graduationYear ?? "—"}</td>
                          <td data-label="Applied">{formatDate(application.appliedAt || application.createdAt)}</td>
                          <td data-label="Status"><StatusBadge status={status} /></td>
                          <td data-label="Actions">
                            <div className="row-actions">
                              <button className="icon-btn" title="Shortlist for interview" aria-label={`Shortlist ${name} for interview`} disabled={busy || status === "shortlisted"} onClick={() => handleApplicationStatus(id, "shortlisted")}><Star size={15} /></button>
                              <button className="icon-btn" title="Mark as selected" aria-label={`Select ${name}`} disabled={busy || status === "selected"} onClick={() => handleApplicationStatus(id, "selected")} style={{ color: "var(--success)" }}><Trophy size={15} /></button>
                              <button className="icon-btn" title="Reject" aria-label={`Reject ${name}`} disabled={busy || status === "rejected"} onClick={() => handleApplicationStatus(id, "rejected")} style={{ color: "var(--danger)" }}><X size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "reports" && (
        <>
          <PageHeader
            title="Reports"
            description="Applications, interview shortlists and selections across every placement drive."
            actions={<button className="btn btn-secondary" onClick={loadReports} disabled={reportsLoading}><RefreshCw size={15} /> {reportsLoading ? "Generating…" : "Refresh"}</button>}
          />
          <Alert tone="warning">{reportsError}</Alert>
          <Alert tone="success">{reportsMessage}</Alert>

          <Summary
            loading={reportsLoading}
            items={[
              ["Drives", reports.length, "Included in this report"],
              ["Applications", reportTotals.applications, "Across all drives"],
              ["Interview", reportTotals.status("shortlisted"), "Currently shortlisted"],
              ["Selected", reportTotals.status("selected"), "Successful placements"]
            ]}
          />

          <section className="grid grid-main-side">
            <div className="panel">
              <div className="panel-head"><div><h2>By drive</h2><p>Status breakdown and selection rate.</p></div></div>
              {reportsLoading ? <SkeletonRows rows={4} /> : reports.length === 0 ? (
                <Empty icon={BarChart3} title="No report data yet" text="Publish a drive and receive applications to see results here." />
              ) : (
                <div className="table-wrap">
                  <table className="table table-cards">
                    <thead><tr><th>Drive</th><th className="right">Applied</th><th className="right">Interview</th><th className="right">Selected</th><th className="right">Rejected</th><th style={{ minWidth: 150 }}>Selection rate</th></tr></thead>
                    <tbody>
                      {reports.map(({ drive, applications: apps, error }) => {
                        const count = (status) => apps.filter((app) => String(app.status || "applied").toLowerCase() === status).length;
                        const selected = count("selected");
                        const rate = apps.length ? Math.round((selected / apps.length) * 100) : 0;
                        return (
                          <tr key={drive._id}>
                            <td className="td-main">
                              <button className="cell-main cell-link" onClick={() => { setSelectedDriveId(drive._id); setActiveTab("applications"); }}>
                                <OrgMark name={drive.companyName} />
                                <div style={{ minWidth: 0 }}><strong>{drive.jobTitle}</strong><span>{drive.companyName}{error ? " · data incomplete" : ""}</span></div>
                              </button>
                            </td>
                            <td data-label="Applied" className="right">{apps.length}</td>
                            <td data-label="Interview" className="right">{count("shortlisted")}</td>
                            <td data-label="Selected" className="right">{selected}</td>
                            <td data-label="Rejected" className="right">{count("rejected")}</td>
                            <td data-label="Selection rate">
                              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 120, flex: 1, justifyContent: "flex-end" }}>
                                <div style={{ flex: 1, maxWidth: 120 }}><Bar value={rate} tone="success" /></div>
                                <strong className="num" style={{ fontSize: 13, minWidth: 34, textAlign: "right" }}>{rate}%</strong>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="panel">
              <div className="panel-head"><div><h2>Conversion</h2><p>Share of all applications.</p></div></div>
              <div className="panel-body meters">
                {[
                  ["Applications received", reportTotals.applications, ""],
                  ["Reached interview", reportTotals.status("shortlisted") + reportTotals.status("selected"), "warning"],
                  ["Selected", reportTotals.status("selected"), "success"],
                  ["Rejected", reportTotals.status("rejected"), "danger"]
                ].map(([name, value, tone]) => (
                  <div className="meter-row" key={name}>
                    <span>{name}</span><strong>{value}</strong>
                    <Bar value={reportTotals.applications ? (value / reportTotals.applications) * 100 : 0} tone={tone} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
