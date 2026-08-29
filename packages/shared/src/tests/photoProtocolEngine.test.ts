/**
 * photoProtocolEngine.test.ts — Unit Test Suite for Orthodontic Photo-Protocol Engine (@dental/shared)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	ORTHODONTIC_8_ANGLES,
	ORTHODONTIC_ANGLES_MAP,
	ORTHODONTIC_STAGE_METADATA,
	ANGLE_CLASS_LABELS_RU,
	SMILE_ARC_LABELS_RU,
	MIDLINE_SHIFT_LABELS_RU,
	createEmptyOrthodonticSession,
	calculateOrthodonticProtocolCompleteness,
	updateSlotPhoto,
	removeSlotPhoto,
	calculateMidlineDeviation,
	calculateOcclusalPlaneTilt,
	buildOrthodonticComparisonSeries,
	generateOrthodonticClinicalReport,
	renderOrthodonticPresentationHtml,
	orthodonticPhotoSessionSchema,
	type OrthodonticPhotoSession,
	type OrthodonticAngleId,
} from "../index.js";

describe("Orthodontic Photo-Protocol Engine (Wave 21 — Domain 4)", () => {
	describe("1. Canonical 8-Angle Registry & Metadata", () => {
		it("contains exactly 8 standardized orthodontic angles (5 intraoral + 3 extraoral)", () => {
			assert.strictEqual(ORTHODONTIC_8_ANGLES.length, 8);

			const extraoral = ORTHODONTIC_8_ANGLES.filter((a) => a.category === "extraoral");
			const intraoral = ORTHODONTIC_8_ANGLES.filter((a) => a.category === "intraoral");

			assert.strictEqual(extraoral.length, 3);
			assert.strictEqual(intraoral.length, 5);
		});

		it("maintains strict sequential numbering 1..8 and non-empty clinical definitions", () => {
			const expectedAngles: OrthodonticAngleId[] = [
				"extraoral_face_rest",
				"extraoral_face_smile",
				"extraoral_profile",
				"intraoral_frontal_occlusion",
				"intraoral_right_lateral",
				"intraoral_left_lateral",
				"intraoral_upper_arch",
				"intraoral_lower_arch",
			];

			ORTHODONTIC_8_ANGLES.forEach((angle, idx) => {
				assert.strictEqual(angle.sequenceNumber, idx + 1);
				assert.strictEqual(angle.id, expectedAngles[idx]);
				assert.ok(angle.titleRu.length > 0);
				assert.ok(angle.shortLabelRu.length > 0);
				assert.ok(angle.clinicalInstructionsRu.length > 0);
				assert.ok(angle.requiredEquipmentRu.length > 0);
				assert.ok(angle.framingLandmarks.length > 0);
				assert.ok(angle.svgPath.length > 0);
			});
		});

		it("provides fast map lookup for all 8 angles", () => {
			assert.ok(ORTHODONTIC_ANGLES_MAP.extraoral_face_rest);
			assert.strictEqual(ORTHODONTIC_ANGLES_MAP.extraoral_face_rest.titleRu, "Анфас в покое");
			assert.ok(ORTHODONTIC_ANGLES_MAP.intraoral_frontal_occlusion);
			assert.strictEqual(
				ORTHODONTIC_ANGLES_MAP.intraoral_frontal_occlusion.titleRu,
				"Фронт в окклюзии",
			);
			assert.ok(ORTHODONTIC_ANGLES_MAP.intraoral_upper_arch);
			assert.strictEqual(ORTHODONTIC_ANGLES_MAP.intraoral_upper_arch.category, "intraoral");
		});

		it("validates statutory clinical stage metadata (До лечения, Контроль, После лечения)", () => {
			assert.strictEqual(ORTHODONTIC_STAGE_METADATA.pre_treatment.shortLabelRu, "До лечения");
			assert.strictEqual(ORTHODONTIC_STAGE_METADATA.active_monitoring.shortLabelRu, "Контроль");
			assert.strictEqual(ORTHODONTIC_STAGE_METADATA.post_treatment.shortLabelRu, "После лечения");

			assert.ok(ORTHODONTIC_STAGE_METADATA.pre_treatment.color.startsWith("#"));
			assert.ok(ORTHODONTIC_STAGE_METADATA.active_monitoring.descriptionRu.length > 10);
		});

		it("validates diagnostic classifications (Angle class, smile arc, midline shift)", () => {
			assert.ok(ANGLE_CLASS_LABELS_RU.class_1.includes("I класс"));
			assert.ok(ANGLE_CLASS_LABELS_RU.class_2_div_1.includes("II класс, 1 подкласс"));
			assert.ok(ANGLE_CLASS_LABELS_RU.class_3.includes("III класс"));

			assert.ok(SMILE_ARC_LABELS_RU.consonant.includes("Консонантная"));
			assert.ok(SMILE_ARC_LABELS_RU.reverse.includes("Реверсивная"));

			assert.ok(MIDLINE_SHIFT_LABELS_RU.none.includes("В норме"));
			assert.ok(MIDLINE_SHIFT_LABELS_RU.left.includes("влево"));
		});
	});

	describe("2. Session Creation & Treatment Plan Linkage", () => {
		it("creates a brand-new empty session with all 8 slots properly initialized", () => {
			const session = createEmptyOrthodonticSession({
				patientId: "pat-1001",
				patientName: "Смирнова Екатерина Васильевна",
				doctorName: "Д-р Смирнов Алексей Петрович",
				clinicName: "ООО «Денте Стоматология»",
				stage: "pre_treatment",
				treatmentPlanId: "tp-ortho-44",
				treatmentPlanStageId: "stage-1-align",
				treatmentStageTitle: "Этап 1: Нивелирование зубных рядов дугами CuNiTi 0.014",
			});

			assert.strictEqual(session.patientId, "pat-1001");
			assert.strictEqual(session.patientName, "Смирнова Екатерина Васильевна");
			assert.strictEqual(session.stage, "pre_treatment");
			assert.strictEqual(session.treatmentPlanId, "tp-ortho-44");
			assert.strictEqual(
				session.treatmentStageTitle,
				"Этап 1: Нивелирование зубных рядов дугами CuNiTi 0.014",
			);

			// Check all 8 slots exist and are initialized
			const slotKeys = Object.keys(session.slots);
			assert.strictEqual(slotKeys.length, 8);

			for (const angle of ORTHODONTIC_8_ANGLES) {
				const slot = session.slots[angle.id];
				assert.ok(slot, `Slot ${angle.id} should exist`);
				assert.strictEqual(slot.angleId, angle.id);
				assert.strictEqual(slot.imageUrl, undefined);
				assert.strictEqual(slot.rotationDegrees, 0);
				assert.strictEqual(slot.zoom, 1);
				assert.strictEqual(slot.guidelineOverlayEnabled, true);
			}

			// Validate with Zod schema
			const validated = orthodonticPhotoSessionSchema.parse(session);
			assert.strictEqual(validated.id, session.id);
		});
	});

	describe("3. Completeness Scoring & Readiness Gates", () => {
		it("calculates 0% completeness on fresh empty session", () => {
			const session = createEmptyOrthodonticSession({
				patientId: "pat-1002",
				patientName: "Кузнецов И. А.",
				doctorName: "Д-р Петрова М. С.",
			});

			const metrics = calculateOrthodonticProtocolCompleteness(session);
			assert.strictEqual(metrics.totalRequired, 8);
			assert.strictEqual(metrics.uploadedCount, 0);
			assert.strictEqual(metrics.completionPercentage, 0);
			assert.strictEqual(metrics.isComplete, false);
			assert.strictEqual(metrics.isReadyForConsultation, false);
			assert.strictEqual(metrics.missingAngles.length, 8);
			assert.strictEqual(metrics.intraoralCompleted, 0);
			assert.strictEqual(metrics.extraoralCompleted, 0);
		});

		it("accurately computes partial progress and consultation readiness", () => {
			let session = createEmptyOrthodonticSession({
				patientId: "pat-1003",
				patientName: "Волков С. В.",
				doctorName: "Д-р Смирнов А. П.",
			});

			// Upload 3 intraoral and 2 extraoral (total 5) -> not ready (requires 6)
			session = updateSlotPhoto(session, "extraoral_face_rest", {
				imageUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
			});
			session = updateSlotPhoto(session, "extraoral_face_smile", {
				imageUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
			});
			session = updateSlotPhoto(session, "intraoral_frontal_occlusion", {
				imageUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
			});
			session = updateSlotPhoto(session, "intraoral_right_lateral", {
				imageUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
			});
			session = updateSlotPhoto(session, "intraoral_left_lateral", {
				imageUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
			});

			let metrics = calculateOrthodonticProtocolCompleteness(session);
			assert.strictEqual(metrics.uploadedCount, 5);
			assert.strictEqual(metrics.completionPercentage, 63); // 5/8 = 62.5 -> 63%
			assert.strictEqual(metrics.isComplete, false);
			assert.strictEqual(metrics.isReadyForConsultation, false);
			assert.strictEqual(metrics.intraoralCompleted, 3);
			assert.strictEqual(metrics.extraoralCompleted, 2);

			// Add 6th photo (intraoral upper arch) -> consultation ready
			session = updateSlotPhoto(session, "intraoral_upper_arch", {
				imageUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
			});

			metrics = calculateOrthodonticProtocolCompleteness(session);
			assert.strictEqual(metrics.uploadedCount, 6);
			assert.strictEqual(metrics.completionPercentage, 75);
			assert.strictEqual(metrics.isComplete, false);
			assert.strictEqual(metrics.isReadyForConsultation, true);
		});

		it("reports 100% completion when all 8 photos are uploaded", () => {
			let session = createEmptyOrthodonticSession({
				patientId: "pat-1004",
				patientName: "Морозова А. Н.",
				doctorName: "Д-р Смирнов А. П.",
			});

			for (const angle of ORTHODONTIC_8_ANGLES) {
				session = updateSlotPhoto(session, angle.id, {
					imageUrl: `https://storage.dente.clinic/photos/pat-1004/${angle.id}.jpg`,
				});
			}

			const metrics = calculateOrthodonticProtocolCompleteness(session);
			assert.strictEqual(metrics.uploadedCount, 8);
			assert.strictEqual(metrics.completionPercentage, 100);
			assert.strictEqual(metrics.isComplete, true);
			assert.strictEqual(metrics.isReadyForConsultation, true);
			assert.strictEqual(metrics.missingAngles.length, 0);
			assert.strictEqual(metrics.missingAngleNamesRu.length, 0);
			assert.strictEqual(metrics.intraoralCompleted, 5);
			assert.strictEqual(metrics.extraoralCompleted, 3);
		});
	});

	describe("4. Slot Photo Mutations (Update & Remove)", () => {
		it("updates photo properties (rotation, zoom, contrast, calibration) idempotently", () => {
			const session = createEmptyOrthodonticSession({
				patientId: "pat-1005",
				patientName: "Федорова Е. Д.",
				doctorName: "Д-р Смирнов А. П.",
			});

			const updated = updateSlotPhoto(session, "intraoral_frontal_occlusion", {
				imageUrl: "https://storage.dente.clinic/img1.jpg",
				rotationDegrees: 90,
				zoom: 1.5,
				panX: 10,
				panY: -5,
				brightness: 15,
				contrast: 10,
				calibrationMmPerPx: 0.05,
				notes: "Глубокая резцовая дизокклюзия 4 мм",
			});

			const slot = updated.slots.intraoral_frontal_occlusion;
			assert.ok(slot);
			assert.strictEqual(slot!.imageUrl, "https://storage.dente.clinic/img1.jpg");
			assert.strictEqual(slot!.rotationDegrees, 90);
			assert.strictEqual(slot!.zoom, 1.5);
			assert.strictEqual(slot!.panX, 10);
			assert.strictEqual(slot!.panY, -5);
			assert.strictEqual(slot!.brightness, 15);
			assert.strictEqual(slot!.contrast, 10);
			assert.strictEqual(slot!.calibrationMmPerPx, 0.05);
			assert.strictEqual(slot!.notes, "Глубокая резцовая дизокклюзия 4 мм");
			assert.ok(slot!.capturedAt);
		});

		it("removes photo and clears image data cleanly", () => {
			let session = createEmptyOrthodonticSession({
				patientId: "pat-1006",
				patientName: "Тестов Т. Т.",
				doctorName: "Д-р Смирнов А. П.",
			});

			session = updateSlotPhoto(session, "intraoral_right_lateral", {
				imageUrl: "https://storage.dente.clinic/test.jpg",
				rotationDegrees: 180,
				calibrationMmPerPx: 0.04,
			});

			assert.ok(session.slots.intraoral_right_lateral?.imageUrl);

			const cleared = removeSlotPhoto(session, "intraoral_right_lateral");
			assert.strictEqual(cleared.slots.intraoral_right_lateral!.imageUrl, undefined);
			assert.strictEqual(cleared.slots.intraoral_right_lateral!.rotationDegrees, 0);
			assert.strictEqual(cleared.slots.intraoral_right_lateral!.calibrationMmPerPx, undefined);
		});
	});

	describe("5. Clinical Guidelines Calculations (Midline & Occlusal Plane)", () => {
		it("calculates midline deviation with millimeter calibration", () => {
			// Center reference = 500px, observed midline = 540px, scale = 0.05 mm/px
			// Deviation = (540 - 500) * 0.05 = 40 * 0.05 = 2.0 mm (right shift)
			const resRight = calculateMidlineDeviation({
				referenceMidlineX: 500,
				observedMidlineX: 540,
				calibrationMmPerPx: 0.05,
			});

			assert.strictEqual(resRight.deviationMm, 2.0);
			assert.strictEqual(resRight.direction, "right");

			// Left shift: 500px -> 460px
			const resLeft = calculateMidlineDeviation({
				referenceMidlineX: 500,
				observedMidlineX: 460,
				calibrationMmPerPx: 0.05,
			});

			assert.strictEqual(resLeft.deviationMm, 2.0);
			assert.strictEqual(resLeft.direction, "left");

			// In normal range (delta <= 1px)
			const resNone = calculateMidlineDeviation({
				referenceMidlineX: 500,
				observedMidlineX: 500.5,
				calibrationMmPerPx: 0.05,
			});

			assert.strictEqual(resNone.deviationMm, 0.0);
			assert.strictEqual(resNone.direction, "none");
		});

		it("calculates occlusal plane tilt & canting from contact points", () => {
			// Level horizontal plane
			const levelRes = calculateOcclusalPlaneTilt({ x: 100, y: 300 }, { x: 500, y: 300 });
			assert.strictEqual(levelRes.tiltDegrees, 0);
			assert.strictEqual(levelRes.isTilted, false);
			assert.strictEqual(levelRes.highSide, "level");

			// Left side higher (canting): left at y=280, right at y=320 (deltaY = 40, deltaX = 400)
			const tiltedRes = calculateOcclusalPlaneTilt({ x: 100, y: 280 }, { x: 500, y: 320 });
			assert.ok(tiltedRes.isTilted);
			assert.strictEqual(tiltedRes.highSide, "left");
			assert.ok(tiltedRes.tiltDegrees > 5);
		});
	});

	describe("6. Multi-Session Before/After Comparison Series", () => {
		it("builds paired comparison series across treatment stages", () => {
			const beforeSession = createEmptyOrthodonticSession({
				patientId: "pat-2001",
				patientName: "Иванова Ольга Сергеевна",
				doctorName: "Д-р Смирнов А. П.",
				stage: "pre_treatment",
				sessionDate: "2025-01-10T10:00:00.000Z",
			});

			const afterSession = createEmptyOrthodonticSession({
				patientId: "pat-2001",
				patientName: "Иванова Ольга Сергеевна",
				doctorName: "Д-р Смирнов А. П.",
				stage: "post_treatment",
				sessionDate: "2026-08-20T10:00:00.000Z",
			});

			// Upload before & after frontal photos
			const bUpdated = updateSlotPhoto(beforeSession, "intraoral_frontal_occlusion", {
				imageUrl: "https://storage.dente.clinic/pat-2001-before-front.jpg",
			});
			const aUpdated = updateSlotPhoto(afterSession, "intraoral_frontal_occlusion", {
				imageUrl: "https://storage.dente.clinic/pat-2001-after-front.jpg",
			});

			const series = buildOrthodonticComparisonSeries(bUpdated, aUpdated);

			assert.strictEqual(series.pairs.length, 8);
			assert.strictEqual(series.pairedCount, 1);
			assert.ok(series.daysBetweenSessions > 500);

			const frontPair = series.pairs.find((p) => p.angleId === "intraoral_frontal_occlusion");
			assert.ok(frontPair);
			assert.strictEqual(frontPair.hasBothPhotos, true);
			assert.strictEqual(
				frontPair.beforePhoto?.imageUrl,
				"https://storage.dente.clinic/pat-2001-before-front.jpg",
			);
			assert.strictEqual(
				frontPair.afterPhoto?.imageUrl,
				"https://storage.dente.clinic/pat-2001-after-front.jpg",
			);
		});
	});

	describe("7. Clinical Report & Patient Presentation HTML Generator", () => {
		it("generates structured report DTO with Russian date formatting", () => {
			const session = createEmptyOrthodonticSession({
				patientId: "pat-3001",
				patientName: "Михайлов Дмитрий Игоревич",
				doctorName: "Д-р Смирнова Е. В.",
				sessionDate: "2026-08-25T14:30:00.000Z",
			});

			const report = generateOrthodonticClinicalReport(session);
			assert.strictEqual(report.session.patientName, "Михайлов Дмитрий Игоревич");
			assert.ok(report.formattedDateRu.includes("2026"));
			assert.strictEqual(report.stageMeta.shortLabelRu, "До лечения");
		});

		it("renders complete, valid, printable Russian HTML presentation without escaping bugs", () => {
			const session = createEmptyOrthodonticSession({
				patientId: "pat-3002",
				patientName: "Васильева & Партнеры <Анна>",
				doctorName: "Д-р Смирнов А. П.",
				clinicName: "ООО «Денте <Стоматология>»",
				stage: "active_monitoring",
				treatmentStageTitle: "Этап 2: Закрытие промежутков эластическими цепочками",
			});

			const html = renderOrthodonticPresentationHtml(session);

			assert.ok(html.startsWith("<!DOCTYPE html>"));
			assert.ok(html.includes("ООО «Денте &lt;Стоматология&gt;»"));
			assert.ok(html.includes("Васильева &amp; Партнеры &lt;Анна&gt;"));
			assert.ok(html.includes("Контроль динамики"));
			assert.ok(html.includes("Этап 2: Закрытие промежутков эластическими цепочками"));
			assert.ok(html.includes("Стандартная ортодонтическая сетка (8 ракурсов)"));
			assert.ok(html.includes("Клиническая диагностика и окклюзионные параметры"));
			assert.ok(html.includes("I класс по Энглю"));
			assert.ok(html.includes("</html>"));
		});

		it("renders before/after comparison section when comparison session is provided", () => {
			const beforeSession = createEmptyOrthodonticSession({
				patientId: "pat-3003",
				patientName: "Ковалев В. П.",
				doctorName: "Д-р Смирнов А. П.",
				stage: "pre_treatment",
				sessionDate: "2025-06-01T10:00:00.000Z",
			});

			const afterSession = createEmptyOrthodonticSession({
				patientId: "pat-3003",
				patientName: "Ковалев В. П.",
				doctorName: "Д-р Смирнов А. П.",
				stage: "post_treatment",
				sessionDate: "2026-08-01T10:00:00.000Z",
			});

			const bUp = updateSlotPhoto(beforeSession, "extraoral_face_smile", {
				imageUrl: "https://storage.dente.clinic/smile_before.jpg",
			});
			const aUp = updateSlotPhoto(afterSession, "extraoral_face_smile", {
				imageUrl: "https://storage.dente.clinic/smile_after.jpg",
			});

			const html = renderOrthodonticPresentationHtml(aUp, bUp);

			assert.ok(html.includes("Сравнительный анализ динамики (До / После"));
			assert.ok(html.includes("https://storage.dente.clinic/smile_before.jpg"));
			assert.ok(html.includes("https://storage.dente.clinic/smile_after.jpg"));
		});
	});
});
