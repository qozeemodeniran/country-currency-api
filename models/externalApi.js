const axios = require('axios');

class ExternalApi {
  constructor() {
    this.countriesApi = 'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies';
    this.exchangeApi = 'https://open.er-api.com/v6/latest/USD';
  }

  async fetchCountries() {
    try {
      console.log('Fetching countries from:', this.countriesApi);
      const response = await axios.get(this.countriesApi, { 
        timeout: 30000,
        headers: {
          'User-Agent': 'CountryCurrencyAPI/1.0'
        }
      });
      console.log(`Fetched ${response.data.length} countries`);
      return response.data;
    } catch (error) {
      console.error('Error fetching countries:', error.message);
      throw new Error('Could not fetch data from countries API');
    }
  }

  async fetchExchangeRates() {
    try {
      console.log('Fetching exchange rates from:', this.exchangeApi);
      const response = await axios.get(this.exchangeApi, { 
        timeout: 30000,
        headers: {
          'User-Agent': 'CountryCurrencyAPI/1.0'
        }
      });
      
      if (!response.data || !response.data.rates) {
        throw new Error('Invalid response from exchange API');
      }
      
      console.log('Exchange rates fetched successfully');
      return response.data.rates;
    } catch (error) {
      console.error('Error fetching exchange rates:', error.message);
      throw new Error('Could not fetch data from exchange rates API');
    }
  }

  // Helper function to get currency code
  getCurrencyCode(currencies) {
    if (!currencies || currencies.length === 0 || !currencies[0]) {
      return null;
    }
    return currencies[0].code || null;
  }

  // Calculate estimated GDP
  calculateEstimatedGDP(population, exchangeRate) {
    if (!exchangeRate || !population) return 0;
    const randomMultiplier = Math.random() * 1000 + 1000; // Random between 1000-2000
    const gdp = (population * randomMultiplier) / exchangeRate;
    return parseFloat(gdp.toFixed(2));
  }
}

module.exports = new ExternalApi();