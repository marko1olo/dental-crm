## VERDICT: NEEDS_REWORK

Работа настоящая и в основном честная: EXIT_BITE перепроверен мной целиком и воспроизводится 14/14,
продукт не тронут, ни одно требование не удалено, четыре стража перестали врать в диагностике. Но два из
четырёх переписанных стража содержат РОВНО ТЕ ДВА КЛАССА ВЫРОЖДЕННЫХ УТВЕРЖДЕНИЙ, которые исполнитель сам
назвал и объявил устранёнными, и я показал исполнением, что главный лок пакета зелен на возврате того
самого P0, ради которого он назван главным. Возврата не требуется, вреда нет, правка мелкая — но
предписания «закрепи СВЯЗЬ, а не обёртку» и «не оставляй вырожденных утверждений» не выполнены.

---

## 1. Что проверено дословно, с кодом выхода

### 1.1 Коммиты, трейлеры, чужая работа

```
git show --stat fec195234   -> .agents/archon/packets/OO4/commitmsg.txt  + scripts/smoke-speech-queue-source.mjs
git show --stat 6f157084c   -> .agents/archon/packets/OO4/commitmsg2.txt + три стража диктовки
git log -1 --format='%(trailers)' fec195234  -> пусто
git log -1 --format='%(trailers)' 6f157084c  -> пусто
git log -1 --format='%an|%ae' 6f157084c      -> marko1olo|marko1olo@users.noreply.github.com
```

Ровно заявленные пути, 6 файлов, ни одного файла продукта. `[ARCHON]` в теме, атрибуции инструмента нет.
Чужая незакоммиченная работа НЕ подметена: в дереве по-прежнему лежат `apps/web/src/useAppLogic.tsx`,
`workspaceShell.tsx`, `PaymentCapture.tsx`, `ScannerView.tsx`, `SettingsAiTab.tsx`, тесты api и
`packages/shared/dist/*` — ничего из этого в его коммитах нет. `scripts/lib/shot-audit.mjs` остался
untracked и в историю не попадал (`git log --all -- scripts/lib/shot-audit.mjs` пуст) — его слова
подтверждаются.

### 1.2 Истинные коды выхода ПОСЛЕ, без конвейера

```
node scripts/smoke-speech-queue-source.mjs                        > /tmp/rev-OO4-*.log 2>&1; echo $?  -> 0
node scripts/smoke-speech-recorder-resilience-source.mjs          -> 1
node scripts/smoke-speech-final-ready-status-source.mjs           -> 1
node scripts/smoke-visit-dictation-simplified-actions-source.mjs  -> 1
```

Счётчики совпали с его отчётом поштучно: `21 lock / 25 debt`; `3/0/3/34`; `0/0/4/21`; `2/0/1/29`.
Через npm — то же: `npm run -s smoke:speech-queue-source` = 0, остальные три = 1. Обёртки в
`package.json:86,136,138,139` на месте.

### 1.3 Истинные коды выхода ДО — его таблица подтверждена исполнением

Старые версии стражей прогнаны против СЕГОДНЯШНЕГО продукта (теневая копия репозитория, чтобы
незакоммиченная работа других агентов не влияла):

```
git show fec195234^:scripts/smoke-speech-queue-source.mjs > $S/scripts/old-queue.mjs
(cd $S && node scripts/old-queue.mjs); echo $?
  -> 1, единственная строка вывода: "Error: Missing marker: function applyUiPreferences"
git show 6f157084c^:scripts/smoke-speech-recorder-resilience-source.mjs ...   -> 1, вывод 1 строка
git show 6f157084c^:scripts/smoke-speech-final-ready-status-source.mjs ...    -> 1, вывод 1 строка
git show 6f157084c^:scripts/smoke-visit-dictation-simplified-actions-source.mjs -> 1, вывод 1 строка
```

Диагноз BROKEN подтверждён буквально: старый страж очереди печатал «Missing marker: function
applyUiPreferences», а `applyUiPreferences` жива. Утверждение «из 39 требований наружу выходило одно» —
проверено: `wc -l` вывода каждой старой версии = 1. Класс `process.exit(1)` на первом требовании
реален, все `forbidIn` ниже действительно не исполнялись.

