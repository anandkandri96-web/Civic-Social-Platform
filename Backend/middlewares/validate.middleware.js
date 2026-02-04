// const Joi = require('joi');

// exports.validateIssue = (req, res, next) => {
//   const schema = Joi.object({
//     title: Joi.string().required(),
//     description: Joi.string().required(),
//     category: Joi.string().valid('roads', 'electricity', 'garbage', 'drainage', 'other').required(),
//     severity: Joi.number().min(1).max(5).required(),
//     lng: Joi.number().required(),
//     lat: Joi.number().required()
//   });
//   const { error } = schema.validate(req.body);
//   if (error) return res.status(400).json({ message: error.details[0].message });
//   next();
// };