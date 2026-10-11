export const normalizeDepartment = (value) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

// Returns the college's own spelling of a department, or null if it is not on the list.
export const findDepartment = (college, value) => {
  const wanted = normalizeDepartment(value).toLowerCase();

  if (!wanted) {
    return null;
  }

  return (
    (college?.departments || []).find(
      (department) => department.toLowerCase() === wanted
    ) || null
  );
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Case-insensitive exact match, so older records with different casing still match.
export const departmentQuery = (department) =>
  new RegExp(`^${escapeRegex(normalizeDepartment(department))}$`, "i");
