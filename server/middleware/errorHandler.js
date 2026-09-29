const notFound = (req, res) => {
  res.status(404).json({ msg: `Route not found: ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    msg: status === 500 ? "Server error" : err.message,
  });
};

module.exports = { notFound, errorHandler };