/**
 * Logger utility for the AI Phone application
 */

// Default logger that logs everything
const defaultLogger = {
  debug: console.debug,
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error
};

// Quiet logger that only logs errors
const quietLogger = {
  debug: () => {},
  log: () => {},
  info: () => {},
  warn: () => {},
  error: console.error
};

module.exports = {
  defaultLogger,
  quietLogger
};
