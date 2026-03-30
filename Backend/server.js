require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const { startEscalationJob } = require("./jobs/escalation.job");
const { startPriorityAndMaintenanceJobs } = require("./jobs/priority-maintenance.job");

const PORT = process.env.PORT || 5000;

connectDB();
startEscalationJob();
startPriorityAndMaintenanceJobs();

app.listen(PORT, () => {
  const logger = require("./utils/logger");
  logger.info(`Server running on port ${PORT}`);
});
