@AGENTS.md

# Session bootstrap (read in this order)

1. AGENTS.md (included above): architecture, locked decisions, hard rules,
   phase plan, database schema reference.
2. RUN_STATE.md: exactly what is done and the precise next steps. Update it
   after every meaningful chunk of work; it is the handover contract between
   sessions.
3. DESIGN.md: the design system (tokens, motion, icon, layout rules). All UI
   work must comply.
4. MEMORY.md: environment gotchas, Yash's working rules, secrets handling,
   decisions already made.

Never print values from .env.local or Desktop/keys.evn. No em dashes in prose
written for Yash. Verify UI changes with a screenshot before shipping.
