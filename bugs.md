# Bug Tracking

## Save Customer 404 Error - 2026-04-14

Description: Saving a new customer in the POS Customer Base page fails with a 404 Not Found error from Axios.
Expected behavior: The customer data should be sent to `POST /api/customers` and saved to the database.
Actual behavior: The server returns 404, implying the route is not registered or the server process is stale.
Solution: Identified a stale server process that didn't have the newly implemented `customers` routes active. Performed a manual server restart and verified route availability via CURL.
Status: Fixed
