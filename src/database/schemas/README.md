# Database Schemas

This directory contains the database schemas for the Mycelium backend. Each subdirectory contains a schema definition and a README with column documentation.

## Schemas

- [User](./user/README.md) - User accounts and authentication
- [Project](./project/README.md) - Workspaces owned by users
- [API Key](./api-key/README.md) - API keys for projects
  - [Daily Stats](./api-key/daily-stats/README.md) - Per-day usage metrics
  - [IP Stats](./api-key/ip-stats/README.md) - Per-IP usage statistics
- [Log](./log/README.md) - HTTP request/response records
  - [Detail](./log/detail/README.md) - Extended payload data
- [React Flow](./react-flow/README.md) - Canvas state for service maps
- [Integration](./integration/README.md) - Integrations discovered under projects
