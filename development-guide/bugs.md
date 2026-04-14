# Bug Tracker

## Active Issues

### Create Product Error - 2026-02-11
- **Description**: Creating a product fails with "Request failed with status code 500".
- **Expected behavior**: Product should be created successfully.
- **Actual behavior**: Server returns 500 Internal Server Error.
- **Solution**: Fixed by handling `undefined` optional parameters (converting to `null` or `0`) in `Inventory.ts`.
- **Status**: Fixed

<!-- 
Copy and paste the template below for new bugs.
-->

### Template
<!-- 
## [Bug Name] - [Date]
- **Description**: [Brief description]
- **Expected behavior**: [What should happen]
- **Actual behavior**: [What is happening]
- **Solution**: [How it was fixed]
- **Status**: [Open | In-Progress | Fixed | Closed]
-->

## Resolved Issues
