import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	ClinicalPhotoProtocolService,
	DENTAL_PHOTO_ANGLES,
	MANDATORY_LAB_ANGLES,
	type ClinicalPhotoItem,
} from "./ClinicalPhotoProtocolService.js";

describe("ClinicalPhotoProtocolService — Feature #134 Dental Photography Protocol", () => {
	test("1. Verifies 12 standard dental photography angles", () => {
		assert.equal(DENTAL_PHOTO_ANGLES.length, 12);
		assert.equal(MANDATORY_LAB_ANGLES.length, 8);
	});

	test("2. Generates correct watermark string", () => {
		const fixedDate = new Date("2026-08-16T12:00:00Z");
		const watermark = ClinicalPhotoProtocolService.generateWatermarkString(
			"Dente Clinic",
			"Иванов Иван Иванович",
			fixedDate,
		);
		assert.equal(watermark, "DENTE CLINIC | Пациент: Иванов Иван Иванович | Дата: 2026-08-16");
	});

	test("3. Validates incomplete protocol (missing lab mandatory angles)", () => {
		const photos: ClinicalPhotoItem[] = [
			{
				id: "p1",
				organizationId: "org-1",
				patientId: "patient-1",
				angle: "portrait_full_face_smile",
				fileUrl: "https://cdn.dente.ru/p1.jpg",
				takenAt: new Date(),
			},
			{
				id: "p2",
				organizationId: "org-1",
				patientId: "patient-1",
				angle: "intraoral_frontal_occlusion",
				fileUrl: "https://cdn.dente.ru/p2.jpg",
				takenAt: new Date(),
			},
		];

		const result = ClinicalPhotoProtocolService.validatePhotoProtocol(photos);
		assert.equal(result.totalPhotosCount, 2);
		assert.equal(result.uniqueAnglesCount, 2);
		assert.equal(result.isValidForDentalLab, false);
		assert.equal(result.isFullProtocolComplete, false);
		assert.equal(result.missingMandatoryLabAngles.length, 6);
	});

	test("4. Validates complete protocol with all 12 standard angles", () => {
		const photos: ClinicalPhotoItem[] = DENTAL_PHOTO_ANGLES.map((angle, idx) => ({
			id: `photo-${idx}`,
			organizationId: "org-1",
			patientId: "patient-1",
			angle,
			fileUrl: `https://cdn.dente.ru/photo-${idx}.jpg`,
			takenAt: new Date(),
		}));

		const result = ClinicalPhotoProtocolService.validatePhotoProtocol(photos);
		assert.equal(result.totalPhotosCount, 12);
		assert.equal(result.uniqueAnglesCount, 12);
		assert.equal(result.isValidForDentalLab, true);
		assert.equal(result.isFullProtocolComplete, true);
		assert.equal(result.missingMandatoryLabAngles.length, 0);
		assert.equal(result.missingAllAngles.length, 0);
	});
});