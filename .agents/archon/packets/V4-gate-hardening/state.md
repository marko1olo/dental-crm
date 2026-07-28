# V4-gate-hardening — state

STATUS: DONE (PROVEN) — коммит d62af23ea13e61ae413cef6f8f53e36cc5a65427

## PROVEN (все команды выполнены, вывод в handoff.md)
- `node scripts/smoke-clinical-mutation-guard.mjs` → exit 0, ok:true,
  464/462/187/433/173, secretUnconfiguredRoutes=276, warnings=[].
- Свежесть сборки КРАСНЕЕТ: органически (чужая правка routes/clinical.ts) и по команде
  (`touch apps/api/src/security/identity.ts` → exit 1 с двумя временами), затем
  `npm run build -w @dental/api` → exit 0 → гейт exit 0.
- Детектор двойного ответа КРАСНЕЕТ: снят короткий выход после охранника в
  dist/routes/billing.js → exit 1, «ОБРАБОТЧИК ОТВЕТИЛ ДВАЖДЫ», при
  challengedMutatingRoutes=173 БЕЗ ИЗМЕНЕНИЙ и нуле строк «НЕ ЗАЩИЩЁН».
  Восстановлено побайтово (md5 d696c686f9a2c890c1b79ebd7ece50a6), dist без churn.
- Сверка инвентаря послаблений КРАСНЕЕТ: имя убрано из списка → exit 1 с file:line;
  восстановлено `git checkout --`.
- `NODE_ENV=production node scripts/smoke-clinical-mutation-guard.mjs` → exit 0
  (до правки exit 1 со стеком).
- `npm run smoke:all -- --only=clinical-mutation-guard` → PASS 2985ms, failed=0.
- Контроль: старый способ загрузки даёт те же 464/187 — падение 481→464 не моё.

- GATE PASSED: `node scripts/smoke-clinical-mutation-guard.mjs` → exit 0,
  ok:true, 464/462/187/433/173, secretUnconfiguredRoutes=276, warnings=[].
- COMMITTED d62af23ea (4 файла: два скрипта + state.md + commitmsg.txt).
  ОШИБКА ФОРМЫ: в теме коммита нет префикса «[ARCHON] ». Историю не переписываю
  (запрет пакета); префикс поставлен на следующий коммит, факт записан в handoff.
- Дальше: доказательства (freshness FIRES, логгер ловит level>=40, ambient production).

- Packet: V4-gate-hardening (rework of U2-behavioural-guard-gate)
- Lane: PROOF
- Claim: scripts/smoke-clinical-mutation-guard.mjs, scripts/lib/api-route-census.mjs
- Gate: node scripts/smoke-clinical-mutation-guard.mjs
- Spec: .agents/archon/packets/U2-behavioural-guard-gate/review.md (222 строки, прочитан целиком)

## Log
- STARTED — packet dir created, nothing read yet.
- AUTHORITY READ — .agents/AGENTS.md, .agents/INDEX.md, U2 review.md (222 строки),
  U2 handoff.md (227 строк). Прошлый экземпляр этого пакета умер на этом шаге, правок не сделал.
- HEAD у первого экземпляра: 8f56e5ae48eddc568304eaba5c3f09311e83b019.
  HEAD сейчас: 56bc2ef6d5492b7d2dabed228ebe8d63113c676e (сдвинулся под нами).
- Claimed files CLEAN: `git status --porcelain -- scripts/smoke-clinical-mutation-guard.mjs
  scripts/lib/api-route-census.mjs` = пусто. Коллизии нет.
- Оба файла прочитаны ЦЕЛИКОМ (census 149 строк, gate 702 строки).

## DEFECT CONFIRMED (измерено, не пересказано)

1. **Черствая сборка — дефект ЖИВОЙ ПРЯМО СЕЙЧАС.** `api-route-census.mjs:48` проверяет только
   `existsSync(dist/server.js)`. Замер через компилятор (ts.parseJsonConfigFileContent для
   apps/api/tsconfig.json, 239 компилируемых файлов): **8 файлов src новее своего dist**, в т.ч.
   `routes/auth.ts` (src 06:33:23 > dist 04:21:13), `db/schema.ts` (06:29:52 > 04:21:13),
   `routes/clinical.ts`, `routes/inventory.ts`, `db/domainStateHydration.ts`. MISSING=0 —
   отображение src->dist полное, ни одного захардкоженного пути не нужно.
2. **Логгер заглушён.** `api-route-census.mjs:68` `app.log.level = "silent"` — записи level>=40
   и FST_ERR_REP_ALREADY_SENT не видит никто.
3. **Флаги послаблений.** `smoke-clinical-mutation-guard.mjs:72-79` перечисляет 6 имён.
   В исходниках идиом `NODE_ENV !== "production" && process.env.X === "1"` даёт 5 разных флагов,
   и два из них в списке отсутствуют: `DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS`
   (schedule.ts:134) и `DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE` (telegram.ts:1491).
   **Тот же пробел во втором владельце списка** — `apps/api/src/server.ts:92-97` (не мой claim).
4. **Второй владелец заголовка.** `smoke-clinical-mutation-guard.mjs:81` перепечатывает
   `"x-dente-admin-secret"`, который `apps/api/src/accessGuard.ts:7` экспортирует как
   `denteAdminSecretHeader`.
5. **Расхождение inject vs слушающий сокет.** `apps/api/src/security/identity.ts:102-106`
   `serverAcceptsNetworkConnections()` возвращает `httpServer.listening`; `:112-115`
   `unverifiedOrganizationUsable()` разрешает НЕПРОВЕРЕННОЙ организации ЗАПИСЬ, когда сервер
   не слушает порт. Под `app.inject` он не слушает никогда. В гейте это нигде не названо.
6. **Ambient NODE_ENV=production.** Проверю командой; ревизор измерил exit 1
   `AUTH_TOKEN_SECRET обязателен в production` на импорте (census:53).

## План (по номерам review.md §8)
1. "24" -> гейт САМ МЕРЯЕТ число (сквозной проход без секретов) — прозе рот не дать.
2. dist-freshness через компилятор TS (rootDir/outDir/fileNames из tsconfig) — падать с командой сборки.
3. перехватывающий поток pino (Symbol.for("pino.stream")) + level=warn; level>=40 валит прогон;
   самопроверка перехвата обязательна, иначе тихая потеря детектора.
4. injectionLimitations в отчёт: WebSocket + identity.ts.
5. два флага + САМОПРОВЕРКА инвентаря по исходникам.
6. AUTH_TOKEN_SECRET + снятие послаблений ДО импорта dist.
7. два веб-утверждения — вне claim, ожидается DECLARED DEBT (перемерю, что они ещё проходят).
8. импорт denteAdminSecretHeader из dist/accessGuard.js.

## Следующая медленная команда
`npm run build -w @dental/api` (dist черствый; без этого любой мой замер — про вчерашний код).
