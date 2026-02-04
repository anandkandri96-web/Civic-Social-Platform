// import { useEffect, useState } from 'react';
// import {
//   getAllIssues,
//   updateIssueStatusAdmin,
//   deleteIssueAdmin,
// } from '../../api/admin.api';

// // import { useSocket } from '../../hooks/useSocket';
// import IssueCard from '../../components/issues/IssueCard';
// import Button from '../../components/common/Button';
// import Loader from '../../components/common/Loader';
// import './ManageIssues.css';


// const ManageIssues = () => {
//   const [issues, setIssues] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   const { socket, joinRoom, on, off } = useSocket();

//   /**
//    * Fetch all issues
//    */
//   useEffect(() => {
//     let mounted = true;

//     const fetchAllIssues = async () => {
//       try {
//         const data = await getAllIssues();
//         if (mounted) {
//           setIssues(Array.isArray(data) ? data : []);
//         }
//       } catch (err) {
//         console.error('Failed to fetch all issues:', err);
//         if (mounted) {
//           setError('Failed to load issues');
//         }
//       } finally {
//         if (mounted) {
//           setLoading(false);
//         }
//       }
//     };

//     fetchAllIssues();

//     return () => {
//       mounted = false;
//     };
//   }, []);

//   /**
//    * Real-time updates
//    */
//   useEffect(() => {
//     if (!socket) return;

//     joinRoom('admin-issues');

//     const handleIssueUpdated = (updatedIssue) => {
//       setIssues((prev) =>
//         prev.map((issue) =>
//           issue.id === updatedIssue.id ? updatedIssue : issue
//         )
//       );
//     };

//     on('issueUpdated', handleIssueUpdated);

//     return () => {
//       off('issueUpdated', handleIssueUpdated);
//     };
//   }, [socket, joinRoom, on, off]);

//   /**
//    * Admin actions
//    */
//   const handleStatusUpdate = async (id, status) => {
//     try {
//       await updateIssueStatusAdmin(id, status);
//     } catch (err) {
//       console.error('Failed to update status:', err);
//     }
//   };

//   const handleDelete = async (id) => {
//     const confirmed = window.confirm(
//       'Are you sure you want to delete this issue? This action cannot be undone.'
//     );

//     if (!confirmed) return;

//     try {
//       await deleteIssueAdmin(id);
//       setIssues((prev) => prev.filter((issue) => issue.id !== id));
//     } catch (err) {
//       console.error('Failed to delete issue:', err);
//     }
//   };

//   /**
//    * UI states
//    */
//   if (loading) return <Loader />;

//   if (error) {
//     return (
//       <p className="text-center text-sm font-medium text-red-600 mt-8">
//         {error}
//       </p>
//     );
//   }

//   if (issues.length === 0) {
//     return (
//       <p className="text-center text-sm text-gray-500 mt-8">
//         No issues found.
//       </p>
//     );
//   }

//   return (
//     <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
//       <h1 className="text-2xl font-semibold text-gray-800">
//         Manage Issues
//       </h1>

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//         {issues.map((issue) => (
//           <div
//             key={issue.id}
//             className="rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow p-4 space-y-4"
//           >
//             <IssueCard issue={issue} />

//             <div className="flex items-center gap-2 flex-wrap">
//               {issue.status !== 'resolved' && (
//                 <Button
//                   size="sm"
//                   className="bg-green-600 hover:bg-green-700 text-white"
//                   onClick={() =>
//                     handleStatusUpdate(issue.id, 'resolved')
//                   }
//                 >
//                   Resolve
//                 </Button>
//               )}

//               <Button
//                 size="sm"
//                 variant="danger"
//                 className="bg-red-600 hover:bg-red-700 text-white"
//                 onClick={() => handleDelete(issue.id)}
//               >
//                 Delete
//               </Button>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default ManageIssues;

const ManageIssues = () => (
  <div className="max-w-7xl mx-auto px-4 py-6">
    <h1 className="text-2xl font-semibold text-gray-800">Manage Issues</h1>
    <p className="text-gray-500 mt-2">Issue management UI will be wired here. Use admin API: GET /api/admin/issues, PATCH /api/issues/:id/status, DELETE /api/issues/:id.</p>
  </div>
);

export default ManageIssues;
