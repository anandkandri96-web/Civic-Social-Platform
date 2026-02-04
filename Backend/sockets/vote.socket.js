// // backend/sockets/vote.socket.js

// const mongoose = require('mongoose');

// module.exports = (io, socket) => {
//   socket.on('join-votes', (issueId) => {
//     if (!mongoose.Types.ObjectId.isValid(issueId)) return;
//     socket.join(`issue-${issueId}`);
//   });

//   socket.on('leave-votes', (issueId) => {
//     if (!mongoose.Types.ObjectId.isValid(issueId)) return;
//     socket.leave(`issue-${issueId}`);
//   });
// };
