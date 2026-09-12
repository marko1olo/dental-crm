/**
 * wave119EmojiPurification.test.ts
 *
 * Unit tests verifying complete eradication of raw cartoon emojis across
 * Insurance/DMS, Recall, Offline/Settings, and SanPiN modules in accordance
 * with Supreme Law: THE HAMMER (Mandate 8d, 7th deadly sin of UI).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

describe("Wave 119: Raw Emoji Eradication (Mandates 8a–8q)", () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const repoRoot = path.resolve(__dirname, "../../../../../..");

	const RAW_EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}]|⚡|🦷|⚠️|❌|✅|🚨|🔥|✓/u;

	it("1. InsurancePreAuthModal: zero raw emojis, uses Lucide Zap vector icon", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/insurance/InsurancePreAuthModal.tsx",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("⚡"), "InsurancePreAuthModal must not contain raw ⚡ emoji");
		assert.ok(!content.includes("✓"), "InsurancePreAuthModal must not contain raw ✓ symbol");
		assert.ok(!RAW_EMOJI_REGEX.test(content), "InsurancePreAuthModal must be free of raw emojis");
		assert.ok(content.includes("<Zap"), "InsurancePreAuthModal must render Lucide Zap vector icon");
	});

	it("2. DmsInsuranceManagerModal: zero raw emojis, uses Lucide Zap vector icon", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/insurance/dmsManager/DmsInsuranceManagerModal.tsx",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("⚡"), "DmsInsuranceManagerModal must not contain raw ⚡ emoji");
		assert.ok(!RAW_EMOJI_REGEX.test(content), "DmsInsuranceManagerModal must be free of raw emojis");
		assert.ok(content.includes("<Zap"), "DmsInsuranceManagerModal must render Lucide Zap vector icon");
	});

	it("3. DmsGuaranteeLettersModal: zero raw emojis, uses Lucide Zap vector icon", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/insurance/DmsGuaranteeLettersModal.tsx",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("⚡"), "DmsGuaranteeLettersModal must not contain raw ⚡ emoji");
		assert.ok(!RAW_EMOJI_REGEX.test(content), "DmsGuaranteeLettersModal must be free of raw emojis");
		assert.ok(content.includes("<Zap"), "DmsGuaranteeLettersModal must render Lucide Zap vector icon");
	});

	it("4. DmsGuaranteeLetterModal: zero raw emojis, uses Lucide Zap vector icon", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/insurance/DmsGuaranteeLetterModal.tsx",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("⚡"), "DmsGuaranteeLetterModal must not contain raw ⚡ emoji");
		assert.ok(!content.includes("✓"), "DmsGuaranteeLetterModal must not contain raw ✓ symbol");
		assert.ok(!RAW_EMOJI_REGEX.test(content), "DmsGuaranteeLetterModal must be free of raw emojis");
		assert.ok(content.includes("<Zap"), "DmsGuaranteeLetterModal must render Lucide Zap vector icon");
	});

	it("5. PatientRecallManagerModal: zero raw emojis, uses Lucide Smartphone & Lightbulb icons", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/recalls/PatientRecallManagerModal.tsx",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("🦷"), "PatientRecallManagerModal must not contain raw 🦷 emoji");
		assert.ok(!content.includes("📱"), "PatientRecallManagerModal must not contain raw 📱 emoji");
		assert.ok(!content.includes("💡"), "PatientRecallManagerModal must not contain raw 💡 emoji");
		assert.ok(!content.includes("✨"), "PatientRecallManagerModal must not contain raw ✨ emoji");
		assert.ok(!content.includes("📅"), "PatientRecallManagerModal must not contain raw 📅 emoji");
		assert.ok(!RAW_EMOJI_REGEX.test(content), "PatientRecallManagerModal must be free of raw emojis");
		assert.ok(content.includes("<Smartphone"), "PatientRecallManagerModal must render Lucide Smartphone icon");
		assert.ok(content.includes("<Lightbulb"), "PatientRecallManagerModal must render Lucide Lightbulb icon");
	});

	it("6. OfflineBackupVaultPanel: zero raw emojis, uses Lucide AlertTriangle and XCircle icons", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/settings/OfflineBackupVaultPanel.tsx",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("⚠️"), "OfflineBackupVaultPanel must not contain raw ⚠️ emoji");
		assert.ok(!content.includes("❌"), "OfflineBackupVaultPanel must not contain raw ❌ emoji");
		assert.ok(!content.includes("✅"), "OfflineBackupVaultPanel must not contain raw ✅ emoji");
		assert.ok(!RAW_EMOJI_REGEX.test(content), "OfflineBackupVaultPanel must be free of raw emojis");
		assert.ok(content.includes("<AlertTriangle"), "OfflineBackupVaultPanel must render Lucide AlertTriangle icon");
		assert.ok(content.includes("<XCircle"), "OfflineBackupVaultPanel must render Lucide XCircle icon");
		assert.ok(content.includes("<CheckCircle2"), "OfflineBackupVaultPanel must render Lucide CheckCircle2 icon");
	});

	it("7. SettingsAiTab: zero raw emojis, uses Lucide CheckCircle2 icon", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/settings/SettingsAiTab.tsx",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("✅"), "SettingsAiTab must not contain raw ✅ emoji");
		assert.ok(!RAW_EMOJI_REGEX.test(content), "SettingsAiTab must be free of raw emojis");
		assert.ok(content.includes("<CheckCircle2"), "SettingsAiTab must render Lucide CheckCircle2 icon");
	});

	it("8. OfflineReadinessBanner: zero raw emojis, uses Lucide Zap vector icon", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/offline/OfflineReadinessBanner.tsx",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("⚡"), "OfflineReadinessBanner must not contain raw ⚡ emoji");
		assert.ok(!RAW_EMOJI_REGEX.test(content), "OfflineReadinessBanner must be free of raw emojis");
		assert.ok(content.includes("<Zap"), "OfflineReadinessBanner must render Lucide Zap vector icon");
	});

	it("9. SanpinRegisters: zero raw emojis, uses Lucide Sparkles vector icon", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/sanpin/SanpinRegisters.tsx",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("⚡"), "SanpinRegisters must not contain raw ⚡ emoji");
		assert.ok(!RAW_EMOJI_REGEX.test(content), "SanpinRegisters must be free of raw emojis");
		assert.ok(content.includes("<Sparkles"), "SanpinRegisters must render Lucide Sparkles vector icon");
	});

	it("10. SanpinCycleModal: zero raw emojis, uses Lucide Sparkles vector icon", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/sanpin/SanpinCycleModal.tsx",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("⚡"), "SanpinCycleModal must not contain raw ⚡ emoji");
		assert.ok(!RAW_EMOJI_REGEX.test(content), "SanpinCycleModal must be free of raw emojis");
		assert.ok(content.includes("<Sparkles"), "SanpinCycleModal must render Lucide Sparkles vector icon");
	});

	it("11. SeniorNurseKraftUnsealModal: zero raw emojis, uses Lucide Zap and Sparkles icons", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/sanpin/kraft/SeniorNurseKraftUnsealModal.tsx",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("⚡"), "SeniorNurseKraftUnsealModal must not contain raw ⚡ emoji");
		assert.ok(!RAW_EMOJI_REGEX.test(content), "SeniorNurseKraftUnsealModal must be free of raw emojis");
		assert.ok(content.includes("<Zap"), "SeniorNurseKraftUnsealModal must render Lucide Zap icon");
		assert.ok(content.includes("<Sparkles"), "SeniorNurseKraftUnsealModal must render Lucide Sparkles icon");
	});

	it("12. MedicalWasteJournalModal: zero raw emojis, uses Lucide Sparkles icon", () => {
		const filePath = path.join(
			repoRoot,
			"apps/web/src/components/sanpin/waste/MedicalWasteJournalModal.tsx",
		);
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("⚡"), "MedicalWasteJournalModal must not contain raw ⚡ emoji");
		assert.ok(!RAW_EMOJI_REGEX.test(content), "MedicalWasteJournalModal must be free of raw emojis");
		assert.ok(content.includes("<Sparkles"), "MedicalWasteJournalModal must render Lucide Sparkles icon");
	});
});