### 1.4 Ни одно требование не удалено — проверено сравнением множеств

Извлёк все строковые литералы из старой и новой версии каждого стража и сверил:

```
scripts/smoke-speech-queue-source.mjs:                  старых литералов 78, отсутствуют в новом файле 3
scripts/smoke-speech-recorder-resilience-source.mjs:    dropped 0 (2 «пропавших» = те же строки с диагностическим хвостом)
scripts/smoke-speech-final-ready-status-source.mjs:     dropped 0 (3 «пропавших» = то же)
scripts/smoke-visit-dictation-simplified-actions-source.mjs: dropped 0
```

Три «пропавшие» строки стража очереди — это `if (speechTranscriptionMatchesActiveVisit(result))
flushedRecordingIds.add(...)`, `const hasAudioWaitingForServer = queue.some(...)` и текст сообщения о
безусловной сборке; все три заменены RegExp-эквивалентами, кусаемость которых я проверил (см. 1.5,
MUT-h2 и MUT-h4). Молча снятых требований нет ни в одном из четырёх стражей.

### 1.5 EXIT_BITE перепроверен МОИМ мутатором, не его

Две независимые схемы, обе с обязательной проверкой «мутация применилась» (`applied=true`, `delta≠0`):

**Схема A** — копия стража, читающая склеенный источник из файла, продукт не тронут. Базовая линия
воспроизвела настоящего стража поштучно: `EXIT=0, liveLocks 21, declaredDebt 25`. Это отсекает ту самую
ловушку, в которую он попал на первом заходе (подставленный источник ломался `SyntaxError`, и всё
краснело «само»).

**Схема B** — теневой корень репозитория (`apps/web/src` целиком + `scripts/lib` + `docs`), стражи
запускались БЕЗ единой правки, мутировался только продукт в копии. Базовая линия: `0 / 1 / 1 / 1`,
счётчики совпали.

Его четыре мутации (схема A):

| мутация | код | сообщение |
|---|---|---|
| `=== activeVisitId` → `return true;` | 1 | Speech apply guard missing marker: return result.chunk.visitId === … |
| убран `if (…MatchesActiveVisit(result))` над `flushedRecordingIds.add` | 1 | Pending speech queue must assemble only recordings that match the active visit |
| `params.set("visitId", …id)` → `…patientId` | 1 | Speech recovery request must stay active-visit scoped before fetch |
| `queue.some(` → `queue.every(` | 1 | Pending speech queue must keep every queued audio blob local… |

Мои добавочные мутации в суть (схема A): `\|\|`→`&&` в раннем выходе восстановления — **краснеет**;
удаление `vosk_local` из детекции локального провайдера — **краснеет**. Ни одна из шести не ломает
синтаксис, все меняют поведение.

Живые локи трёх REAL-стражей и храповики (схема B, продукт мутируется, страж как в репозитории):

| мутация в продукте | ожидалось | получено |
|---|---|---|
| вернуть «Фрагмент не отправлен на распознавание: микрофон не слышал голос» | 2 | **2**, `! Local microphone-level checks must not discard speech audio…` |
| вернуть «Запись остановлена, но микрофон почти не слышал голос.» | 2 | **2**, `! Quiet stopped recordings must not be marked as failed…` |
| `await loadSpeechGatewayStatus({silent:true})` внутрь `startServerVoiceRecording` | 2 | **2**, `! Initial voice recorder start path must not wait for gateway status…` |
| вернуть `{showDictationVoiceWaitAction ? (` | 2 | **2**, `! …must not show a redundant disabled waiting button…` |
| вернуть «Ждет голос» | 2 | **2**, `! …must not show the confusing redundant 'wait for voice' action.` |
| храповик: вернуть `serverVoiceRecordingShouldContinueRef` | 2 | **2**, `+ Visit voice recorder must track whether a stop was requested…` |
| храповик: вернуть `speechRecordingHadRecognizedTextRef` | 2 | **2**, `+ Visit speech recording must remember whether…` |
| храповик: вернуть `dictation-queue-card` в VisitView | 2 | **2**, `+ Visit dictation queued-audio card must render in the main dictation area.` |

