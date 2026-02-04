// // backend/sockets/notification.socket.js

// module.exports = (io, socket) => {
//   if (!socket.user || !socket.user.id) return;

//   const userRoom = socket.user.id.toString();
//   socket.join(userRoom);

//   // Optional: confirm join (debug only)
//   // console.log(`User ${userRoom} joined notification room`);
// };
