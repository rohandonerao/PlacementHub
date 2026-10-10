import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  LogOut,
  Save,
  UserRound,
  GraduationCap,
  Target,
  CheckCircle2
} from "lucide-react";

export default function StudentDashboard({
  user,
  profile,
  profileLoading,
  error,
  message,
  loading,
  skillsInput,
  setSkillsInput,
  logout,
  saveProfile,
  updateProfileField,
  setPlacementTab,
  setPlacementError,
  setPlacementMessage,
  setPage,
  loadPlacementData,
  setAnalysisError
}) {
  const skills = (skillsInput || "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  return (
    <section className="dashboard student-dashboard">
      <div className="student-welcome">
        <div className="student-welcome-content">
          <span className="welcome-pill">
            <GraduationCap size={15} /> STUDENT WORKSPACE
          </span>
          <h1>Welcome back, {user?.name?.split(" ")[0] || "Student"}!</h1>
          <p>Manage your profile, discover opportunities, and prepare for your next career step.</p>
          <div className="welcome-email">
            <UserRound size={16} />
            <span>{user?.email}</span>
          </div>
        </div>
        <button className="welcome-signout" type="button" onClick={logout}>
          <LogOut size={16} /> Sign out
        </button>
        <div className="welcome-decoration welcome-decoration-one" />
        <div className="welcome-decoration welcome-decoration-two" />
      </div>

      {profileLoading ? (
        <div className="dashboard-loading">
          <div className="loading-spinner" />
          <p>Loading your student workspace...</p>
        </div>
      ) : profile ? (
        <>
          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}

          <div className="student-summary-grid">
            <button
              type="button"
              className="summary-card"
              onClick={async () => {
                setPlacementTab("drives");
                setPlacementError("");
                setPlacementMessage("");
                setPage("placements");
                await loadPlacementData();
              }}
            >
              <span className="summary-icon summary-blue"><BriefcaseBusiness size={21} /></span>
              <span className="summary-copy">
                <strong>Placement Drives</strong>
                <small>Explore open opportunities</small>
              </span>
              <ArrowRight size={18} className="summary-arrow" />
            </button>

            <button
              type="button"
              className="summary-card"
              onClick={() => {
                setAnalysisError("");
                setPage("resume-analyzer");
              }}
            >
              <span className="summary-icon summary-violet"><FileText size={21} /></span>
              <span className="summary-copy">
                <strong>Resume Analyzer</strong>
                <small>Improve your resume match</small>
              </span>
              <ArrowRight size={18} className="summary-arrow" />
            </button>

            <button
              type="button"
              className="summary-card"
              onClick={async () => {
                setPlacementTab("applications");
                setPlacementError("");
                setPlacementMessage("");
                setPage("placements");
                await loadPlacementData();
              }}
            >
              <span className="summary-icon summary-green"><Target size={21} /></span>
              <span className="summary-copy">
                <strong>My Applications</strong>
                <small>Track your application status</small>
              </span>
              <ArrowRight size={18} className="summary-arrow" />
            </button>
          </div>

          <div className="dashboard-section-title">
            <div>
              <span className="eyebrow">YOUR INFORMATION</span>
              <h2>Student Profile</h2>
              <p>Keep your academic and technical details up to date for placement eligibility.</p>
            </div>
            <span className="profile-status">
              <CheckCircle2 size={15} /> Profile details
            </span>
          </div>

          <form className="profile-form student-profile-form" onSubmit={saveProfile}>
            <div className="section-heading">
              <div>
                <h2>Personal & Academic Details</h2>
                <p>Fields marked with an asterisk are required.</p>
              </div>
              <span className="profile-heading-icon"><UserRound size={21} /></span>
            </div>

            <div className="profile-grid">
              <div>
                <label>Full name *</label>
                <input
                  name="name"
                  value={profile.name || ""}
                  onChange={updateProfileField}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label>Email address</label>
                <input value={profile.email || ""} readOnly />
              </div>

              <div>
                <label>Department</label>
                <input
                  name="department"
                  value={profile.department || ""}
                  onChange={updateProfileField}
                  placeholder="e.g. Computer Engineering"
                />
              </div>

              <div>
                <label>Phone number</label>
                <input
                  name="phone"
                  value={profile.phone || ""}
                  onChange={updateProfileField}
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <label>College / Institute</label>
                <input
                  name="college"
                  value={profile.college || ""}
                  onChange={updateProfileField}
                  placeholder="Enter your college name"
                />
              </div>

              <div>
                <label>Graduation year</label>
                <input
                  type="number"
                  name="graduationYear"
                  min="2000"
                  max="2100"
                  value={profile.graduationYear ?? ""}
                  onChange={updateProfileField}
                  placeholder="e.g. 2027"
                />
              </div>

              <div>
                <label>CGPA (out of 10)</label>
                <input
                  type="number"
                  name="cgpa"
                  min="0"
                  max="10"
                  step="0.01"
                  value={profile.cgpa ?? ""}
                  onChange={updateProfileField}
                  placeholder="e.g. 8.50"
                />
              </div>

              <div>
                <label>Active backlogs</label>
                <input
                  type="number"
                  name="backlogs"
                  min="0"
                  step="1"
                  value={profile.backlogs ?? 0}
                  onChange={updateProfileField}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="skills-field">
              <label>Technical skills</label>
              <textarea
                rows="3"
                value={skillsInput}
                onChange={(event) => setSkillsInput(event.target.value)}
                placeholder="Add skills separated by commas, e.g. Java, SQL, React"
              />
              <div className="skills-preview">
                {skills.length ? (
                  skills.map((skill) => <span key={skill}>{skill}</span>)
                ) : (
                  <small>Add your skills separated by commas.</small>
                )}
              </div>
            </div>

            <div className="profile-form-footer">
              <p>Your profile information helps determine placement-drive eligibility.</p>
              <button className="primary-button" type="submit" disabled={loading}>
                <Save size={17} />
                {loading ? "Saving changes..." : "Save Profile"}
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="form-error">
          Could not load your profile. Sign out and log in again.
        </div>
      )}
    </section>
  );
}
