# Country Currency & Exchange API

A RESTful API that fetches country data from external APIs, stores it in a database, and provides CRUD operations with exchange rate calculations.

## 🚀 Features

- Fetch country data from REST Countries API
- Get exchange rates from Open Exchange Rates API
- Calculate estimated GDP based on population and exchange rates
- CRUD operations for country data
- Filtering and sorting capabilities
- Automatic image generation for data summary
- Comprehensive error handling

## 🛠️ Tech Stack

- Node.js & Express.js
- MySQL with JawsDB
- Axios for HTTP requests
- Canvas for image generation
- Jest & Supertest for testing

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL database (local or JawsDB)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/country-currency-api.git
   cd country-currency-api