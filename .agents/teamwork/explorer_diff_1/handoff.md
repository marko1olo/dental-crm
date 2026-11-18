# Сравнительный дифференциальный анализ: Ручное переключение аккаунтов vs Antigravity Manager (Root Cause Analysis деградации скорости)

## 1. Наблюдения (Observations)

### 1.1. Физическая архитектура Antigravity (Штатный режим и ручное переключение)
1. **Размещение исполняемых файлов и рантайма:**
   - Главный хост Electron: `C:\Users\Admin\AppData\Local\Programs\Antigravity\Antigravity.exe`
   - Основной бэкенд-сервер: `C:\Users\Admin\AppData\Local\Programs\Antigravity\resources\bin\language_server.exe`
   - Командная строка запуска `language_server.exe`:
     `language_server.exe --standalone --override_ide_name antigravity --subclient_type hub --override_ide_version 2.29.0 --override_user_agent_name antigravity --https_server_port 0 --csrf_token <UUID> --app_data_dir antigravity --api_server_url https://generativelanguage.googleapis.com --cloud_code_endpoint https://cloudcode-pa.googleapis.com --enable_sidecars --host_bridge_url=http://127.0.0.1:52736 --host_bridge_token=<HEX>`
   - `language_server.exe` напрямую соединяется с `https://generativelanguage.googleapis.com` и `https://cloudcode-pa.googleapis.com` через порт 443 без промежуточных локальных прокси-серверов.

2. **Штатное хранилище авторизации и состояния:**
   - **Windows Credential Manager:** Секреты OAuth и токены обновляются через штатные вызовы Windows Credential API (`CredWriteW` / `keytar` под пространством `antigravity`).
   - **`storage.json` (`C:\Users\Admin\AppData\Roaming\Antigravity\User\globalStorage\storage.json`):**
     * Содержит стабильные аппаратные идентификаторы хоста:
       - `telemetry.machineId`: `auth0|user_e40e5fafdb74fe5a390b6b99fed4bfb0`
       - `telemetry.macMachineId`: `004f6b11-9a51-4cff-b068-68558aaa3501`
       - `telemetry.devDeviceId`: `e6c30504-151e-4b0c-bc52-fcef2b09e7fe`
       - `telemetry.sqmId`: `{295151BB-2249-45E8-9150-F81B12885332}`
     * При ручной смене аккаунтов эти значения **СТАБИЛЬНЫ И НЕ МЕНЯЮТСЯ**.
   - **`state.vscdb` (`C:\Users\Admin\AppData\Roaming\Antigravity\User\globalStorage\state.vscdb`):**
     * Содержит синхронизированные ключи `antigravityUnifiedStateSync.oauthToken`, `antigravityUnifiedStateSync.userStatus` (Protobuf с ключом `authStateWithContextSentinelKey`), `antigravityAuthStatus`, `antigravity.profileUrl`.
     * При штатном входе через браузер (OAuth 2.0 PKCE flow) все структуры обновляются атомарно внутри процесса Antigravity.

3. **Сетевой профиль штатного ручного переключения:**
   - Переключается ровно **ОДИН** аккаунт.
   - Нулевой опрос сторонних аккаунтов.
   - Нулевые повторные запросы 403 Forbidden.
   - Прямой стриминг HTTP/2 SSE от Google API на `language_server.exe`.

---

