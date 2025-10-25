# Country Currency & Exchange API

## Overview
This REST API fetches country data + exchange rates, calculates `estimated_gdp` and caches everything in MySQL (JawsDB on Heroku). It supports refresh, CRUD on countries, status, and a generated summary image.

## Endpoints
- POST /countries/refresh → Fetch & cache external data
- GET /countries → List countries (filters: ?region=Africa, ?currency=NGN, sort: ?sort=gdp_desc)
- GET /countries/:name → Get a country by name
- DELETE /countries/:name → Delete country record
- GET /status → { total_countries, last_refreshed_at }
- GET /countries/image → Serve `cache/summary.png` generated at refresh

## Validation
- `name`, `population`, `currency_code` are required when creating via DB-level insert (but refresh inserts from external API).
- Validation errors: `{ "error": "Validation failed", "details": { ... } }`

## Setup (Local / Development)
> NOTE: As required, the DB must be a MySQL JawsDB instance (Heroku or other remote MySQL). You can use Heroku JawsDB for both production and testing.

1. Clone
```bash
git clone <repo-url>
cd country-currency-exchange-api
