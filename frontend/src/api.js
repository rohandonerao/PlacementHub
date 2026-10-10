const API_URL = "http://localhost:5000/api";

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(result.message || "Something went wrong.");
  }

  return result;
}

export async function registerStudent(data) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function loginUser(data) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function getStudentProfile(token) {
  const result = await request("/profile", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return result.user;
}

export async function deletePlacementDrive(token, driveId) {
  return request(`/drives/${driveId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function updateStudentProfile(token, data) {
  const result = await request("/profile", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  return result.user;
}

export async function analyzeResume(token, resume, jobDescription) {
  const formData = new FormData();

  formData.append("resume", resume);
  formData.append("job_description", jobDescription);

  const response = await fetch(`${API_URL}/resume/analyze`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(result.message || "Resume analysis failed.");
  }

  return result;
}

export async function getPlacementDrives(token) {
  return request("/drives", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function createPlacementDrive(token, driveData) {
  return request("/drives", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(driveData)
  });
}

export async function getPlacementDrive(token, driveId) {
  return request(`/drives/${driveId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function updatePlacementDriveStatus(token, driveId, status) {
  return request(`/drives/${driveId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
}

export async function checkEligibility(token, driveId) {
  return request(`/eligibility/${driveId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function applyForPlacement(token, driveId) {
  return request(`/applications/${driveId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function getMyApplications(token) {
  return request("/applications/student/my-applications", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function getDriveApplications(token, driveId) {
  return request(`/applications/drive/${driveId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function updateApplicationStatus(token, applicationId, status) {
  return request(`/applications/${applicationId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
}

export async function getPendingStudents(token) {
  return request("/students/pending", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function approveStudent(token, studentId) {
  return request(`/students/${studentId}/approve`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function rejectStudent(token, studentId) {
  return request(`/students/${studentId}/reject`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}


export async function getTpoAccounts(token) {
  return request("/admin/tpos", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function createTpoAccount(token, data) {
  return request("/admin/tpos", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function updateTpoAccount(token, tpoId, data) {
  return request(`/admin/tpos/${tpoId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
}

export async function updateTpoAccountStatus(token, tpoId, isActive) {
  return request(`/admin/tpos/${tpoId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ isActive })
  });
}

export async function getVerifiedColleges() {
  return request("/auth/colleges");
}

export async function registerCollege(data) {
  return request("/auth/register-college", {
    method: "POST",
    body: JSON.stringify(data)
  });
}