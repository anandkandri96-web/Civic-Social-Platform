const AuditLog = require("../models/auditLog");
const logger = require("../utils/logger");

function logAudit(payload) {
  setImmediate(async () => {
    try {
      await AuditLog.create(payload);
    } catch (e) {
      logger.error("Audit log write failed", { message: e.message, action: payload?.action });
    }
  });
}

module.exports = { logAudit };
