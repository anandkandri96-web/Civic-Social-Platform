// // backend/sockets/issue.socket.js

// const mongoose = require('mongoose');

// module.exports = (io, socket) => {
//   // 🔗 Join issue room
//   socket.on('join-issue', (issueId) => {
//     if (!mongoose.Types.ObjectId.isValid(issueId)) return;

//     socket.join(`issue-${issueId}`);
//   });

//   // 🔌 Leave issue room
//   socket.on('leave-issue', (issueId) => {
//     if (!mongoose.Types.ObjectId.isValid(issueId)) return;

//     socket.leave(`issue-${issueId}`);
//   });

//   // Clients should NOT emit "newIssue"
//   // Issues are broadcast from controllers/services only
// };
