const { fetchCountries, fetchExchangeRates } = require('../utils/fetcher');
const db = require('../models');
const { generateSummaryImage } = require('../utils/imageGenerator');

function randBetween1000and2000() {
  return Math.random() * 1000 + 1000; // 1000..2000
}

async function runRefresh() {
  // Wrap the external fetches first (so we can abort early if external fails)
  let countriesData, rates;
  try {
    [countriesData, rates] = await Promise.all([fetchCountries(), fetchExchangeRates()]);
  } catch (err) {
    const which = err.message || 'External';
    const readable = which.includes('Countries') ? 'Countries' : which.includes('Exchange') ? 'Exchange rates' : 'External';
    throw { kind: 'external', message: `Could not fetch data from ${readable}` };
  }

  const t = await db.sequelize.transaction();
  try {
    const lastRefreshedAt = new Date().toISOString();

    for (const raw of countriesData) {
      const name = raw.name;
      const capital = raw.capital || null;
      const region = raw.region || null;
      const population = raw.population || 0;
      const flag_url = raw.flag || null;

      // currency handling per spec: take first currency, else null
      let currency_code = null;
      if (Array.isArray(raw.currencies) && raw.currencies.length > 0) {
        currency_code = raw.currencies[0].code || null;
      }

      let exchange_rate = null;
      let estimated_gdp = 0;

      if (currency_code && rates && typeof rates[currency_code] !== 'undefined') {
        // rates are in terms of 1 USD => rate for currency. 
        // Note: Exchange API is latest/USD: rates[CUR] = x meaning 1 USD = x CUR
        // The sample in your prompt uses "NGN → 1600", so exchange_rate stores the currency per USD.
        exchange_rate = Number(rates[currency_code]);
        // compute estimated_gdp: population × random(1000–2000) ÷ exchange_rate
        const multiplier = randBetween1000and2000();
        // avoid division by zero
        if (exchange_rate) {
          estimated_gdp = (Number(population) * multiplier) / exchange_rate;
        } else {
          estimated_gdp = 0;
        }
      } else {
        // handle missing currency or missing exchange rate per spec
        exchange_rate = null;
        estimated_gdp = 0;
      }

      // Upsert logic - match existing country by name case-insensitive
      const existing = await db.Country.findOne({
        where: db.sequelize.where(
          db.sequelize.fn('lower', db.sequelize.col('name')),
          db.sequelize.fn('lower', name)
        ),
        transaction: t
      });

      if (existing) {
        await existing.update({
          capital,
          region,
          population,
          currency_code,
          exchange_rate,
          estimated_gdp,
          flag_url,
          last_refreshed_at: lastRefreshedAt
        }, { transaction: t });
      } else {
        await db.Country.create({
          name,
          capital,
          region,
          population,
          currency_code,
          exchange_rate,
          estimated_gdp,
          flag_url,
          last_refreshed_at: lastRefreshedAt
        }, { transaction: t });
      }
    } // for each country

    // update global meta
    await db.Meta.upsert({ key: 'last_refreshed_at', value: lastRefreshedAt }, { transaction: t });

    // commit before generating image (so DB contains updated info)
    await t.commit();

    // Generate summary image: query top 5
    const total = await db.Country.count();
    const top5 = await db.Country.findAll({
      order: [['estimated_gdp', 'DESC']],
      limit: 5
    });

    const imgPath = await generateSummaryImage(total, top5, lastRefreshedAt);
    return { total, last_refreshed_at: lastRefreshedAt, image_path: imgPath };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

module.exports = { runRefresh };
