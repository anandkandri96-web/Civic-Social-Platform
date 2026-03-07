const cron = require("node-cron");
const { runEscalationSweep } = require("../services/escalation.service");

function startEscalationJob() {
  const schedule = process.env.ESCALATION_CRON || "0 * * * *"; // hourly
  cron.schedule(schedule, async () => {
    try {
      const count = await runEscalationSweep();
      if (count > 0) {
        console.log(`[escalation-job] escalated ${count} issues`);
      }
    } catch (error) {
      console.error("[escalation-job] failed:", error.message);
    }
  });
}

module.exports = { startEscalationJob };