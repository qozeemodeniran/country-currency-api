const axios = require('axios');
const COUNTRIES_API = 'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies';
const EXCHANGE_API = 'https://open.er-api.com/v6/latest/USD';

const http = axios.create({ timeout: 15000 });

async function fetchCountries() {
  try {
    const res = await http.get(COUNTRIES_API);
    return res.data;
  } catch (err) {
    throw new Error('Countries API');
  }
}

async function fetchExchangeRates() {
  try {
    const res = await http.get(EXCHANGE_API);
    // API returns an object with 'rates' property on success
    if (res.data && res.data.result === 'success' && res.data.rates) {
      return res.data.rates;
    }
    // Some versions might just return rates object - handle cautiously
    if (res.data && res.data.rates) return res.data.rates;
    // fallback if format differs
    throw new Error('Exchange API invalid format');
  } catch (err) {
    throw new Error('Exchange API');
  }
}

module.exports = { fetchCountries, fetchExchangeRates };