**EXIT_BITE = 14/14 воспроизведено мной независимо.** Код 2 действительно отделяет новую регрессию от
старого отсутствия, храповик в обе стороны действительно срабатывает. Заявленная задача решена, а не
соседняя подешевле: правились именно четыре указанных стража, класс каждого установлен замером.

### 1.6 Его FOUND проверен по диску

| его пункт | моя проверка | итог |
|---|---|---|
| `useVisitLogic.ts:709-716` fail-open→fail-closed | прочитано; `return false` при пустом `activeVisitId`, сообщение «относится к другому приему» | подтверждено (статически) |
| `VisitView.tsx:780-792` очередь внутри `<details>` «Дополнительно» | `rg -F -n 'advanced-dictation-actions' apps/web/src` → единственное вхождение, строка 780 | подтверждено |
| мёртвый CSS `dictation-queue-card` | `rg -l 'dictation-queue-card' apps/web/src` → только `styles/main.css` | подтверждено |
| `uploadSpeechBlob(blob: Blob)` один аргумент | `useVisitLogic.ts:1300`; `rg -l 'speechActiveGatewayStatusRef' apps/web/src` → пусто | подтверждено |
| слабое `!queueStorageBlock.includes(m) && !source.includes(m)` | `queueStorageBlock ⊂ source`, значит выражение тождественно `!source.includes(m)`; привязки к блоку нет вообще | подтверждено |

Выборка «этого нет нигде» проверена самостоятельно: `Записать голос`, `Добавить голос`,
`serverVoiceRecordButtonClassName`, `showDictationProcessingActions`, `speechAutoFlushRetryTick`,
`serverVoiceRecordingShouldContinueRef`, `configureServerVoiceRecorder`,
`speechRecordingHadRecognizedTextRef`, `Ждет голос` — 0 файлов у каждого. Опровержение подсказки про
`DENTAL_SPEECH_KEY_HEALTH_FILE=off` верно: ни один из четырёх стражей не импортирует ничего из
`apps/api`, это чисто текстовые проверки, к пулу ключей отношения нет.

---

## 2. Почему всё-таки NEEDS_REWORK

### 2.1 Главный лок зелен на возврате того самого P0 — «СВЯЗЬ» не закреплена

Коммит утверждает: «закреплена СВЯЗЬ… а НЕ закрепляется защитная обёртка», и «главный из них —
расшифровка диктовки одного приёма не попадает в карту другого пациента». Замер это опровергает.
Связь описана ДВУМЯ НЕЗАВИСИМЫМИ образцами без обратной ссылки:

```js
// scripts/smoke-speech-queue-source.mjs:352
/const \w+ = [^;]*dashboard\??\.activeVisit\??\.id;/
// scripts/smoke-speech-queue-source.mjs:357
/return result\.chunk\.visitId === \w+;/
```

`\w+` во втором образце — ЛЮБОЙ идентификатор, и он никак не связан с `\w+` из первого. Три мутации в
суть, каждая с `applied=true`, все оставляют стража **ЗЕЛЁНЫМ (EXIT=0, liveLocks 21)**:

```
MUT-a  тавтология через одну промежуточную переменную:
       + const acceptedVisitId = result.chunk.visitId;
         return result.chunk.visitId === acceptedVisitId;   // всегда true для visit-фрагментов
       -> EXIT=0  ЭТО И ЕСТЬ P0: расшифровка чужого приёма попадает в открытую карту

MUT-g  подстановка устаревшего идентификатора ПЕРЕД активным (пропускается через `[^;]*`):
       const activeVisitId = lastAppliedVisitIdRef.current || useAppStore.getState().dashboard?.activeVisit?.id;
       -> EXIT=0  фрагменты маршрутизируются по устаревшему id

MUT-d  сравнение с patientId вместо id (та же подмена, которую он САМ тестирует в params.set):
       const activeVisitPatientId = …dashboard?.activeVisit?.patientId;
       return result.chunk.visitId === activeVisitPatientId;
       -> EXIT=0  каждый фрагмент диктовки отвергается с сообщением «относится к другому приему»
```

