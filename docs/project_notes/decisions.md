# Architectural Decisions

This file logs architectural decisions (ADRs) for the project. Use bullet lists for clarity.

## Format

Each decision should include:
- Date and ADR number
- Context (why the decision was needed)
- Decision (what was chosen)
- Alternatives considered
- Consequences (trade-offs, implications)

---

## Entries

<!-- Add new ADR entries below this line -->

### ADR-001: Admin Panel Redesign with Queue-Based Process Management (2025-01-17)

**Context:**
- Current admin panel has 4 hardcoded process types (catalog, product, recipe, image)
- Adding new scrapers requires code changes
- Status tracking uses JSON files (not persistent, not scalable)
- No authentication - anyone can access /admin
- No visibility into process logs or history

**Decision:**
- Redesign admin panel with database-backed process management
- Implement queue system (one process at a time) for execution control
- Add JWT-based authentication with password from environment variable
- Store process configs, runs, and logs in MySQL
- Move store configuration from code to database
- Add real-time log streaming via Server-Sent Events (SSE)

**Alternatives Considered:**
- Keep JSON file status → Rejected: Not persistent, race conditions
- Use Redis for queue → Rejected: Adds infrastructure complexity, MySQL sufficient
- NextAuth for auth → Rejected: Overkill for single-user admin, simple JWT better
- WebSockets for logs → Rejected: SSE simpler, works well for one-way streaming
- Parallel execution → Rejected: Sequential queue simpler, avoids API rate limits

**Consequences:**
- ✅ Dynamic process management without code changes
- ✅ Full execution history and logs preserved
- ✅ Protected admin access
- ✅ Stores configurable from UI
- ✅ Real-time visibility into running processes
- ❌ More complex initial implementation
- ❌ Requires database migration
- ❌ Existing scripts need modification for structured logging

