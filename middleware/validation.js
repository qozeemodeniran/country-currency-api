const validateCountry = (req, res, next) => {
  const { name, population, currency_code } = req.body;
  const errors = {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'is required';
  }

  if (!population || typeof population !== 'number' || population < 0) {
    errors.population = 'is required and must be a positive number';
  }

  if (!currency_code || typeof currency_code !== 'string' || currency_code.trim().length === 0) {
    errors.currency_code = 'is required';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

const validateQueryParams = (req, res, next) => {
  const { region, currency, sort } = req.query;
  
  if (sort && !['gdp_desc', 'gdp_asc'].includes(sort)) {
    return res.status(400).json({
      error: 'Validation failed',
      details: {
        sort: 'must be either gdp_desc or gdp_asc'
      }
    });
  }

  next();
};

module.exports = {
  validateCountry,
  validateQueryParams
};