require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const { startEscalationJob } = require("./jobs/escalation.job");

const PORT = process.env.PORT || 5000;

connectDB();
startEscalationJob();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
