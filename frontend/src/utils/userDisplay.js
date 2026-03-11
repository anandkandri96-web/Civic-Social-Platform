export function getDepartmentName(userLike) {
  const dept = userLike?.department;
  if (dept && typeof dept === 'object') return dept.name || '';
  if (typeof dept === 'string') {
    const v = dept.trim();
    // Avoid showing raw ObjectId values in the UI.
    if (/^[a-f0-9]{24}$/i.test(v)) return '';
    return v;
  }
  return '';
}

export function getUserId(userLike) {
  if (typeof userLike === 'string' && userLike.trim()) return userLike.trim();
  const id = userLike?._id ?? userLike?.id;
  return id ? String(id) : '';
}

export function getWorkerDisplayId(workerLike) {
  const explicit =
    workerLike?.workerId ??
    workerLike?.workerID ??
    workerLike?.worker_id ??
    workerLike?.serialNumber ??
    workerLike?.serial_number;
  if (explicit) return String(explicit);
  return 'N/A';
}

export function getOfficerDisplayId(officerLike) {
  const explicit =
    officerLike?.officerId ??
    officerLike?.officerID ??
    officerLike?.officer_id ??
    officerLike?.serialNumber ??
    officerLike?.serial_number;
  if (explicit) return String(explicit);
  return 'N/A';
}

export function getActiveLabel(isActive) {
  if (typeof isActive !== 'boolean') return 'N/A';
  return isActive ? 'Active' : 'Inactive';
}
