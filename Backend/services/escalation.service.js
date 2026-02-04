// // backend/services/escalation.service.js

// const Issue = require('../models/Issue');
// const Notification = require('../models/Notification');
// const User = require('../models/User');
// const { io } = require('../config/socket');

// // Escalation rules
// const ESCALATION_DAYS = 7;
// const PRIORITY_THRESHOLD = 50;

// exports.checkEscalation = async () => {
//   try {
//     const issues = await Issue.find({
//       status: 'pending',
//       escalated: false,
//       priority: { $gt: PRIORITY_THRESHOLD }
//     });

//     if (!issues.length) return;

//     // Get all admins
//     const admins = await User.find({ role: 'admin' }).select('_id');

//     for (const issue of issues) {
//       const daysOpen =
//         (Date.now() - issue.createdAt.getTime()) / (1000 * 60 * 60 * 24);

//       if (daysOpen < ESCALATION_DAYS) continue;

//       issue.escalated = true;
//       await issue.save();

//       for (const admin of admins) {
//         const notification = await Notification.create({
//           user: admin._id,
//           message: `🚨 Issue Escalated: ${issue.title}`
//         });

//         io.to(admin._id.toString()).emit('notification:new', notification);
//       }
//     }
//   } catch (error) {
//     console.error('Escalation Service Error:', error);
//   }
// };
