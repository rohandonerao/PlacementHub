import { useEffect, useState } from "react";
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
import Landing from "./pages/Landing";
import { ApprovalStatus, CollegeRegister, ForgotPassword, LoginRegister, ResetPassword } from "./pages/Auth";
import StudentWorkspace from "./pages/StudentWorkspace";
import TPODashboard from "./pages/TPODashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { loader } from "./loader";
import "./styles.css";

// Read once at load: email links open the app with ?reset=<token> or ?page=login.
const initialParams = new URLSearchParams(window.location.search);

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
  const [studentTab, setStudentTab] = useState("overview");
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
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState(emptyJobDescription);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [checkingApproval, setCheckingApproval] = useState(false);

  const go = (nextPage) => {
    setError("");
    setMessage("");
    setPage(nextPage);
    window.scrollTo({ top: 0 });
  };

  const changeStudentTab = (tab) => {
    setError("");
    setMessage("");
    setPlacementError("");
    setPlacementMessage("");
    setAnalysisError("");
    setStudentTab(tab);
  };

  useEffect(() => {
    loader.pulse();
  }, [page]);

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
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updateCollegeForm = (event) => {
    const { name, value } = event.target;
    setCollegeForm((current) => ({ ...current, [name]: value }));
  };

  const openDashboard = async (loggedInUser, token) => {
    setUser(loggedInUser);
    setStudentTab("overview");
    setPage("student");
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

  // Links from emails: ?reset=<token> opens the reset form, ?page=login opens sign in.
  useEffect(() => {
    const token = initialParams.get("reset");
    if (!token && initialParams.get("page") !== "login") return;
    window.history.replaceState(null, "", window.location.pathname);
    if (token) {
      setResetToken(token);
      setPage("reset-password");
    } else {
      setPage("login");
    }
  }, []);

  // Fired by api.js when a signed-in request returns 401.
  useEffect(() => {
    const handleExpired = () => {
      logout();
      setPage("login");
      setError("Your session has expired. Please sign in again.");
    };
    window.addEventListener("session-expired", handleExpired);
    return () => window.removeEventListener("session-expired", handleExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialParams.has("reset")) return;
    const token = sessionStorage.getItem("token");
    const savedUser = sessionStorage.getItem("user");
    if (!token || !savedUser) return;
    try {
      const loggedInUser = JSON.parse(savedUser);
      if (!loggedInUser?.role) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        return;
      }
      setUser(loggedInUser);
      if (loggedInUser.role === "admin") {
        setPage("admin-dashboard");
      } else if (loggedInUser.role === "tpo") {
        setPage("tpo-dashboard");
      } else if (loggedInUser.approvalStatus !== "approved") {
        setPage("approval-status");
        refreshApproval(loggedInUser, token);
      } else {
        openDashboard(loggedInUser, token);
      }
    } catch {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      setUser(null);
      setPage("home");
    }
  }, []);

  // Students waiting for approval: ask the server for their current status.
  const refreshApproval = async (currentUser = user, token = sessionStorage.getItem("token")) => {
    if (!currentUser || !token) return;
    setCheckingApproval(true);
    setError("");
    setMessage("");
    try {
      const latest = await getStudentProfile(token);
      const updatedUser = { ...currentUser, approvalStatus: latest.approvalStatus || "pending" };
      setUser(updatedUser);
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      if (updatedUser.approvalStatus === "approved") {
        await openDashboard(updatedUser, token);
      } else {
        setMessage(updatedUser.approvalStatus === "rejected" ? "" : "Still waiting for approval. Please check again later.");
      }
    } catch (err) {
      setError(err.message || "Could not check your approval status.");
    } finally {
      setCheckingApproval(false);
    }
  };

  const loadPlacementData = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) return;
    setPlacementLoading(true);
    setPlacementError("");
    try {
      const [driveData, applicationData] = await Promise.all([
        getPlacementDrives(token),
        getMyApplications(token)
      ]);
      setDrives(Array.isArray(driveData) ? driveData : driveData.drives || []);
      setApplications(
        Array.isArray(applicationData) ? applicationData : applicationData.applications || []
      );
    } catch (err) {
      setPlacementError(err.message || "Could not load placement data.");
    } finally {
      setPlacementLoading(false);
    }
  };

  // Student data is refreshed whenever a data-driven tab is opened.
  useEffect(() => {
    if (page !== "student") return;
    if (["overview", "drives", "applications"].includes(studentTab) || (studentTab === "resume" && drives.length === 0)) {
      loadPlacementData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, studentTab]);

  const loadEligibility = async (driveId) => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setPlacementError("Your session has expired. Please log in again.");
      return;
    }
    setPlacementError("");
    try {
      const result = await checkEligibility(token, driveId);
      setEligibility((previous) => ({ ...previous, [driveId]: result }));
    } catch (err) {
      setPlacementError(err.message || "Could not check eligibility.");
    }
  };

  const handleApply = async (driveId) => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setPlacementError("Your session has expired. Please log in again.");
      return;
    }
    setPlacementError("");
    setPlacementMessage("");
    try {
      const result = await applyForPlacement(token, driveId);
      setStudentTab("applications");
      setPlacementMessage(result.message || "Application submitted successfully.");
    } catch (err) {
      setPlacementError(err.message || "Could not submit your application.");
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
        setMessage(result.message || "Registration submitted. Await verification.");
      } else {
        const result = await loginUser({ email: form.email, password: form.password });
        sessionStorage.setItem("token", result.token);
        sessionStorage.setItem("user", JSON.stringify(result.user));
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
      setMessage(result.message || "College registration submitted. Please wait for verification.");
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
      const token = sessionStorage.getItem("token");
      const updated = await updateStudentProfile(token, {
        name: profile.name,
        department: profile.department,
        phone: profile.phone,
        college: profile.college,
        graduationYear: profile.graduationYear === "" ? null : Number(profile.graduationYear),
        cgpa: profile.cgpa === "" ? null : Number(profile.cgpa),
        backlogs: profile.backlogs === "" ? 0 : Number(profile.backlogs),
        skills: skillsInput.split(",").map((skill) => skill.trim()).filter(Boolean)
      });
      setProfile({ ...updated, collegeDepartments: profile.collegeDepartments });
      const updatedUser = { ...user, name: updated.name };
      setUser(updatedUser);
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      setSkillsInput((updated.skills || []).join(", "));
      setMessage("Profile updated successfully.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
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
    setDrives([]);
    setApplications([]);
    setEligibility({});
    setStudentTab("overview");
    setPage("home");
  };

  const updateProfileField = (event) => {
    setProfile({ ...profile, [event.target.name]: event.target.value });
  };

  const handleResumeChange = (event) => {
    const file = event.target.files?.[0];
    setResume(null);
    setAnalysis(null);
    setAnalysisError("");
    if (!file) return;
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setAnalysisError("Please select a PDF or DOCX resume.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAnalysisError("Resume must be 5 MB or smaller.");
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
      setAnalysisError("Please select your PDF or DOCX resume.");
      return;
    }
    if (!jobDescription.trim()) {
      setAnalysisError("Please enter a job description.");
      return;
    }
    const token = sessionStorage.getItem("token");
    if (!token) {
      setAnalysisError("Your session has expired. Please log in again.");
      return;
    }
    setAnalyzing(true);
    try {
      const result = await analyzeResume(token, resume, jobDescription.trim());
      setAnalysis(result);
    } catch (err) {
      setAnalysisError(err.message || "Resume analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (page === "login" || page === "register") {
    return (
      <LoginRegister
        mode={page}
        form={form}
        updateForm={updateForm}
        submitForm={submitForm}
        colleges={colleges}
        collegeLoading={collegeLoading}
        error={error}
        message={message}
        loading={loading}
        go={go}
      />
    );
  }

  if (page === "register-college") {
    return (
      <CollegeRegister
        collegeForm={collegeForm}
        updateCollegeForm={updateCollegeForm}
        submitCollegeRegistration={submitCollegeRegistration}
        error={error}
        message={message}
        loading={loading}
        go={go}
      />
    );
  }

  if (page === "approval-status" && user) {
    return <ApprovalStatus user={user} logout={logout} onCheck={() => refreshApproval()} checking={checkingApproval} error={error} message={message} />;
  }

  if (page === "forgot-password") {
    return <ForgotPassword go={go} />;
  }

  if (page === "reset-password") {
    return <ResetPassword token={resetToken} go={go} />;
  }

  if (page === "student" && user) {
    return (
      <StudentWorkspace
        user={user}
        profile={profile}
        profileLoading={profileLoading}
        error={error}
        message={message}
        loading={loading}
        skillsInput={skillsInput}
        setSkillsInput={setSkillsInput}
        saveProfile={saveProfile}
        updateProfileField={updateProfileField}
        logout={logout}
        tab={studentTab}
        setTab={changeStudentTab}
        drives={drives}
        applications={applications}
        eligibility={eligibility}
        placementLoading={placementLoading}
        placementError={placementError}
        placementMessage={placementMessage}
        loadPlacementData={loadPlacementData}
        loadEligibility={loadEligibility}
        handleApply={handleApply}
        resume={resume}
        handleResumeChange={handleResumeChange}
        jobDescription={jobDescription}
        setJobDescription={setJobDescription}
        analysis={analysis}
        analysisError={analysisError}
        analyzing={analyzing}
        handleAnalyzeResume={handleAnalyzeResume}
      />
    );
  }

  if (page === "tpo-dashboard" && user) {
    return <TPODashboard user={user} logout={logout} />;
  }

  if (page === "admin-dashboard" && user?.role === "admin") {
    return <AdminDashboard user={user} logout={logout} />;
  }

  return <Landing go={go} />;
}
