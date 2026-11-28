import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { POPULAR_STERILIZER_BRAND_PRESETS, type SterilizerEquipment } from "@dental/shared";
import {
	SterilizerPassportCard,
	SterilizerCycleLogsTable,
	SterilizerMaintenanceSchedule,
	SterilizerModalFooterActions,
	useSterilizerEquipmentForm,
	type SterilizerFormData,
} from "../sterilizerEquipment";
import { SterilizerEquipmentModal } from "../SterilizerEquipmentModal";

const REAL_HTML_DISABLED_BTN_REGEX = /<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i;

const sampleFormData: SterilizerFormData = {
	name: "Melag Vacuklav 23B+",
	brandModel: "Vacuklav 23B+",
	serialNumber: "SN-2026-001",
	inventoryNumber: "INV-01",
	deviceType: "steam_autoclave",
	deviceClass: "B",
	chamberVolumeLiters: 22,
	locationRoom: "ЦСО",
	verificationExpiryDate: "2027-06-01",
	lastMaintenanceDate: "2026-06-01",
	nextMaintenanceDate: "2027-06-01",
	commissioningDate: "2026-01-15",
	status: "active",
	notes: "",
};

describe("SanPiN 3.3686-21 — Sterilizer Equipment Decomposed Architecture (Mandates 8b, 8d, 8e)", () => {
	it("verifies public export parity and presets", () => {
		assert.equal(typeof SterilizerEquipmentModal, "function");
		assert.equal(typeof SterilizerPassportCard, "function");
		assert.equal(typeof SterilizerCycleLogsTable, "function");
		assert.equal(typeof SterilizerMaintenanceSchedule, "function");
		assert.equal(typeof SterilizerModalFooterActions, "function");
		assert.equal(typeof useSterilizerEquipmentForm, "function");
		assert.ok(POPULAR_STERILIZER_BRAND_PRESETS.length >= 1);
	});

	it("renders decomposed sterilizer subcomponents with zero disabled buttons and zero cartoon emojis", () => {
		const renders = [
			renderToStaticMarkup(
				React.createElement(SterilizerCycleLogsTable, { cycleLogs: [], isLoading: false, onRefresh: () => {} }),
			),
			renderToStaticMarkup(
				React.createElement(SterilizerModalFooterActions, { isSaving: false, isEditing: false, onClose: () => {} }),
			),
			renderToStaticMarkup(
				React.createElement(SterilizerPassportCard, {
					formData: sampleFormData,
					onFieldChange: () => {},
					selectedPresetId: null,
					onApplyPreset: () => {},
					isEditing: false,
				}),
			),
			renderToStaticMarkup(
				React.createElement(SterilizerMaintenanceSchedule, {
					formData: sampleFormData,
					onFieldChange: () => {},
					isEditing: true,
					submitting: false,
					onQuickMaintenance: () => {},
					onQuickReturnToService: () => {},
					onQuickDecommission: () => {},
					decommissionReason: "",
					setDecommissionReason: () => {},
					showDecommissionConfirm: false,
					setShowDecommissionConfirm: () => {},
				}),
			),
		];

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		for (const html of renders) {
			assert.ok(html.length > 0);
			assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(html), false);
			assert.equal(emojiRegex.test(html.replace(/[✓✕•→]/g, "")), false);
		}
	});
});
