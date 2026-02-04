// exports.calculatePriority = (severity, votes, createdAt, escalated = false) => {
//   const ageInHours = (Date.now() - new Date(createdAt)) / (1000 * 60 * 60);

//   const severityWeight = severity * 5;
//   const voteWeight = votes * 2;
//   const timeWeight = Math.min(ageInHours, 72); // cap time factor

//   const escalationBonus = escalated ? 20 : 0;

//   return Math.round(
//     severityWeight + voteWeight + timeWeight + escalationBonus
//   );
// };
