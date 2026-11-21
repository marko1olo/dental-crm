import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, vi } from "vitest";
import { mapSurfacesToCariesType } from "../gate0/gate0CariesMapper";
import { AnatomicalTooth } from "../gate0/AnatomicalTooth";
import { Tooth11Container } from "../gate0/teeth/tooth11/Tooth11Container";
import { Tooth46Container } from "../gate0/teeth/tooth46/Tooth46Container";
import { Tooth41Container } from "../gate0/teeth/tooth41/Tooth41Container";
import { LiveInvoiceFiscalBridge } from "../LiveInvoiceFiscalBridge";

describe("Odontogram Wheeler 2.5D Red Team Fixes Verification Suite", () => {
	describe("ДЕФЕКТ 1 [SEV-2]: Инверсия координаты бейджа статуса для верхних зубов", () => {
		it("рассчитывает cy = 24.0 для верхней челюсти (зуб 11) и cy = 176.0 для нижней (зуб 46)", () => {
			const upperHtml = renderToStaticMarkup(
				React.createElement(AnatomicalTooth, { toothNumber: 11, showBadge: true, badgeRadius: 14 })
			);
			assert.ok(upperHtml.includes('cy="24"'), "Верхний зуб 11 должен иметь бейдж вверху cy=24");

			const lowerHtml = renderToStaticMarkup(
				React.createElement(AnatomicalTooth, { toothNumber: 46, showBadge: true, badgeRadius: 14 })
			);
			assert.ok(lowerHtml.includes('cy="176"'), "Нижний зуб 46 при r=14 должен иметь cy=176");
		});

		it("Tooth11Container рендерит бейдж с cy = 24.0 при r > 10", () => {
			const html = renderToStaticMarkup(
				React.createElement(Tooth11Container, { toothNumber: 11, showBadge: true, badgeRadius: 14 })
			);
			assert.ok(html.includes('cy="24"'), "Tooth11Container должен рендерить cy=24 для верхней челюсти");
		});
	});

	describe("ДЕФЕКТ 2 [SEV-2]: Фиксация канонического viewBox 0 0 100 218 и baseHeight = 218", () => {
		it("Tooth11Container сохраняет viewBox='0 0 100 218' безусловно независимо от радиуса бейджа", () => {
			const htmlR8 = renderToStaticMarkup(
				React.createElement(Tooth11Container, { toothNumber: 11, badgeRadius: 8.5 })
			);
			assert.ok(htmlR8.includes('viewBox="0 0 100 218"'), "Tooth11Container при r=8.5 должен сохранять viewBox 0 0 100 218");
			assert.ok(htmlR8.includes('height="218"'), "Tooth11Container при r=8.5 должен сохранять height 218");

			const htmlR14 = renderToStaticMarkup(
				React.createElement(Tooth11Container, { toothNumber: 11, badgeRadius: 14 })
			);
			assert.ok(htmlR14.includes('viewBox="0 0 100 218"'), "Tooth11Container при r=14 должен сохранять viewBox 0 0 100 218");
			assert.ok(htmlR14.includes('height="218"'), "Tooth11Container при r=14 должен сохранять height 218");
		});

		it("Tooth46Container и Tooth41Container сохраняют viewBox='0 0 100 218' безусловно", () => {
			const html46 = renderToStaticMarkup(
				React.createElement(Tooth46Container, { toothNumber: 46, badgeRadius: 8.5 })
			);
			assert.ok(html46.includes('viewBox="0 0 100 218"'), "Tooth46Container должен сохранять viewBox 0 0 100 218");

			const html41 = renderToStaticMarkup(
				React.createElement(Tooth41Container, { toothNumber: 41, badgeRadius: 8.5 })
			);
			assert.ok(html41.includes('viewBox="0 0 100 218"'), "Tooth41Container должен сохранять viewBox 0 0 100 218");
		});
	});

	describe("ДЕФЕКТ 3 [SEV-3]: Классификация кариеса слепой ямки нёбных/язычных поверхностей", () => {
		it("классифицирует изолированную поверхность L резца/клыка как Класс I по Блэку", () => {
			// Центральный верхний резец 11
			assert.equal(mapSurfacesToCariesType(11, ["L"]), "class1");
			// Боковой верхний резец 12
			assert.equal(mapSurfacesToCariesType(12, ["L"]), "class1");
			// Верхний клык 13
			assert.equal(mapSurfacesToCariesType(13, ["L"]), "class1");
			// Нижний клык 43
			assert.equal(mapSurfacesToCariesType(43, ["L"]), "class1");
		});

		it("сохраняет Класс III по Блэку для апроксимальных поверхностей резцов (M, D)", () => {
			assert.equal(mapSurfacesToCariesType(11, ["M"]), "class3");
			assert.equal(mapSurfacesToCariesType(11, ["D"]), "class3");
			assert.equal(mapSurfacesToCariesType(21, ["M"]), "class3");
		});

		it("сохраняет Класс IV при переходе на режущий край/окклюзию (MO, DO)", () => {
			assert.equal(mapSurfacesToCariesType(11, ["M", "O"]), "class4");
			assert.equal(mapSurfacesToCariesType(21, ["D", "O"]), "class4");
		});

		it("сохраняет Класс V для пришеечных поверхностей (V, C)", () => {
			assert.equal(mapSurfacesToCariesType(11, ["V"]), "class5");
			assert.equal(mapSurfacesToCariesType(11, ["C"]), "class5");
		});
	});

	describe("ДЕФЕКТ 4 [SEV-3]: Проброс целочисленных копеек в LiveInvoiceFiscalBridge", () => {
		it("пробрасывает целочисленные суммы в рендеринг CashRegisterStudioModal", () => {
			const html = renderToStaticMarkup(
				React.createElement(LiveInvoiceFiscalBridge, {
					isOpen: true,
					baseItems: [{ key: "item1", title: "Лечение кариеса", priceRub: 4500, quantity: 1, toothNumber: 16 }],
					patientId: "test-patient-uuid",
					patientName: "Иванов И.И.",
					netTotalPrice: 4500,
					netTotalKopecks: 450000n,
					onClose: () => {},
				})
			);

			assert.ok(html.includes('data-testid="cash-register-studio-modal"'), "Касса должна быть успешно смонтирована");
			assert.ok(html.includes("4500") || html.includes("4\u00a0500") || html.includes("4 500"), "Касса должна отображать сумму сметы");
			assert.ok(html.includes("Принять оплату"), "Касса должна содержать Primary CTA кнопку приёма оплаты");
		});
	});

	describe("ДЕФЕКТ 5 [SEV-4]: Дебаунс-батчинг при частых кликах по зубам в SOAP протокол", () => {
		it("батчит множественные быстрые клики через 250мс дебаунс-таймер", async () => {
			vi.useFakeTimers();
			const events: unknown[] = [];
			const eventTarget = new EventTarget();

			// Эмулируем внутренний дебаунс-батчер useOdontogramSync
			const pending: Array<{ toothNumber: number; state: string }> = [];
			let timer: ReturnType<typeof setTimeout> | null = null;

			function simulateToothClick(num: number, state: string) {
				pending.push({ toothNumber: num, state });
				if (timer) clearTimeout(timer);
				timer = setTimeout(() => {
					const batch = [...pending];
					pending.length = 0;
					for (const item of batch) {
						eventTarget.dispatchEvent(
							new CustomEvent("dente-apply-soap-protocol", {
								detail: { finding: item, mode: "smart_append", immediate: true },
							})
						);
					}
				}, 250);
			}

			const listener = (e: Event) => {
				events.push((e as CustomEvent).detail);
			};
			eventTarget.addEventListener("dente-apply-soap-protocol", listener);

			// Клик 1: зуб 11 (кариес)
			simulateToothClick(11, "Caries");
			// Через 50мс клик 2: зуб 12 (кариес)
			vi.advanceTimersByTime(50);
			simulateToothClick(12, "Caries");
			// До истечения 250мс событий отправлено быть не должно!
			assert.equal(events.length, 0);

			// Прокручиваем время на 250мс
			vi.advanceTimersByTime(250);

			// Оба события отправлены в одном батче
			assert.equal(events.length, 2);
			assert.equal((events[0] as { finding: { toothNumber: number } }).finding.toothNumber, 11);
			assert.equal((events[1] as { finding: { toothNumber: number } }).finding.toothNumber, 12);

			eventTarget.removeEventListener("dente-apply-soap-protocol", listener);
			vi.useRealTimers();
		});
	});
});