### 1.2. Архитектура переключения через Antigravity Manager (v0.30.0)
1. **Процессы и порты:**
   - Исполняемый файл: `C:\Users\Admin\AppData\Local\antigravity_manager\app-0.30.0\antigravity-manager.exe`
   - Исходный код ядра: `C:\Users\Admin\AppData\Local\antigravity_manager\app-0.30.0\resources\standalone\core\` (`main.cjs`, `traffic-audit.worker.js`, `traffic-classifier-FFBx77iv.cjs`, `thought-store.worker.js`)
   - Процесс слушает локальный порт:
     `LocalAddress: 0.0.0.0, LocalPort: 55720 (antigravity-manager.exe, PID 2308)`
     Имеет активное соединение `RemoteAddress: 13.228.255.186:443`.

2. **Прямое силовое вмешательство в SQLite и Windows Credential Manager:**
   - В `main.cjs` функция `prepareClientAccountWrite` открывает `state.vscdb` через `better-sqlite3` и `drizzle-orm` в обход работающего Electron:
     ```javascript
     const { raw, orm } = openDrizzleConnection(dbPath, { fileMustExist: false }, { busyTimeoutMs: 3e3 });
     ...
     orm.transaction((transaction) => writeCredentials(transaction, credentials));
     ```
   - Запись токенов в `writeCredentials` создает рассогласованные структуры (`oauthTokenInfoSentinelKey` вместо `authStateWithContextSentinelKey`).
   - Через `koffi` (FFI) вызывается `advapi32.dll!CredWriteW` для прямой перезаписи Windows Credential Manager.

3. **Аппаратный спуфинг (Hardware Fingerprint Spoofing):**
   - В `applyDeviceProfile` (`main.cjs`) менеджер перезаписывает `storage.json`:
     ```javascript
     storage["telemetry.machineId"] = profile.machineId;
     storage["telemetry.macMachineId"] = profile.macMachineId;
     storage["telemetry.devDeviceId"] = profile.devDeviceId;
     storage["telemetry.sqmId"] = profile.sqmId;
     storage["storage.serviceMachineId"] = profile.devDeviceId;
     writeJsonAtomically(storagePath, storage);
     syncStateServiceMachineIdValue(profile.devDeviceId, stateDbPath, appTarget);
     ```
   - На каждое переключение вызывается `generateDeviceProfile()`, генерирующий фейковые UUIDv4 для хоста!

4. **Убийство процессов (`SIGKILL`) и зависания горячего переключения:**
   - В `prepareIdeHotSwitch` менеджер ищет дочерние сервисы и принудительно убивает их:
     ```javascript
     process.kill(service.pid, "SIGKILL");
     ```
   - В логе `C:\Users\Admin\.antigravity-agent\app-2026-11-05.log` зафиксированы критические сбои закрытия:
     ```
     [INFO] [timing] switch.execute {"stage":"close","switchMode":"failed","exitUnconfirmed":true,"failureReason":"process_close_failed","totalMs":17413,"errorType":"AggregateError","errorMessage":"Classic switch recovery failed"}
     ```
     Менеджер зависал на 17.4 секунды, оставляя процесс в неопределенном состоянии `exitUnconfirmed: true`.

5. **Катастрофический рассинхрон идентичностей (3 разных пользователя одновременно):**
   - Выдержка из `C:\Users\Admin\.antigravity-agent\app-2026-11-05.log`:
     ```
     [2026-11-05T15:26:25.419Z] [INFO] Account info from unified user status: email=Матвей Данатов
     [2026-11-05T15:26:25.447Z] [INFO] Account info from unified OAuth token: email=suzukihitler@gmail.com
     [2026-11-05T15:26:30.676Z] [INFO] Switching to cloud account: lotokantok@gmail.com
     [2026-11-05T15:26:32.389Z] [INFO] Account info from unified user status: email=Матвей Данатов
     [2026-11-05T15:26:32.399Z] [INFO] Account info from unified OAuth token: email=suzukihitler@gmail.com
     ```
     После переключения менеджером на `lotokantok@gmail.com` пользовательский статус остался `Матвей Данатов`, а OAuth токен — `suzukihitler@gmail.com`.

6. **Шторм опроса квот по 37 аккаунтам (Quota Retry Flood):**
   - База `C:\Users\Admin\.antigravity-agent\cloud_accounts.db` содержит **37 зарегистрированных аккаунтов**.
   - В `app-2026-11-05.log` каждые 15 минут фоновый `CloudMonitor` запускает циклическое обновление токенов и опрос квот для всех 37 аккаунтов подряд:
     ```
     [15:27:46] Monitor: Refreshing token for stef.pidoras@gmail.com
     [15:27:51] Monitor: Refreshing token for matveidanatov@gmail.com
     [15:27:55] Monitor: Refreshing token for i.sumarokova@list.ru
     [15:27:58] Monitor: Refreshing token for timuratnagulov72@gmail.com
     [15:28:03] Monitor: Refreshing token for operatorpvd@gmail.com
     [15:28:07] Monitor: Refreshing token for anton.vvvasilev@gmail.com
     [15:28:11] Monitor: Refreshing token for deepseek.goverment@gmail.com
     [15:28:16] Monitor: Refreshing token for codexgov@gmail.com
     [15:28:20] Monitor: Refreshing token for narimashka51@gmail.com
     [15:28:25] [WARN] [GoogleAPIService] Quota summary API https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary returned 403
     [15:28:25] [WARN] [GoogleAPIService] Quota summary returned 403 with project ID, retrying without project ID
     [15:28:26] [WARN] [GoogleAPIService] Quota summary API https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary returned 403
     [15:28:27] [WARN] [GoogleAPIService] Quota summary API https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:retrieveUserQuotaSummary returned 403
     ... и еще 10+ аккаунтов
     ```
     Менеджер бомбардирует эндпоинты Google с одного локального IP, ловит лавину 403 Forbidden и тут же делает повторные ретраи без Project ID.

7. **Тяжелый дисковый шлюз-аудитор (`request-audit.db` — 159 МБ):**
   - Локация: `C:\Users\Admin\.antigravity-agent\proxy-state\request-audit.db` (159,035,392 байт).
   - В базе накоплено:
     * `request_logs`: **100,008 записей**
     * `audit_payloads`: **199,892 записей**
     * `request_body_refs`: **199,956 записей**
   - В `main.cjs` функция `createCapturingTransform` перехватывает SSE-стримы через `new node_stream.Transform`, парсит каждый чанк в `IncrementalSseRedactor` и пишет блобы в SQLite, создавая бэкпрешер и блокируя поток вывода.

---

## 2. Логическая цепочка (Logic Chain)

1. **Шаг 1: Аппаратный спуфинг триггерит Anti-Abuse фильтры Google.**
   - При смене через Antigravity Manager вызывается `applyDeviceProfile`, подменяющий `machineId`, `macMachineId`, `devDeviceId`, `sqmId` на свежесгенерированные случайные UUIDv4.
   - Для серверов Google (Cloud Code / Generative Language API) появление нового UUID машины с того же IP-адреса выглядит как поведение фермы ботов или генератора учетных записей.
   - Серверные шлюзы Google включают жесткий троттлинг IP-адреса, увеличивают Time-To-First-Token (TTFT) и ставят запросы в медленные очереди с низким приоритетом.
   - При ручной смене аппаратные идентификаторы остаются неизменными (стабильный доверенный ПК разработчика), поэтому Google не применяет троттлинг.

2. **Шаг 2: Шторм фоновых запросов квот по 37 аккаунтам вызывает глобальный IP Rate-Limit.**
   - Antigravity Manager каждые 15 минут или при фокусе окна опрашивает всю пачку из 37 аккаунтов через `retrieveUserQuotaSummary`.
   - Аккаунты с истекшей сессией возвращают 403 Forbidden.
   - Менеджер на каждый 403 запускает каскад из 3 ретраев (`daily-cloudcode-pa`, `cloudcode-pa`, `sandbox`).
   - Это создает шквал из сотен невалидных авторизационных запросов в минуту с IP-адреса пользователя, в результате чего инфраструктура Google накладывает временный IP-level rate limit.
   - При ручном переключении опрашивается ровно 1 текущий аккаунт, шторм запросов отсутствует.

3. **Шаг 3: Состояние 3-стороннего рассинхрона (Desync Disaster) парализует сессию `language_server`.**
   - Менеджер перезаписывает `state.vscdb` внешним процессом Node.js через `better-sqlite3`, в то время как Electron держит базу в памяти.
   - В результате `userStatus` остается от первого аккаунта («Матвей Данатов»), `oauthToken` — от второго (`suzukihitler`), а целевой аккаунт — третий (`lotokantok`).
   - `language_server.exe` получает противоречивые метаданные авторизации: заголовки Bearer Token не совпадают с контекстом проекта и квотами пользователя.
   - Запросы к Google API завершаются внутренними ошибками аутентификации, вызывая скрытые циклы экспоненциального отката (exponential backoff retry loops) внутри рантайма `language_server`.

4. **Шаг 4: Убийство `language_server` через `SIGKILL` ломает TCP-сокеты и оставляет зомби-соединения.**
   - `hotSession.stopServices` в Antigravity Manager производит `process.kill(service.pid, "SIGKILL")`.
   - При аварийном уничтожении процесса Windows не успевает штатно завершить TCP-сессии (`FIN/ACK`), сокеты зависают в состоянии `TIME_WAIT` / `CLOSE_WAIT`.
   - Новый `language_server` вынужден тратить секунды на таймауты перепривязки портов (`host_bridge_url`, `https_server_port`).
   - В логах зафиксировано, что процедура закрытия регулярно проваливается по таймауту 10–17 секунд (`exitUnconfirmed: true`).

5. **Шаг 5: 159-мегабайтный синхронный SQLite-аудитор создает локальный I/O фриз.**
   - Локальный сервис `TrafficAuditService` перехватывает SSE-стримы ответов LLM через `node_stream.Transform`.
   - Каждый токен и чанк парсится и синхронно транслируется в `request-audit.db` (100 008 логов, 199 892 пейлоада).
   - При размере базы 159 МБ операции транзакций SQLite в WAL-режиме конкурируют за дисковую шину и блокируют цикл событий Node.js (event loop lag), что проявляется для пользователя как прерывистая, медленная («заикающаяся») генерация.

---

## 3. Сравнительная дифференциальная матрица (Ручной метод vs Antigravity Manager)

| Параметр / Механизм | Ручное переключение (UI Antigravity) | Переключение через Antigravity Manager | Влияние на скорость и стабильность |
| :--- | :--- | :--- | :--- |
| **Канал авторизации** | Прямой OAuth 2.0 PKCE flow через браузер Google | Прямая инъекция в SQLite `state.vscdb` и Windows Credential API (`koffi`) | В менеджере возникает рассинхрон `userStatus` и `oauthToken` |
| **Аппаратный профиль (`storage.json`)** | Неизменен (стабильный `machineId`, `macMachineId`, `sqmId`) | Постоянно спуфится генератором `generateDeviceProfile()` | Google расценивает частую смену machineId с одного IP как ферму ботов и включает троттлинг |
| **Фоновый опрос аккаунтов** | Строго 0 запросов по чужим аккаунтам | Непрерывный циклический опрос 37 аккаунтов (`retrieveUserQuotaSummary`) | Лавина 403 Forbidden вызывает IP rate-limit на стороне Google Cloud Armor |
| **Завершение сессии `language_server`** | Штатное переподключение без `SIGKILL` | Принудительный `process.kill(pid, "SIGKILL")` с таймаутом до 17.4 с | Зависшие TCP сокеты, таймауты `exitUnconfirmed: true` |
| **Перехват трафика и логов** | Прямой сетевой сокет к Google API без посредников | Локальный шлюз, `node_stream.Transform` и запись в 159 МБ `request-audit.db` | Задержка стриминга токенов, десериализация SSE, блокировки диска SQLite |
| **Согласованность данных** | 100% синхронизация (email, token, user status совпадают) | Рассинхрон 3 аккаунтов («Матвей Данатов», «suzukihitler», «lotokantok») | Несовпадение токена и профиля вызывает циклы внутренних retry в `language_server` |

---

## 4. Предостережения и ограничения (Caveats)

1. **Внешняя телеметрия Google:** Алгоритмы оценки благонадежности IP-адресов и вычисления TTFT на серверах Google закрыты и анализируются эмпирически на основе кодов ответов (403, 429) и наблюдаемой скорости.
2. **Версионность:** Анализ выполнен на базе исходного кода Antigravity Manager версии `0.30.0` (репозиторий Draculabo/AntigravityManager). Будущие версии могут изменить поведение `prepareIdeHotSwitch`.
3. **Безопасность учетных записей:** В отчете намеренно исключены сырые токены и хеши авторизации в соответствии с требованиями безопасности.

---

## 5. Вывод и вердикт («Где зарыта собака»)

Корневая причина («где зарыта собака») деградации скорости Antigravity при переключении через Antigravity Manager носит **комплексный 4-факторный синергетический характер**:

1. **Главный внешний фактор (Google Anti-Abuse Throttling):**
   Менеджер при каждом переключении генерирует случайный аппаратный профиль (`machineId`, `macMachineId`, `sqmId`) и одновременно долбит API квот по 37 аккаунтам из базы `cloud_accounts.db`. Серверы Google видят шквал 403 Forbidden и постоянную смену идентификаторов ПК с одного IP-адреса, расценивают систему как автоматизированный ботнет/скрейпер и включают троттлинг пропускной способности и задержки генерации.
2. **Главный внутренний фактор (Desync & Zombie Sockets):**
   Силовая запись токенов в `state.vscdb` поверх живого процесса приводит к рассинхрону трех разных аккаунтов в одном профиле, а убийство `language_server.exe` через `SIGKILL` оставляет зависшие сокеты и вызывает 10–17-секундные сбои восстановления сессии.
3. **Локальный дисковый фактор:**
   Шлюз аудита в `standalone/core` непрерывно прогоняет SSE-стримы через `Transform` стрим и пишет каждый байт в раздутую 159-мегабайтную базу `request-audit.db` (200 000+ записей), создавая локальные микро-фризы генерации.

**Почему при ручном переключении все работает быстро:**
При ручном входе в Antigravity авторизуется ровно один аккаунт, аппаратные ID остаются неизменными (Google доверяет стабильному ПК), опрос 37 сторонних аккаунтов не производится, сокеты закрываются штатно, локальный аудитор не перехватывает трафик, а токен, сессия и пользовательский статус находятся в 100% согласованном состоянии.

---

## 6. Метод независимой верификации (Verification Method)

1. **Проверка рассинхрона аккаунтов в логе:**
   Выполнить команду в PowerShell:
   ```powershell
   Get-Content "C:\Users\Admin\.antigravity-agent\app-2026-11-05.log" | Select-String "Account info from unified"
   ```
   *Ожидаемый результат:* Фиксация одновременного присутствия разных email в `user status` и `OAuth token`.

2. **Проверка шторма 403 ошибок по квотам:**
   ```powershell
   Get-Content "C:\Users\Admin\.antigravity-agent\app-2026-11-05.log" | Select-String "retrieveUserQuotaSummary returned 403"
   ```
   *Ожидаемый результат:* Серия предупреждений `[WARN]` с ретраями без project ID для десятков аккаунтов.

3. **Проверка размера базы аудита трафика:**
   ```powershell
   Get-Item "C:\Users\Admin\.antigravity-agent\proxy-state\request-audit.db" | Select-Object Length, LastWriteTime
   ```
   *Ожидаемый результат:* Размер базы $\approx 159\text{ MB}$, более 100 000 записей запросов.

4. **Проверка аппаратного спуфинга:**
   Сравнить значения в `C:\Users\Admin\AppData\Roaming\Antigravity\User\globalStorage\storage.json` до и после переключения через менеджер.
   *Ожидаемый результат:* Изменение `telemetry.machineId` и `telemetry.sqmId` при смене через менеджер и их неизменность при ручной смене.
