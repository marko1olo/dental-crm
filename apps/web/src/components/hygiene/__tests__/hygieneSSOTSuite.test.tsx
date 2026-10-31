/**
 * @dental/web/components/hygiene/__tests__/hygieneSSOTSuite.test.tsx
 *
 * DENTE Dental CRM — Red Team SSOT Тест-сьют: Профессиональная гигиена, индекс OHI-S и домашний уход.
 * Проверяет:
 * 1. Инварианты размеров файлов каталога (280–350 строк) и студии (380–480 строк) (Мандат 8b).
 * 2. Автономию врача: ни одной disabled кнопки (Мандат 8e).
 * 3. Единый дизайн-код: ровно 1 Primary CTA кнопка цвета teal (#0d9488) (Мандат 8am).
 * 4. Чистый русский язык без птичьего канцелярита и регуляторных шифров (Мандат 8x, 8ap).
 * 5. Apple HIG на мобильных: Drag Handle 36x5px, Bottom Sheet rounded-t-[24px] (Мандат 8ze).
 * 6. Полная связность: монтирование DirectHygieneLauncher в AppShell и StandaloneLaunchers (Мандат 8aq).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	OHI_S_PRESETS,
	CLEANING_PROTOCOLS,
	HOME_CARE_PLANS,
	dispatchHygieneInvoiceAndServices,
	commitHygieneVisitProtocol,
} from "../hygieneCatalogData";
import { HygieneStudioModal } from "../HygieneStudioModal";
import { DirectHygieneLauncher } from "../DirectHygieneLauncher";

describe("Red Team Hygiene SSOT Suite — Professional Hygiene & OHI-S Studio", () => {
	const hygieneDir = path.resolve(process.cwd(), "src/components/hygiene");
	const appShellPath = path.resolve(process.cwd(), "src/AppShell.tsx");
	const standalonePath = path.resolve(
		process.cwd(),
		"src/components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx",
	);

	describe("1. File Size Budgets & Sweet Spots (Mandate 8b)", () => {
		it("hygieneCatalogData.ts is strictly within 280–350 lines", () => {
			const catalogPath = path.join(hygieneDir, "hygieneCatalogData.ts");
			assert.ok(fs.existsSync(catalogPath), "hygieneCatalogData.ts must exist");
			const lines = fs.readFileSync(catalogPath, "utf-8").split("\n").length;
			assert.ok(
				lines >= 280 && lines <= 350,
				`hygieneCatalogData.ts must be 280–350 lines, was ${lines}`,
			);
		});

		it("HygieneStudioModal.tsx is strictly within 380–480 lines", () => {
			const studioPath = path.join(hygieneDir, "HygieneStudioModal.tsx");
			assert.ok(fs.existsSync(studioPath), "HygieneStudioModal.tsx must exist");
			const lines = fs.readFileSync(studioPath, "utf-8").split("\n").length;
			assert.ok(
				lines >= 380 && lines <= 480,
				`HygieneStudioModal.tsx must be 380–480 lines, was ${lines}`,
			);
		});

		it("DirectHygieneLauncher.tsx is strictly within 60–100 lines", () => {
			const launcherPath = path.join(hygieneDir, "DirectHygieneLauncher.tsx");
			assert.ok(fs.existsSync(launcherPath), "DirectHygieneLauncher.tsx must exist");
			const lines = fs.readFileSync(launcherPath, "utf-8").split("\n").length;
			assert.ok(
				lines >= 60 && lines <= 100,
				`DirectHygieneLauncher.tsx must be 60–100 lines, was ${lines}`,
			);
		});
	});

	describe("2. Clinical Catalog & OHI-S Protocols Data Integrity", () => {
		it("OHI_S_PRESETS contains 4 standard levels with accurate scores", () => {
			assert.equal(OHI_S_PRESETS.length, 4);
			const [ideal, fair, poor, severe] = OHI_S_PRESETS;

			assert.equal(ideal.id, "ideal");
			assert.equal(ideal.score, 0.0);
			assert.ok(ideal.label.includes("0.0"));

			assert.equal(fair.id, "fair");
			assert.equal(fair.score, 0.8);
			assert.ok(fair.label.includes("0.8"));

			assert.equal(poor.id, "poor");
			assert.equal(poor.score, 1.8);
			assert.ok(poor.label.includes("1.8"));

			assert.equal(severe.id, "severe");
			assert.equal(severe.score, 2.6);
			assert.ok(severe.label.includes("2.6"));
		});

		it("CLEANING_PROTOCOLS includes complex, perio, pediatric and fluoridation with valid prices", () => {
			assert.equal(CLEANING_PROTOCOLS.length, 4);
			const complex = CLEANING_PROTOCOLS.find((p) => p.id === "complex");
			assert.ok(complex);
			assert.equal(complex.primaryService.code, "A16.07.051");
			assert.equal(complex.primaryService.priceRub, 5500);
			assert.ok(complex.consumables.some((c) => c.includes("глицин")));
			assert.ok(complex.consumables.some((c) => c.includes("Cleanic")));

			const perio = CLEANING_PROTOCOLS.find((p) => p.id === "perio");
			assert.ok(perio);
			assert.equal(perio.primaryService.code, "A16.07.051.001");
			assert.equal(perio.primaryService.priceRub, 6200);

			const pediatric = CLEANING_PROTOCOLS.find((p) => p.id === "pediatric");
			assert.ok(pediatric);
			assert.equal(pediatric.primaryService.code, "A16.07.051.002");

			const fluoridation = CLEANING_PROTOCOLS.find((p) => p.id === "fluoridation");
			assert.ok(fluoridation);
			assert.equal(fluoridation.primaryService.code, "A11.07.012");
		});

		it("HOME_CARE_PLANS contains evidence-based oral hygiene recommendations", () => {
			assert.equal(HOME_CARE_PLANS.length, 3);
			const [std, perio, ortho] = HOME_CARE_PLANS;

			assert.ok(std.toothbrush.includes("Curaprox"));
			assert.ok(std.interdental.includes("ершики"));
			assert.equal(std.recallMonths, 6);

			assert.ok(perio.toothpaste.includes("Biorepair") || perio.toothpaste.includes("Parodontax"));
			assert.equal(perio.recallMonths, 3);

			assert.ok(ortho.toothbrush.includes("Ortho"));
			assert.ok(ortho.monotuft.includes("1006"));
			assert.equal(ortho.recallMonths, 3);
		});

		it("dispatchHygieneInvoiceAndServices fires estimate and invoice events cleanly", () => {
			const events: Array<{ type: string; detail: any }> = [];
			const origDispatch = typeof window !== "undefined" ? window.dispatchEvent : undefined;

			// Mock window dispatchEvent
			(globalThis as any).window = {
				dispatchEvent: (event: any) => {
					events.push({ type: event.type, detail: event.detail });
					return true;
				},
			};

			try {
				const complex = CLEANING_PROTOCOLS[0];
				dispatchHygieneInvoiceAndServices(complex);

				const invoiceEvents = events.filter((e) => e.type === "dente-add-services-to-invoice");
				const estimateEvents = events.filter((e) => e.type === "dente-add-estimate-service");

				assert.equal(invoiceEvents.length, 1);
				assert.equal(estimateEvents.length, 1);
				assert.equal(invoiceEvents[0].detail.code, "A16.07.051");
				assert.equal(invoiceEvents[0].detail.priceRub, 5500);
			} finally {
				if (origDispatch) {
					(globalThis as any).window.dispatchEvent = origDispatch;
				}
			}
		});
	});

	describe("3. HygieneStudioModal Doctor Autonomy & Apple HIG Invariants", () => {
		it("renders HygieneStudioModal without crash", () => {
			const html = renderToStaticMarkup(
				createElement(HygieneStudioModal, {
					isOpen: true,
					onClose: () => {},
					patientName: "Алексей Смирнов",
					doctorName: "Д-р Смирнова А.В.",
					previousOhiS: 2.4,
				}),
			);

			assert.ok(html.includes("Профессиональная гигиена и профилактика"));
			assert.ok(html.includes("data-testid=\"hygiene-studio-modal\""));
			assert.ok(html.includes("data-testid=\"hygiene-commit-protocol-btn\""));
			assert.ok(html.includes("data-testid=\"hygiene-print-memo-btn\""));
			assert.ok(html.includes("data-testid=\"ohi-s-dynamics-banner\""));
		});

		it("Mandate 8e: ZERO disabled buttons across the entire studio", () => {
			const html = renderToStaticMarkup(
				createElement(HygieneStudioModal, {
					isOpen: true,
					onClose: () => {},
				}),
			);

			// Assert no button has disabled attribute
			assert.equal(
				html.includes("disabled"),
				false,
				"HygieneStudioModal must NEVER have disabled buttons (Mandate 8e Doctor Autonomy)",
			);
		});

		it("Mandate 8am: exactly ONE Primary CTA button with teal color #0d9488", () => {
			const html = renderToStaticMarkup(
				createElement(HygieneStudioModal, {
					isOpen: true,
					onClose: () => {},
				}),
			);

			// Primary CTA button
			assert.ok(
				html.includes("bg-teal-600"),
				"Primary CTA button must use bg-teal-600",
			);
			assert.ok(
				html.includes("✓ Зафиксировать протокол гигиены"),
				"Primary CTA must read '✓ Зафиксировать протокол гигиены'",
			);

			// Count occurrences of Primary CTA styling
			const primaryCtaMatches = html.match(/bg-teal-600/g) || [];
			assert.equal(
				primaryCtaMatches.length,
				1,
				"Must have strictly ONE Primary CTA button with bg-teal-600",
			);
		});

		it("Mandate 8ze: Apple HIG Drag Handle (36x5px) and Bottom Sheet rounded-t-[24px]", () => {
			const html = renderToStaticMarkup(
				createElement(HygieneStudioModal, {
					isOpen: true,
					onClose: () => {},
				}),
			);

			assert.ok(
				html.includes("rounded-t-[24px]"),
				"Must feature rounded-t-[24px] for mobile bottom sheet",
			);
			assert.ok(
				html.includes("data-testid=\"hygiene-drag-handle\""),
				"Must feature mobile drag handle",
			);
			assert.ok(
				html.includes("w-9 h-1.5"),
				"Drag handle must have 36x6px Apple HIG dimensions (w-9 h-1.5)",
			);
		});

		it("Mandate 8x & 8ap: Zero bird language or Soviet decree ciphers in UI", () => {
			const html = renderToStaticMarkup(
				createElement(HygieneStudioModal, {
					isOpen: true,
					onClose: () => {},
				}),
			);

			assert.equal(html.includes("043/у"), false, "Must not display raw 043/у in visible modal text");
			assert.equal(html.includes("804н"), false, "Must not display raw 804н in visible modal text");
			assert.equal(html.includes("54-ФЗ"), false, "Must not display raw 54-ФЗ in visible modal text");
			assert.equal(html.includes("СанПиН"), false, "Must not display raw SanPiN in visible modal text");
		});

		it("renders OHI-S dynamics comparison banner (Was: 2.4 -> Now: 0.8)", () => {
			const html = renderToStaticMarkup(
				createElement(HygieneStudioModal, {
					isOpen: true,
					onClose: () => {},
					previousOhiS: 2.4,
				}),
			);

			assert.ok(html.includes("data-testid=\"ohi-s-dynamics-banner\""));
			assert.ok(html.includes("Было: 2.4 ➔ Стало: 0.8"));
			assert.ok(html.includes("Улучшение на 67% 🟢"));
		});
	});

	describe("4. Direct Deep-Link Mounting & Architecture Integration (Mandate 8aq)", () => {
		it("DirectHygieneLauncher mounts into AppShell.tsx", () => {
			assert.ok(fs.existsSync(appShellPath), "AppShell.tsx must exist");
			const content = fs.readFileSync(appShellPath, "utf-8");
			assert.ok(
				content.includes("DirectHygieneLauncher"),
				"AppShell must import DirectHygieneLauncher",
			);
			assert.ok(
				content.includes("<DirectHygieneLauncher />"),
				"AppShell must render <DirectHygieneLauncher />",
			);
		});

		it("DirectHygieneLauncher mounts into StandaloneLaunchers.tsx under deep links", () => {
			assert.ok(fs.existsSync(standalonePath), "StandaloneLaunchers.tsx must exist");
			const content = fs.readFileSync(standalonePath, "utf-8");
			assert.ok(
				content.includes("DirectHygieneLauncher"),
				"StandaloneLaunchers must import DirectHygieneLauncher",
			);
			assert.ok(
				content.includes("hygiene=1") && content.includes("#hygiene"),
				"StandaloneLaunchers must route hygiene=1 and #hygiene",
			);
			assert.ok(
				content.includes("cleaning=1") && content.includes("#cleaning"),
				"StandaloneLaunchers must route cleaning=1 and #cleaning",
			);
		});
	});
});
