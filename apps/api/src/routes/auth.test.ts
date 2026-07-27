import { test, describe, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert";
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
            limit: async () => [{ id: 'org1', name: 'Test Org', passwordHash: hashCredential('password123') }]
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
            limit: async () => [{ id: 'user1', organizationId: 'org1', pinCodeHash: hashCredential('1234'), role: 'doctor' }]
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
            limit: async () => [{ id: 'user1', organizationId: 'org1', pinCodeHash: hashCredential('1234'), role: 'doctor' }]
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
                return [{ id: 'user1', organizationId: 'org1', passwordHash: hashCredential('password123'), role: 'doctor', fullName: 'John Doe', email: 'test@test.com' }];
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
});
