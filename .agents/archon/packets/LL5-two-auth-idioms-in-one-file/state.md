# LL5-two-auth-idioms-in-one-file

## НАЧАЛО. Инвентаризация шести участков visits.ts (замер на HEAD, свой прогон)

БРИФ НЕВЕРЕН В ГЛАВНОМ ЧИСЛЕ. Он says «visits.ts: verifyToken 5 / requireClinical*Access 1».
Замерено `rg -c 'requireClinical(Read|Mutation)Access\(' apps/api/src`: visits.ts В СПИСКЕ ОТСУТСТВУЕТ.
Вызовов общего охранника в файле НОЛЬ. Пять совпадений `verifyToken` — это 1 импорт + 4 вызова.

| # | строка | маршрут | идиома | при отказе |
|---|--------|---------|--------|-----------|
| 1 | visits.ts:8 | — (импорт) | requireClinicalMutationAccess + requireClinicalReadAccess | **НИКОГДА НЕ ВЫЗЫВАЮТСЯ** — мёртвый импорт |
| 2 | 169-174 | POST /api/appointments/:appointmentId/visit | ручная verifyToken | 401 AuthRequired / 401 AuthExpired, return |
| 3 | 210-215 | GET /api/visits/:visitId/draft/autosave | ручная verifyToken | 401 AuthRequired / 401 AuthExpired, return |
| 4 | 228-233 | PUT /api/visits/:visitId/draft/autosave | ручная verifyToken | 401 AuthRequired / 401 AuthExpired, return |
| 5 | 253-258 | POST /api/visits/:visitId/draft/accept | ручная verifyToken | 401 AuthRequired / 401 AuthExpired, return |

## РЕШАЮТ ЛИ ДВЕ ИДИОМЫ ОДНО И ТО ЖЕ? НЕТ. ОНИ ОРТОГОНАЛЬНЫ.

- ручная `verifyToken(x-dente-clinic-token, TOKEN_SECRET())` отвечает «какая это клиника и настоящий ли
  токен» — арендатор. Даёт organizationId. Без учётных данных 401.
- `requireClinicalMutationAccess` отвечает «есть ли у звонящего секрет администратора клиники»
  (`x-dente-admin-secret` против `DENTE_CLINICAL_ADMIN_SECRET`). organizationId НЕ даёт вовсе — возвращает
  boolean. Без секрета 403, при ненастроенном секрете 503, при dev-послаблении пропускает.

Это два РАЗНЫХ слоя, а не два ответа на один вопрос. Поэтому «заменить одно другим» удалило бы слой.
Правильная сходимость — `requireClinicalMutationContext` / `requireClinicalReadContext` (accessGuard.ts:201-221),
которые выполняют ОБА шага: охранник, затем `requireOrganizationId` из security/identity.ts.

## ДЕФЕКТ, КОТОРЫЙ ПЕРЕВЕШИВАЕТ РЕФАКТОРИНГ

Гейт секрета администратора клиники стоит на КАЖДОМ другом клиническом маршрутном файле
(imaging.ts 24, smartImports.ts 10, speech.ts 8, diary.ts 7, clinical.ts 5, templates.ts 5, xray.ts 5,
egisz.ts 4, system.ts 4). В visits.ts его НЕТ — включая POST /draft/accept, который ПОДПИСЫВАЕТ карту
приёма в базе. Импорт на строке 8 создаёт видимость гейта: и рецензент, и `rg` по имени охранника
находят его в файле. Комментарий самого теста (visits.test.ts:18, 36-37) утверждает, что охранник
работает «перед проверкой токена». Он не работает никогда.

## ГОТОВО. Коммит e951c9550

Четыре маршрута переведены на requireClinicalMutationContext / requireClinicalReadContext (оба слоя),
ручные verifyToken/TOKEN_SECRET удалены. Замер app.inject ДО -> ПОСЛЕ, секрет задан и не послан:
POST /appointments/:id/visit 404 -> 403 | GET draft/autosave 200 -> 403 |
PUT draft/autosave 400 -> 403 | POST draft/accept 400 -> 403. Без учётных данных было 401, стало 403
(гейт секрета стоит перед определением арендатора — порядок как во всех прочих клинических маршрутах).
Тест: 11/11, exit 0. Мутационная проверка: guard на POST /draft/accept снят -> exit 1, красные ровно те
три утверждения, что покрывают этот маршрут; guard возвращён, дерево чистое.
Соседи не сломаны: apps/api/src/tests/routes/visits.test.ts прогнан лично, 11/11 exit 0.
