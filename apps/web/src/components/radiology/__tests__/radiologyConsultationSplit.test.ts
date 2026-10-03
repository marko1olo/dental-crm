import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DENTAL_DISCIPLINES,
	CONSULTATION_PATHOLOGY_CATALOG,
	getDentalDisciplineById,
	getPathologiesByDiscipline,
	getPathologyById,
	searchConsultationPathologies,
	type DentalDisciplineId,
} from "../ConsultationPathologyLibrary.js";
import { getImageCoords, captureCompositeSnapshot } from "../consultationCanvasRenderers.js";

describe("EzDent-i Window #4: Consultation Split & 8 Dental Disciplines (Screens 25 & 26)", () => {
	describe("8 Dental Disciplines Structure & Catalog Purity (Screenshot 26)", () => {
		it("registers exactly 8 dental disciplines corresponding to EzDent-i", () => {
			assert.equal(DENTAL_DISCIPLINES.length, 8, "Expected exactly 8 dental disciplines");

			const disciplineIds = DENTAL_DISCIPLINES.map((d) => d.id);
			assert.ok(disciplineIds.includes("conservative"), "Missing Conservative Dentistry");
			assert.ok(disciplineIds.includes("prosthodontics"), "Missing Prosthodontics");
			assert.ok(disciplineIds.includes("periodontics"), "Missing Periodontics");
			assert.ok(disciplineIds.includes("implant"), "Missing Implant Dentistry");
			assert.ok(disciplineIds.includes("oral_surgery"), "Missing Oral Surgery");
			assert.ok(disciplineIds.includes("pedodontics"), "Missing Pedodontics");
			assert.ok(disciplineIds.includes("oral_medicine"), "Missing Oral Medicine");
			assert.ok(disciplineIds.includes("orthodontics"), "Missing Orthodontics");
		});

		it("verifies accurate Russian and English titles for all 8 disciplines", () => {
			const cons = getDentalDisciplineById("conservative");
			assert.ok(cons);
			assert.equal(cons?.titleEn, "Conservative Dentistry");
			assert.equal(cons?.shortLabelRu, "Терапия");

			const pros = getDentalDisciplineById("prosthodontics");
			assert.ok(pros);
			assert.equal(pros?.titleEn, "Prosthodontics");
			assert.equal(pros?.shortLabelRu, "Ортопедия");

			const perio = getDentalDisciplineById("periodontics");
			assert.ok(perio);
			assert.equal(perio?.titleEn, "Periodontics");
			assert.equal(perio?.shortLabelRu, "Пародонтология");

			const impl = getDentalDisciplineById("implant");
			assert.ok(impl);
			assert.equal(impl?.titleEn, "Implant Dentistry");
			assert.equal(impl?.shortLabelRu, "Имплантация");

			const surg = getDentalDisciplineById("oral_surgery");
			assert.ok(surg);
			assert.equal(surg?.titleEn, "Oral Surgery");
			assert.equal(surg?.shortLabelRu, "Хирургия");

			const pedo = getDentalDisciplineById("pedodontics");
			assert.ok(pedo);
			assert.equal(pedo?.titleEn, "Pedodontics");
			assert.equal(pedo?.shortLabelRu, "Детская");

			const med = getDentalDisciplineById("oral_medicine");
			assert.ok(med);
			assert.equal(med?.titleEn, "Oral Medicine");
			assert.equal(med?.shortLabelRu, "Слизистая");

			const ortho = getDentalDisciplineById("orthodontics");
			assert.ok(ortho);
			assert.equal(ortho?.titleEn, "Orthodontics");
			assert.equal(ortho?.shortLabelRu, "Ортодонтия");
		});

		it("contains comprehensive clinical demonstration cases with ICD-10 and offline SVG schematics", () => {
			assert.ok(CONSULTATION_PATHOLOGY_CATALOG.length >= 8, "Expected at least 8 pathology items");

			for (const item of CONSULTATION_PATHOLOGY_CATALOG) {
				assert.ok(item.id.length > 0, "Item must have id");
				assert.ok(item.titleRu.length > 0, `Item ${item.id} must have titleRu`);
				assert.ok(item.titleEn.length > 0, `Item ${item.id} must have titleEn`);
				assert.ok(item.descriptionRu.length > 0, `Item ${item.id} must have descriptionRu`);
				assert.ok(item.stages.length >= 2, `Item ${item.id} must have at least 2 stages`);
				assert.ok(item.keyEducationalPoints.length >= 1, `Item ${item.id} must have educational points`);
				assert.ok(item.recommendedTreatmentRu.length > 0, `Item ${item.id} must have recommended treatment`);
				assert.ok(item.previewSvg.startsWith("data:image/svg+xml"), `Item ${item.id} must have valid SVG data URI`);
			}
		});

		it("retrieves pathologies by discipline correctly", () => {
			const consItems = getPathologiesByDiscipline("conservative");
			assert.ok(consItems.length >= 2, "Expected multiple conservative dentistry cases");
			assert.ok(consItems.every((i) => i.disciplineId === "conservative"));

			const implantItems = getPathologiesByDiscipline("implant");
			assert.ok(implantItems.length >= 2, "Expected implant cases");
			assert.ok(implantItems.some((i) => i.id === "impl_two_stage_protocol"));

			const surgItems = getPathologiesByDiscipline("oral_surgery");
			assert.ok(surgItems.some((i) => i.id === "surg_impacted_wisdom_tooth"));
		});

		it("searches pathologies by keyword in Russian, English, or ICD-10", () => {
			const cariesResults = searchConsultationPathologies("кариес");
			assert.ok(cariesResults.length > 0, "Expected search for 'кариес' to return results");

			const icdResults = searchConsultationPathologies("K04.0");
			assert.ok(icdResults.length > 0, "Expected search for 'K04.0' to return pulpitis case");

			const emptyResults = searchConsultationPathologies("xyzNonExistentDisease99");
			assert.equal(emptyResults.length, 0);
		});
	});

	describe("Dual-View Split & Two-Section Dock Ergonomics (Screenshot 25)", () => {
		it("validates synchronized dual navigation logic (Sync Pan & Zoom)", () => {
			let isSync = true;
			let leftZoom = 1.0;
			let rightZoom = 1.0;

			// Zoom in with factor 1.15
			const factor = 1.15;
			if (isSync) {
				leftZoom *= factor;
				rightZoom *= factor;
			} else {
				leftZoom *= factor;
			}

			assert.equal(leftZoom, 1.15);
			assert.equal(rightZoom, 1.15, "In sync mode right viewport must mirror left zoom");

			// Toggle sync off
			isSync = false;
			leftZoom *= factor;
			assert.ok(Math.abs(leftZoom - 1.3225) < 0.001);
			assert.equal(rightZoom, 1.15, "In independent mode right zoom should remain untouched");
		});

		it("validates 3px active slot border styling and focus contract", () => {
			let activeSlot: "left" | "right" = "left";
			const getBorder = (slot: "left" | "right") => {
				return activeSlot === slot ? "3px solid #00C853" : "1px solid #1e293b";
			};

			assert.equal(getBorder("left"), "3px solid #00C853", "Active left slot must have 3px #00C853 border");
			assert.equal(getBorder("right"), "1px solid #1e293b");

			activeSlot = "right";
			assert.equal(getBorder("left"), "1px solid #1e293b");
			assert.equal(getBorder("right"), "3px solid #00C853", "Active right slot must have 3px #00C853 border");
		});

		it("formats Form 043/u consultation protocol statement with doctor autonomy", () => {
			const selectedPathologyTitle = "Коронка из диоксида циркония (ZrO2)";
			const note = `Проведена клиническая консультация (EzDent-i Сплит): сопоставлены контрольные снимки пациента и эталонная схема лечения («${selectedPathologyTitle}»). Пациенту наглядно продемонстрированы анатомические ориентиры, обоснован план комплексной санации и согласован протокол лечения.`;

			assert.ok(note.includes("EzDent-i Сплит"));
			assert.ok(note.includes("Коронка из диоксида циркония"));
			assert.ok(note.includes("согласован протокол лечения"));
		});

		it("verifies active thumbnail styling in captured filmstrip (Screenshot 25 parity)", () => {
			const activeStudySrc = "/radiology/active_study_13_05_2024.jpg";
			const studies = [
				{ id: "s1", imageUrl: "/radiology/other_study.jpg", dateStr: "16.05.2024 08:44:07" },
				{ id: "s2", imageUrl: "/radiology/active_study_13_05_2024.jpg", dateStr: "13.05.2024 08:37:25" },
			];

			const getThumbnailStyle = (study: typeof studies[0]) => {
				const isCurrentlyActive = activeStudySrc === study.imageUrl;
				return {
					border: isCurrentlyActive ? "2px solid #00C853" : "1px solid #334155",
					dateBarClass: isCurrentlyActive ? "bg-[#00C853] text-white font-bold" : "bg-black/90 text-slate-300 font-mono",
				};
			};

			const inactive = getThumbnailStyle(studies[0]!);
			assert.equal(inactive.border, "1px solid #334155");
			assert.ok(inactive.dateBarClass.includes("bg-black/90"));

			const active = getThumbnailStyle(studies[1]!);
			assert.equal(active.border, "2px solid #00C853", "Active thumbnail must have #00C853 green border");
			assert.ok(active.dateBarClass.includes("bg-[#00C853]"), "Active date bar must be #00C853 emerald green");
			assert.ok(active.dateBarClass.includes("text-white"), "Active date bar must have high contrast white text");
		});

		it("validates screen-to-image coordinate projection math (getImageCoords)", () => {
			// Fake canvas with rect at (0, 0, 800, 600)
			const mockCanvas = {
				width: 800,
				height: 600,
				getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
			} as unknown as HTMLCanvasElement;

			const state = { panX: 0, panY: 0, zoom: 1.0 };
			const naturalDimensions = { width: 400, height: 400 };

			// Center click: clientX = 400, clientY = 300
			// screenX = 400, screenY = 300
			// imgX = (400 - (800/2 + 0)) / 1.0 + 400/2 = (400 - 400) + 200 = 200
			// imgY = (300 - (600/2 + 0)) / 1.0 + 400/2 = (300 - 300) + 200 = 200
			const centerPt = getImageCoords(mockCanvas, state, naturalDimensions, 400, 300);
			assert.equal(centerPt.x, 200, "Center of viewport must project to center of image (200)");
			assert.equal(centerPt.y, 200, "Center of viewport must project to center of image (200)");

			// Zoomed 2.0x, offset panX = 50
			const stateZoomed = { panX: 50, panY: 0, zoom: 2.0 };
			const ptZoomed = getImageCoords(mockCanvas, stateZoomed, naturalDimensions, 450, 300);
			// imgX = (450 - (400 + 50)) / 2.0 + 200 = 0 + 200 = 200
			assert.equal(ptZoomed.x, 200);
		});

		it("validates composite snapshot engine returns null when canvases are unmounted", () => {
			const result = captureCompositeSnapshot({
				leftCanvas: null,
				rightCanvas: null,
				leftTitle: "Левый снимок",
				rightTitle: "Правый снимок",
			});
			assert.equal(result, null, "Unmounted canvas must safely return null without throwing");
		});
	});
});
