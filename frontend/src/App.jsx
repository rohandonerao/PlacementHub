import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  GraduationCap,
  Upload,
  Sparkles
} from "lucide-react";
import {
  loginUser,
  registerStudent,
  registerCollege,
  getVerifiedColleges,
  getStudentProfile,
  updateStudentProfile,
  analyzeResume,
  getPlacementDrives,
  checkEligibility,
  applyForPlacement,
  getMyApplications
} from "./api";
import StudentDashboard from "./pages/StudentDashboard";
import PlacementDrives from "./pages/PlacementDrives";
import TPODashboard from "./pages/TPODashboard";
import AdminDashboard from "./AdminDashboard";
import "./styles.css";
const emptyForm = {
  name: "",
  email: "",
  password: "",
  department: "",
  collegeId: ""
};
const emptyCollegeForm = {
  name: "",
  email: "",
  password: "",
  collegeName: "",
  officialEmail: "",
  address: "",
  principalName: ""
};
const emptyJobDescription = `Junior Software Developer
Required Skills:
Java, Python, SQL, JavaScript, React, REST APIs, Git.
Requirements:
Knowledge of data structures, object-oriented programming,
database management, and problem-solving.`;
export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [collegeForm, setCollegeForm] = useState(emptyCollegeForm);
  const [colleges, setColleges] = useState([]);
  const [collegeLoading, setCollegeLoading] = useState(false);
  const [skillsInput, setSkillsInput] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [drives, setDrives] = useState([]);
  const [applications, setApplications] = useState([]);
  const [eligibility, setEligibility] = useState({});
  const [placementLoading, setPlacementLoading] = useState(false);
  const [placementError, setPlacementError] = useState("");
  const [placementMessage, setPlacementMessage] = useState("");
  const [placementTab, setPlacementTab] = useState("drives");
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState(
    emptyJobDescription
  );
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  useEffect(() => {
    if (page === "register" || page === "register-college") {
      loadColleges();
    }
  }, [page]);
  const loadColleges = async () => {
  setCollegeLoading(true);
  setError("");
  try {
    const result = await getVerifiedColleges();
    const collegeList = Array.isArray(result)
      ? result
      : Array.isArray(result?.colleges)
        ? result.colleges
        : Array.isArray(result?.data)
          ? result.data
          : [];
    setColleges(collegeList);
  } catch (err) {
    setColleges([]);
    setError(err.message || "Could not load verified colleges.");
  } finally {
    setCollegeLoading(false);
  }
};
  const updateForm = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  };
  const updateCollegeForm = (event) => {
    setCollegeForm({
      ...collegeForm,
      [event.target.name]: event.target.value
    });
  };
  const openDashboard = async (loggedInUser, token) => {
    setUser(loggedInUser);
    setPage("dashboard");
    setProfileLoading(true);
    setError("");
    try {
      const result = await getStudentProfile(token);
      setProfile(result);
      setSkillsInput((result.skills || []).join(", "));
    } catch (err) {
      setError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (!token || !savedUser) return;
    try {
      const loggedInUser = JSON.parse(savedUser);
      if (!loggedInUser?.role) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return;
      }
      setUser(loggedInUser);
      if (loggedInUser.role === "admin") {
        setPage("admin-dashboard");
      } else if (loggedInUser.role === "tpo") {
        setPage("tpo-dashboard");
      } else if (loggedInUser.approvalStatus !== "approved") {
        setPage("approval-status");
      } else {
        openDashboard(loggedInUser, token);
      }
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setPage("home");
    }
  }, []);
  const loadPlacementData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setPlacementLoading(true);
    setPlacementError("");
    try {
      const [driveData, applicationData] = await Promise.all([
        getPlacementDrives(token),
        getMyApplications(token)
      ]);
      setDrives(
        Array.isArray(driveData)
          ? driveData
          : driveData.drives || []
      );
      setApplications(
        Array.isArray(applicationData)
          ? applicationData
          : applicationData.applications || []
      );
    } catch (err) {
      setPlacementError(
        err.message || "Could not load placement data."
      );
    } finally {
      setPlacementLoading(false);
    }
  };
  const loadEligibility = async (driveId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setPlacementError(
        "Your session has expired. Please log in again."
      );
      return;
    }
    setPlacementError("");
    try {
      const result = await checkEligibility(token, driveId);
      setEligibility((previous) => ({
        ...previous,
        [driveId]: result
      }));
    } catch (err) {
      setPlacementError(
        err.message || "Could not check eligibility."
      );
    }
  };
  const handleApply = async (driveId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setPlacementError(
        "Your session has expired. Please log in again."
      );
      return;
    }
    setPlacementError("");
    setPlacementMessage("");
    try {
      const result = await applyForPlacement(token, driveId);
      setPlacementMessage(
        result.message || "Application submitted successfully."
      );
      await loadPlacementData();
      setPlacementTab("applications");
    } catch (err) {
      setPlacementError(
        err.message || "Could not submit your application."
      );
    }
  };
  const submitForm = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (page === "register") {
        const result = await registerStudent(form);
        setMessage(
          result.message ||
            "Registration submitted. Await verification."
        );
      } else {
        const result = await loginUser({
          email: form.email,
          password: form.password
        });
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.user));
        setUser(result.user);
        if (result.user.role === "admin") {
          setPage("admin-dashboard");
        } else if (result.user.role === "tpo") {
          setPage("tpo-dashboard");
        } else if (result.user.approvalStatus !== "approved") {
          setProfile(null);
          setPage("approval-status");
        } else {
          await openDashboard(result.user, result.token);
        }
      }
    } catch (err) {
      setError(err.message || "Request failed.");
    } finally {
      setLoading(false);
    }
  };
  const submitCollegeRegistration = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const result = await registerCollege(collegeForm);
      setMessage(
        result.message ||
          "College registration submitted. Please wait for verification."
      );
      setCollegeForm(emptyCollegeForm);
    } catch (err) {
      setError(err.message || "College registration failed.");
    } finally {
      setLoading(false);
    }
  };
  const saveProfile = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const updated = await updateStudentProfile(token, {
        name: profile.name,
        department: profile.department,
        phone: profile.phone,
        college: profile.college,
        graduationYear:
          profile.graduationYear === ""
            ? null
            : Number(profile.graduationYear),
        cgpa:
          profile.cgpa === ""
            ? null
            : Number(profile.cgpa),
        backlogs:
          profile.backlogs === ""
            ? 0
            : Number(profile.backlogs),
        skills: skillsInput
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
      });
      setProfile(updated);
      const updatedUser = { ...user, name: updated.name };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setSkillsInput((updated.skills || []).join(", "));
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setProfile(null);
    setForm(emptyForm);
    setCollegeForm(emptyCollegeForm);
    setResume(null);
    setAnalysis(null);
    setAnalysisError("");
    setError("");
    setMessage("");
    setPlacementError("");
    setPlacementMessage("");
    setPage("home");
  };
  const updateProfileField = (event) => {
    setProfile({
      ...profile,
      [event.target.name]: event.target.value
    });
  };
  const handleResumeChange = (event) => {
    const file = event.target.files?.[0];
    setResume(null);
    setAnalysis(null);
    setAnalysisError("");
    if (!file) return;
    const validExtension = /\.(pdf|docx)$/i.test(file.name);
    if (!validExtension) {
      setAnalysisError(
        "Please select a PDF or DOCX resume."
      );
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAnalysisError(
        "Resume must be 5 MB or smaller."
      );
      event.target.value = "";
      return;
    }
    setResume(file);
  };
  const handleAnalyzeResume = async (event) => {
    event.preventDefault();
    setAnalysisError("");
    setAnalysis(null);
    if (!resume) {
      setAnalysisError(
        "Please select your PDF or DOCX resume."
      );
      return;
    }
    if (!jobDescription.trim()) {
      setAnalysisError(
        "Please enter a job description."
      );
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      setAnalysisError(
        "Your session has expired. Please log in again."
      );
      return;
    }
    setAnalyzing(true);
    try {
      const result = await analyzeResume(
        token,
        resume,
        jobDescription.trim()
      );
      setAnalysis(result);
    } catch (err) {
      setAnalysisError(
        err.message || "Resume analysis failed."
      );
    } finally {
      setAnalyzing(false);
    }
  };
  const formatLabel = (key) =>
    key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const renderValue = (value) => {
    if (value === null || value === undefined) {
      return "Not available";
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return "None found";
      return (
        <ul className="analysis-list">
          {value.map((item, index) => (
            <li key={index}>
              {typeof item === "object"
                ? JSON.stringify(item)
                : String(item)}
            </li>
          ))}
        </ul>
      );
    }
    if (typeof value === "object") {
      return (
        <div className="analysis-nested">
          {Object.entries(value).map(([key, nestedValue]) => (
            <div className="analysis-nested-row" key={key}>
              <strong>{formatLabel(key)}</strong>
              <div>{renderValue(nestedValue)}</div>
            </div>
          ))}
        </div>
      );
    }
    return String(value);
  };
  return (
    <main className="page">
      {page !== "admin-dashboard" && (
        <nav className="navbar">
          <div className="brand-mark">P</div>
          <span className="brand">PlacementHub</span>
          <span className="nav-label">
            AI-Driven Placement Management
          </span>
        </nav>
      )}
      {page === "home" && (
        <section className="hero">
          <div className="eyebrow">
            COLLEGE PLACEMENT PLATFORM
          </div>
          <h1>
            One platform for every
            <br />
            <span>placement journey.</span>
          </h1>
          <p>
            Manage placement drives, applications, and resume
            analysis in one centralized system.
          </p>
          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={() => {
                setError("");
                setMessage("");
                setPage("login");
              }}
            >
              Login <ArrowRight size={17} />
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                setError("");
                setMessage("");
                setPage("register");
              }}
            >
              Register as Student
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                setError("");
                setMessage("");
                setPage("register-college");
              }}
            >
              Register Your College
            </button>
          </div>
          <div className="hero-panel">
            <div>
              <b>03</b>
              <span>Role-based portals</span>
            </div>
            <div>
              <b>AI</b>
              <span>Resume analysis</span>
            </div>
            <div>
              <b>01</b>
              <span>Centralized platform</span>
            </div>
          </div>
        </section>
      )}
      {(page === "login" || page === "register") && (
        <section className="auth-section">
          <button
            className="back-button"
            onClick={() => setPage("home")}
          >
            <ArrowLeft size={16} /> Back to home
          </button>
          <div className="auth-card">
            <div className="icon-box">
              <GraduationCap size={23} />
            </div>
            <h2>
              {page === "login"
                ? "Welcome back"
                : "Create student account"}
            </h2>
            <p className="auth-description">
              {page === "login"
                ? "Sign in to continue to PlacementHub."
                : "Register to access college placement opportunities."}
            </p>
            <form onSubmit={submitForm}>
              {page === "register" && (
                <>
                  <label>Full name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateForm}
                    required
                  />
                  <label>Department</label>
                  <input
                    name="department"
                    value={form.department}
                    onChange={updateForm}
                    required
                  />
                  <label>College</label>
                  <select
                    name="collegeId"
                    value={form.collegeId}
                    onChange={updateForm}
                    required
                    disabled={collegeLoading}
                  >
                    <option value="">
                      {collegeLoading
                        ? "Loading colleges..."
                        : "Select your college"}
                    </option>
                   {(Array.isArray(colleges) ? colleges : []).map((college) => (
                      <option
                        key={college._id}
                        value={college._id}
                      >
                        {college.name}
                      </option>
                    ))}
                  </select>
                  {!collegeLoading && colleges.length === 0 && (
                    <p className="auth-description">
                      No verified colleges are available yet.
                    </p>
                  )}
                </>
              )}
              <label>Email address</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateForm}
                required
              />
              <label>Password</label>
              <input
                name="password"
                type="password"
                minLength={8}
                value={form.password}
                onChange={updateForm}
                required
              />
              {error && (
                <div className="form-error">{error}</div>
              )}
              {message && (
                <div className="form-success">{message}</div>
              )}
              <button
                className="primary-button submit-button"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : page === "login"
                    ? "Sign in"
                    : "Submit registration"}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>
            <div className="auth-switch">
              {page === "login"
                ? "New student?"
                : "Already registered?"}
              <button
                onClick={() => {
                  setError("");
                  setMessage("");
                  setPage(
                    page === "login" ? "register" : "login"
                  );
                }}
              >
                {page === "login"
                  ? "Create account"
                  : "Sign in"}
              </button>
            </div>
            {page === "login" && (
              <div className="auth-switch">
                College administrator?
                <button
                  onClick={() => {
                    setError("");
                    setMessage("");
                    setPage("register-college");
                  }}
                >
                  Register college
                </button>
              </div>
            )}
          </div>
        </section>
      )}
      {page === "register-college" && (
        <section className="auth-section">
          <button
            className="back-button"
            onClick={() => setPage("home")}
          >
            <ArrowLeft size={16} /> Back to home
          </button>
          <div className="auth-card">
            <div className="icon-box">
              <GraduationCap size={23} />
            </div>
            <h2>Register Your College</h2>
            <p className="auth-description">
              Register your institution and create its administrator
              account. Access will be enabled after verification.
            </p>
            <form onSubmit={submitCollegeRegistration}>
              <label>College name</label>
              <input
                name="collegeName"
                value={collegeForm.collegeName}
                onChange={updateCollegeForm}
                required
              />
              <label>Official college email</label>
              <input
                name="officialEmail"
                type="email"
                value={collegeForm.officialEmail}
                onChange={updateCollegeForm}
                required
              />
              <label>College address</label>
              <input
                name="address"
                value={collegeForm.address}
                onChange={updateCollegeForm}
                required
              />
              <label>Principal name</label>
              <input
                name="principalName"
                value={collegeForm.principalName}
                onChange={updateCollegeForm}
                required
              />
              <label>Administrator full name</label>
              <input
                name="name"
                value={collegeForm.name}
                onChange={updateCollegeForm}
                required
              />
              <label>Administrator email</label>
              <input
                name="email"
                type="email"
                value={collegeForm.email}
                onChange={updateCollegeForm}
                required
              />
              <label>Administrator password</label>
              <input
                name="password"
                type="password"
                minLength={8}
                value={collegeForm.password}
                onChange={updateCollegeForm}
                required
              />
              {error && (
                <div className="form-error">{error}</div>
              )}
              {message && (
                <div className="form-success">{message}</div>
              )}
              <button
                className="primary-button submit-button"
                disabled={loading}
              >
                {loading
                  ? "Submitting..."
                  : "Register College"}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>
            <div className="auth-switch">
              Already registered?
              <button
                onClick={() => {
                  setError("");
                  setMessage("");
                  setPage("login");
                }}
              >
                Sign in
              </button>
            </div>
          </div>
        </section>
      )}
      {page === "approval-status" && user && (
        <section className="auth-section">
          <div className="auth-card">
            <div className="icon-box">
              <GraduationCap size={23} />
            </div>
            <h2>
              {user.approvalStatus === "rejected"
                ? "Registration Rejected"
                : "Awaiting TPO Approval"}
            </h2>
            <p className="auth-description">
              {user.approvalStatus === "rejected"
                ? "Your student registration has been rejected. Please contact your college TPO for more information."
                : "Your college TPO must approve your account before you can access placement drives, applications, and resume analysis."}
            </p>
            <div
              className={
                user.approvalStatus === "rejected"
                  ? "form-error"
                  : "form-success"
              }
            >
              Status: {" "}
              {user.approvalStatus === "rejected"
                ? "Rejected"
                : "Pending Approval"}
            </div>
            <button
              className="primary-button submit-button"
              type="button"
              onClick={logout}
            >
              Sign Out
            </button>
          </div>
        </section>
      )}
      {page === "dashboard" && user && (
        <StudentDashboard
          user={user}
          profile={profile}
          profileLoading={profileLoading}
          error={error}
          message={message}
          loading={loading}
          skillsInput={skillsInput}
          setSkillsInput={setSkillsInput}
          logout={logout}
          saveProfile={saveProfile}
          updateProfileField={updateProfileField}
          setPlacementTab={setPlacementTab}
          setPlacementError={setPlacementError}
          setPlacementMessage={setPlacementMessage}
          setPage={setPage}
          loadPlacementData={loadPlacementData}
          setAnalysisError={setAnalysisError}
        />
      )}
      {page === "tpo-dashboard" && user && (
        <TPODashboard
          user={user}
          logout={logout}
        />
      )}
      {page === "admin-dashboard" && user?.role === "admin" && (
        <AdminDashboard
          user={user}
          logout={logout}
        />
      )}
      {page === "resume-analyzer" && user && (
        <section className="dashboard resume-page">
          <div className="dashboard-header resume-page-header">
            <div>
              <div className="eyebrow">AI-POWERED TOOL</div>
              <h1>Resume Analyzer</h1>
              <p>
                Discover how well your resume matches your target role.
              </p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setPage("dashboard")}
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
          </div>
          <section className="resume-section">
            <div className="resume-intro">
              <div className="resume-intro-icon">
                <Sparkles size={23} />
              </div>
              <div>
                <div className="eyebrow">GET CAREER-READY</div>
                <h2>Analyze your resume</h2>
                <p>
                  Upload your resume and add the job description
                  to receive an AI-powered analysis.
                </p>
              </div>
            </div>
            <form
              className="resume-form"
              onSubmit={handleAnalyzeResume}
            >
              <label htmlFor="resume-file">
                Resume file <span>PDF or DOCX · Max 5 MB</span>
              </label>
              <div className="resume-upload">
                <Upload size={23} />
                <div className="resume-upload-copy">
                  <strong>
                    {resume ? resume.name : "Choose your resume"}
                  </strong>
                  <span>
                    {resume
                      ? "File selected and ready to analyze"
                      : "Select a PDF or DOCX file from your device"}
                  </span>
                </div>
                <input
                  id="resume-file"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleResumeChange}
                />
              </div>
              <label htmlFor="job-description">
                Job description <span>Required</span>
              </label>
              <textarea
                id="job-description"
                rows="8"
                value={jobDescription}
                onChange={(event) =>
                  setJobDescription(event.target.value)
                }
                placeholder="Paste the target job description here..."
                required
              />
              {analysisError && (
                <div className="form-error">{analysisError}</div>
              )}
              <button
                className="primary-button submit-button resume-submit"
                type="submit"
                disabled={analyzing}
              >
                <Sparkles size={17} />
                {analyzing
                  ? "Analyzing Resume..."
                  : "Analyze Resume"}
                {!analyzing && <ArrowRight size={17} />}
              </button>
            </form>
            {analysis && (
              <div className="analysis-results">
                <div className="resume-results-heading">
                  <div className="resume-intro-icon">
                    <FileText size={22} />
                  </div>
                  <div>
                    <div className="eyebrow">
                      ANALYSIS COMPLETE
                    </div>
                    <h2>Resume Analysis Results</h2>
                  </div>
                </div>
                <div className="analysis-results-grid">
                  {typeof analysis === "object" &&
                  !Array.isArray(analysis) ? (
                    Object.entries(analysis)
                      .filter(
                        ([key]) =>
                          !key.toLowerCase().includes("note")
                      )
                      .map(([key, value]) => (
                        <article
                          className="analysis-card"
                          key={key}
                        >
                          <h3>{formatLabel(key)}</h3>
                          <div>{renderValue(value)}</div>
                        </article>
                      ))
                  ) : (
                    <article className="analysis-card">
                      {renderValue(analysis)}
                    </article>
                  )}
                </div>
              </div>
            )}
          </section>
        </section>
      )}
      {page === "placements" && user && (
        <PlacementDrives
          placementTab={placementTab}
          setPlacementTab={setPlacementTab}
          setPlacementError={setPlacementError}
          setPlacementMessage={setPlacementMessage}
          placementError={placementError}
          placementMessage={placementMessage}
          placementLoading={placementLoading}
          drives={drives}
          eligibility={eligibility}
          loadEligibility={loadEligibility}
          handleApply={handleApply}
          applications={applications}
          setPage={setPage}
        />
      )}
      <footer>
        <span>PlacementHub</span>
        <span>AI-Driven Placement Management System</span>
      </footer>
    </main>
  );
}
