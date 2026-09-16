let app;
let initError = null;

try {
  app = require('../Backend/server');
} catch (err) {
  initError = {
    message: err.message,
    stack: err.stack
  };
  console.error('Failed to load backend server in Vercel function:', err);
}

module.exports = (req, res) => {
  if (initError) {
    return res.status(500).json({
      error: 'Backend Initialization Error',
      details: initError.message,
      stack: initError.stack
    });
  }
  return app(req, res);
};
