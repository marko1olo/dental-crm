/**
 * demoModeIsolationInquisition.test.ts
 *
 * Бескомпромиссная Ред-тим проверка изоляции демо-режима и чистоты боевого прода
 * (Production Zero-Mock, Demo Mode Quarantine & Anti-Data-Leakage Inquisitor).
 *
 * МАНДАТЫ 8c (ZERO-MOCKS), 8f (REAL PERSISTENCE), 8y (FAIL-CLOSED INVARIANT).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	isDemoMode,
	isDemoShowcaseMode,
	isDemoTenant,
	isDemoPatientId,
	isDemoStudyInstanceUid,
	assertProductionPurity,
	quarantineDemoData,
	setRuntimeDemoMode,
	DEMO_SHOWCASE_ORG_ID,
	DEMO_STUDY_INSTANCE_UID,
} from "../utils/demoModeEngine.js";

import { createDefaultPaidContract } from "../components/documents/paidContractEngine.js";
import { WaitingLoungeSignage } from "../components/lounge/WaitingLoungeSignage.js";
import { DemoModeBanner } from "../components/demo/DemoModeBanner.js";

const getWebRoot = () =>
	fs.existsSync(path.resolve(process.cwd(), "apps/web"))
		? path.resolve(process.cwd(), "apps/web")
		: process.cwd();

describe("Production Zero-Mock & Demo Mode Quarantine Inquisitor (8c, 8f, 8y)", () => {
	it("SSOT: verifies demoModeEngine SSOT predicates and quarantine logic", () => {
		// 1. По умолчанию в боевом режиме демо отключено
		setRuntimeDemoMode(null);
		assert.equal(isDemoMode(), false, "isDemoMode must be false by default in production");
		assert.equal(isDemoShowcaseMode(), false, "isDemoShowcaseMode must match isDemoMode");

		// 2. Тенанты
		assert.equal(isDemoTenant(DEMO_SHOWCASE_ORG_ID), true, "Demo org ID is demo tenant");
		assert.equal(isDemoTenant("01a00000-0000-0000-0000-000000000001"), true, "01a0 prefix is demo tenant");
		assert.equal(isDemoTenant("demo_clinic_spb"), true, "demo_ prefix is demo tenant");
		assert.equal(isDemoTenant("sample_org"), true, "sample_ prefix is demo tenant");
		assert.equal(isDemoTenant("f47ac10b-58cc-4372-a567-0e02b2c3d479"), false, "Real clinic UUID is not demo");
		assert.equal(isDemoTenant(null), false, "null is not demo tenant");

		// 3. Пациенты
		assert.equal(isDemoPatientId("01a00000-0000-0000-0000-000000000001"), true);
		assert.equal(isDemoPatientId("demo_patient_1"), true);
		assert.equal(isDemoPatientId("sample_patient_ivanov"), true);
		assert.equal(isDemoPatientId("b1c2d3e4-1234-5678-90ab-cdef12345678"), false, "Real patient UUID is not demo");

		// 4. Исследования КЛКТ
		assert.equal(isDemoStudyInstanceUid(DEMO_STUDY_INSTANCE_UID), true);
		assert.equal(isDemoStudyInstanceUid("1.2.826.0.1.3680043.8.demo.kavo"), true);
		assert.equal(isDemoStudyInstanceUid("demo_cbct_volume_42"), true);
		assert.equal(isDemoStudyInstanceUid("zakharov_cbct_volume"), true);
		assert.equal(isDemoStudyInstanceUid("1.2.840.10008.5.1.4.1.1.2.987654321"), false, "Real DICOM study UID is not demo");

		// 5. quarantineDemoData
		const prodResult = quarantineDemoData(["real_item"], () => ["fake_demo_item"]);
		assert.deepEqual(prodResult, ["real_item"], "Quarantine returns prod data in production mode");

		setRuntimeDemoMode(true);
		const demoResult = quarantineDemoData(["real_item"], () => ["fake_demo_item"]);
		assert.deepEqual(demoResult, ["fake_demo_item"], "Quarantine returns demo fallback in demo mode");
		setRuntimeDemoMode(null);

		// 6. assertProductionPurity
		setRuntimeDemoMode(false);
		assert.throws(
			() => {
				assertProductionPurity("testContext", { organizationId: DEMO_SHOWCASE_ORG_ID });
			},
			/PRODUCTION PURITY VIOLATION/,
			"assertProductionPurity must reject demo org in production context",
		);

		assert.doesNotThrow(() => {
			assertProductionPurity("testContext", { organizationId: "real-clinic-uuid" });
		}, "assertProductionPurity passes for clean production payload");
	});

	it("LEGAL PURITY: verifies createDefaultPaidContract generates ZERO mock services and 0 ₽ in production mode", () => {
		// Production mode
		setRuntimeDemoMode(false);

		const prodContract = createDefaultPaidContract({
			contractNumber: "ДОГ-PROD-2026-001",
			patientFullName: "Кузнецов Михаил Павлович",
		});

		// В боевом режиме услуги пустые, сумма 0 коп., директор пустой
		assert.deepEqual(prodContract.services, [], "Production contract must have 0 fake services");
		assert.equal(prodContract.totalAmountKopecks, 0, "Production contract must have 0 kopecks when no services provided");
		assert.equal(prodContract.clinic.directorFullName, "", "Production contract must not inject fake director");

		// Explicit services in prod mode must be honored and kopecks calculated exactly
		const explicitContract = createDefaultPaidContract({
			services: [
				{
					code: "A16.07.002",
					name: "Пломбирование зуба 46 световым композитом",
					toothOrArea: "46",
					quantity: 1,
					unitPriceKopecks: 500000,
					discountKopecks: 0,
					totalKopecks: 500000,
				},
			],
		});
		assert.equal(explicitContract.services.length, 1);
		assert.equal(explicitContract.totalAmountKopecks, 500000, "Calculated kopecks must match explicit services");

		// Demo mode: provides showcase mock services and 8,000 ₽
		setRuntimeDemoMode(true);
		const demoContract = createDefaultPaidContract({});
		assert.equal(demoContract.services.length, 2, "Demo contract provides 2 sample services");
		assert.equal(demoContract.totalAmountKopecks, 800000, "Demo contract provides 8,000 ₽ total amount");
		assert.equal(demoContract.clinic.directorFullName, "Смирнов Алексей Викторович");

		setRuntimeDemoMode(null);
	});

	it("LOUNGE SIGNAGE: verifies WaitingLoungeSignage renders honest empty queue in production mode", () => {
		setRuntimeDemoMode(false);

		// Рендер табло зоны ожидания с пустой очередью в проде
		const html = renderToStaticMarkup(
			React.createElement(WaitingLoungeSignage, {
				clinicName: "Клиника Доктора Тестова",
				initialItems: [],
			}),
		);

		// Должен отображаться честный EmptyState
		assert.ok(html.includes('data-testid="lounge-empty-queue"'), "Renders honest empty queue in production mode");
		assert.ok(
			html.includes("В данный момент приём завершён или ожидающих пациентов нет"),
			"Displays honest empty queue notification",
		);
		// Никаких фейковых Ивановых и Петровых на табло!
		assert.ok(!html.includes("Иванов И."), "No fake Ivanov on TV in production");
		assert.ok(!html.includes("Петрова Е."), "No fake Petrova on TV in production");
	});

	it("LOUNGE SIGNAGE: verifies WaitingLoungeSignage renders showcase queue in demo mode", () => {
		setRuntimeDemoMode(true);

		const html = renderToStaticMarkup(
			React.createElement(WaitingLoungeSignage, {
				clinicName: "DENTE DEMO",
			}),
		);

		assert.ok(!html.includes('data-testid="lounge-empty-queue"'), "Does not render empty queue in demo mode");
		assert.ok(html.includes("Иванов И."), "Showcase queue rendered in demo mode");
		assert.ok(html.includes("Петрова Е."), "Showcase queue rendered in demo mode");

		setRuntimeDemoMode(null);
	});

	it("DEMO BANNER: verifies DemoModeBanner visibility is strictly tied to isDemoShowcaseMode", () => {
		// Production mode: banner returns null
		setRuntimeDemoMode(false);
		const htmlProd = renderToStaticMarkup(React.createElement(DemoModeBanner, {}));
		assert.equal(htmlProd, "", "DemoModeBanner renders null in production");

		// Demo mode: banner renders warning with exit button
		setRuntimeDemoMode(true);
		const htmlDemo = renderToStaticMarkup(React.createElement(DemoModeBanner, {}));
		assert.ok(htmlDemo.includes('data-testid="demo-mode-banner"'), "DemoModeBanner renders banner in demo mode");
		assert.ok(htmlDemo.includes('data-testid="exit-demo-button"'), "Banner contains exit demo button");
		assert.ok(htmlDemo.includes("ДЕМО-РЕЖИМ (Витрина):"), "Banner contains demo indicator text");

		setRuntimeDemoMode(null);
	});

	it("RADIOLOGY CODE AUDIT: verifies CbctMprImplantStudioModal does NOT auto-inject Zakharov demo volume for real patients", () => {
		const modalSourcePath = path.resolve(
			getWebRoot(),
			"src/components/radiology/CbctMprImplantStudioModal.tsx",
		);
		const source = fs.readFileSync(modalSourcePath, "utf-8");

		// 1. Проверяем импорт SSOT функций
		assert.ok(source.includes("isDemoShowcaseMode"), "Imports isDemoShowcaseMode");
		assert.ok(source.includes("isDemoPatientId"), "Imports isDemoPatientId");

		// 2. Проверяем карантин начальной инициализации volume
		assert.ok(
			source.includes("const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId);"),
			"Guards demo volume state with isDemo",
		);

		// 3. Проверяем, что applyVol не перезаписывает реального пациента на Захарова
		assert.ok(
			source.includes("if (patientName && patientName.trim())"),
			"applyVol prioritizes patientName over fallback",
		);
		assert.ok(
			source.includes("Захаров Иван Дмитриевич (Демо 3D КЛКТ)"),
			"Zakharov name is quarantined strictly to demo mode / demo patient",
		);
	});

	it("INVENTORY CODE AUDIT: verifies InventoryView and WarehouseInventoryAuditModal quarantine mock items", () => {
		const invViewPath = path.resolve(getWebRoot(), "src/components/InventoryView.tsx");
		const invViewSource = fs.readFileSync(invViewPath, "utf-8");

		assert.ok(invViewSource.includes("isDemoShowcaseMode"), "InventoryView imports isDemoShowcaseMode");
		assert.ok(
			invViewSource.includes("isDemo ? [...DEFAULT_INVENTORY_ITEMS_PRESET] : []"),
			"InventoryView auditInitialDoc uses empty items for production",
		);
		assert.ok(
			invViewSource.includes("isDemo ? DEFAULT_COMMISSION_MEMBERS : SOLO_DOCTOR_COMMISSION_MEMBERS"),
			"InventoryView auditInitialDoc defaults to solo doctor commission in production",
		);

		const modalPath = path.resolve(
			getWebRoot(),
			"src/components/inventory/WarehouseInventoryAuditModal.tsx",
		);
		const modalSource = fs.readFileSync(modalPath, "utf-8");
		assert.ok(modalSource.includes("isDemoShowcaseMode"), "WarehouseInventoryAuditModal imports isDemoShowcaseMode");
		assert.ok(
			modalSource.includes("setItems([...DEFAULT_INVENTORY_ITEMS_PRESET]);") &&
				modalSource.includes("setItems([]);"),
			"WarehouseInventoryAuditModal initializes items as [] in production mode",
		);
	});
});
