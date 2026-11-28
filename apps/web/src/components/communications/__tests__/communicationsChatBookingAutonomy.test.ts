import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { useAppStore } from "../../../store/appStore";
import { useScheduleStore } from "../../../store/scheduleStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { executeBookAppointmentFromChat } from "../bookFromChatAutonomy";
import { OMNICHANNEL_TEMPLATES } from "../../chat/OmnichannelOperatorDesk";

describe("Communications & Chat Booking Autonomy (Mandates 8e, 8n — 6G Live SUT)", () => {
	it("1. executeBookAppointmentFromChat immediately populates schedule draft and opens quick booking drawer", () => {
		useAppStore.setState({ currentView: "communications" });
		useUiSurfaceStore.setState({ activeDrawer: null });

		executeBookAppointmentFromChat(
			{
				id: "pat-chat-1",
				fullName: "Васильев Пётр Николаевич",
				phone: "+79998887766",
				reason: "Консультация по имплантации",
			},
			{ todayIso: "2026-10-26" },
		);

		const draft = useScheduleStore.getState().newAppointmentDraft;
		assert.equal(draft.patientId, "pat-chat-1");
		assert.equal(draft.reason, "Консультация по имплантации");
		assert.ok(draft.comment?.includes("+79998887766"));

		const pending = useScheduleStore.getState().pendingStageBooking;
		assert.ok(pending);
		assert.equal(pending.patientName, "Васильев Пётр Николаевич");
		assert.equal(pending.patientPhone, "+79998887766");

		assert.equal(useAppStore.getState().currentView, "schedule");
		assert.equal(useUiSurfaceStore.getState().activeDrawer, "quick_booking");
	});

	it("2. Omnichannel templates contain clinical memos (surgery, parking, reminder) without cartoon emojis or order codes", () => {
		const surgeryTmpl = OMNICHANNEL_TEMPLATES.find((t) => t.id === "post_op_surgery");
		assert.ok(surgeryTmpl, "Surgery post-op memo must exist");
		assert.ok(surgeryTmpl.text.includes("удаления / имплантации"));
		assert.ok(surgeryTmpl.text.includes("кровяной сгусток"));

		const parkingTmpl = OMNICHANNEL_TEMPLATES.find((t) => t.id === "clinic_parking");
		assert.ok(parkingTmpl, "Parking memo must exist");
		assert.ok(parkingTmpl.text.includes("бесплатная гостевая парковка"));

		const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const seenIds = new Set<string>();
		for (const t of OMNICHANNEL_TEMPLATES) {
			assert.equal(seenIds.has(t.id), false, `Duplicate template id ${t.id}`);
			seenIds.add(t.id);
			assert.ok(t.label.trim().length > 0);
			assert.ok(!EMOJI_REGEX.test(t.text), `Template ${t.id} must not contain cartoon emojis per Mandate 8d`);
			assert.equal(t.text.includes("043/у") || t.text.includes("804н"), false);
		}
	});

	it("3. executeBookAppointmentFromChat handles minimal patient context without phone without crashing", () => {
		useAppStore.setState({ currentView: "communications" });
		useUiSurfaceStore.setState({ activeDrawer: null });

		executeBookAppointmentFromChat(
			{
				id: "pat-chat-min",
				fullName: "Иванова Мария Сергеевна",
				reason: "Осмотр",
			},
			{ todayIso: "2026-10-27" },
		);

		const draft = useScheduleStore.getState().newAppointmentDraft;
		assert.equal(draft.patientId, "pat-chat-min");
		assert.equal(draft.date, "2026-10-27");
		assert.equal(draft.reason, "Осмотр");
		assert.equal(useAppStore.getState().currentView, "schedule");
		assert.equal(useUiSurfaceStore.getState().activeDrawer, "quick_booking");
	});
});
