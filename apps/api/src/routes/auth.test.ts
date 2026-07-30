import { test, describe, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import * as auth from "./auth.js";
import { db } from "../db/client.js";
import { hashCredential, signToken } from "../utils/cryptoHelper.js";

describe("auth routes", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    process.env.AUTH_TOKEN_SECRET = "test-secret";
    app = Fastify();
    await app.register(auth.registerAuthRoutes);
  });

  afterEach(async () => {
    await app.close();
    mock.restoreAll();
  });

  describe("clinic login", () => {
    test("returns 400 for missing credentials", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/clinic/login",
        payload: {}
      });
      assert.strictEqual(response.statusCode, 400);
    });

    test("returns 500 when database throws an error", async () => {
      mock.method(db, 'select', () => ({
        from: () => ({
          where: () => ({
            limit: async () => { throw new Error("DB Error"); }
          })
        })
      }));

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/clinic/login",
        payload: { email: "test@example.com", password: "password123" }
      });
      assert.strictEqual(response.statusCode, 500);
    });

    test("returns 401 when organization not found", async () => {
      mock.method(db, 'select', () => ({
        from: () => ({
          where: () => ({
            limit: async () => []
          })
        })
      }));

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/clinic/login",
        payload: { email: "missing@example.com", password: "password123" }
      });
      assert.strictEqual(response.statusCode, 401);
    });

    test("returns 200 and token on success", async () => {
      mock.method(db, 'select', () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 'org1', name: 'Test Org', passwordHash: await hashCredential('password123') }]
          })
        })
      }));

      mock.method(db, 'insert', () => ({
        values: async () => {} // mock audit event insertion
      }));

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/clinic/login",
        payload: { email: "test@example.com", password: "password123" }
      });
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.json().ok, true);
    });
  });

  describe("staff unlock", () => {
    test("returns 401 if clinic token is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/staff/unlock",
        payload: { userId: "user1", pinCode: "1234" }
      });
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.json().error, "ClinicAuthRequired");
    });

    test("несуществующий сотрудник неотличим от неверного PIN", async () => {
      // Раньше здесь ожидался 404 UserNotFound. Такой ответ делал endpoint
      // оракулом: по коду можно было перебрать, какие сотрудники есть в
      // организации. Теперь оба случая отвечают одинаково — это и проверяем.
      const clinicToken = signToken({ organizationId: 'org1' }, "test-secret", 60*60);

      mock.method(db, 'select', () => ({
        from: () => ({
          where: () => ({
            limit: async () => []
          })
        })
      }));
      const missingUser = await app.inject({
        method: "POST",
        url: "/api/auth/staff/unlock",
        headers: { "x-dente-clinic-token": clinicToken },
        payload: { userId: "user1", pinCode: "1234" }
      });

      mock.restoreAll();
      mock.method(db, 'select', () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 'user1', organizationId: 'org1', pinCodeHash: await hashCredential('1234'), role: 'doctor' }]
          })
        })
      }));
      const wrongPin = await app.inject({
        method: "POST",
        url: "/api/auth/staff/unlock",
        headers: { "x-dente-clinic-token": clinicToken },
        payload: { userId: "user1", pinCode: "9999" }
      });

      assert.strictEqual(missingUser.statusCode, 401);
      assert.strictEqual(missingUser.json().error, "AuthError");
      // Ответы обязаны совпадать полностью, иначе разница выдаёт существование
      // сотрудника.
      assert.strictEqual(wrongPin.statusCode, missingUser.statusCode);
      assert.deepStrictEqual(wrongPin.json(), missingUser.json());
    });

    test("returns 200 on successful unlock", async () => {
      mock.method(db, 'select', () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 'user1', organizationId: 'org1', pinCodeHash: await hashCredential('1234'), role: 'doctor' }]
          })
        })
      }));

      mock.method(db, 'insert', () => ({
        values: async () => {}
      }));

      const clinicToken = signToken({ organizationId: 'org1' }, "test-secret", 60*60);

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/staff/unlock",
        headers: { "x-dente-clinic-token": clinicToken },
        payload: { userId: "user1", pinCode: "1234" }
      });
      assert.strictEqual(response.statusCode, 200);
      assert.ok(response.json().staffToken);
    });
  });

  describe("direct user login (/api/auth/login)", () => {
    test("returns 400 for missing credentials", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {}
      });
      assert.strictEqual(response.statusCode, 400);
    });

    test("returns 401 for invalid credentials", async () => {
      mock.method(db, 'select', () => ({
        from: () => ({
          where: () => ({
            limit: async () => []
          })
        })
      }));

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: "wrong@example.com", password: "pwd" }
      });
      assert.strictEqual(response.statusCode, 401);
    });

    test("returns 200 on successful direct login", async () => {
      let callCount = 0;
      mock.method(db, 'select', () => ({
        from: () => ({
          where: () => ({
            limit: async () => {
              if (callCount === 0) {
                callCount++;
                return [{ id: 'user1', organizationId: 'org1', passwordHash: await hashCredential('password123'), role: 'doctor', fullName: 'John Doe', email: 'test@test.com' }];
              }
              return [{ name: 'Clinic Name' }];
            }
          })
        })
      }));

      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: "test@test.com", password: "password123" }
      });
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.json().ok, true);
      assert.ok(response.json().clinicToken);
      assert.ok(response.json().staffToken);
    });
  });

  describe("user profile (/api/auth/user/me)", () => {
    test("returns 401 if staff token missing", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/user/me"
      });
      assert.strictEqual(response.statusCode, 401);
    });

    test("нет демо-профиля в обход базы: неизвестный сотрудник -> 404", async () => {
      // Раньше тест ожидал, что для userId "user1" вернётся готовый демо-профиль
      // без обращения к базе. Такой ветки в маршруте нет — он всегда идёт в базу
      // (демо-бэкдоры выключены). Без подмены запрос уходил в живую базу, где
      // "user1" не UUID, и падал с 500; ожидание .id тоже устарело — маршрут
      // отдаёт { ok, user }.
      mock.method(db, 'select', () => ({
        from: () => ({
          where: () => ({
            limit: async () => []
          })
        })
      }));

      const staffToken = signToken({ userId: 'user1' }, "test-secret", 60*60);
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/user/me",
        headers: { "x-dente-staff-token": staffToken }
      });
      assert.strictEqual(response.statusCode, 404);
      assert.strictEqual(response.json().error, "NotFound");
    });

    test("returns 200 with user profile", async () => {
      mock.method(db, 'select', () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 'user2', fullName: 'Jane', role: 'admin' }]
          })
        })
      }));

      const staffToken = signToken({ userId: 'user2' }, "test-secret", 60*60);
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/user/me",
        headers: { "x-dente-staff-token": staffToken }
      });
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.json().ok, true);
      assert.strictEqual(response.json().user.id, "user2");
    });
  });

  // ─── Права проверяются раньше тела запроса ──────────────────────────────────
  // БЫЛО: POST /api/auth/clinic/set-password проверял длину нового пароля, а
  // POST /api/auth/staff/set-pin — наличие поля userId и форму PIN, ДО проверки
  // прав. Аноним без единого токена отправлял разные тела и по разным ответам
  // читал политику паролей клиники, политику PIN и обязательные поля закрытого
  // маршрута. Здесь проверяется и новый порядок, и неизменность контракта
  // ошибок для того, кто право имеет.
  describe("права проверяются раньше тела запроса", () => {
    // Синтетические значения: ни организации, ни сотрудника с такими id нет.
    const SYNTHETIC_ORG_ID = "22222222-2222-4222-8222-222222222222";
    const SYNTHETIC_USER_ID = "11111111-1111-4111-8111-111111111111";
    const FOREIGN_ORG_ID = "33333333-3333-4333-8333-333333333333";
    // Тот же секрет, что задаёт внешний beforeEach в этом файле.
    const TEST_TOKEN_SECRET = "test-secret";
    const SET_PASSWORD_URL = "/api/auth/clinic/set-password";
    const SET_PIN_URL = "/api/auth/staff/set-pin";

    let savedSetupKey: string | undefined;

    beforeEach(() => {
      // ADMIN_SETUP_KEY — второй способ авторизации этих двух маршрутов, и он
      // читается ИЗ ТЕЛА. Проверки анонимного отказа обязаны идти без него,
      // иначе проверялся бы не тот путь.
      savedSetupKey = process.env.ADMIN_SETUP_KEY;
      delete process.env.ADMIN_SETUP_KEY;
    });

    afterEach(() => {
      if (savedSetupKey === undefined) delete process.env.ADMIN_SETUP_KEY;
      else process.env.ADMIN_SETUP_KEY = savedSetupKey;
    });

    /** Заголовки владельца организации: подписанные токены кабинета и сотрудника. */
    function ownerHeaders(): Record<string, string> {
      return {
        "x-dente-clinic-token": signToken({ organizationId: SYNTHETIC_ORG_ID }, TEST_TOKEN_SECRET, 60 * 60),
        "x-dente-staff-token": signToken(
          { userId: SYNTHETIC_USER_ID, organizationId: SYNTHETIC_ORG_ID, role: "owner", fullName: "Владелец" },
          TEST_TOKEN_SECRET,
          60 * 60
        )
      };
    }

    /**
     * Любое обращение к базе до успешной проверки прав — провал: это работа,
     * которую сервер выполняет по заказу того, кому ничего не разрешено.
     * Подмена не возвращает данные, а бросает исключение, поэтому нарушение
     * видно и по коду ответа (500 вместо 403), и по списку вызовов.
     */
    function forbidDatabaseAccess(): string[] {
      const calls: string[] = [];
      const reject = (method: string) => () => {
        calls.push(method);
        throw new Error(`запрос без прав дошёл до базы: db.${method}`);
      };
      mock.method(db, "select", reject("select"));
      mock.method(db, "update", reject("update"));
      mock.method(db, "insert", reject("insert"));
      return calls;
    }

    /** Подмена базы для успешных путей: цель найдена, запись и аудит проходят. */
    function allowDatabaseWrites(): void {
      mock.method(db, "select", () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: SYNTHETIC_USER_ID }]
          })
        })
      }));
      mock.method(db, "update", () => ({
        set: () => ({
          where: async () => undefined
        })
      }));
      mock.method(db, "insert", () => ({
        values: async () => undefined
      }));
    }

    test("set-password без прав: ответ не зависит от тела и не выдаёт политику пароля", async () => {
      const dbCalls = forbidDatabaseAccess();
      // Раньше эти тела давали РАЗНЫЕ ответы: короткий пароль — 400 с текстом
      // политики, правильный по форме — 403.
      const payloads = [
        {},
        { newPassword: "" },
        { newPassword: "1" },
        { newPassword: "достаточно-длинный-пароль" },
        { organizationId: SYNTHETIC_ORG_ID, newPassword: "1" },
        { newPassword: "1", adminKey: "неверный ключ установки" }
      ];

      const responses = await Promise.all(
        payloads.map((payload) => app.inject({ method: "POST", url: SET_PASSWORD_URL, payload }))
      );

      for (const response of responses) {
        assert.strictEqual(response.statusCode, 403);
        assert.strictEqual(response.json().error, "Forbidden");
      }
      // Побайтовая идентичность всех ответов: отказ не несёт ни бита сведений о теле.
      for (const response of responses.slice(1)) {
        assert.strictEqual(response.body, responses[0]!.body);
      }
      // Политика длины пароля больше не утекает: ни числа, ни слова «символ».
      assert.ok(!/\d/.test(responses[0]!.body), `в отказе осталось число: ${responses[0]!.body}`);
      assert.ok(!/символ/i.test(responses[0]!.body), `в отказе осталась политика: ${responses[0]!.body}`);
      assert.deepStrictEqual(dbCalls, []);
    });

    test("set-pin без прав: ответ не зависит от тела и не выдаёт ни политику PIN, ни обязательные поля", async () => {
      const dbCalls = forbidDatabaseAccess();
      // Раньше: пустое тело — 400 «Не указан сотрудник.», короткий PIN — 400 с
      // политикой «4–12 цифр», правильная форма — 403.
      const payloads = [
        {},
        { userId: SYNTHETIC_USER_ID },
        { newPin: "1234" },
        { userId: SYNTHETIC_USER_ID, newPin: "12" },
        { userId: SYNTHETIC_USER_ID, newPin: "abcd" },
        { userId: SYNTHETIC_USER_ID, newPin: "1234" },
        { userId: "не идентификатор", newPin: "1234", adminKey: "неверный ключ установки" }
      ];

      const responses = await Promise.all(
        payloads.map((payload) => app.inject({ method: "POST", url: SET_PIN_URL, payload }))
      );

      for (const response of responses) {
        assert.strictEqual(response.statusCode, 403);
        assert.strictEqual(response.json().error, "Forbidden");
      }
      for (const response of responses.slice(1)) {
        assert.strictEqual(response.body, responses[0]!.body);
      }
      // Границы 4–12 и текст «Не указан сотрудник.» в отказе отсутствуют.
      assert.ok(!/\d/.test(responses[0]!.body), `в отказе осталось число: ${responses[0]!.body}`);
      assert.ok(!/цифр/i.test(responses[0]!.body), `в отказе осталась политика PIN: ${responses[0]!.body}`);
      assert.ok(!/Не указан/i.test(responses[0]!.body), `в отказе осталась проверка поля: ${responses[0]!.body}`);
      assert.deepStrictEqual(dbCalls, []);
    });

    test("set-password с правами: контракт ошибок тела не изменился", async () => {
      const dbCalls = forbidDatabaseAccess();
      const headers = ownerHeaders();

      const empty = await app.inject({ method: "POST", url: SET_PASSWORD_URL, headers, payload: {} });
      assert.strictEqual(empty.statusCode, 400);
      assert.strictEqual(empty.json().error, "ValidationError");
      assert.strictEqual(empty.json().message, "Новый пароль должен быть не короче 8 символов.");

      const short = await app.inject({
        method: "POST",
        url: SET_PASSWORD_URL,
        headers,
        payload: { newPassword: "1234567" }
      });
      assert.strictEqual(short.statusCode, 400);
      assert.strictEqual(short.json().error, "ValidationError");
      assert.strictEqual(short.json().message, "Новый пароль должен быть не короче 8 символов.");

      // Запрет менять пароль чужой организации не ослаблен и по-прежнему
      // проверяется после проверки тела.
      const foreign = await app.inject({
        method: "POST",
        url: SET_PASSWORD_URL,
        headers,
        payload: { organizationId: FOREIGN_ORG_ID, newPassword: "достаточно-длинный-пароль" }
      });
      assert.strictEqual(foreign.statusCode, 403);
      assert.strictEqual(foreign.json().message, "Нельзя менять пароль чужой организации.");

      assert.deepStrictEqual(dbCalls, []);
    });

    test("set-pin с правами: контракт ошибок тела не изменился", async () => {
      const dbCalls = forbidDatabaseAccess();
      const headers = ownerHeaders();

      const empty = await app.inject({ method: "POST", url: SET_PIN_URL, headers, payload: {} });
      assert.strictEqual(empty.statusCode, 400);
      assert.strictEqual(empty.json().error, "ValidationError");
      assert.strictEqual(empty.json().message, "Не указан сотрудник.");

      const noPin = await app.inject({
        method: "POST",
        url: SET_PIN_URL,
        headers,
        payload: { userId: SYNTHETIC_USER_ID }
      });
      assert.strictEqual(noPin.statusCode, 400);
      assert.strictEqual(noPin.json().message, "PIN должен состоять из 4–12 цифр.");

      const shortPin = await app.inject({
        method: "POST",
        url: SET_PIN_URL,
        headers,
        payload: { userId: SYNTHETIC_USER_ID, newPin: "12" }
      });
      assert.strictEqual(shortPin.statusCode, 400);
      assert.strictEqual(shortPin.json().message, "PIN должен состоять из 4–12 цифр.");

      const letters = await app.inject({
        method: "POST",
        url: SET_PIN_URL,
        headers,
        payload: { userId: SYNTHETIC_USER_ID, newPin: "abcd" }
      });
      assert.strictEqual(letters.statusCode, 400);
      assert.strictEqual(letters.json().message, "PIN должен состоять из 4–12 цифр.");

      assert.deepStrictEqual(dbCalls, []);
    });

    test("охранник открывается: владелец меняет пароль клиники и PIN сотрудника", async () => {
      // Перенос проверки прав вперёд не должен превратить маршрут в вечно
      // закрытый — иначе «защита» была бы просто поломкой.
      allowDatabaseWrites();
      const headers = ownerHeaders();

      const password = await app.inject({
        method: "POST",
        url: SET_PASSWORD_URL,
        headers,
        payload: { newPassword: "достаточно-длинный-пароль" }
      });
      assert.strictEqual(password.statusCode, 200);
      assert.strictEqual(password.json().ok, true);
      assert.strictEqual(password.json().message, "Пароль клиники обновлён.");

      const pin = await app.inject({
        method: "POST",
        url: SET_PIN_URL,
        headers,
        payload: { userId: SYNTHETIC_USER_ID, newPin: "4321" }
      });
      assert.strictEqual(pin.statusCode, 200);
      assert.strictEqual(pin.json().ok, true);
      assert.strictEqual(pin.json().message, "PIN сотрудника обновлён.");
    });

    test("ключ установки читается из тела и после переноса работает так же", async () => {
      // Единственный настоящий риск переноса: охранник берёт adminKey из тела,
      // то есть тело обязано разбираться до охранника, но НЕ проверяться.
      const setupKey = `dente-setup-${randomUUID()}`;
      process.env.ADMIN_SETUP_KEY = setupKey;

      const wrongKeyCalls = forbidDatabaseAccess();
      const wrongKey = await app.inject({
        method: "POST",
        url: SET_PASSWORD_URL,
        payload: { organizationId: SYNTHETIC_ORG_ID, newPassword: "достаточно-длинный-пароль", adminKey: `${setupKey}x` }
      });
      assert.strictEqual(wrongKey.statusCode, 403);
      assert.strictEqual(wrongKey.json().error, "Forbidden");
      assert.deepStrictEqual(wrongKeyCalls, []);

      // С верным ключом валидация тела снова достижима — и в прежнем порядке:
      // сначала пароль, затем организация.
      const shortPassword = await app.inject({
        method: "POST",
        url: SET_PASSWORD_URL,
        payload: { organizationId: SYNTHETIC_ORG_ID, newPassword: "1", adminKey: setupKey }
      });
      assert.strictEqual(shortPassword.statusCode, 400);
      assert.strictEqual(shortPassword.json().message, "Новый пароль должен быть не короче 8 символов.");

      const noOrganization = await app.inject({
        method: "POST",
        url: SET_PASSWORD_URL,
        payload: { newPassword: "достаточно-длинный-пароль", adminKey: setupKey }
      });
      assert.strictEqual(noOrganization.statusCode, 400);
      assert.strictEqual(noOrganization.json().message, "Не указана организация.");

      const badPin = await app.inject({
        method: "POST",
        url: SET_PIN_URL,
        payload: { userId: SYNTHETIC_USER_ID, newPin: "12", adminKey: setupKey }
      });
      assert.strictEqual(badPin.statusCode, 400);
      assert.strictEqual(badPin.json().message, "PIN должен состоять из 4–12 цифр.");

      mock.restoreAll();
      allowDatabaseWrites();
      const accepted = await app.inject({
        method: "POST",
        url: SET_PASSWORD_URL,
        payload: { organizationId: SYNTHETIC_ORG_ID, newPassword: "достаточно-длинный-пароль", adminKey: setupKey }
      });
      assert.strictEqual(accepted.statusCode, 200);
      assert.strictEqual(accepted.json().ok, true);
    });
  });

  // ─── SaaS body Zod validation ───────────────────────────────────────────────
  // Bodies that used to be `(request.body as any)` now go through safeParse.
  // Empty/short/bad-PIN cases must stay 400 ValidationError with the same RU
  // messages; no DB needed for pure validation failures. Auth-gated routes
  // still refuse unauthenticated callers before body shape is considered.
  describe("SaaS body Zod validation", () => {
    const TEST_TOKEN_SECRET = "test-secret";

    test("register: empty body → 400 Заполните все поля", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {}
      });
      assert.strictEqual(response.statusCode, 400);
      assert.strictEqual(response.json().error, "ValidationError");
      assert.strictEqual(response.json().message, "Заполните все поля.");
    });

    test("register: short password → 400 password policy", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          clinicName: "Клиника",
          ownerName: "Владелец",
          email: "owner@example.com",
          password: "short"
        }
      });
      assert.strictEqual(response.statusCode, 400);
      assert.strictEqual(response.json().error, "ValidationError");
      assert.strictEqual(response.json().message, "Пароль должен быть не короче 8 символов.");
    });

    test("register: bad ownerPin → 400 PIN policy", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          clinicName: "Клиника",
          ownerName: "Владелец",
          email: "owner@example.com",
          password: "long-enough-password",
          ownerPin: "12"
        }
      });
      assert.strictEqual(response.statusCode, 400);
      assert.strictEqual(response.json().error, "ValidationError");
      assert.strictEqual(response.json().message, "PIN должен состоять из 4–12 цифр.");
    });

    test("login: empty body → 400 Введите email и пароль", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {}
      });
      assert.strictEqual(response.statusCode, 400);
      assert.strictEqual(response.json().error, "ValidationError");
      assert.strictEqual(response.json().message, "Введите email и пароль.");
    });

    test("invites/accept: empty body → 400 Заполните все поля", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/invites/accept",
        payload: {}
      });
      assert.strictEqual(response.statusCode, 400);
      assert.strictEqual(response.json().error, "ValidationError");
      assert.strictEqual(response.json().message, "Заполните все поля.");
    });

    test("invites/accept: short password → 400 password policy", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/invites/accept",
        payload: {
          token: "some-token",
          fullName: "Иван",
          password: "short",
          pinCode: "1234"
        }
      });
      assert.strictEqual(response.statusCode, 400);
      assert.strictEqual(response.json().error, "ValidationError");
      assert.strictEqual(response.json().message, "Пароль должен быть не короче 8 символов.");
    });

    test("invites/accept: bad pinCode → 400 PIN policy", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/invites/accept",
        payload: {
          token: "some-token",
          fullName: "Иван",
          password: "long-enough-password",
          pinCode: "ab"
        }
      });
      assert.strictEqual(response.statusCode, 400);
      assert.strictEqual(response.json().error, "ValidationError");
      assert.strictEqual(response.json().message, "PIN должен состоять из 4–12 цифр.");
    });

    test("invites/create: no token → 403 before body shape", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/invites/create",
        payload: {}
      });
      assert.strictEqual(response.statusCode, 403);
      assert.strictEqual(response.json().error, "Forbidden");
    });

    test("invites/create: admin token + empty body → 400 Укажите email и роль", async () => {
      const staffToken = signToken(
        {
          userId: "11111111-1111-4111-8111-111111111111",
          fullName: "Admin",
          role: "owner",
          organizationId: "22222222-2222-4222-8222-222222222222"
        },
        TEST_TOKEN_SECRET,
        60 * 60
      );
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/invites/create",
        headers: { "x-dente-staff-token": staffToken },
        payload: {}
      });
      assert.strictEqual(response.statusCode, 400);
      assert.strictEqual(response.json().error, "ValidationError");
      assert.strictEqual(response.json().message, "Укажите email и роль.");
    });

    test("update-password: no token → 401 before body", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/user/update-password",
        payload: {}
      });
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.json().error, "AuthRequired");
    });

    test("update-password: token + empty body → 400", async () => {
      const staffToken = signToken(
        { userId: "11111111-1111-4111-8111-111111111111" },
        TEST_TOKEN_SECRET,
        60 * 60
      );
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/user/update-password",
        headers: { "x-dente-staff-token": staffToken },
        payload: {}
      });
      assert.strictEqual(response.statusCode, 400);
      assert.strictEqual(response.json().error, "ValidationError");
      assert.strictEqual(response.json().message, "Введите старый и новый пароль.");
    });

    test("update-password: token + short newPassword → 400", async () => {
      const staffToken = signToken(
        { userId: "11111111-1111-4111-8111-111111111111" },
        TEST_TOKEN_SECRET,
        60 * 60
      );
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/user/update-password",
        headers: { "x-dente-staff-token": staffToken },
        payload: { oldPassword: "old-password", newPassword: "short" }
      });
      assert.strictEqual(response.statusCode, 400);
      assert.strictEqual(response.json().error, "ValidationError");
      assert.strictEqual(response.json().message, "Новый пароль должен быть не короче 8 символов.");
    });

    test("update-pin: no token → 401 before body", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/user/update-pin",
        payload: {}
      });
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(response.json().error, "AuthRequired");
    });

    test("update-pin: token + empty body → 400", async () => {
      const staffToken = signToken(
        { userId: "11111111-1111-4111-8111-111111111111" },
        TEST_TOKEN_SECRET,
        60 * 60
      );
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/user/update-pin",
        headers: { "x-dente-staff-token": staffToken },
        payload: {}
      });
      assert.strictEqual(response.statusCode, 400);
      assert.strictEqual(response.json().error, "ValidationError");
      assert.strictEqual(response.json().message, "Введите старый и новый PIN-код.");
    });

    test("update-pin: token + bad newPin → 400 PIN policy", async () => {
      const staffToken = signToken(
        { userId: "11111111-1111-4111-8111-111111111111" },
        TEST_TOKEN_SECRET,
        60 * 60
      );
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/user/update-pin",
        headers: { "x-dente-staff-token": staffToken },
        payload: { oldPin: "1234", newPin: "12" }
      });
      assert.strictEqual(response.statusCode, 400);
      assert.strictEqual(response.json().error, "ValidationError");
      assert.strictEqual(response.json().message, "PIN должен состоять из 4–12 цифр.");
    });
  });
});
