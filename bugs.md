# Bug Tracking

## Save Customer 404 Error - 2026-04-14

Description: Saving a new customer in the POS Customer Base page fails with a 404 Not Found error from Axios.
Expected behavior: The customer data should be sent to `POST /api/customers` and saved to the database.
Actual behavior: The server returns 404, implying the route is not registered or the server process is stale.
Solution: Identified a stale server process that didn't have the newly implemented `customers` routes active. Performed a manual server restart and verified route availability via CURL.
Status: Fixed

## Cross-Device Login Network Error - 2026-04-14

Description: Unable to login from other devices on the same network; returns "Network Error".
Expected behavior: Devices on the local network (WiFi) should be able to reach the backend API.
Actual behavior: Frontend was hardcoded to `localhost`, causing other devices to try to hit themselves instead of the host machine.
Solution: 
1. Identified Host IP as `192.168.1.64`.
2. Created `client/.env` pointing `NEXT_PUBLIC_API_URL` to the host IP.
3. Updated `client/package.json` to use `next dev -H 0.0.0.0`.
4. Restarted both services to apply network exposure settings.
Status: Fixed
