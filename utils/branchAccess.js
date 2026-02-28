const ensureBranchAccess = (
  req,
  res,
  {
    targetBranch,
    missingMessage = "User branch assignment is required",
    mismatchMessage = "Access denied for this branch"
  } = {}
) => {
  if (!req.user || !req.user.branch) {
    res.status(403).json({ message: missingMessage });
    return false;
  }

  if (targetBranch && req.user.branch !== targetBranch) {
    res.status(403).json({ message: mismatchMessage });
    return false;
  }

  return true;
};

module.exports = {
  ensureBranchAccess
};
