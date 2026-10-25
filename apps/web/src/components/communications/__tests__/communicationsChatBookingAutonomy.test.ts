import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { useAppStore } from "../../../store/appStore";
import { useScheduleStore } from "../../../store/scheduleStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { executeBookAppointmentFromChat } from "../bookFromChatAutonomy";
import { OMNICHANNEL_TEMPLATES } from "../../omnichannel_chat/omnichannelChatTemplates";

describe("Communications & Chat 1-Click Booking Autonomy (Mandates 8e, 8n & 8b)", () => {
	it("1. executeBookAppointmentFromChat immediately populates schedule draft and opens quick booking drawer", () => {
		useAppStore.setState({ currentView: "communications" });
		useUiSurfaceStore.setState({ activeDrawer: null });

		executeBookAppointmentFromChat({
			id: "pat-chat-1",
			fullName: "Васильев Пётр Николаевич",
			phone: "+79998887766",
			reason: "Консультация по имплантации",
		}, { todayIso: "2026-10-26" });

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

	it("2. Omnichannel templates contain clinical memos (surgery, parking, reminder) without cartoon emojis", () => {
		const surgeryTmpl = OMNICHANNEL_TEMPLATES.find((t) => t.id === "post_op_surgery");
		assert.ok(surgeryTmpl, "Surgery post-op memo must exist");
		assert.ok(surgeryTmpl.text.includes("удаления / имплантации"));
		assert.ok(surgeryTmpl.text.includes("кровяной сгусток"));

		const parkingTmpl = OMNICHANNEL_TEMPLATES.find((t) => t.id === "clinic_parking");
		assert.ok(parkingTmpl, "Parking memo must exist");
		assert.ok(parkingTmpl.text.includes("бесплатная гостевая парковка"));

		const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		for (const t of OMNICHANNEL_TEMPLATES) {
			assert.ok(!EMOJI_REGEX.test(t.text), `Template ${t.id} must not contain cartoon emojis per Mandate 8d`);
		}
	});

	it("3. All communications CSS modules strictly respect <= 120 lines budget per Mandate 8b", () => {
		const stylesDir = path.resolve(__dirname, "../styles");
		const scanDirs = [
			stylesDir,
			path.join(stylesDir, "mobileMessenger"),
			path.join(stylesDir, "staffMessenger"),
		];

		for (const dir of scanDirs) {
			if (!fs.existsSync(dir)) continue;
			for (const file of fs.readdirSync(dir)) {
				const fullPath = path.join(dir, file);
				if (fs.statSync(fullPath).isFile() && file.endsWith(".css")) {
					const lines = fs.readFileSync(fullPath, "utf8").split("\n").length;
					assert.ok(lines <= 120, `CSS Module ${file} exceeds 120 lines limit: ${lines} lines`);
				}
			}
		}

		const rootMobileCss = path.resolve(__dirname, "../mobileCommunicationsMessenger.css");
		const mobileLines = fs.readFileSync(rootMobileCss, "utf8").split("\n").length;
		assert.ok(mobileLines <= 120, `mobileCommunicationsMessenger.css exceeds 120 lines: ${mobileLines}`);

		const rootStaffCss = path.resolve(__dirname, "../staffMessenger.css");
		const staffLines = fs.readFileSync(rootStaffCss, "utf8").split("\n").length;
		assert.ok(staffLines <= 120, `staffMessenger.css exceeds 120 lines: ${staffLines}`);
	});
});
