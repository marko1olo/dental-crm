/**
 * staffChat.test.ts — Comprehensive Integration Tests for Staff Messenger & Clinic Intercom.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { organizations, users } from "../db/schema.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import { registerStaffChatRoutes } from "./staffChat.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../tests/support/fixtureOrganizations.js";
import { createTenantTestApp } from "../tests/support/tenantTestApp.js";

async function buildTestApp() {
	process.env.NODE_ENV = "test";
	const app = createTenantTestApp();
	await registerStaffChatRoutes(app);
	await app.ready();
	return app;
}

function createStaffHeaders(
	organizationId: string,
	userId: string,
	role = "doctor",
	fullName = "Д-р Иванов",
) {
	const token = signToken(
		{ organizationId, userId, role, fullName },
		authTokenSecret(),
	);
	return {
		"x-dente-staff-token": token,
	};
}

describe("Staff Messenger & Clinic Intercom Rails", () => {
	it("executes full lifecycle: default channels, direct message, 1-click intercom ping, read tracking", async () => {
		const app = await buildTestApp();

		const orgId = fixtureUuid("staffChatTest", 1);
		const doctorId = fixtureUuid("staffChatTest", 2);
		const assistantId = fixtureUuid("staffChatTest", 3);

		await purgeFixtureOrganizations([orgId]);

		// 1. Setup isolated test organization and users under fixture tenant RLS
		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(organizations).values({
				id: orgId,
				name: `Клиника Интерком Тест-${Date.now()}`,
			});
			await tx.insert(users).values([
				{
					id: doctorId,
					organizationId: orgId,
					fullName: "Д-р Иванов И.И.",
					role: "doctor",
					isActive: true,
				},
				{
					id: assistantId,
					organizationId: orgId,
					fullName: "Ассистент Петрова А.С.",
					role: "assistant",
					isActive: true,
				},
			]);
		});

		const doctorHeaders = createStaffHeaders(
			orgId,
			doctorId,
			"doctor",
			"Д-р Иванов И.И.",
		);
		const assistantHeaders = createStaffHeaders(
			orgId,
			assistantId,
			"assistant",
			"Ассистент Петрова А.С.",
		);

		// 2. GET /api/staff-chat/channels — defaults should be created automatically
		const getChannelsRes = await app.inject({
			method: "GET",
			url: "/api/staff-chat/channels",
			headers: doctorHeaders,
		});
		assert.equal(getChannelsRes.statusCode, 200);
		const { channels } = JSON.parse(getChannelsRes.body);
		assert.ok(Array.isArray(channels));
		assert.ok(channels.length >= 4);

		const generalChannel = channels.find((c: any) => c.slug === "general");
		const assistantChannel = channels.find(
			(c: any) => c.slug === "intercom_assistants",
		);
		assert.ok(generalChannel, "General channel must exist");
		assert.ok(assistantChannel, "Intercom assistants channel must exist");

		// 3. POST /api/staff-chat/channels/direct — create direct chat between doctor and assistant
		const directRes = await app.inject({
			method: "POST",
			url: "/api/staff-chat/channels/direct",
			headers: doctorHeaders,
			payload: { targetUserId: assistantId },
		});
		assert.equal(directRes.statusCode, 200);
		const { channel: directChannel } = JSON.parse(directRes.body);
		assert.equal(directChannel.type, "direct");

		// 4. POST /api/staff-chat/messages — send text message to general channel
		const sendMsgRes = await app.inject({
			method: "POST",
			url: "/api/staff-chat/messages",
			headers: doctorHeaders,
			payload: {
				channelId: generalChannel.id,
				content: "Коллеги, утреннее собрание в 08:45 в ординаторской.",
				urgency: "normal",
			},
		});
		assert.equal(sendMsgRes.statusCode, 201);
		const { message: sentMsg } = JSON.parse(sendMsgRes.body);
		assert.equal(sentMsg.channelId, generalChannel.id);
		assert.equal(
			sentMsg.content,
			"Коллеги, утреннее собрание в 08:45 в ординаторской.",
		);
		assert.equal(sentMsg.senderUserId, doctorId);

		// 5. GET /api/staff-chat/messages — assistant reads messages in general
		const listMsgsRes = await app.inject({
			method: "GET",
			url: `/api/staff-chat/messages?channelId=${generalChannel.id}`,
			headers: assistantHeaders,
		});
		assert.equal(listMsgsRes.statusCode, 200);
		const { messages } = JSON.parse(listMsgsRes.body);
		assert.ok(messages.length >= 1);
		assert.equal(messages[0].id, sentMsg.id);

		// 6. POST /api/staff-chat/intercom-ping — 1-click chairside call for assistant
		const pingRes = await app.inject({
			method: "POST",
			url: "/api/staff-chat/intercom-ping",
			headers: doctorHeaders,
			payload: {
				presetKey: "call_assistant",
				cabinetNumber: "2",
				reason: "Коффердам / изоляция",
				customNote: "Зуб 4.6",
			},
		});
		assert.equal(pingRes.statusCode, 201);
		const pingData = JSON.parse(pingRes.body);
		assert.equal(pingData.preset, "call_assistant");
		assert.equal(pingData.channelSlug, "intercom_assistants");
		assert.ok(
			pingData.message.content.includes("каб. 2"),
			"Intercom ping message must include cabinet number",
		);
		assert.ok(
			pingData.message.content.includes("Коффердам"),
			"Intercom ping message must include reason",
		);

		// 7. POST /api/staff-chat/read — assistant marks channel as read
		const readRes = await app.inject({
			method: "POST",
			url: "/api/staff-chat/read",
			headers: assistantHeaders,
			payload: { channelId: generalChannel.id },
		});
		assert.equal(readRes.statusCode, 200);
		const readData = JSON.parse(readRes.body);
		assert.equal(readData.ok, true);

		// 8. GET /api/staff-chat/locations — list real clinic chairs and cabinets
		const locationsRes = await app.inject({
			method: "GET",
			url: "/api/staff-chat/locations",
			headers: doctorHeaders,
		});
		assert.equal(locationsRes.statusCode, 200);
		const { locations } = JSON.parse(locationsRes.body);
		assert.ok(Array.isArray(locations));
		assert.ok(locations.length > 0);

		// 9. POST /api/staff-chat/intercom-ping with targetAudience: "reception"
		const receptionPingRes = await app.inject({
			method: "POST",
			url: "/api/staff-chat/intercom-ping",
			headers: doctorHeaders,
			payload: {
				presetKey: "patient_arrived",
				targetAudience: "reception",
				patientName: "Сидоров С.П.",
				customNote: "Подготовьте договор и расчет",
			},
		});
		assert.equal(receptionPingRes.statusCode, 201);
		const recPingData = JSON.parse(receptionPingRes.body);
		assert.equal(recPingData.channelSlug, "reception");

		// 10. POST /api/staff-chat/intercom-ack — 2-Way interactive Ack response by assistant
		const ackRes = await app.inject({
			method: "POST",
			url: "/api/staff-chat/intercom-ack",
			headers: assistantHeaders,
			payload: {
				messageId: pingData.message.id,
				ackType: "on_my_way",
				customComment: "Набираю кламера, иду!",
			},
		});
		assert.equal(ackRes.statusCode, 200);
		const { message: ackedMessage } = JSON.parse(ackRes.body);
		assert.ok(Array.isArray(ackedMessage.intercomAcks));
		assert.equal(ackedMessage.intercomAcks.length, 1);
		assert.equal(ackedMessage.intercomAcks[0].ackType, "on_my_way");
		assert.equal(ackedMessage.intercomAcks[0].staffId, assistantId);

		// 11. GET /api/staff-chat/members — list active staff
		const membersRes = await app.inject({
			method: "GET",
			url: "/api/staff-chat/members",
			headers: doctorHeaders,
		});
		assert.equal(membersRes.statusCode, 200);
		const { members } = JSON.parse(membersRes.body);
		assert.ok(Array.isArray(members));
		assert.ok(members.length >= 2);
		assert.ok(members.some((m: any) => m.staffId === doctorId));
		assert.ok(members.some((m: any) => m.staffId === assistantId));
	});
});
