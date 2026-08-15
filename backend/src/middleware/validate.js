const { validationResult } = require('express-validator');

/**
 * Drop this after a chain of express-validator checks (e.g. body('email').isEmail()).
 * Returns the first validation failure as a plain { error } response, matching
 * the shape every other error in this API already uses, so the frontend
 * doesn't need any special-case handling for validation vs. other 400s.
 */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

module.exports = { handleValidation };
