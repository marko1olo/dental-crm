/**
 * Unit Test Suite for Round 85: QR-Code Quick Reception Check-in in Patient Mobile Cabinet (375px)
 * (DOMAIN: PORTAL PATIENT CABINET & RECEPTION QR 375PX)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
	generateReceptionCheckinQrPayload,
	type ReceptionCheckinQrResult,
} from "../components/portal/patientCabinet/patientCabinetEngine";
import { DEMO_PATIENT_CABINET } from "../components/portal/patientCabinet/patientCabinetPresets";

test("Round 85: Patient Portal Mobile Reception QR Suite (375px)", async (t) => {
	await t.test("1. generateReceptionCheckinQrPayload creates high-contrast SVG QR matrix & check-in data", () => {
		const demo = DEMO_PATIENT_CABINET;
		const result: ReceptionCheckinQrResult = generateReceptionCheckinQrPayload(demo);

		assert.ok(result.qrPayload.startsWith("DENTE:CHECKIN:v1|"), "Payload must have valid DENTE format");
		assert.ok(result.qrPayload.includes(`pid=${demo.patientId}`), "Payload must contain patientId");
		assert.ok(result.qrPayload.includes(`card=${demo.cardNumber}`), "Payload must contain cardNumber");
		assert.ok(result.qrCodeSvg.includes("<svg"), "Must produce valid SVG XML string");
		assert.ok(result.qrCodeSvg.includes('fill="#000000"'), "Must use pure high-contrast black fill for optical barcode scanners");
		assert.ok(result.qrCodeSvg.includes('fill="#ffffff"'), "Must have white background for scanner contrast");
		assert.equal(result.fullName, demo.fullName);
		assert.equal(result.cardNumber, demo.cardNumber);
		assert.ok(result.nextAppointment !== undefined, "Demo cabinet must have an upcoming appointment");
		assert.equal(result.nextAppointment?.timeRu, "14:30");
		assert.ok(result.receptionInstructionsRu.includes("ресепшен"));
	});

	const srcDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src"))
		? path.resolve(process.cwd(), "apps/web/src")
		: path.resolve(process.cwd(), "src");

	await t.test("2. PatientCabinetModal contains Reception QR Banner and 'Показать администратору' button", () => {
		const modalPath = path.resolve(srcDir, "components/portal/patientCabinet/PatientCabinetModal.tsx");
		const modalSrc = fs.readFileSync(modalPath, "utf-8");

		assert.ok(modalSrc.includes("data-testid=\"reception-qr-banner\""), "Must render reception-qr-banner in Overview tab");
		assert.ok(modalSrc.includes("Показать администратору"), "Must have button 'Показать администратору'");
		assert.ok(modalSrc.includes("data-testid=\"btn-show-reception-qr\""), "Must have testid for reception QR button");
		assert.ok(modalSrc.includes("data-testid=\"reception-qr-modal\""), "Must render reception-qr-modal dialog");
	});

	await t.test("3. Nearest visit card highlights time with 20px bold font and cabinet room number", () => {
		const modalPath = path.resolve(srcDir, "components/portal/patientCabinet/PatientCabinetModal.tsx");
		const modalSrc = fs.readFileSync(modalPath, "utf-8");

		assert.ok(modalSrc.includes("pc-next-visit-time"), "Must use pc-next-visit-time class");
		assert.ok(modalSrc.includes("pc-next-visit-room"), "Must use pc-next-visit-room class");
		assert.ok(modalSrc.includes("data-testid=\"next-appt-qr-btn\""), "Next appointment card must have reception QR button");

		const cssPath = path.resolve(srcDir, "components/portal/patientCabinet/patientCabinet.css");
		const cssSrc = fs.readFileSync(cssPath, "utf-8");

		assert.ok(cssSrc.includes(".pc-next-visit-time"), "CSS must define .pc-next-visit-time");
		assert.ok(cssSrc.includes("font-size: 20px"), "Time must be styled at 20px font-size");
		assert.ok(cssSrc.includes("font-weight: 800"), "Time must be styled as bold");
	});

	await t.test("4. Touch targets >= 48px and zero horizontal overflow compliance for 375px mobile viewports", () => {
		const cssPath = path.resolve(srcDir, "components/portal/patientCabinet/patientCabinet.css");
		const cssSrc = fs.readFileSync(cssPath, "utf-8");

		assert.ok(cssSrc.includes(".pc-reception-qr-card"), "CSS must style .pc-reception-qr-card");

		const touchCssPath = path.resolve(srcDir, "styles/touch-targets.css");
		const touchCssSrc = fs.readFileSync(touchCssPath, "utf-8");

		assert.ok(touchCssSrc.includes("overflow-x: hidden"), "touch-targets.css must enforce zero horizontal scroll");
		assert.ok(touchCssSrc.includes("min-height: 48px"), "touch-targets.css must enforce >= 48px touch targets");
	});
});