MUT-g не гипотетическая: это первое, что напишет тот, кто прочитает его же FOUND №1 («при транзиентно
неопределённом `activeVisit.id` текст ТЕРЯЕТСЯ») и захочет починить потерю текста ссылкой на последний
известный id. Дверь, на которую он сам указывает, страж не запирает. Четвёртая мутация — переворот
`return false` → `return true` при неизвестном id — тоже зелёная, но это он объявил намеренно
(`/return (?:true|false);/`), спорить не буду, только фиксирую последствие: полярность fail-closed не
защищена ничем, а именно она — предмет его FOUND №1.

Починка мелкая: один образец с обратной ссылкой вместо двух независимых, например
`/const (\w+) = (?:useAppStore\.getState\(\)\.)?dashboard\??\.activeVisit\??\.id;[\s\S]{0,400}?return result\.chunk\.visitId === \1;/`,
и `[^;]*` заменить на явный список допустимых источников. Тогда MUT-a, MUT-g и MUT-d краснеют.

### 2.2 Вырожденное сравнение `indexOf > indexOf` починено НАПОЛОВИНУ — два требования исчезают молча

`scripts/smoke-speech-final-ready-status-source.mjs:232-244`: проверка на `-1` добавлена только ПРАВОМУ
операнду (`genericRetryIndex`), левый не проверен вообще:

```js
if (finalizeBlock.indexOf("speechRecordingHadRecognizedTextRef.current") > genericRetryIndex) { … }
if (finalizeBlock.indexOf("queuedCurrentRecordingCount > 0") > genericRetryIndex) { … }
```

Проверено мутацией (схема B, теневой продукт): в `finalizeSpeechRecording` добавлена ТОЛЬКО строка
`setSpeechStatusNote("Распознавание завершено, но текст не появился")`, больше ничего.

```
node scripts/smoke-speech-final-ready-status-source.mjs; echo $?  -> 1
ИТОГ: живых локов держит 0, сломано 0, неоценимо 2 (было 4), объявленного отсутствия 21
```

Два требования — `Final speech status must check recognized text before showing the retry message` и
`Final speech status must check queued audio before showing the retry message` — ИСЧЕЗЛИ ИЗ ДОКЛАДА
ПОЛНОСТЬЮ: не в «держит», не в «сломано», не в «неоценимо», не в «отсутствии». Код выхода не изменился.
Это ровно то, что пакет запрещал: «Снятое молча требование — стёртая функция», только сработает оно не
сегодня, а на первом же шаге к закрытию долга. Триггер не экзотический: вернуть текст сообщения о
повторе — очевидный первый шаг. Храповик не спасает: строка-анкер `Распознавание завершено, но текст не
появился` не входит ни в одно требование и ни в один реестр, поэтому `closedDebt` не срабатывает.

Тот же силуэт латентно лежит в `smoke-speech-recorder-resilience-source.mjs:351`
(`recorderStopBlock.indexOf("if (shouldRestart)") > recorderStopBlock.indexOf("void finalizeSpeechRecording")`,
оба операнда без защиты от `-1`); там его маскирует храповик по `configureServerVoiceRecorder`, поэтому
последствие мягче, но код тот же.

### 2.3 Восемь записей долга НЕВОЗМОЖНО закрыть: маркеры с пробельным отступом против табов

Исполнитель нашёл этот класс («запрет искал отступ из восьми пробелов в файле, отбитом табами»), починил
ОДИН экземпляр в страже очереди — и оставил восемь того же класса в стражах, которые переписывал в тот же
час:

```
smoke-speech-recorder-resilience-source.mjs:217,222,227   маркеры с "\n      " (6 пробелов)
smoke-speech-final-ready-status-source.mjs:105,110,120,125,130   маркеры с "\n      "/"\n        "
```

Замер:

```
rg -c '^\t' apps/web/src/useAppLogic.tsx                     -> 14260 строк с табом
rg -c '^  [^ *]' apps/web/src/useAppLogic.tsx                -> 0 строк с пробельным отступом
git show 7b465576d:apps/web/src/useAppLogic.tsx  (слой ещё жив, 2026-06-29)
  -> все 8 маркеров MATCH; historical line: "    serverVoiceRecordingStartingRef.current = true;"
```

