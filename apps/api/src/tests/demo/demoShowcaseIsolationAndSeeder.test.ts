import assert from "node:assert/strict";
import { test } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	chairs,
	clinics,
	crmLeads,
	inventoryItems,
	labItems,
	labOrderEvents,
	labOrders,
	organizations,
	patients,
	stockBatches,
	toothStates,
	users,
	warehouses,
} from "../../db/schema.js";
import { registerAuthRoutes } from "../../routes/auth.js";
import {
	DEMO_ADMIN_ID,
	DEMO_CHAIR_1_ID,
	DEMO_CHAIR_2_ID,
	DEMO_CHAIR_3_ID,
	DEMO_CLINIC_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_SURGEON_ID,
	DEMO_LAB_ORDER_1_ID,
	DEMO_OWNER_ID,
	DEMO_PATIENT_1_ID,
	DEMO_PATIENT_2_ID,
	DEMO_PATIENT_3_ID,
	DEMO_PATIENT_4_ID,
	DEMO_SHOWCASE_ORG_ID,
	DEMO_WAREHOUSE_ID,
	ensureDemoShowcaseTenant,
} from "../../services/demo/deepDemoSeeder.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

test("Demo Showcase Seeder & Multi-tenant RLS Isolation Suite (Mandates 8c, 8f, 8y, 8n)", async (t) => {
	// Включаем тестовый демо-вход на время выполнения теста
	const previousDemoEnv = process.env.DENTE_ALLOW_DEMO_LOGIN;
	const previousNodeEnv = process.env.NODE_ENV;
	process.env.DENTE_ALLOW_DEMO_LOGIN = "1";
	process.env.NODE_ENV = "test";

	t.after(() => {
		if (previousDemoEnv !== undefined) {
			process.env.DENTE_ALLOW_DEMO_LOGIN = previousDemoEnv;
		} else {
			delete process.env.DENTE_ALLOW_DEMO_LOGIN;
		}
		if (previousNodeEnv !== undefined) {
			process.env.NODE_ENV = previousNodeEnv;
		} else {
			delete process.env.NODE_ENV;
		}
	});

	await t.test("1. ensureDemoShowcaseTenant successfully seeds full real PostgreSQL demo tenant", async () => {
		// Принудительный сброс и сидирование чистого демонстрационного тенанта
		const seedResult = await ensureDemoShowcaseTenant(undefined, { forceReset: true });

		assert.equal(seedResult.organizationId, DEMO_SHOWCASE_ORG_ID);
		assert.equal(seedResult.clinicId, DEMO_CLINIC_ID);
		assert.equal(seedResult.chairsCount, 3);
		assert.equal(seedResult.staffCount, 6);
		assert.equal(seedResult.patientsCount, 4);
		assert.equal(seedResult.appointmentsCount, 6);
		assert.equal(seedResult.leadsCount, 4);
		assert.equal(seedResult.labOrderId, DEMO_LAB_ORDER_1_ID);
		assert.equal(seedResult.warehouseId, DEMO_WAREHOUSE_ID);

		// Проверяем физическое наличие данных в БД под контекстом DEMO_SHOWCASE_ORG_ID
		await withTenantCtx(DEMO_SHOWCASE_ORG_ID, async (tx) => {
			// Организация
			const [org] = await tx
				.select()
				.from(organizations)
				.where(eq(organizations.id, DEMO_SHOWCASE_ORG_ID));
			assert.ok(org, "Demo organization must exist in PostgreSQL");
			assert.equal(org.name, "Стоматологическая Клиника DENTE (Демо)");
			assert.equal(org.loginId, "clinic@example.com");

			// Клиника (филиал)
			const [clinic] = await tx
				.select()
				.from(clinics)
				.where(eq(clinics.id, DEMO_CLINIC_ID));
			assert.ok(clinic, "Demo clinic branch must exist");
			assert.equal(clinic.organizationId, DEMO_SHOWCASE_ORG_ID);

			// 3 кресла
			const demoChairs = await tx
				.select()
				.from(chairs)
				.where(eq(chairs.organizationId, DEMO_SHOWCASE_ORG_ID));
			assert.equal(demoChairs.length, 3, "Demo clinic must have exactly 3 chairs");
			const chairIds = new Set(demoChairs.map((c) => c.id));
			assert.ok(chairIds.has(DEMO_CHAIR_1_ID));
			assert.ok(chairIds.has(DEMO_CHAIR_2_ID));
			assert.ok(chairIds.has(DEMO_CHAIR_3_ID));

			// 6 сотрудников (5 ролей + владелец)
			const demoStaff = await tx
				.select()
				.from(users)
				.where(eq(users.organizationId, DEMO_SHOWCASE_ORG_ID));
			assert.equal(demoStaff.length, 6, "Must have exactly 6 staff members");
			const staffIds = new Set(demoStaff.map((u) => u.id));
			assert.ok(staffIds.has(DEMO_DOCTOR_1_ID), "Therapist must exist");
			assert.ok(staffIds.has(DEMO_DOCTOR_ORTHOPEDIST_ID), "Orthopedist must exist");
			assert.ok(staffIds.has(DEMO_DOCTOR_2_ID), "Orthodontist must exist");
			assert.ok(staffIds.has(DEMO_DOCTOR_SURGEON_ID), "Surgeon must exist");
			assert.ok(staffIds.has(DEMO_OWNER_ID), "Owner must exist");
			assert.ok(staffIds.has(DEMO_ADMIN_ID), "Administrator must exist");

			// 4 реальных пациента с каноническими ID
			const demoPatients = await tx
				.select()
				.from(patients)
				.where(eq(patients.organizationId, DEMO_SHOWCASE_ORG_ID));
			assert.equal(demoPatients.length, 4, "Must have 4 demo patients");
			const patientIds = new Set(demoPatients.map((p) => p.id));
			assert.ok(patientIds.has(DEMO_PATIENT_1_ID));
			assert.ok(patientIds.has(DEMO_PATIENT_2_ID));
			assert.ok(patientIds.has(DEMO_PATIENT_3_ID));
			assert.ok(patientIds.has(DEMO_PATIENT_4_ID));

			// Зубные формулы (одонтограммы)
			const teeth = await tx
				.select()
				.from(toothStates)
				.where(eq(toothStates.organizationId, DEMO_SHOWCASE_ORG_ID));
			assert.ok(teeth.length >= 10, "Must have comprehensive odontogram tooth states");
			const p0Teeth = teeth.filter((t) => t.patientId === DEMO_PATIENT_1_ID);
			assert.ok(p0Teeth.some((t) => t.toothNumber === 16 && t.state === "caries"));
			assert.ok(p0Teeth.some((t) => t.toothNumber === 24 && t.state === "filling"));
			assert.ok(p0Teeth.some((t) => t.toothNumber === 36 && t.state === "pulpitis"));

			// Расписание
			const appts = await tx
				.select()
				.from(appointments)
				.where(eq(appointments.organizationId, DEMO_SHOWCASE_ORG_ID));
			assert.equal(appts.length, 6, "Must have 6 appointments across chairs");

			// Заказ в ЗТЛ (lab_orders + lab_items + lab_order_events)
			const [labOrder] = await tx
				.select()
				.from(labOrders)
				.where(
					and(
						eq(labOrders.organizationId, DEMO_SHOWCASE_ORG_ID),
						eq(labOrders.id, DEMO_LAB_ORDER_1_ID),
					),
				);
			assert.ok(labOrder, "Lab order 01a00000-0005-0000-0000-000000000001 must exist");
			assert.equal(labOrder.status, "in_progress");
			assert.equal(labOrder.priceRub, 14500);

			const items = await tx
				.select()
				.from(labItems)
				.where(eq(labItems.labOrderId, DEMO_LAB_ORDER_1_ID));
			assert.equal(items.length, 1, "Lab item must be present");

			const events = await tx
				.select()
				.from(labOrderEvents)
				.where(eq(labOrderEvents.labOrderId, DEMO_LAB_ORDER_1_ID));
			assert.equal(events.length, 3, "Lab order tracking events must be present");

			// Склад и партии FEFO
			const [wh] = await tx
				.select()
				.from(warehouses)
				.where(
					and(
						eq(warehouses.organizationId, DEMO_SHOWCASE_ORG_ID),
						eq(warehouses.id, DEMO_WAREHOUSE_ID),
					),
				);
			assert.ok(wh, "Main warehouse must exist");

			const invItems = await tx
				.select()
				.from(inventoryItems)
				.where(eq(inventoryItems.organizationId, DEMO_SHOWCASE_ORG_ID));
			assert.equal(invItems.length, 6, "Must have 6 inventory catalog items");

			const batches = await tx
				.select()
				.from(stockBatches)
				.where(eq(stockBatches.organizationId, DEMO_SHOWCASE_ORG_ID));
			assert.equal(batches.length, 6, "Must have 6 stock batches with FEFO expiration dates");

			// Лиды
			const leads = await tx
				.select()
				.from(crmLeads)
				.where(eq(crmLeads.organizationId, DEMO_SHOWCASE_ORG_ID));
			assert.equal(leads.length, 4, "Must have 4 CRM leads");
			assert.ok(leads.some((l) => l.name === "Ковалев Роман Викторович" && l.status === "new"));
		});
	});

	await t.test("2. Idempotency test: calling ensureDemoShowcaseTenant again does not corrupt or duplicate rows", async () => {
		const secondRun = await ensureDemoShowcaseTenant(undefined, { forceReset: false });
		assert.equal(secondRun.alreadyExisted, true, "Should report alreadyExisted on second call");

		// Проверяем, что число строк не удвоилось
		await withTenantCtx(DEMO_SHOWCASE_ORG_ID, async (tx) => {
			const staff = await tx
				.select()
				.from(users)
				.where(eq(users.organizationId, DEMO_SHOWCASE_ORG_ID));
			assert.equal(staff.length, 6, "Staff count must stay exactly 6");

			const demoPatients = await tx
				.select()
				.from(patients)
				.where(eq(patients.organizationId, DEMO_SHOWCASE_ORG_ID));
			assert.equal(demoPatients.length, 4, "Patients count must stay exactly 4");

			const appts = await tx
				.select()
				.from(appointments)
				.where(eq(appointments.organizationId, DEMO_SHOWCASE_ORG_ID));
			assert.equal(appts.length, 6, "Appointments count must stay exactly 6");
		});
	});

	await t.test("3. STRICT RLS ISOLATION: Production clinic MUST NEVER see demo showcase rows", async () => {
		const prodOrgId = "dce70000-7777-4000-8000-000000000001";
		const prodClinicId = "dce70000-7777-4000-8000-000000000002";

		// Гарантируем наличие тестовой непривилегированной роли без BYPASSRLS
		// (в dev PostgreSQL роль dental имеет SUPERUSER, который обходит RLS по стандарту PG)
		await db.execute(sql`
			DO $$ BEGIN
				IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dente_rls_tester') THEN
					CREATE ROLE dente_rls_tester NOSUPERUSER NOBYPASSRLS;
				END IF;
			END $$;
			GRANT ALL ON ALL TABLES IN SCHEMA public TO dente_rls_tester;
			GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO dente_rls_tester;
			GRANT USAGE ON SCHEMA public TO dente_rls_tester;
		`);

		// Создаем тестовую боевую организацию
		await withTenantCtx(prodOrgId, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: prodOrgId,
					name: "Реальная Боевая Клиника (Прод-контур)",
					loginId: "real-prod@clinic.ru",
				})
				.onConflictDoNothing();

			await tx
				.insert(clinics)
				.values({
					id: prodClinicId,
					organizationId: prodOrgId,
					name: "Боевое отделение",
				})
				.onConflictDoNothing();

			// Активируем непривилегированную роль dente_rls_tester для активации FORCE RLS
			await tx.execute(sql`SET LOCAL ROLE dente_rls_tester`);

			// Делаем выборки ВСЕХ доменов под контекстом боевой клиники (prodOrgId)
			// PostgreSQL FORCE RLS обязан отфильтровать все демо-строки!
			const prodPatients = await tx.select().from(patients);
			const prodAppointments = await tx.select().from(appointments);
			const prodLabOrders = await tx.select().from(labOrders);
			const prodInventory = await tx.select().from(inventoryItems);
			const prodLeads = await tx.select().from(crmLeads);
			const prodChairs = await tx.select().from(chairs);
			const prodUsers = await tx.select().from(users);

			// Ни одна запись демо-тенанта НЕ МОЖЕТ присутствовать в выборке прод-клиники!
			const demoPatientLeak = prodPatients.some((p) => p.organizationId === DEMO_SHOWCASE_ORG_ID);
			assert.equal(demoPatientLeak, false, "ZERO LEAK: Prod clinic must not see demo patients");

			const demoApptLeak = prodAppointments.some((a) => a.organizationId === DEMO_SHOWCASE_ORG_ID);
			assert.equal(demoApptLeak, false, "ZERO LEAK: Prod clinic must not see demo appointments");

			const demoLabLeak = prodLabOrders.some((l) => l.organizationId === DEMO_SHOWCASE_ORG_ID);
			assert.equal(demoLabLeak, false, "ZERO LEAK: Prod clinic must not see demo lab orders");

			const demoInvLeak = prodInventory.some((i) => i.organizationId === DEMO_SHOWCASE_ORG_ID);
			assert.equal(demoInvLeak, false, "ZERO LEAK: Prod clinic must not see demo inventory items");

			const demoLeadLeak = prodLeads.some((l) => l.organizationId === DEMO_SHOWCASE_ORG_ID);
			assert.equal(demoLeadLeak, false, "ZERO LEAK: Prod clinic must not see demo leads");

			const demoChairLeak = prodChairs.some((c) => c.organizationId === DEMO_SHOWCASE_ORG_ID);
			assert.equal(demoChairLeak, false, "ZERO LEAK: Prod clinic must not see demo chairs");

			const demoUserLeak = prodUsers.some((u) => u.organizationId === DEMO_SHOWCASE_ORG_ID);
			assert.equal(demoUserLeak, false, "ZERO LEAK: Prod clinic must not see demo staff users");

			// Возвращаем роль для очистки
			await tx.execute(sql`RESET ROLE`);

			// Очищаем тестовую боевую организацию
			await tx.delete(clinics).where(eq(clinics.id, prodClinicId));
			await tx.delete(organizations).where(eq(organizations.id, prodOrgId));
		});
	});

	await t.test("4. Fastify HTTP Endpoints: authenticating demo credentials issues valid tokens against real DB", async () => {
		const app = createTenantTestApp();
		await registerAuthRoutes(app);

		// 1) Вход клиники: POST /api/auth/clinic/login
		const clinicLoginRes = await app.inject({
			method: "POST",
			url: "/api/auth/clinic/login",
			payload: {
				email: "clinic@example.com",
				password: "dente2026",
			},
		});

		assert.equal(clinicLoginRes.statusCode, 200, "Clinic login must succeed with 200 OK");
		const clinicJson = clinicLoginRes.json();
		assert.ok(clinicJson.clinicToken, "Must return clinicToken");
		assert.equal(
			clinicJson.clinicProfile?.organizationId,
			DEMO_SHOWCASE_ORG_ID,
			"Clinic token must point to DEMO_SHOWCASE_ORG_ID",
		);

		const clinicToken = clinicJson.clinicToken;

		// 2) Разблокировка врача по PIN: POST /api/auth/staff/unlock (Д-р Соколов А. В., PIN 1111)
		const unlockRes = await app.inject({
			method: "POST",
			url: "/api/auth/staff/unlock",
			headers: {
				"x-dente-clinic-token": clinicToken,
			},
			payload: {
				userId: DEMO_DOCTOR_1_ID,
				pinCode: "1111",
			},
		});

		assert.equal(unlockRes.statusCode, 200, "PIN unlock must succeed with 200 OK");
		const unlockJson = unlockRes.json();
		assert.ok(unlockJson.staffToken, "Must return staffToken");
		assert.equal(unlockJson.user?.id, DEMO_DOCTOR_1_ID);
		assert.equal(unlockJson.user?.fullName, "Д-р Соколов А. В.");
		assert.equal(unlockJson.user?.role, "doctor");

		// 3) Неверный PIN -> 401 AuthError
		const badUnlockRes = await app.inject({
			method: "POST",
			url: "/api/auth/staff/unlock",
			headers: {
				"x-dente-clinic-token": clinicToken,
			},
			payload: {
				userId: DEMO_DOCTOR_1_ID,
				pinCode: "9999",
			},
		});
		assert.equal(badUnlockRes.statusCode, 401, "Invalid PIN must reject with 401");

		// 4) Прямой вход врача через SaaS: POST /api/auth/login
		const doctorLoginRes = await app.inject({
			method: "POST",
			url: "/api/auth/login",
			payload: {
				identifier: "doctor@clinic.com",
				password: "any",
			},
		});
		assert.equal(doctorLoginRes.statusCode, 200, "Doctor direct login must return 200 OK");
		const doctorJson = doctorLoginRes.json();
		assert.equal(doctorJson.user?.id, DEMO_DOCTOR_1_ID);
		assert.equal(doctorJson.user?.role, "doctor");

		// 5) Прямой вход администратора через SaaS: POST /api/auth/login
		const adminLoginRes = await app.inject({
			method: "POST",
			url: "/api/auth/login",
			payload: {
				identifier: "admin@clinic.ru",
				password: "any",
			},
		});
		assert.equal(adminLoginRes.statusCode, 200, "Admin direct login must return 200 OK");
		const adminJson = adminLoginRes.json();
		assert.equal(adminJson.user?.id, DEMO_ADMIN_ID);
		assert.equal(adminJson.user?.role, "administrator");

		// 6) Эндпоинт инициализации демо-контура: POST /api/auth/demo/seed
		const seedApiRes = await app.inject({
			method: "POST",
			url: "/api/auth/demo/seed",
			payload: { forceReset: false },
		});
		assert.equal(seedApiRes.statusCode, 200, "Seed endpoint must return 200 OK");
		const seedApiJson = seedApiRes.json();
		assert.equal(seedApiJson.ok, true);
		assert.equal(seedApiJson.organizationId, DEMO_SHOWCASE_ORG_ID);

		await app.close();
	});
});
