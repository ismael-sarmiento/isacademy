# AGENTS.md — isacademy

## Parent

Global roots (L0):
- Claude Code: `~/.claude/CLAUDE.md`
- Codex: `~/.codex/AGENTS.md`

## Purpose

Entry point for any agent working on the IsAcademy promotional website (GitHub Pages, static).
Personal project of Ismael Sarmiento; DATM governance does not apply beyond the L0 protocols
(Plan al Milímetro before each phase, close-out recap after each task).

## Read order

1. `README.md` — structure, local preview, deployment (A: browser upload, B: git + gh)
2. `docs/PROJECT_CONTEXT.md` — product decisions that must not be reopened without the owner
3. `docs/TODO.md` — pending items and phase roadmap

## Rules

- Static only: no backend, no build step, no API keys in the repo. Relative paths (site lives under `/isacademy/`).
- Every user-facing string lives in `i18n/es.json` and `i18n/en.json`; keep both in sync.
- Both themes (light and dark) and phone portrait (375×812) must be checked on every UI change.
- Never publish the contact phone number until the owner says so (buttons show "Próximamente").
- This is a professional academy site whose goal is student acquisition. Playful elements live only in the intro/opening
  and the Resources section (future 3D world). Any game content must be original (no copied characters or franchises).
- Copy tone: professional, plural voice ("nosotros"). Every section should end in a clear path to contact.
- TFG/TFM copy must never suggest doing the student's work.
- Never bypass git hooks or security controls to publish; if `git push` is not allowed, use README option A.
