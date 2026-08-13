import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { db } from "../../db/client.js";
import {
	organizations,
	patients,
	sberbankTransactions,
} from "../../db/schema.js";
import { registerSberbankRoutes } from "../../routes/sberbank.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * ИНТЕГРАЦИЯ СБЕРБАНКА.
 *
 * Маршруты собираются на настоящем Fastify-экземпляре с теми же хуками tenant
 * context, что и приложение. Авторизация проходит через подписанный токен
 * сотрудника, поэтому проверка конфигурации не маскирует отсутствие прав.
 * Запуск: node --import tsx --test src/tests/routes/sberbank.test.ts
 */

const TEST_NS = "sberbankRouteConfiguration";
const ORG_ID = fixtureUuid(TEST_NS, 1);
const USER_ID = fixtureUuid(TEST_NS, 2);
const PATIENT_ID = fixtureUuid(TEST_NS, 3);
const ORDER_ID = "sberbank-unconfigured-order";

type SberbankEnvironment = {
	terminalUser: string | undefined;
	terminalPassword: string | undefined;
	terminalToken: string | undefined;
};

function isDatabaseUnavailable(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	const cause =
		typeof error === "object" && error !== null && "cause" in error
			? (error as { cause?: unknown }).cause
			: undefined;
	const causeMessage =
		cause instanceof Error ? cause.message : String(cause ?? "");
	return /ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|getaddrinfo|Connection terminated|Client has encountered a connection error|password authentication failed|database "[^"]*" does not exist|role "[^"]*" does not exist/i.test(
		`${message} ${causeMessage}`,
	);
}

function clearSberbankConfiguration(): SberbankEnvironment {
	const environment = {
		terminalUser: process.env.SBERBANK_TERMINAL_USER,
		terminalPassword: process.env.SBERBANK_TERMINAL_PASSWORD,
		terminalToken: process.env.SBERBANK_TERMINAL_TOKEN,
	};
	delete process.env.SBERBANK_TERMINAL_USER;
	delete process.env.SBERBANK_TERMINAL_PASSWORD;
	delete process.env.SBERBANK_TERMINAL_TOKEN;
	return environment;
}

function restoreSberbankConfiguration(environment: SberbankEnvironment): void {
	if (environment.terminalUser === undefined) {
		delete process.env.SBERBANK_TERMINAL_USER;
	} else {
		process.env.SBERBANK_TERMINAL_USER = environment.terminalUser;
	}
	if (environment.terminalPassword === undefined) {
		delete process.env.SBERBANK_TERMINAL_PASSWORD;
	} else {
		process.env.SBERBANK_TERMINAL_PASSWORD = environment.terminalPassword;
	}
	if (environment.terminalToken === undefined) {
		delete process.env.SBERBANK_TERMINAL_TOKEN;
	} else {
		process.env.SBERBANK_TERMINAL_TOKEN = environment.terminalToken;
	}
}

describe("Sberbank Acquiring Routes", () => {
	const app = createTenantTestApp();
	let staffToken = "";
	let databaseAvailable = true;
	let originalSberbankEnvironment: SberbankEnvironment;

	before(async () => {
		originalSberbankEnvironment = clearSberbankConfiguration();
		await registerSberbankRoutes(app);
		await app.ready();
		staffToken = signToken(
			{ organizationId: ORG_ID, userId: USER_ID, role: "owner" },
			authTokenSecret(),
		);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.insert(organizations)
					.values({ id: ORG_ID, name: "Sberbank Route Test Clinic" });
				await db.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Sberbank Route Test Patient",
				});
				await db.insert(sberbankTransactions).values({
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					orderId: ORDER_ID,
					amount: 1500,
					status: "pending",
				});
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
		await app.close();
		restoreSberbankConfiguration(originalSberbankEnvironment);
	});

	test("rejects missing patient or amount before authorization", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/sberbank/pay",
			payload: { amount: 1500 },
		});
		assert.equal(response.statusCode, 400, response.body);
	});

	test("returns 501 when Sberbank credentials are not configured", async (context) => {
		if (!databaseAvailable) {
			return context.skip("database unavailable");
		}

		const response = await app.inject({
			method: "POST",
			url: "/api/sberbank/pay",
			headers: { "x-dente-staff-token": staffToken },
			payload: { patientId: PATIENT_ID, amount: 1500 },
		});
		assert.equal(response.statusCode, 501, response.body);
		assert.equal(response.json().error, "PaymentGatewayNotConfigured");
	});

	test("status route returns 501 after finding a tenant-scoped transaction", async (context) => {
		if (!databaseAvailable) {
			return context.skip("database unavailable");
		}

		const response = await app.inject({
			method: "GET",
			url: `/api/sberbank/status/${ORDER_ID}`,
			headers: { "x-dente-staff-token": staffToken },
		});
		assert.equal(response.statusCode, 501, response.body);
		assert.equal(response.json().error, "PaymentGatewayNotConfigured");
	});
});
