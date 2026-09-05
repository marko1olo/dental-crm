/**
 * OrthodonticPhotoProtocolModal.test.tsx — Unit & Rendering Tests for Orthodontic Photo-Protocol Modal
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	OrthodonticPhotoProtocolModal,
	ORTHODONTIC_CLINICAL_PRESETS,
	generateOrthodonticDiaryNote,
} from "../components/diagnostics/OrthodonticPhotoProtocolModal";
import {
	createEmptyOrthodonticSession,
	updateSlotPhoto,
	ORTHODONTIC_8_ANGLES,
} from "@dental/shared";

describe("OrthodonticPhotoProtocolModal Component", () => {
	it("renders null when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(OrthodonticPhotoProtocolModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);
		assert.strictEqual(html, "");
	});

	it("renders full 8-slot grid modal with clinical header, toolbar, and stage buttons", () => {
		const html = renderToStaticMarkup(
			createElement(OrthodonticPhotoProtocolModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Смирнова Екатерина Васильевна",
				doctorName: "Д-р Смирнов Алексей Петрович",
				clinicName: "ООО «Денте Стоматология»",
				treatmentStageTitle: "Этап 1: Нивелирование зубных рядов",
			}),
		);

		// Modal container
		assert.ok(html.includes("ortho-photo-modal-container"));
		assert.ok(html.includes('data-testid="orthodontic-photo-protocol-modal"'));

		// Header & Patient Info
		assert.ok(html.includes("Ортодонтический фотопротокол (8 ракурсов)"));
		assert.ok(html.includes("Смирнова Екатерина Васильевна"));
		assert.ok(html.includes("Д-р Смирнов Алексей Петрович"));
		assert.ok(html.includes("ООО «Денте Стоматология»"));

		// Stage buttons
		assert.ok(html.includes("До лечения"));
		assert.ok(html.includes("Контроль"));
		assert.ok(html.includes("После лечения"));
		assert.ok(html.includes("active-stage-pre"));

		// Plan ribbon & completeness meter
		assert.ok(html.includes("Этап 1: Нивелирование зубных рядов"));
		assert.ok(html.includes("0/8 (0%)"));

		// Guidelines button & Export button
		assert.ok(html.includes("Сетка наложения"));
		assert.ok(html.includes("Печать / PDF"));

		// All 8 slot cards present
		for (const angle of ORTHODONTIC_8_ANGLES) {
			assert.ok(
				html.includes(`data-testid="photo-slot-${angle.id}"`),
				`Must contain slot for ${angle.id}`,
			);
			assert.ok(
				html.includes(angle.titleRu),
				`Must contain Russian title for ${angle.titleRu}`,
			);
		}

		// Clinical findings section
		assert.ok(html.includes("Клиническая диагностика и окклюзионные параметры"));
		assert.ok(html.includes("Класс моляров"));
		assert.ok(html.includes("Сагиттальная щель (Overjet)"));
		assert.ok(html.includes("Дуга улыбки (Smile Arc)"));
		assert.ok(html.includes("Смещение средней линии В/Ч"));

		// 1-Click Clinical Presets Bar (Mandates 8e, 8k)
		assert.ok(html.includes("1-клик пресеты 043/у:"));
		assert.ok(html.includes('data-testid="ortho-preset-aligner_bonding_steps_1_5"'));
		assert.ok(html.includes('data-testid="ortho-preset-aligner_tracking_check"'));
		assert.ok(html.includes('data-testid="ortho-preset-braces_niti_powerchain_activation"'));
		assert.ok(html.includes("Фиксация аттачментов + выдача элайнеров (шаги 1–5)"));
		assert.ok(html.includes("Контрольный осмотр на элайнерах (трекинг идеальный, переход на следующий шаг)"));
		assert.ok(html.includes("Активация брекет-системы (замена дуги NiTi, эластические цепочки)"));

		// 1-Click Insert Button & Auto-Save Checkbox in Footer
		assert.ok(html.includes('data-testid="insert-ortho-protocol-043-btn"'));
		assert.ok(html.includes("Вставить протокол ортодонтии в дневник 043/у"));
		assert.ok(html.includes('data-testid="insert-protocol-on-save-checkbox"'));
		assert.ok(html.includes("Вносить в дневник 043/у при сохранении"));

		// No disabled buttons
		assert.ok(!html.includes("disabled"));
	});

	it("renders uploaded photos and overlay guidelines when session has images", () => {
		let session = createEmptyOrthodonticSession({
			patientId: "pat-101",
			patientName: "Иванов И. И.",
			doctorName: "Д-р Смирнов А. П.",
			stage: "active_monitoring",
		});

		session = updateSlotPhoto(session, "intraoral_frontal_occlusion", {
			imageUrl: "https://cdn.dente.clinic/photos/pat101/front.jpg",
			rotationDegrees: 0,
			zoom: 1.2,
		});
		session = updateSlotPhoto(session, "extraoral_face_smile", {
			imageUrl: "https://cdn.dente.clinic/photos/pat101/smile.jpg",
		});

		const html = renderToStaticMarkup(
			createElement(OrthodonticPhotoProtocolModal, {
				isOpen: true,
				onClose: () => {},
				initialSession: session,
			}),
		);

		// Completeness progress
		assert.ok(html.includes("2/8 (25%)"));

		// Images rendered
		assert.ok(html.includes("https://cdn.dente.clinic/photos/pat101/front.jpg"));
		assert.ok(html.includes("https://cdn.dente.clinic/photos/pat101/smile.jpg"));

		// Guidelines overlay
		assert.ok(html.includes("ortho-guide-midline"));
		assert.ok(html.includes("ortho-guide-occlusal"));

		// Active stage
		assert.ok(html.includes("active-stage-active"));
	});

	it("correctly synthesizes 043/u diary notes for all three 1-click clinical presets", () => {
		const session = createEmptyOrthodonticSession({
			patientId: "pat-202",
			patientName: "Кузнецова Анна Сергеевна",
			doctorName: "Д-р Лебедева О. В.",
			stage: "pre_treatment",
		});

		// Preset 1: Aligner bonding + steps 1-5 delivery
		const preset1 = ORTHODONTIC_CLINICAL_PRESETS.find((p) => p.id === "aligner_bonding_steps_1_5")!;
		assert.ok(preset1, "Preset 1 must exist");
		const note1 = generateOrthodonticDiaryNote(preset1, session, "04.09.2026");
		assert.ok(note1.includes("ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЁМА (ФОРМА 043/у)"));
		assert.ok(note1.includes("Кузнецова Анна Сергеевна"));
		assert.ok(note1.includes("Элайнеры шаги 1–5 выданы, аттачменты фиксированы, сепарация выполнена"));
		assert.ok(note1.includes("37% ортофосфорной кислотой"));
		assert.ok(note1.includes("ношения: строго не менее 22 часов в сутки"));

		// Preset 2: Aligner tracking check
		const preset2 = ORTHODONTIC_CLINICAL_PRESETS.find((p) => p.id === "aligner_tracking_check")!;
		assert.ok(preset2, "Preset 2 must exist");
		const note2 = generateOrthodonticDiaryNote(preset2, session, "04.09.2026");
		assert.ok(note2.includes("Трекинг перемещения зубов идеальный"));
		assert.ok(note2.includes("Одобрен переход на следующий плановый шаг элайнеров"));
		assert.ok(note2.includes("Контрольный осмотр на элайнерах: трекинг идеальный, переход на следующий шаг разрешен"));

		// Preset 3: Braces activation + NiTi + Power Chain
		const preset3 = ORTHODONTIC_CLINICAL_PRESETS.find((p) => p.id === "braces_niti_powerchain_activation")!;
		assert.ok(preset3, "Preset 3 must exist");
		const note3 = generateOrthodonticDiaryNote(preset3, session, "04.09.2026");
		assert.ok(note3.includes("Активация брекет-системы выполнена"));
		assert.ok(note3.includes("замена дуги NiTi и установка эластической цепочки"));
		assert.ok(note3.includes("Power Chain"));
		assert.ok(note3.includes(".016x.022\""));
	});

	it("renders dynamic neutral defaults and zero mock names when props are omitted", () => {
		const html = renderToStaticMarkup(
			createElement(OrthodonticPhotoProtocolModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);

		// Must render dynamic neutral defaults
		assert.ok(html.includes("Пациент"));
		assert.ok(html.includes("Лечащий врач-ортодонт"));
		assert.ok(html.includes("Стоматологическая клиника"));

		// Must NOT contain hardcoded mock names (Zero Mocks Mandate)
		assert.ok(!html.includes("pat-ortho-001"));
		assert.ok(!html.includes("Смирнова Екатерина Васильевна"));
		assert.ok(!html.includes("Д-р Смирнов Алексей Петрович"));
		assert.ok(!html.includes("ООО «Денте Стоматология»"));
	});
});
