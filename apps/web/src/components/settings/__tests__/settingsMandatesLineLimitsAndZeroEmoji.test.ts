import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const settingsDir = path.resolve(__dirname, "..");

const EMOJI_REGEX = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

const DECOMPOSED_FILES = [
	"SettingsAccessTab.tsx",
	"access/AccessSecurityHero.tsx",
	"access/AccessSecurityGuaranteesGrid.tsx",
	"access/useInviteStaffForm.ts",
	"access/InviteStaffCard.tsx",
	"access/ActiveWorkspaceProfileCard.tsx",
	"access/WorkspaceProfilesGrid.tsx",
	"access/AccessPoliciesGrid.tsx",
	"AiRecognitionJobsPanel.tsx",
	"ai/useAiRecognitionJobs.ts",
	"admin/AdminCadenceCard.tsx",
	"admin/AdminMessengersCadenceCard.tsx",
	"admin/useAdminCadenceState.ts",
	"staff/StaffMemberCard.tsx",
	"staff/StaffMemberCardActions.tsx",
	"DelimitedTileCard.tsx",
	"DoctorSettingsSection.tsx",
	"AdminSettingsSection.tsx",
];

describe("Settings Mandates: Line Limits (<= 120 lines) & Zero Emoji", () => {
	it("Все декомпозированные файлы строго <= 120 строк", () => {
		for (const rel of DECOMPOSED_FILES) {
			const full = path.join(settingsDir, rel);
			assert.ok(fs.existsSync(full), `Файл должен существовать: ${rel}`);
			const count = fs.readFileSync(full, "utf-8").split("\n").length;
			assert.ok(count <= 120, `Файл ${rel} превысил лимит 120 строк: ${count}`);
		}
	});

	it("Файлы не содержат мультяшных эмодзи", () => {
		for (const rel of DECOMPOSED_FILES) {
			const full = path.join(settingsDir, rel);
			const text = fs.readFileSync(full, "utf-8");
			assert.equal(EMOJI_REGEX.test(text), false, `Файл ${rel} содержит эмодзи`);
		}
	});

	it("DelimitedTileCard имеет непрозрачную основу и правильные классы", () => {
		const text = fs.readFileSync(path.join(settingsDir, "DelimitedTileCard.tsx"), "utf-8");
		assert.ok(text.includes("bg-[var(--paper-card)]"));
		assert.ok(text.includes("border-[var(--line)]"));
		assert.equal(text.includes("bg-slate-300"), false);
	});
});
