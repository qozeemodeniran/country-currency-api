const axios = require('axios');

class ExternalApi {
  constructor() {
    this.countriesApi = 'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies';
    this.exchangeApi = 'https://open.er-api.com/v6/latest/USD';
  }

  async fetchCountries() {
    try {
      const response = await axios.get(this.countriesApi, { timeout: 10000 });
      return response.data;
    } catch (error) {
      console.error('Error fetching countries:', error.message);
      throw new Error('Could not fetch data from countries API');
    }
  }

  async fetchExchangeRates() {
    try {
      const response = await axios.get(this.exchangeApi, { timeout: 10000 });
      return response.data.rates;
    } catch (error) {
      console.error('Error fetching exchange rates:', error.message);
      throw new Error('Could not fetch data from exchange rates API');
    }
  }

  // Helper function to get currency code
  getCurrencyCode(currencies) {
    if (!currencies || currencies.length === 0) {
      return null;
    }
    return currencies[0].code || null;
  }

  // Calculate estimated GDP
  calculateEstimatedGDP(population, exchangeRate) {
    if (!exchangeRate) return 0;
    const randomMultiplier = Math.random() * 1000 + 1000; // Random between 1000-2000
    return (population * randomMultiplier) / exchangeRate;
  }
}

module.exports = new ExternalApi();