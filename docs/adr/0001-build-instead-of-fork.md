# Build Snug from scratch instead of forking Sofa

Sofa (MIT, actively maintained) already covers episode tracking, a Jellyfin webhook and a "continue watching" home, and was the starting point. We chose to build Snug from scratch rather than fork it, because we want a series-only scope, our own modular DDD codebase, and Status semantics Sofa does not have (Paused, Ready/Upcoming home sections). We reuse Sofa's stack (Bun, Hono, React, Drizzle, SQLite) and keep Sofa's export file importable, without naming it in the product.
