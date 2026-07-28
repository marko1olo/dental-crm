# U5-diary-lock-ceremony — state

STATUS: DONE
HEAD at start: e14c09862cf9ba58c7bfa05713695b4fcfece8da
HEAD at finish: 2750f01d2ca519f55ae694571c47cf8c9c096c6e (двигали другие агенты)
MY COMMITS: 87e367c40 (исправление), 1f65d674b (тест + защита от отрицательного
списания; заголовок того коммита про «пустую полку» ЛОЖНЫЙ — поправка в handoff.md,
внесена пакетом V2-inventory-false-record)

## Authority read (complete)
.agents/AGENTS.md, .agents/INDEX.md, .agents/CLINICAL_RULES.md, RECON_DOSSIER.md §5.7.

## Both paths — exact lines (at 87e367c40^)
- Path A (POST upsert+sign): `apps/api/src/routes/diary.ts:97-218`; подписание `:119`,
  роль `:121-123`, ветка обновления `:135-187`, ветка вставки `:188-217`.
- Path B (`POST /:id/lock`): `:221-408`; FOR UPDATE `:267-283`, замок `:286-302`,
  услуги+склад `:304-354`, ставка `:356-380`, журнал `:382-390`.
- Path C (`POST /:id/revise`): `:411-492`.

## Execution chain (§6) — ANSWERED
POST `/api/diaries` не вызывает никто в репозитории. Единственный клиент роутера —
`apps/web/src/components/useVisitDiaryLogic.ts` (`:59`, `:81`, `:209` только `/lock`),
черновик уходит в PUT `/api/visits/:visitId/draft/autosave` (`:135`). Маршрут
зарегистрирован и доступен по сети — не мёртвый код, но и не путь продукта.
`req.user` наполняет глобальный хук `apps/api/src/server.ts:310` -> getRequestIdentity
(`security/identity.ts:206`); роль приходит из x-dente-staff-token.

## Итог доказательств
- TYPECHECK: `npm run typecheck -w @dental/api` exit 0.
- UNIT+DB: новый тест 5/5 pass на настоящей PostgreSQL, фикстуры удалены.
- COUNTERFACTUAL: код до 87e367c40 на тех же данных — POST: остаток 10, 0 движений,
  0 записей журнала, услуга approved, подпись null; /lock: 6 / 1 / 1 / completed /
  сохранена. После — оба дают второй результат.
- API+DB на живом 127.0.0.1:4100 + 127.0.0.1:5432: CEREMONY EQUAL = true,
  повторная подпись 403/409, остаток не двинулся.
- `npm test -w @dental/api`: 970/970 pass, fail 0 (дважды). База без моего файла 965/965.

## Log
- [x] STARTED
- [x] AUTHORITY READ
- [x] DEFECT CONFIRMED
- [x] EDIT WRITTEN
- [x] GATE PASSED
- [x] COMMITTED 87e367c40
- [x] COMMITTED 1f65d674b
- [x] PROVEN
- [x] DONE

## Files left on disk
state.md, commitmsg.txt, commitmsg2.txt, handoff.md, live-api-proof.ts (повторяемая
проверка, запускать с cwd apps/api; пишет в живую базу и убирает за собой).
Временные файлы counterfactual-прогона удалены.
