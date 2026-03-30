// useRole.js (restored)
// React hook for role-based access (deprecated in favor of permission-based system)
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContextBase';
import { getDashboardPath, isAdmin, isOfficer, isWorker, isVolunteer, isCitizen } from '../utils/roleCheck';

export const useRole = () => {
  const { user } = useContext(AuthContext);
  return {
    isAdmin: isAdmin(user),
    isOfficer: isOfficer(user),
    isWorker: isWorker(user),
    isVolunteer: isVolunteer(user),
    isCitizen: isCitizen(user),
    dashboardPath: getDashboardPath(user),
    user,
  };
};