То есть маркеры были правдой, пока файл был отбит пробелами; сегодня файл отбит табами, и вернуть
поведение так, чтобы эти восемь требований прошли, НЕВОЗМОЖНО. Долг объявлен нефальсифицируемым:
храповик по этим записям не сработает никогда, а страж останется красным даже после честного
восстановления слоя. Комментарий на строках 119-127 того же файла обещает обратное («вырожденное
утверждение попадает в `unevaluable`, а НЕ в „держит“») — обещание не распространено на `requireIn`.
Пять аналогичных маркеров в страже диктовки претензии НЕ вызывают: их цель — `VisitView.tsx`, а он
отбит пробелами (`rg -c '^  [^ *]'` = 177, табов 0), там они совпадут.

### 2.4 Одна запись классифицирована REAL, а она STALE — и реестр из-за этого врёт

Запись `Visit dictation processing controls are missing from the actions block. [показ по условию: -1,
«Собрать ЭМК»: -1, «Упорядочить текст»: -1]` попала в раздел, заголовок которого дословно утверждает
«поведения нет ни в одном из 469 файлов apps/web/src». Поведение есть, переименованы подписи:

```
«Собрать ЭМК»        -> apps/web/src/VisitView.tsx:756  onClick={buildDraft}, подпись «Собрать нейро-черновик»
                        реализация: apps/web/src/hooks/domains/useVisitLogic.ts:1041 async function buildDraft()
«Упорядочить текст»  -> apps/web/src/VisitView.tsx:796  onClick={polishTranscript}, подпись «Очистить текст»
                        реализация: apps/web/src/hooks/domains/useVisitLogic.ts:973  async function polishTranscript()
```

REAL здесь только третья часть — `showDictationProcessingActions` (условного показа действительно нет,
кнопки теперь гасятся через `disabled`). По таксономии пакета переехавший/переименованный текст — STALE,
и лечится он маркером, а не записью в реестр отсутствия. В нынешнем виде реестр долга сообщает «сборки
ЭМК нет», хотя она есть и работает; это ровно то вранье реестра, против которого написан храповик.

### 2.5 Мелочь: `?? 0` вместо «неизвестно»

`scripts/smoke-speech-queue-source.mjs:550` — `(requireOutcomes.get(message)?.fail ?? 0) === 0` считает
НИ РАЗУ НЕ ИСПОЛНЕННОЕ требование «закрытым долгом». Живого вреда нет только потому, что проверка
`untestedDebt` (554-561) стоит раньше и падает с правильным сообщением. Оставлять подстановку нуля под
защитой порядка строк — хрупко; правильнее `has()`.

---

## FOUND

**F1. `apps/web/src/VisitView.tsx:771` — подсказка кнопки, СТИРАЮЩЕЙ диктовку, дословно равна подписи
кнопки, которая её НЕ стирает.** Новый дефект, никем не заявленный.

```
771:  title="Очистить текст"      <- кнопка onClick={clearTranscriptWithUndo} (СТИРАЕТ весь текст)
773:  Очистить                       её видимая подпись
805:  {isTranscriptPolishing ? "Чищу" : "Очистить текст"}   <- кнопка onClick={polishTranscript} (форматирует)
```

Установлено: `rg -n 'Очистить' apps/web/src/VisitView.tsx` даёт ровно эти три строки. Обе кнопки лежат в
одном блоке `dictation-actions`, разница 32 строки; безобидная (polish) спрятана внутри `<details>`
«Дополнительно», разрушительная стоит в основном ряду. Сценарий отказа: врачу сказано «нажми „Очистить
текст“»; он наводит курсор на «Очистить» в основном ряду, тултип показывает «Очистить текст» — точное
совпадение — он жмёт и теряет надиктованный текст приёма. Возврат возможен только пока жив
`clearedTranscriptSnapshot` (кнопка «Вернуть», строка 779), то есть до перезагрузки/смены приёма.
Требования стража ровно на этот случай — `Visit dictation server voice button must use a dedicated
readable label` и родственные — сейчас лежат в реестре объявленного отсутствия, то есть эту зону никто
не сторожит.

