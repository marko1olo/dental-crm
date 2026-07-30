# Adversarial review — LL3-test-reads-shared-database @ 814cf93bd

Reviewer: independent (did not write the code). READ-ONLY pass. In progress; findings appended as derived.

## Commit under review

- `814cf93bd` `[ARCHON] fix(тесты-отчётов): ошибка 500 от отчёта читалась как «undefined !== false»`
- Author `marko1olo <marko1olo@users.noreply.github.com>`
- `git show --stat`: **1 file**, `apps/api/src/tests/routes/managerReports.test.ts`, 38 insertions / 9 deletions. No other path smuggled in.
- Follow-up `72acfc2c0` touches only `.agents/archon/packets/LL3-test-reads-shared-database/state.md`.

## 6. Attribution — PASS

```
$ git log -1 --format='%(trailers)' 814cf93bd | cat -A
$
```
Literal output is a single empty line. **Trailers empty.**

```
$ git log -1 --format='%B' 814cf93bd | rg -ci 'co-authored|anthropic|generated with|claude'
0   (rg exit 1 = no match)
```
No Co-Authored-By, no `anthropic`, no `claude`, no "generated with" anywhere in subject or body. Clean.

## 1. Does the packet's stated defect still reproduce? — NO. THE BRIEF WAS STALE/WRONG.

The brief's central claim: *"IT IS A TEST THAT READS WHATEVER HAPPENS TO BE LYING IN THE SHARED
DATABASE … that organization owns ZERO appointments."*

I re-derived this against the **pre-commit** tree, not the builder's word:

```
$ git show '814cf93bd^:apps/api/src/tests/routes/managerReports.test.ts'
```
The pre-image `before()` hook already contains `db.insert(appointments).values([ …5 rows… ])`, every row
carrying `organizationId: ORG_ID` — one `completed` a year back, two `completed` in period, one
`cancelled`, one `no_show`. That block is not new; `git log -- <file>` shows it arriving with
`782098525 feat(reports)` and it survived `33bfaa5c5` and `157db6628` untouched.

So the test was **already self-seeding for its own ORG_ID before this commit**. The brief's diagnosis
("reads ambient rows", "owns zero appointments") is wrong. The lead's live-DB query returned zero rows
for `dce70000-…-0401` because the `after()` hook deletes the whole fixture by `organizationId` — he
measured the database *after* cleanup. The fixture is transient by design, not absent.

**Verdict on the brief: STALE PREMISE. Builder correctly refused to implement option 1 (already done) or
option 2 (would have been a downgrade), and said so in the commit body.** That is the right call, and it
is caught rather than accommodated — this is stale brief #13.

## 5b. Tenancy of the new deletes — PASS, verified with my own rg

The new `removeFixtureRows()` deletes 9 tables. Every single `where` is
`eq(<table>.organizationId, ORG_ID)`, and the last is `eq(organizations.id, ORG_ID)`. No delete is
filtered by row id alone; no delete is unfiltered. Blast radius is one organization.

Is that organization solely this file's? My own scoped search, not the builder's:

```
$ rg -l -g '!node_modules' -g '!dist' "dce70000-0000-4000-8000-000000000401" .
apps/api/src/tests/routes/managerReports.test.ts
```
**My count: 1 file.** Same for the whole `…-0000000004` prefix — 9 hits, all in this one file. So the
pre-seed purge cannot delete another test's fixture even under parallel test-file execution.

(more sections below — appended as verified)
