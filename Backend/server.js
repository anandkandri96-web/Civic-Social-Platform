// /**
//  * Load environment variables FIRST
//  */
// require("dotenv").config();

// const http = require("http");

// const app = require("./app");
// const connectDB = require("./config/db");
// // const initSocket = require("./config/socket"); // NOT USED YET

// /**
//  * Connect to MongoDB
//  */
// connectDB();

// /**
//  * Create HTTP server
//  */
// const server = http.createServer(app);

// /**
//  * 🚫 Socket.IO DISABLED for now
//  * (You commented Server import, so this must be removed)
//  */

// // const { Server } = require("socket.io");
// // const io = new Server(server, {
// //   cors: {
// //     origin: process.env.CLIENT_URL || "*",
// //     methods: ["GET", "POST"],
// //     credentials: true,
// //   },
// // });

// // initSocket(io);

// /**
//  * Start server
//  */
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`✅ Server running on port ${PORT}`);
// });

// /**
//  * Graceful shutdown
//  */
// process.on("SIGTERM", shutdown);
// process.on("SIGINT", shutdown);

// function shutdown() {
//   console.log(" Shutting down server...");
//   server.close(() => {
//     console.log(" HTTP server closed");
//     process.exit(0);
//   });
// }

require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const { startEscalationJob } = require("./jobs/escalation.job");

const PORT = process.env.PORT || 5000;

connectDB();
startEscalationJob();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

