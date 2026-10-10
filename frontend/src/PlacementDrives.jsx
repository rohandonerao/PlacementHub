import { ArrowLeft, BriefcaseBusiness, CalendarDays, CheckCircle2, CircleX, Clock3, FileText, GraduationCap, Target } from "lucide-react";

export default function PlacementDrives({
  placementTab,
  setPlacementTab,
  setPlacementError,
  setPlacementMessage,
  placementError,
  placementMessage,
  placementLoading,
  drives,
  eligibility,
  loadEligibility,
  handleApply,
  applications,
  setPage
}) {
  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString() : "Not specified";

  return (
    <section className="dashboard placement-page">
      <div className="placement-hero">
        <div className="placement-hero-copy">
          <span className="welcome-pill"><BriefcaseBusiness size={15} /> CAREER OPPORTUNITIES</span>
          <h1>Find your next opportunity</h1>
          <p>Explore placement drives, check your eligibility, and keep track of every application.</p>
        </div>
        <div className="placement-hero-icon"><Target size={42} /></div>
      </div>

      <div className="placement-page-toolbar">
        <div>
          <h2>{placementTab === "drives" ? "Available placement drives" : "My applications"}</h2>
          <p>{placementTab === "drives" ? `${drives.length} drive${drives.length === 1 ? "" : "s"} available to review` : `${applications.length} application${applications.length === 1 ? "" : "s"} submitted`}</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => setPage("dashboard")}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      <div className="placement-tabs">
        <button
          type="button"
          className={placementTab === "drives" ? "primary-button" : "secondary-button"}
          onClick={() => {
            setPlacementTab("drives");
            setPlacementError("");
            setPlacementMessage("");
          }}
        >
          <BriefcaseBusiness size={16} /> Available Drives
        </button>
        <button
          type="button"
          className={placementTab === "applications" ? "primary-button" : "secondary-button"}
          onClick={() => {
            setPlacementTab("applications");
            setPlacementError("");
            setPlacementMessage("");
          }}
        >
          <FileText size={16} /> My Applications
        </button>
      </div>

      {placementError && <div className="form-error">{placementError}</div>}
      {placementMessage && <div className="form-success">{placementMessage}</div>}

      {placementLoading ? (
        <div className="dashboard-loading">
          <div className="loading-spinner" />
          <p>Loading placement data...</p>
        </div>
      ) : placementTab === "drives" ? (
        <div className="placement-list">
          {drives.length === 0 ? (
            <div className="placement-empty">
              <span><BriefcaseBusiness size={27} /></span>
              <h3>No placement drives available</h3>
              <p>New opportunities will appear here when they are published by your placement team.</p>
            </div>
          ) : (
            drives.map((drive) => {
              const result = eligibility[drive._id];
              const requiredSkills = drive.requiredSkills || [];
              return (
                <article className="placement-drive-card" key={drive._id}>
                  <div className="placement-card-top">
                    <div className="placement-company-icon"><BriefcaseBusiness size={22} /></div>
                    <div className="placement-company-copy">
                      <h3>{drive.companyName || "Company"}</h3>
                      <p>{drive.jobTitle || "Placement opportunity"}</p>
                    </div>
                    <span className={`drive-status ${drive.status === "closed" ? "drive-status-closed" : ""}`}>
                      {drive.status || "open"}
                    </span>
                  </div>

                  <div className="placement-facts">
                    <div className="placement-fact">
                      <span>Package</span>
                      <strong>{drive.packageLPA != null ? `${drive.packageLPA} LPA` : "Not specified"}</strong>
                    </div>
                    <div className="placement-fact">
                      <span>Minimum CGPA</span>
                      <strong>{drive.minimumCgpa ?? "Not specified"}</strong>
                    </div>
                    <div className="placement-fact">
                      <span>Application deadline</span>
                      <strong><CalendarDays size={14} /> {formatDate(drive.applicationDeadline)}</strong>
                    </div>
                  </div>

                  <div className="placement-skills">
                    <span className="placement-label">Required skills</span>
                    <div className="placement-skill-tags">
                      {requiredSkills.length ? requiredSkills.map((skill) => (
                        <span key={skill}>{skill}</span>
                      )) : <small>No specific skills listed</small>}
                    </div>
                  </div>

                  <div className="placement-card-actions">
                    <button className="secondary-button" type="button" onClick={() => loadEligibility(drive._id)}>
                      <CheckCircle2 size={16} /> Check Eligibility
                    </button>
                  </div>

                  {result && (
                    <div className={`eligibility-panel ${result.canApply ? "eligibility-pass" : "eligibility-fail"}`}>
                      <div className="eligibility-heading">
                        {result.canApply ? <CheckCircle2 size={18} /> : <CircleX size={18} />}
                        <strong>{result.canApply ? "You are eligible to apply" : "Eligibility requirements not met"}</strong>
                      </div>
                      {result.checks && (
                        <div className="eligibility-checks">
                          {Object.entries(result.checks).map(([name, check]) => (
                            <div className="eligibility-check" key={name}>
                              <span>{name.replace(/([A-Z])/g, " $1")}</span>
                              <strong>
                                {typeof check === "object" && check !== null
                                  ? (check.passed ? "Passed" : "Failed")
                                  : String(check)}
                              </strong>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        className="primary-button"
                        type="button"
                        disabled={!result.canApply}
                        onClick={() => handleApply(drive._id)}
                      >
                        Apply Now <ArrowLeft className="apply-arrow" size={16} />
                      </button>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      ) : (
        <div className="placement-list">
          {applications.length === 0 ? (
            <div className="placement-empty">
              <span><FileText size={27} /></span>
              <h3>No applications yet</h3>
              <p>When you apply to a placement drive, its status will appear here.</p>
              <button className="primary-button" type="button" onClick={() => setPlacementTab("drives")}>
                Browse Drives
              </button>
            </div>
          ) : (
            applications.map((application) => (
              <article className="application-card" key={application._id}>
                <div className="placement-company-icon application-icon"><GraduationCap size={22} /></div>
                <div className="application-main">
                  <h3>{application.drive?.companyName || "Company"}</h3>
                  <p>{application.drive?.jobTitle || "Placement drive"}</p>
                  <span><Clock3 size={14} /> Applied {formatDate(application.appliedAt)}</span>
                </div>
                <span className={`application-status status-${application.status || "applied"}`}>
                  {application.status || "applied"}
                </span>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
