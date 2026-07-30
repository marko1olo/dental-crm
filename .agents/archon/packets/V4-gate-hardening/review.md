# V4-gate-hardening — ADVERSARIAL REVIEW (in progress, written incrementally)

Commit under attack: d62af23ea13e61ae413cef6f8f53e36cc5a65427 (+ handoff commit 9de69093a1ce3df2b71cccf51ac81818c7992d31)
HEAD at review start: 9de69093a1ce3df2b71cccf51ac81818c7992d31
Reviewer did not write this code. Specification: `.agents/archon/packets/U2-behavioural-guard-gate/review.md` (222 lines, read complete).

Status: WORK IN PROGRESS — sections are appended as each check completes.

## 0. Static facts established

- `git show d62af23ea --stat`: 4 files — `scripts/lib/api-route-census.mjs` (+506/-?),
  `scripts/smoke-clinical-mutation-guard.mjs` (+296), `.agents/.../state.md`, `.agents/.../commitmsg.txt`.
  Second commit 9de69093a: `handoff.md`, `state.md`, `commitmsg2.txt`. No source files, no dist, no
  neighbour work. Claimed FILES CHANGED list matches exactly.
- `apps/api/package.json`: build = `tsc -p tsconfig.json` — NOT `tsc -b`, and neither
  `apps/api/tsconfig.json` nor `tsconfig.base.json` sets `incremental`. So a plain `touch` of a src file
  IS curable by a rebuild (full emit every time). The builder's touch→red→build→green claim is therefore
  mechanically possible; verified below.
- `apps/api/tsconfig.json` has `rootDir: src`, `outDir: dist`, `include: ["src"]` — so the compiler file
  list cannot escape `apps/api/src`, and `buildOutputPathFor()` cannot produce a path outside `dist`.
- `security/identity.ts:102-106` / `:112-115` line references in `injectionLimitations` are exact.
- `security/webhookAuth.ts:95-98` (`request.log.warn(... [webhook:<channel>] Отклонён запрос с неверным
  секретом.)`) — the single allowed logger record — is exact.
- Rate-limit headroom claim re-derived from `security/rateLimit.ts:66-80`: tightest DEFAULT_RULES entry is
  5/min for `/api/auth/(clinic/login|staff/unlock|login)`; only `routes/auth.ts:84` and `routes/portal.ts`
  carry per-route configs. Two sweeps = 2 of 5 on those three routes. Claim holds (details below).
