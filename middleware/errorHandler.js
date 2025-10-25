function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: "Validation failed",
      details: err.details || err.message
    });
  }

  // Database errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      error: "Duplicate entry",
      details: "A country with this name already exists"
    });
  }

  // Default error
  res.status(500).json({
    error: "Internal server error",
    details: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
}

module.exports = errorHandler;