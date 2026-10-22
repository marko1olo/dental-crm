import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	ClinicalWriteoffModal,
	DEFAULT_CLINICAL_SERVICES,
} from "../writeoff/ClinicalWriteoffModal.js";

describe("SSR Rendering of ClinicalWriteoffModal", () => {
	it("Рендерит модальное окно списания в статический HTML", () => {
		const html = renderToStaticMarkup(
			createElement(ClinicalWriteoffModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Сидоров Петр",
				initialServices: DEFAULT_CLINICAL_SERVICES,
			}),
		);

		assert.ok(html.includes("data-testid=\"clinical-writeoff-modal\""));
		assert.ok(html.includes("Клиническое списание материалов"));
		assert.ok(html.includes("Сидоров Петр"));
		assert.ok(html.includes("Норма расхода"));
	});

	it("Рендерит честный EmptyState при отсутствии выполненных услуг в приеме", () => {
		const html = renderToStaticMarkup(
			createElement(ClinicalWriteoffModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Сидоров Петр",
				initialServices: [],
			}),
		);

		assert.ok(html.includes("data-testid=\"cw-empty-services\""));
		assert.ok(html.includes("В текущем приёме нет выполненных клинических услуг"));
	});
});
