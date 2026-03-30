const Joi = require("joi");

/**
 * Validates req.body, req.query, or req.params with Joi. abortEarly: false.
 * Responds with { errors: [{ field, message }] } on failure.
 */
function validateRequest(schema, source = "body") {
  return (req, res, next) => {
    const target = source === "params" ? req.params : source === "query" ? req.query : req.body;
    const { error, value } = schema.validate(target, { abortEarly: false, stripUnknown: true });
    if (error) {
      const errors = (error.details || []).map((d) => ({
        field: d.path.join(".") || source,
        message: d.message.replace(/"/g, ""),
      }));
      return res.status(400).json({ errors });
    }
    if (source === "body") req.body = value;
    else if (source === "query") req.query = value;
    else req.params = value;
    return next();
  };
}

module.exports = { validateRequest };
