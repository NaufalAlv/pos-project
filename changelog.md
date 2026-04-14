# Changelog

## [1.0.1] - 2026-04-14
### Added
- Comprehensive error logging to `authController.ts` and `User.ts` model.
- Startup environment checks in `index.ts` (JWT secret check).
- Detailed request logging (including body) for debugging purposes.
- `client/.env.example` for easier API URL configuration.
- `run_instructions.md` for project initialization on new devices.

### Fixed
- Potential race condition by moving `dotenv.config()` to the absolute top of the server entry point.
- Ghost process issue by identifying and killing orphaned server processes on port 5000.