**F2. Страж `smoke-speech-final-ready-status-source.mjs` держит НОЛЬ живых локов.**
`ИТОГ: живых локов держит 0, сломано 0, неоценимо 4, объявленного отсутствия 21`. Все его 21 требование
в реестре отсутствия, все 4 структурные проверки неоценимы. Единственная работающая функция файла —
храповик (проверено: возврат `speechRecordingHadRecognizedTextRef` даёт код 2). Это не обман — он это
докладывает открыто — но пока долг не закрыт, красный код этого стража ничего о продукте не сообщает, а
двум его требованиям достаточно одной строки в продукте, чтобы исчезнуть вовсе (см. 2.2). В таком виде
он ближе к записке, чем к стражу.

**F3. Класс для остальных красных `-source`-стражей, подтверждаю и уточняю его наблюдение.** Его гипотеза
про два вида вырожденных утверждений верна, но список неполон — надо искать ТРИ шаблона, а не два:
`\\n {2,}` в литеральных маркерах (пробельный отступ против табов — восемь штук уцелели в его же пакете),
`indexOf(a) > indexOf(b)` с защитой от `-1` только у одного операнда (не у обоих — именно так уцелел
дефект 2.2), и `!scopeBlock.includes(m) && !source.includes(m)` (оговорка `|| source` обнуляет привязку к
блоку — он нашёл её у себя на строке 481 и честно оставил как есть). Команды поиска по остальным
стражам:
`rg -n '\\n {2,}' scripts/smoke-*-source.mjs`, `rg -n 'indexOf\(.*\) [<>] .*indexOf\(' scripts/smoke-*.mjs`,
`rg -n 'includes\(marker\) && !source\.includes' scripts/smoke-*.mjs`.

**F4. Реестр долга стража диктовки закрепляет «Собрать ЭМК» и «Упорядочить текст» как несуществующие,
хотя это переименование (см. 2.4).** Побочный продукт: если владелец экрана вернёт подписи в угоду
стражу, в русском интерфейсе появятся ДВЕ кнопки с почти одинаковым смыслом — «Собрать нейро-черновик» и
«Собрать ЭМК», — потому что требование описывает старую редакцию, а не поведение. Маркер надо привязать к
`onClick={buildDraft}` / `onClick={polishTranscript}`, а не к подписи.

---

## Что осталось непроверенным

- FOUND №1 исполнителя (потеря текста при транзиентно пустом `dashboard.activeVisit.id`) подтверждён
  только чтением кода: окно между `void loadSpeechRecordingRecovery({silent:true})` и чтением
  `useAppStore.getState()` выглядит реальным, но браузером я это не воспроизводил. Статический разбор,
  не рантайм-доказательство.
- Общие гейты (полный typecheck, build, весь `npm test`) не запускались по условию пакета. Предметные
  четыре `smoke:*` запущены и в `node`, и через `npm run`.
- Пакет мёртвый код не включал, экран не менял — проверка «не льёт ли сырые значения на экран»
  неприменима; F1 найден чтением продукта, а не следствием правки.

## Что нужно доделать (маленькое, реверт не нужен)

1. Один образец с обратной ссылкой вместо двух независимых в `smoke-speech-queue-source.mjs:352,357`;
   `[^;]*` заменить явным перечислением источников. Проверка приёмки: MUT-a, MUT-g, MUT-d краснеют.
2. Защита от `-1` левому операнду в `smoke-speech-final-ready-status-source.mjs:233,240` и в
   `smoke-speech-recorder-resilience-source.mjs:351`. Приёмка: добавление одной строки
   `Распознавание завершено, но текст не появился` не уменьшает суммы `держит+сломано+неоценимо+отсутствие`.
3. Восемь маркеров с пробельным отступом сделать нечувствительными к отступу (RegExp с `\s+`), иначе долг
   нефальсифицируем. Приёмка: восстановление слоя в табах закрывает долг и роняет храповик.
4. Запись про «Собрать ЭМК»/«Упорядочить текст» перевести из REAL в STALE, привязав к
   `onClick={buildDraft}` / `onClick={polishTranscript}`.
5. `?? 0` на строке 550 заменить проверкой `has()`.

Ничего долгоживущего не запускал. Теневая копия и мутаторы лежали в
`%TEMP%\oo4rev` (вне репозитория), продукт и рабочее дерево не менялись: `git status` по
`apps/web`/`apps/api` до и после ревью совпадает, мои единственные изменения — этот файл.
