import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { DoctorPieceRateWalletView, pluralizeRu } from "../DoctorPieceRateWalletView";
import { DoctorMobileShiftModal } from "../../doctor-portal/DoctorMobileShiftModal";
import { SAMPLE_DOCTOR_SHIFT_APPOINTMENTS } from "@dental/shared";

describe("DoctorPieceRateWalletView & Doctor Mobile Shift Integration (THE HAMMER Standards)", () => {
	it("DoctorPieceRateWalletView: рендерит 4-карточную сводку, мобильный Drag Handle (Apple HIG) и кнопки без ошибок", () => {
		const html = renderToString(
			<DoctorPieceRateWalletView
				doctorId="doc-1"
				doctorName="Д-р Смирнов Алексей Петрович"
				doctorSpecialty="Врач-стоматолог терапевт-ортопед"
				shiftDateIso="2026-10-11"
				onClose={() => {}}
			/>,
		);

		// 1. Проверяем наличие основного контейнера, Apple HIG Drag Handle и заголовка
		assert.ok(html.includes("doctor-piece-rate-container"));
		assert.ok(html.includes("dpr-mobile-drag-handle-bar"));
		assert.ok(html.includes('data-testid="dpr-header-close-btn"'));
		assert.ok(html.includes("Сдельная оплата и вычеты ЗТЛ"));
		assert.ok(html.includes("Д-р Смирнов Алексей Петрович"));

		// 2. Проверяем контролы периодов
		assert.ok(html.includes("Сегодня"));
		assert.ok(html.includes("Вчера"));

		// 3. Проверяем отсутствие дев-жаргона
		assert.ok(!html.includes("Мандат 8e"));
		assert.ok(!html.includes("1-клик допуск"));
		assert.ok(!html.includes("disabled={true}"));

		// 4. Проверяем отсутствие мультяшных эмодзи
		assert.ok(!html.includes("🔥"));
		assert.ok(!html.includes("👑"));
		assert.ok(!html.includes("✨"));
		assert.ok(!html.includes("❌"));
	});

	it("pluralizeRu: формирует грамотное русское склонение ('3 приёма • 4 услуги')", () => {
		const aptForms = ["приём", "приёма", "приёмов"] as const;
		const srvForms = ["услуга", "услуги", "услуг"] as const;

		assert.equal(`3 ${pluralizeRu(3, aptForms)} • 4 ${pluralizeRu(4, srvForms)}`, "3 приёма • 4 услуги");
		assert.equal(`1 ${pluralizeRu(1, aptForms)} • 1 ${pluralizeRu(1, srvForms)}`, "1 приём • 1 услуга");
		assert.equal(`5 ${pluralizeRu(5, aptForms)} • 12 ${pluralizeRu(12, srvForms)}`, "5 приёмов • 12 услуг");
	});

	it("DoctorMobileShiftModal: поддерживает вкладку 💼 Сделка и ЗТЛ (tab-wallet)", () => {
		const html = renderToString(
			<DoctorMobileShiftModal
				isOpen={true}
				onClose={() => {}}
				initialDoctorId="doc-1"
				initialDoctorName="Д-р Смирнов Алексей Петрович"
				initialDoctorSpecialty="Терапевт-ортопед"
				initialShiftDateIso="2026-10-11"
				initialAppointments={SAMPLE_DOCTOR_SHIFT_APPOINTMENTS}
			/>,
		);

		assert.ok(html.includes('data-testid="tab-wallet"'));
		assert.ok(html.includes("Сделка и ЗТЛ"));
		assert.ok(html.includes("doctor-shift-earnings-card"));
	});
});
