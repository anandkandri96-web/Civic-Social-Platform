const cron = require("node-cron");
const { runAllEscalationTasks } = require("../services/escalation.service");
const logger = require("../utils/logger");
const appConfig = require("../config/appConfig");

function startEscalationJob() {
  const schedule = appConfig.escalationCron;
  cron.schedule(schedule, async () => {
    try {
      const summary = await runAllEscalationTasks();
      if (summary.escalated || summary.released || summary.autoClosed) {
        logger.info("[escalation-job]", summary);
      }
    } catch (error) {
      logger.error("[escalation-job] failed", { message: error.message, stack: error.stack });
    }
  });
}

module.exports = { startEscalationJob };
