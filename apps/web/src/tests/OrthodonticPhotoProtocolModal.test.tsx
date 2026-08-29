/**
 * OrthodonticPhotoProtocolModal.test.tsx — Unit & Rendering Tests for Orthodontic Photo-Protocol Modal
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OrthodonticPhotoProtocolModal } from "../components/diagnostics/OrthodonticPhotoProtocolModal";
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
});
