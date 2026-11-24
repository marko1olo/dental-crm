import { describe, it, expect } from "vitest";
import { anonymizeDicomBuffer } from "../dicomAnonymizer.js";

describe("dicomAnonymizer 152-FZ Compliance", () => {
	function createSyntheticDicomHeader(): Buffer {
		// 128 bytes preamble + 4 bytes "DICM" + tags
		const preamble = Buffer.alloc(128, 0);
		const magic = Buffer.from("DICM", "latin1");

		// Element (0010, 0010) PatientName: VR=PN (2 bytes), Len=18 (2 bytes), Value="ИВАНОВ^ИВАН^ИВАН" (18 bytes)
		const tagGroup = Buffer.from([0x10, 0x00]);
		const tagElement = Buffer.from([0x10, 0x00]);
		const vr = Buffer.from("PN", "latin1");
		const len = Buffer.from([0x12, 0x00]); // 18 bytes
		const val = Buffer.from("ИВАНОВ^ИВАН^ИВАНЫЧ", "latin1").subarray(0, 18);

		// Element (0010, 0020) PatientID: VR=LO, Len=10, Value="PAT-123456"
		const idGroup = Buffer.from([0x10, 0x00]);
		const idElem = Buffer.from([0x20, 0x00]);
		const idVr = Buffer.from("LO", "latin1");
		const idLen = Buffer.from([0x0a, 0x00]);
		const idVal = Buffer.from("PAT-123456", "latin1");

		// PixelData tag (7FE0, 0010): VR=OW, 2 reserved bytes, Len=4, Value=0,0,0,0
		const pixGroup = Buffer.from([0xe0, 0x7f]);
		const pixElem = Buffer.from([0x10, 0x00]);
		const pixVr = Buffer.from("OW", "latin1");
		const pixReserved = Buffer.from([0x00, 0x00]);
		const pixLen = Buffer.from([0x04, 0x00, 0x00, 0x00]);
		const pixData = Buffer.from([0x01, 0x02, 0x03, 0x04]);

		return Buffer.concat([
			preamble,
			magic,
			tagGroup, tagElement, vr, len, val,
			idGroup, idElem, idVr, idLen, idVal,
			pixGroup, pixElem, pixVr, pixReserved, pixLen, pixData,
		]);
	}

	it("physically overwrites patient personal data in binary stream without corrupting length", () => {
		const rawDicom = createSyntheticDicomHeader();
		expect(rawDicom.toString("latin1")).toContain("PAT-123456");

		const anonymized = anonymizeDicomBuffer(rawDicom, {
			patientId: "ANON-9999",
			institutionName: "DENTE CLINIC",
		});

		expect(anonymized.length).toBe(rawDicom.length);
		const anonymizedText = anonymized.toString("latin1");

		expect(anonymizedText).not.toContain("PAT-123456");
		expect(anonymizedText).toContain("ANON-9999");
		expect(anonymizedText).toContain("ANONYMIZED^PATIENT");

		// PixelData must remain completely intact
		const pixelDataOriginal = rawDicom.subarray(rawDicom.length - 4);
		const pixelDataAnonymized = anonymized.subarray(anonymized.length - 4);
		expect(pixelDataAnonymized.equals(pixelDataOriginal)).toBe(true);
	});

	it("safely handles truncated or empty buffers without crashing", () => {
		const smallBuf = Buffer.from([1, 2, 3]);
		expect(anonymizeDicomBuffer(smallBuf)).toBe(smallBuf);
	});

	it("handles SQ delimiter tags (0xFFFE, 0xE000 / 0xE00D / 0xE0DD) without 2-byte VR corruption and wipes nested PII", () => {
		const preamble = Buffer.alloc(128, 0);
		const magic = Buffer.from("DICM", "latin1");

		// SQ tag (0008, 1115) ReferencedSeriesSequence: VR=SQ, 2 reserved, 4-byte undefined length 0xFFFFFFFF
		const sqTag = Buffer.from([0x08, 0x00, 0x15, 0x11]);
		const sqVr = Buffer.from("SQ", "latin1");
		const sqReserved = Buffer.from([0x00, 0x00]);
		const sqLen = Buffer.from([0xff, 0xff, 0xff, 0xff]);

		// Item tag (FFFE, E000) + 4-byte undefined length (NO VR!)
		const itemStart = Buffer.from([0xfe, 0xff, 0x00, 0xe0, 0xff, 0xff, 0xff, 0xff]);

		// Nested (0010, 0010) PatientName inside Item
		const nestedPatName = Buffer.concat([
			Buffer.from([0x10, 0x00, 0x10, 0x00]),
			Buffer.from("PN", "latin1"),
			Buffer.from([0x0c, 0x00]),
			Buffer.from("SECRET^PATIE", "latin1"),
		]);

		// Item Delimitation Item (FFFE, E00D) + 4-byte len 0 (NO VR!)
		const itemEnd = Buffer.from([0xfe, 0xff, 0x0d, 0xe0, 0x00, 0x00, 0x00, 0x00]);
		// Sequence Delimitation Item (FFFE, E0DD) + 4-byte len 0 (NO VR!)
		const seqEnd = Buffer.from([0xfe, 0xff, 0xdd, 0xe0, 0x00, 0x00, 0x00, 0x00]);

		// Trailing (0010, 0020) PatientID after SQ
		const afterId = Buffer.concat([
			Buffer.from([0x10, 0x00, 0x20, 0x00]),
			Buffer.from("LO", "latin1"),
			Buffer.from([0x08, 0x00]),
			Buffer.from("CHART-77", "latin1"),
		]);

		const raw = Buffer.concat([preamble, magic, sqTag, sqVr, sqReserved, sqLen, itemStart, nestedPatName, itemEnd, seqEnd, afterId]);
		const anonymized = anonymizeDicomBuffer(raw, { patientName: "ANON^USER", patientId: "ANON-77" });

		expect(anonymized.length).toBe(raw.length);
		const text = anonymized.toString("latin1");
		expect(text).not.toContain("SECRET^PATIE");
		expect(text).not.toContain("CHART-77");
		expect(text).toContain("ANON-77");
	});
});
