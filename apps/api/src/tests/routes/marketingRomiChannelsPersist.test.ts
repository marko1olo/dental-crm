import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { organizations } from "../../db/schema.js";
import { registerMarketingRoutes } from "../../routes/marketing.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "mktRomiChannelsPersist";
const ORG_ID = fixtureUuid(NAMESPACE, 1);

const clinicToken = signToken(
	{ organizationId: ORG_ID, role: "clinic" },
	authTokenSecret(),
	3600,
);
const ORG_HEADERS = {
	"x-dente-clinic-token": clinicToken,
	"x-organization-id": ORG_ID,
};

describe("Marketing ROMI Channels Persistence in PostgreSQL 18", () => {
	let app: FastifyInstance;

	before(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника ROMI Тест",
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		});

		app = await createTenantTestApp(ORG_ID);
		await registerMarketingRoutes(app);
		await app.ready();
	});

	after(async () => {
		if (app) await app.close();
		await purgeFixtureOrganizations([ORG_ID]);
	});

	test("1. GET /api/marketing/romi-channels auto-seeds 10 canonical DENTE channels into PostgreSQL 18", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/marketing/romi-channels",
			headers: ORG_HEADERS,
		});

		assert.equal(res.statusCode, 200);
		const body = res.json();
		assert.equal(body.success, true);
		assert.equal(body.organizationId, ORG_ID);
		assert.ok(Array.isArray(body.channels));
		assert.equal(body.channels.length, 10, "Must contain exactly 10 canonical channels");

		// Check canonical DENTE channel IDs
		const first = body.channels[0];
		assert.ok(first.id.startsWith("ch_dente_"), `Channel id must start with ch_dente_, got: ${first.id}`);
		assert.equal(first.channelKey, "gis2");
		assert.equal(first.nameRu, "2GIS");

		const yandex = body.channels.find((c: any) => c.channelKey === "yandex_maps");
		assert.ok(yandex);
		assert.equal(yandex.id, "ch_dente_yandex_maps");
	});

	test("2. POST /api/marketing/romi-channels saves updated expenses to PostgreSQL 18", async () => {
		const getRes = await app.inject({
			method: "GET",
			url: "/api/marketing/romi-channels",
			headers: ORG_HEADERS,
		});
		const channels = getRes.json().channels;

		// Update 2GIS spend to 35,000 ₽ (3,500,000 kopecks)
		channels[0].spentKopecks = 3500000;

		const postRes = await app.inject({
			method: "POST",
			url: "/api/marketing/romi-channels",
			headers: {
				...ORG_HEADERS,
				"content-type": "application/json",
			},
			payload: { channels },
		});

		assert.equal(postRes.statusCode, 200);
		const postBody = postRes.json();
		assert.equal(postBody.success, true);
		assert.equal(postBody.channels[0].spentKopecks, 3500000);

		// Verify re-reading from DB preserves the spend
		const verifyRes = await app.inject({
			method: "GET",
			url: "/api/marketing/romi-channels",
			headers: ORG_HEADERS,
		});
		const verifyBody = verifyRes.json();
		assert.equal(verifyBody.channels[0].spentKopecks, 3500000, "Must be persisted in PostgreSQL 18");
	});

	test("3. POST /api/marketing/romi-channels/reset restores default 10 channels with zero balances", async () => {
		const resetRes = await app.inject({
			method: "POST",
			url: "/api/marketing/romi-channels/reset",
			headers: ORG_HEADERS,
		});

		assert.equal(resetRes.statusCode, 200);
		const resetBody = resetRes.json();
		assert.equal(resetBody.success, true);
		assert.equal(resetBody.channels.length, 10);
	});
});
