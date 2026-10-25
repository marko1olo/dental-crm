import assert from "node:assert";
import { describe, test } from "node:test";
import { createDicomIntraoral16File } from "../VisiographDicomExporter";

describe("Visiograph DICOM 16-bit Intraoral Part 10 Storage", () => {
	test("createDicomIntraoral16File generates valid Part 10 DICOM with DICM header and uncompressed 16-bit words", () => {
		const width = 16;
		const height = 16;
		const pixelData16 = new Uint16Array(width * height);
		for (let i = 0; i < pixelData16.length; i++) pixelData16[i] = (i * 137) % 4096;

		const dicomBytes = createDicomIntraoral16File({
			width, height, pixelData16, patientId: "PAT-IO-16-001", patientFullName: "Воронова Елена Михайловна",
			patientBirthDate: "19880512", patientSex: "F", toothCode: "21", scaleMmPerPixel: 0.02,
			clinicName: "DENTE CLINIC PREMIUM", doctorFullName: "Д-р Семенов", bitsAllocated: 16, bitsStored: 12,
			highBit: 11, windowCenter: 2048, windowWidth: 4096,
		});

		assert.ok(dicomBytes instanceof Uint8Array);
		assert.ok(dicomBytes.length > 132 + width * height * 2);
		for (let i = 0; i < 128; i++) assert.strictEqual(dicomBytes[i], 0);

		const magic = String.fromCharCode(dicomBytes[128] ?? 0, dicomBytes[129] ?? 0, dicomBytes[130] ?? 0, dicomBytes[131] ?? 0);
		assert.strictEqual(magic, "DICM");

		const findTag = (group: number, element: number): number => {
			for (let i = 132; i <= dicomBytes.length - 8; i++) {
				if (dicomBytes[i] === (group & 0xff) && dicomBytes[i + 1] === ((group >> 8) & 0xff) &&
					dicomBytes[i + 2] === (element & 0xff) && dicomBytes[i + 3] === ((element >> 8) & 0xff)) return i;
			}
			return -1;
		};

		assert.ok(findTag(0x0002, 0x0000) >= 132);
		assert.ok(findTag(0x0002, 0x0002) >= 132);
		assert.ok(findTag(0x0002, 0x0010) >= 132);
		assert.ok(findTag(0x0008, 0x0016) >= 132);
		assert.ok(findTag(0x0008, 0x0060) >= 132);
		assert.ok(findTag(0x0028, 0x0002) >= 132);
		assert.ok(findTag(0x0028, 0x0004) >= 132);
		assert.ok(findTag(0x0028, 0x0010) >= 132);
		assert.ok(findTag(0x0028, 0x0011) >= 132);
		assert.ok(findTag(0x0028, 0x0100) >= 132);

		const tag7fe0 = findTag(0x7fe0, 0x0010);
		assert.ok(tag7fe0 >= 132);
		const vr7fe0 = String.fromCharCode(dicomBytes[tag7fe0 + 4] ?? 0, dicomBytes[tag7fe0 + 5] ?? 0);
		assert.strictEqual(vr7fe0, "OW");

		const view = new DataView(dicomBytes.buffer, dicomBytes.byteOffset, dicomBytes.byteLength);
		const byteLen = view.getUint32(tag7fe0 + 8, true);
		assert.strictEqual(byteLen, width * height * 2);

		const offset = tag7fe0 + 12;
		for (let i = 0; i < width * height; i++) {
			assert.strictEqual(view.getUint16(offset + i * 2, true), pixelData16[i]);
		}
	});
});
