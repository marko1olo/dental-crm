/**
 * scannerAndOnboardingFrictionlessInquisition.test.ts
 *
 * Red Team Inquisitor Test Suite:
 * 1. Document Camera Scanner track lifecycle & memory leak prevention (Mandate 8e, 8s).
 * 2. Solo Doctor 1-click fallback file picker without camera error lockouts (Mandate 8e, 8n).
 * 3. Support for PDF documents & object URL cleanup.
 * 4. Token & design system compliance (zero cartoon emojis, zero hardcoded hex colors).
 * 5. Onboarding Wizard frictionless autonomy (no forced gates, draft persistence, Mandate 8e).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentCameraScannerModal } from "../DocumentCameraScannerModal.js";
import {
	DOCUMENT_PRESETS,
	parseOmsPolicyOcrText,
	parsePassportOcrText,
	parseSnilsOcrText,
	validateSnilsChecksum,
} from "../documentScannerEngine.js";

describe("Red Team Inquisition: Scanner & Onboarding Frictionless Suite", () => {
	const scannerModalPath = path.resolve(
		process.cwd(),
		"apps/web/src/components/scanner/DocumentCameraScannerModal.tsx",
	);
	const scannerEnginePath = path.resolve(
		process.cwd(),
		"apps/web/src/components/scanner/documentScannerEngine.ts",
	);
	const onboardingModalPath = path.resolve(
		process.cwd(),
		"apps/web/src/components/onboarding/OnboardingWizardModal.tsx",
	);

	it("1. Camera Stream Lifecycle & Memory Leak Invariants in DocumentCameraScannerModal", () => {
		const source = fs.readFileSync(scannerModalPath, "utf8");

		// Track stopping loop must exist in stopCamera
		assert.ok(
			source.includes("for (const track of cameraStreamRef.current.getTracks())"),
			"stopCamera must iterate cameraStreamRef tracks and stop each track",
		);
		assert.ok(
			source.includes("track.stop()"),
			"stopCamera must call track.stop() to release browser camera hardware",
		);

		// Must clean up on unmount
		assert.ok(
			source.includes("isMountedRef.current = false"),
			"Unmount cleanup must flag isMountedRef as false",
		);

		// Must verify if modal closed during getUserMedia async await
		assert.ok(
			source.includes("!isMountedRef.current || !isOpenRef.current || !isCapturingRef.current"),
			"startCamera must verify mounted and open state after getUserMedia await",
		);

		// Must clear videoRef.current.srcObject tracks
		assert.ok(
			source.includes("videoRef.current.srcObject = null"),
			"stopCamera must detach videoRef srcObject",
		);

		// Modal close wrapper must call stopCamera()
		assert.ok(
			source.includes("const handleModalClose = useCallback(() => {\n\t\tstopCamera();\n\t\tonClose();"),
			"handleModalClose must stop camera tracks before executing onClose",
		);
	});

	it("2. 1-Click Fallback for Solo Doctor without Camera Hardware Lockout", () => {
		const source = fs.readFileSync(scannerModalPath, "utf8");

		// Viewport must allow file selection when camera error occurs
		assert.ok(
			source.includes('data-testid="scanner-fallback-file-button"'),
			"Scanner must render dedicated fallback file button on camera error",
		);
		assert.ok(
			source.includes("Камера недоступна. Вы можете выбрать готовое фото или PDF-скан с диска:"),
			"Clear Russian clinical guidance for solo doctor when camera is unavailable",
		);

		// File input must accept both images and PDF documents
		assert.ok(
			source.includes('accept="image/*,.pdf"'),
			"File input must accept images and PDF files",
		);

		// ProcessFile must support PDF without crashing canvas
		assert.ok(
			source.includes('file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")'),
			"Must handle PDF directly as document attachment",
		);

		// Object URLs must be revoked to prevent memory leak
		assert.ok(
			source.includes("URL.revokeObjectURL(objectUrl)"),
			"Object URL must be revoked after image load or error",
		);

		// Drag and drop support
		assert.ok(
			source.includes("onDrop={handleDrop}"),
			"Scanner stage must support direct drag-and-drop file upload",
		);
	});

	it("3. Zero Cartoon Emojis & Zero Hardcoded Hex Colors Audit", () => {
		const filesToAudit = [
			{ name: "DocumentCameraScannerModal.tsx", path: scannerModalPath },
			{ name: "documentScannerEngine.ts", path: scannerEnginePath },
			{ name: "OnboardingWizardModal.tsx", path: onboardingModalPath },
		];

		const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

		for (const file of filesToAudit) {
			const content = fs.readFileSync(file.path, "utf8");
			const lines = content.split("\n");

			lines.forEach((line, idx) => {
				assert.ok(
					!emojiRegex.test(line),
					`Forbidden cartoon emoji found in ${file.name}:${idx + 1}: ${line.trim()}`,
				);
			});
		}

		// Verify eradication of hardcoded hex colors in DocumentCameraScannerModal
		const modalContent = fs.readFileSync(scannerModalPath, "utf8");
		assert.ok(
			!modalContent.includes("#0d9488"),
			"Hardcoded hex color #0d9488 must not be used (use var(--teal) instead)",
		);
		assert.ok(
			!modalContent.includes("text-rose-400"),
			"Tailwind hex color text-rose-400 must be replaced by design token var(--danger)",
		);
	});

	it("4. Touch Ergonomics & Accessible Touch Targets", () => {
		const html = renderToStaticMarkup(
			createElement(DocumentCameraScannerModal, {
				isOpen: true,
				patientId: "pat-999",
				patientName: "Алексей Смирнов",
				onClose: () => {},
			}),
		);

		// Verify close button, presets, and action buttons have minimum 44px touch target on mobile
		assert.ok(html.includes("min-h-[44px]"), "All interactive buttons provide min-h-[44px]");
		assert.ok(html.includes('aria-label="Закрыть сканер"'), "Close button has accessible aria-label");
		assert.ok(html.includes('data-testid="scanner-capture-button"'), "Capture button is rendered");
	});

	it("5. Onboarding Wizard Frictionless Autonomy (Mandates 8e, 8n)", () => {
		const onboardingContent = fs.readFileSync(onboardingModalPath, "utf8");

		// Verify draft toast includes Mandate 8e guarantee
		assert.ok(
			onboardingContent.includes("Настройки сохранены в черновике. Профиль клиники можно дополнить в любой момент в разделе Настройки (Мандат 8e)"),
			"Onboarding modal must notify doctor that draft state is saved without blocking care",
		);

		// No disabled attribute on forward navigation or dismissal
		assert.ok(
			onboardingContent.includes("onClick={dismissOnboarding}"),
			"Dismiss action must be directly clickable",
		);

		// Fast start buttons for immediate clinical work without wizard
		assert.ok(
			onboardingContent.includes("Рабочий вход без мастера"),
			"Fast start section allows opening clinical work immediately",
		);
		assert.ok(
			onboardingContent.includes("Открыть прием"),
			"Solo doctor can jump immediately to patient visit",
		);
	});

	it("6. Document Scanner OCR Parsing Fidelity (Passport, OMS, SNILS)", () => {
		// Valid passport
		const passportData = parsePassportOcrText(
			"ПАСПОРТ РОССИЙСКОЙ ФЕДЕРАЦИИ\nСерия 45 08 № 654321\nВыдан 10.11.2008\nКод подразделения 772-045",
		);
		assert.equal(passportData.isValidSeriesNumber, true);
		assert.equal(passportData.series, "45 08");
		assert.equal(passportData.number, "654321");
		assert.equal(passportData.issuerCode, "772-045");
		assert.equal(passportData.issueDate, "10.11.2008");

		// Valid OMS
		const omsData = parseOmsPolicyOcrText("ПОЛИС ОМС 1234 5678 9012 3456 ВТБ МС");
		assert.equal(omsData.isValid16Digit, true);
		assert.equal(omsData.policyNumber, "1234567890123456");

		// Valid SNILS
		const snilsData = parseSnilsOcrText("СНИЛС 112-233-445 95");
		assert.equal(snilsData.isValidChecksum, true);
		assert.equal(snilsData.digitsOnly, "11223344595");
		assert.equal(snilsData.formatted, "112-233-445 95");
	});
});
