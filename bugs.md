# Bug Tracking

### [Login Error 500] - 2026-04-14
**Description:** User encountered a status 500 error when attempting to log in after migrating to SQLite and moving folders.
**Expected behavior:** Successful login or 401 for invalid credentials.
**Actual behavior:** AxiosError Request failed with status code 500.
**Solution:** 
1. Identified and killed a ghost process on port 5000.
2. Fixed a `TypeError` in `index.ts` request logger that was crashing for every GET request (accessing `Object.keys` on undefined body).
3. Identified that `categories` table is empty, causing `SQLITE_CONSTRAINT_FOREIGNKEY` when adding products.
4. Ensured environment variables are loaded correctly.
**Status:** Fixed (Monitoring for product addition)
