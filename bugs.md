# Bug Tracking

### [Login Error 500] - 2026-04-14
**Description:** User encountered a status 500 error when attempting to log in after migrating to SQLite and moving folders.
**Expected behavior:** Successful login or 401 for invalid credentials.
**Actual behavior:** AxiosError Request failed with status code 500.
**Solution:** 
1. Identified that a ghost process was potentially holding port 5000 with stale code.
2. Verified database integrity and seed data using independent scripts.
3. Added diagnostic logging to capture the exact crash point if it persists.
4. Ensured environment variables are loaded before route imports.
**Status:** Fixed (Pending Verification from User)
