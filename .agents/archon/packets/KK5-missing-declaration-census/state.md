START: перепись «в базе есть, в объявлениях Drizzle нет» — новый страж scripts/smoke-schema-missing-declarations.mjs
COMMITTED: 920b19524 — scripts/smoke-schema-missing-declarations.mjs, страж «в базе есть, в Drizzle нет»: 19 таблиц + 134 колонки в реестре с причиной, падает на скрытом объявлении (exit 1)
COMMITTED(fix причин): 218e194d4 — все 18 таблиц и 134 колонки создаются миграциями (15 — той же 0000, что egisz_logs); since проверяется по диску
