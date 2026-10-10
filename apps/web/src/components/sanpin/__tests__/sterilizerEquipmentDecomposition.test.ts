import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
	POPULAR_STERILIZER_BRAND_PRESETS,
	type SterilizerEquipment,
} from "@dental/shared";
import {
	SterilizerPassportCard,
	SterilizerCycleLogsTable,
	SterilizerMaintenanceSchedule,
	SterilizerModalFooterActions,
	useSterilizerEquipmentForm,
} from "../sterilizerEquipment";
import { SterilizerEquipmentModal } from "../SterilizerEquipmentModal";

describe("SanPiN 3.3686-21 — Sterilizer Equipment Decomposed Architecture (Mandates 8b, 8d, 8e)", () => {
	it("verifies public export parity and component definitions", () => {
		assert.equal(typeof SterilizerEquipmentModal, "function");
		assert.equal(typeof SterilizerPassportCard, "function");
		assert.equal(typeof SterilizerCycleLogsTable, "function");
		assert.equal(typeof SterilizerMaintenanceSchedule, "function");
		assert.equal(typeof SterilizerModalFooterActions, "function");
		assert.equal(typeof useSterilizerEquipmentForm, "function");
	});

	it("verifies facade SterilizerEquipmentModal.tsx line count is strictly <= 120 lines (Mandate 8b)", () => {
		const facadePath = path.resolve(process.cwd(), "apps/web/src/components/sanpin/SterilizerEquipmentModal.tsx");
		assert.ok(fs.existsSync(facadePath), "Facade file must exist");
		const content = fs.readFileSync(facadePath, "utf8");
		const lineCount = content.split(/\r?\n/).length;
		assert.ok(lineCount <= 120, `Facade must be <= 120 lines, got ${lineCount}`);
		assert.ok(content.includes("createPortal"), "Facade must mount via createPortal");
		assert.ok(content.includes("document.body"), "Portal must attach to document.body");
	});

	it("verifies all decomposed modules are strictly <= 500 lines", () => {
		const decomposedDir = path.resolve(process.cwd(), "apps/web/src/components/sanpin/sterilizerEquipment");
		assert.ok(fs.existsSync(decomposedDir), "Decomposed directory must exist");
		const files = fs.readdirSync(decomposedDir);
		for (const file of files) {
			if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
			const filePath = path.join(decomposedDir, file);
			const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).length;
			assert.ok(lines <= 500, `Module ${file} exceeds 500 lines limit (${lines} lines)`);
		}
	});

	it("verifies zero disabled button attributes in decomposed sterilizer modules (Mandate 8e)", () => {
		const decomposedDir = path.resolve(process.cwd(), "apps/web/src/components/sanpin/sterilizerEquipment");
		const files = fs.readdirSync(decomposedDir);
		for (const file of files) {
			if (!file.endsWith(".tsx")) continue;
			const content = fs.readFileSync(path.join(decomposedDir, file), "utf8");
			assert.ok(!content.includes("disabled="), `Found disabled= in ${file}`);
		}
	});

	it("verifies zero cartoon emojis across sterilizerEquipment directory (Mandate 8d pt 7)", () => {
		const decomposedDir = path.resolve(process.cwd(), "apps/web/src/components/sanpin/sterilizerEquipment");
		const files = fs.readdirSync(decomposedDir);
		for (const file of files) {
			if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
			const content = fs.readFileSync(path.join(decomposedDir, file), "utf8");
			const match = content.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u);
			assert.equal(match, null, `Found cartoon emoji in ${file}`);
		}
	});
});
