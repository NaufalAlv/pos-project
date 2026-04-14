# Changelog

All notable changes to the **POS-Bengkel** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project structure and documentation setup.

### Changed
- Migrated database layer from SQL Server (`mssql`) to an embedded SQLite database (`better-sqlite3`) to enable seamless local execution without background services.
