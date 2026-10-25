import assert from "node:assert";
import { describe, test } from "node:test";
import {
	createDicomSecondaryCaptureFile,
	generateDicomUid,
	transliterateCyrillicToLatin,
} from "../VisiographDicomExporter";
import { computeDoctorSignatureDigest } from "../VisiographLegalWatermark";

describe("Visiograph Legal Watermark & DICOM SC Export", () => {
	test("computeDoctorSignatureDigest generates deterministic Russian EDS verification stamp", () => {
		const d1 = computeDoctorSignatureDigest("Петров Петр Петрович", "pat_789", "2026-08-22T12:00:00Z");
		const d2 = computeDoctorSignatureDigest("Петров Петр Петрович", "pat_789", "2026-08-22T12:00:00Z");
		assert.ok(d1.startsWith("ГОСТ Р 34.10 · ЭЦП ["));
		assert.strictEqual(d1, d2);

		const dDiff = computeDoctorSignatureDigest("Петров Петр Петрович", "pat_999", "2026-08-22T12:00:00Z");
		assert.notStrictEqual(d1, dDiff);
	});

	test("transliterateCyrillicToLatin converts Russian medical names to DICOM PN standard", () => {
		assert.strictEqual(transliterateCyrillicToLatin("Иванов Иван Петрович"), "Ivanov Ivan Petrovich");
		assert.strictEqual(transliterateCyrillicToLatin("Щукина Юлия Фёдоровна"), "Shchukina Yuliya Fedorovna");
	});

	test("generateDicomUid produces valid Dente CRM UID format", () => {
		const uid = generateDicomUid("1");
		assert.ok(uid.startsWith("1.2.826.0.1.3680043.10.1."));
		assert.ok(uid.length > 25);
	});

	test("createDicomSecondaryCaptureFile generates valid Part 10 DICOM byte stream", () => {
		const fakeCanvas = {
			width: 64, height: 64,
			getContext: () => ({ getImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4).fill(128) }) }),
		} as unknown as HTMLCanvasElement;

		const bytes = createDicomSecondaryCaptureFile(fakeCanvas, {
			patientId: "PAT-TEST-001", patientFullName: "Смирнов Алексей", toothCode: "46",
			scaleMmPerPixel: 0.052, clinicName: "DENTE CLINIC", doctorFullName: "Д-р Кузнецов",
		});

		assert.ok(bytes instanceof Uint8Array);
		assert.ok(bytes.length > 132 + 64 * 64 * 3);
		for (let i = 0; i < 128; i++) assert.strictEqual(bytes[i], 0);

		const magic = String.fromCharCode(bytes[128] ?? 0, bytes[129] ?? 0, bytes[130] ?? 0, bytes[131] ?? 0);
		assert.strictEqual(magic, "DICM");

		const bufferStr = new TextDecoder("latin1").decode(bytes);
		assert.ok(bufferStr.includes("1.2.840.10008.5.1.4.1.1.7"));
		assert.ok(bufferStr.includes("1.2.840.10008.1.2.1"));
		assert.ok(bufferStr.includes("Smirnov Aleksey"));
		assert.ok(bufferStr.includes("PAT-TEST-001"));
	});
});
