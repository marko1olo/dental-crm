import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	ALIGNER_804N_SERVICES,
	ALIGNER_ATTACHMENT_PRESETS,
	ANGLE_CLASS_OPTIONS,
	ARCHWIRE_MATERIALS,
	BRACKET_SYSTEMS,
	CLINICAL_ACTIONS,
	ELASTIC_SCHEMES,
	ELASTIC_SIZES,
	ORTHO_804N_ACTIONS_MAP,
	OrthodonticVisitProtocolWidget,
	RECT_SECTIONS,
	ROUND_SECTIONS,
	WORKHORSE_ARCHWIRES,
	calculateOrthodonticServices804n,
	type OrthodonticService804n,
} from "../OrthodonticVisitProtocolWidget";

describe("OrthodonticVisitProtocolWidget Component", () => {
	it("renders nothing when isOpen is false", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget isOpen={false} onClose={() => {}} />,
		);
		assert.equal(html, "");
	});

	it("renders full 1-click orthodontic protocol structure when isOpen is true", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget
				isOpen={true}
				onClose={() => {}}
				patientId="pat-101"
				patientName="Иванов Иван Иванович"
			/>,
		);

		// Container & Title
		assert.ok(html.includes("data-testid=\"orthodontic-visit-protocol-widget\""));
		assert.ok(html.includes("Ортодонтический протокол приёма"));
		assert.ok(html.includes("Иванов Иван Иванович"));

		// 1-Click Fast Action Buttons & >= 48px touch targets
		assert.ok(html.includes("data-testid=\"apply-to-form-043-btn\""));
		assert.ok(html.includes("data-testid=\"bottom-apply-protocol-btn\""));
		assert.ok(html.includes("В карту 043/у"));

		// 1-Click 804n Invoice Billing Buttons & Badges
		assert.ok(html.includes("data-testid=\"add-ortho-services-to-invoice-btn\""));
		assert.ok(html.includes("data-testid=\"bottom-add-services-to-invoice-btn\""));
		assert.ok(html.includes("data-testid=\"ortho-services-count-badge\""));
		assert.ok(html.includes("Начислить услуги 804н в чек/смету"));

		// Arch Presets & FDI Tooth Buttons (>= 40px touch targets)
		assert.ok(html.includes("Вся ВЧ"));
		assert.ok(html.includes("Вся НЧ"));
		assert.ok(html.includes("Обе челюсти"));
		assert.ok(html.includes("Фронт"));
		assert.ok(html.includes("min-w-[40px] min-h-[40px]"));

		// Brackets Slots
		assert.ok(html.includes("0.018"));
		assert.ok(html.includes("0.022"));

		// Materials
		assert.ok(html.includes("NiTi"));
		assert.ok(html.includes("CuNiTi"));
		assert.ok(html.includes("SS"));
		assert.ok(html.includes("TMA"));

		// Sections
		assert.ok(html.includes(".016"));
		assert.ok(html.includes(".019x.025"));

		// Elastics
		assert.ok(html.includes("Межчелюстные эластики"));
		assert.ok(html.includes("II класс"));

		// Live 043/u Protocol Preview
		assert.ok(html.includes("ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЁМА (ФОРМА 043/у)"));
		assert.ok(html.includes("1. ЖАЛОБЫ"));
		assert.ok(html.includes("2. ОБЪЕКТИВНЫЙ СТАТУС"));
		assert.ok(html.includes("3. ПРОВЕДЁННОЕ ЛЕЧЕНИЕ"));
		assert.ok(html.includes("4. РЕКОМЕНДАЦИИ И НАЗНАЧЕНИЯ"));
	});

	it("contains all canonical orthodontic presets and catalogs", () => {
		// Bracket Systems
		assert.ok(BRACKET_SYSTEMS.some((b) => b.id === "damon_q2"));
		assert.ok(BRACKET_SYSTEMS.some((b) => b.id === "damon_clear"));
		assert.ok(BRACKET_SYSTEMS.some((b) => b.id === "empower"));
		assert.ok(BRACKET_SYSTEMS.some((b) => b.id === "pitts21"));

		// Wire Materials
		assert.equal(ARCHWIRE_MATERIALS.length, 4);
		assert.ok(ARCHWIRE_MATERIALS.some((m) => m.id === "NiTi"));
		assert.ok(ARCHWIRE_MATERIALS.some((m) => m.id === "CuNiTi"));
		assert.ok(ARCHWIRE_MATERIALS.some((m) => m.id === "SS"));
		assert.ok(ARCHWIRE_MATERIALS.some((m) => m.id === "TMA"));

		// Sections
		assert.ok(ROUND_SECTIONS.includes(".014"));
		assert.ok(ROUND_SECTIONS.includes(".016"));
		assert.ok(RECT_SECTIONS.includes(".016x.022"));
		assert.ok(RECT_SECTIONS.includes(".019x.025"));

		// Elastics
		assert.ok(ELASTIC_SCHEMES.some((e) => e.id === "class_ii"));
		assert.ok(ELASTIC_SCHEMES.some((e) => e.id === "class_iii"));
		assert.ok(ELASTIC_SIZES.some((s) => s.id === "fox_3_16"));
		assert.ok(ELASTIC_SIZES.some((s) => s.id === "kangaroo_1_4"));

		// Clinical Actions
		assert.ok(CLINICAL_ACTIONS.some((a) => a.id === "wire_change"));
		assert.ok(CLINICAL_ACTIONS.some((a) => a.id === "power_chain"));
		assert.ok(CLINICAL_ACTIONS.some((a) => a.id === "rebracket"));
	});

	it("renders 4 autonomous 1-click clinical presets with correct testids and labels", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget
				isOpen={true}
				onClose={() => {}}
				patientId="pat-102"
				patientName="Петрова Анна Сергеевна"
			/>,
		);

		// Autonomous Presets Panel
		assert.ok(html.includes("data-testid=\"ortho-quick-presets-panel\""));
		assert.ok(html.includes("Быстрые клинические пресеты (1 клик)"));

		// 1. Routine activation
		assert.ok(html.includes("data-testid=\"ortho-preset-routine-activation\""));
		assert.ok(html.includes("Плановая активация"));

		// 2. Wire change
		assert.ok(html.includes("data-testid=\"ortho-preset-wire-change\""));
		assert.ok(html.includes("Смена дуг"));

		// 3. Bracket bonding
		assert.ok(html.includes("data-testid=\"ortho-preset-bracket-bonding\""));
		assert.ok(html.includes("Фиксация брекет-системы"));

		// 4. Debonding + retainer
		assert.ok(html.includes("data-testid=\"ortho-preset-debonding-retainer\""));
		assert.ok(html.includes("Снятие брекет-системы"));

		// 5. Aligner Lab Order (Mandate 8e)
		assert.ok(html.includes("data-testid=\"ortho-preset-aligner-lab-order\""));
		assert.ok(html.includes("Наряд ЗТЛ (Элайнеры / Каппа)"));
		assert.ok(html.includes("Мандат 8e: Истечение 30 дней плана НЕ БЛОКИРУЕТ"));
	});

	it("renders aligner attachments express block with 4 presets, delivery sets, and SOAP append button", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget
				isOpen={true}
				onClose={() => {}}
				patientId="pat-103"
				patientName="Сидорова Елена Васильевна"
				currentAligner={12}
				totalAligners={36}
			/>,
		);

		// Express Block Container
		assert.ok(html.includes("data-testid=\"aligner-attachments-express-block\""));
		assert.ok(html.includes("Аттачменты элайнеров"));

		// 4 Presets
		assert.ok(html.includes("data-testid=\"preset-standard-attachments\""));
		assert.ok(html.includes("Стандартные аттачменты: клыки и премоляры (15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45)"));

		assert.ok(html.includes("data-testid=\"preset-intact-attachments\""));
		assert.ok(html.includes("Аттачменты интактны, сколов нет"));

		assert.ok(html.includes("data-testid=\"preset-refixation-attachments\""));
		assert.ok(html.includes("Повторная фиксация аттачмента (замена)"));

		assert.ok(html.includes("data-testid=\"preset-debonding-attachments\""));
		assert.ok(html.includes("Снятие аттачментов и полировка (финиш)"));

		// Quick Delivery Sets (Mandate 8d: >= 44px touch targets)
		assert.ok(html.includes("data-testid=\"widget-issue-set-2-aligners-btn\""));
		assert.ok(html.includes("Сет 2 каппы (+14 дн.)"));
		assert.ok(html.includes("data-testid=\"widget-issue-set-4-aligners-btn\""));
		assert.ok(html.includes("Сет 4 каппы (+28 дн.)"));
		assert.ok(html.includes("min-h-[44px] min-w-[44px]"));

		// Append to Form 043/u diary button (concise label + full title to prevent text overflow)
		assert.ok(html.includes("data-testid=\"append-attachments-to-soap-btn\""));
		assert.ok(html.includes("Внести в дневник 043/у"));
		assert.ok(html.includes("title=\"Добавить протокол в дневник визита без стирания ранее набранного текста\""));

		// Catalog verification
		assert.equal(ALIGNER_ATTACHMENT_PRESETS.length, 4);
		assert.ok(ALIGNER_ATTACHMENT_PRESETS.some((p) => p.id === "standard"));
		assert.ok(ALIGNER_ATTACHMENT_PRESETS.some((p) => p.id === "intact"));
		assert.ok(ALIGNER_ATTACHMENT_PRESETS.some((p) => p.id === "refixation"));
		assert.ok(ALIGNER_ATTACHMENT_PRESETS.some((p) => p.id === "debonding"));
	});

	it("renders 1-click Angle classification selector bar with I, II/1, II/2, and III classes", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget
				isOpen={true}
				onClose={() => {}}
				patientId="pat-104"
				patientName="Кузнецов Дмитрий Павлович"
			/>,
		);

		// Angle Selector Container
		assert.ok(html.includes("data-testid=\"ortho-angle-class-selector\""));
		assert.ok(html.includes("Прикус по Энглю (1-клик фиксация)"));

		// 4 Angle Class Buttons
		assert.ok(html.includes("data-testid=\"angle-class-class_1-btn\""));
		assert.ok(html.includes("data-testid=\"angle-class-class_2_div_1-btn\""));
		assert.ok(html.includes("data-testid=\"angle-class-class_2_div_2-btn\""));
		assert.ok(html.includes("data-testid=\"angle-class-class_3-btn\""));

		assert.ok(html.includes("I класс"));
		assert.ok(html.includes("II/1 класс"));
		assert.ok(html.includes("II/2 класс"));
		assert.ok(html.includes("III класс"));

		// Generated 043/u diary objective status includes Angle classification
		assert.ok(html.includes("• Прикус (классификация Энгля):"));
		assert.ok(html.includes("I класс по Энглю (нейтральный прикус)"));
	});

	it("renders 1-click workhorse archwires strip (NiTi .014, .016, .018, SS .019x.025)", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget
				isOpen={true}
				onClose={() => {}}
				patientId="pat-105"
				patientName="Морозова Ольга Игоревна"
			/>,
		);

		// Workhorse Archwires Strip Container
		assert.ok(html.includes("data-testid=\"ortho-workhorse-wires-strip\""));
		assert.ok(html.includes("Рабочие дуги ортодонта (1 клик)"));

		// 4 Standard Archwires
		assert.ok(html.includes("data-testid=\"quick-wire-niti_014-btn\""));
		assert.ok(html.includes("data-testid=\"quick-wire-niti_016-btn\""));
		assert.ok(html.includes("data-testid=\"quick-wire-niti_018-btn\""));
		assert.ok(html.includes("data-testid=\"quick-wire-ss_019x025-btn\""));

		assert.ok(html.includes("NiTi .014"));
		assert.ok(html.includes("NiTi .016"));
		assert.ok(html.includes("NiTi .018"));
		assert.ok(html.includes("SS .019x.025"));
	});

	it("exports canonical ANGLE_CLASS_OPTIONS and WORKHORSE_ARCHWIRES", () => {
		assert.equal(ANGLE_CLASS_OPTIONS.length, 4);
		assert.ok(ANGLE_CLASS_OPTIONS.some((a) => a.id === "class_1"));
		assert.ok(ANGLE_CLASS_OPTIONS.some((a) => a.id === "class_2_div_1"));
		assert.ok(ANGLE_CLASS_OPTIONS.some((a) => a.id === "class_2_div_2"));
		assert.ok(ANGLE_CLASS_OPTIONS.some((a) => a.id === "class_3"));

		assert.equal(WORKHORSE_ARCHWIRES.length, 4);
		assert.ok(WORKHORSE_ARCHWIRES.some((w) => w.id === "niti_014" && w.material === "NiTi" && w.section === ".014"));
		assert.ok(WORKHORSE_ARCHWIRES.some((w) => w.id === "niti_016" && w.material === "NiTi" && w.section === ".016"));
		assert.ok(WORKHORSE_ARCHWIRES.some((w) => w.id === "niti_018" && w.material === "NiTi" && w.section === ".018"));
		assert.ok(WORKHORSE_ARCHWIRES.some((w) => w.id === "ss_019x025" && w.material === "SS" && w.section === ".019x.025"));

		assert.ok(BRACKET_SYSTEMS.some((b) => b.id === "removable_plate"));
		assert.ok(CLINICAL_ACTIONS.some((a) => a.id === "expansion_screw_activation"));
	});

	describe("804n Nomenclature Clinical Actions Mapping and Services Calculation", () => {
		it("maps wire_change to A16.07.048.002 (2500 rub) + A16.07.048 (1500 rub)", () => {
			const services = calculateOrthodonticServices804n({
				selectedActions: ["wire_change"],
			});
			assert.equal(services.length, 2);

			const wireChange = services.find((s) => s.code === "A16.07.048.002");
			assert.ok(wireChange, "A16.07.048.002 must be present");
			assert.equal(wireChange?.nameRu, "Смена ортодонтической дуги");
			assert.equal(wireChange?.priceRub, 2500);
			assert.equal(wireChange?.stageKind, "stage_ortho");

			const correction = services.find((s) => s.code === "A16.07.048");
			assert.ok(correction, "A16.07.048 must be present");
			assert.equal(correction?.nameRu, "Коррекция прикуса с использованием брекет-системы");
			assert.equal(correction?.priceRub, 1500);
			assert.equal(correction?.stageKind, "stage_ortho");
		});

		it("maps ligature_change to A16.07.048 (1500 rub)", () => {
			const services = calculateOrthodonticServices804n({
				selectedActions: ["ligature_change"],
			});
			assert.equal(services.length, 1);
			assert.equal(services[0]?.code, "A16.07.048");
			assert.equal(services[0]?.nameRu, "Активация элементов брекет-системы / смена лигатур");
			assert.equal(services[0]?.priceRub, 1500);
			assert.equal(services[0]?.stageKind, "stage_ortho");
		});

		it("maps rebracket to A16.07.048.001 (1200 rub) and binds toothNumber if selected", () => {
			const services = calculateOrthodonticServices804n({
				selectedActions: ["rebracket"],
				selectedTooth: 24,
			});
			assert.equal(services.length, 1);
			assert.equal(services[0]?.code, "A16.07.048.001");
			assert.equal(services[0]?.nameRu, "Фиксация одного брекета / замка");
			assert.equal(services[0]?.priceRub, 1200);
			assert.equal(services[0]?.stageKind, "stage_ortho");
			assert.equal(services[0]?.toothNumber, 24);
		});

		it("maps ipr to A16.07.048.003 (800 rub)", () => {
			const services = calculateOrthodonticServices804n({
				selectedActions: ["ipr"],
			});
			assert.equal(services.length, 1);
			assert.equal(services[0]?.code, "A16.07.048.003");
			assert.equal(services[0]?.nameRu, "Сепарация зубов");
			assert.equal(services[0]?.priceRub, 800);
			assert.equal(services[0]?.stageKind, "stage_ortho");
		});

		it("maps plate_activation to A16.07.047 (1000 rub)", () => {
			const services = calculateOrthodonticServices804n({
				selectedActions: ["plate_activation"],
			});
			assert.equal(services.length, 1);
			assert.equal(services[0]?.code, "A16.07.047");
			assert.equal(services[0]?.nameRu, "Коррекция съемного ортодонтического аппарата");
			assert.equal(services[0]?.priceRub, 1000);
			assert.equal(services[0]?.stageKind, "stage_ortho");
		});

		it("maps expansion_screw_activation to A16.07.047.001 (800 rub)", () => {
			const services = calculateOrthodonticServices804n({
				selectedActions: ["expansion_screw_activation"],
			});
			assert.equal(services.length, 1);
			assert.equal(services[0]?.code, "A16.07.047.001");
			assert.equal(services[0]?.nameRu, "Активация расширяющего винта пластинки");
			assert.equal(services[0]?.priceRub, 800);
			assert.equal(services[0]?.stageKind, "stage_ortho");
		});

		it("maps debonding to A16.07.049 (5000 rub) + A16.07.050 (4000 rub)", () => {
			const services = calculateOrthodonticServices804n({
				selectedActions: ["debonding"],
			});
			assert.equal(services.length, 2);

			const debond = services.find((s) => s.code === "A16.07.049");
			assert.ok(debond);
			assert.equal(debond?.nameRu, "Снятие несъемного ортодонтического аппарата");
			assert.equal(debond?.priceRub, 5000);

			const retainer = services.find((s) => s.code === "A16.07.050");
			assert.ok(retainer);
			assert.equal(retainer?.nameRu, "Фиксация несъемного ретейнера");
			assert.equal(retainer?.priceRub, 4000);
		});

		it("maps aligners / isAttachmentsOnly to A16.07.046 (3000 rub) + A16.07.046.001 (2000 rub)", () => {
			const services = calculateOrthodonticServices804n({
				isAttachmentsOnly: true,
			});
			assert.equal(services.length, 2);

			const alignerControl = services.find((s) => s.code === "A16.07.046");
			assert.ok(alignerControl);
			assert.equal(alignerControl?.nameRu, "Ортодонтическая коррекция с применением элайнеров");
			assert.equal(alignerControl?.priceRub, 3000);

			const attachmentsFix = services.find((s) => s.code === "A16.07.046.001");
			assert.ok(attachmentsFix);
			assert.equal(attachmentsFix?.nameRu, "Фиксация композитных аттачментов элайнеров");
			assert.equal(attachmentsFix?.priceRub, 2000);
		});

		it("deduplicates identical 804n codes when multiple actions share a code", () => {
			// wire_change contains A16.07.048 and ligature_change also contains A16.07.048
			const services = calculateOrthodonticServices804n({
				selectedActions: ["wire_change", "ligature_change"],
			});
			assert.equal(services.length, 2);
			const codes = services.map((s) => s.code);
			assert.deepEqual(codes, ["A16.07.048.002", "A16.07.048"]);
		});

		it("contains comprehensive ORTHO_804N_ACTIONS_MAP and ALIGNER_804N_SERVICES definitions", () => {
			assert.ok(ORTHO_804N_ACTIONS_MAP.wire_change);
			assert.ok(ORTHO_804N_ACTIONS_MAP.ligature_change);
			assert.ok(ORTHO_804N_ACTIONS_MAP.rebracket);
			assert.ok(ORTHO_804N_ACTIONS_MAP.ipr);
			assert.ok(ORTHO_804N_ACTIONS_MAP.plate_activation);
			assert.ok(ORTHO_804N_ACTIONS_MAP.expansion_screw_activation);
			assert.ok(ORTHO_804N_ACTIONS_MAP.debonding);

			assert.equal(ALIGNER_804N_SERVICES.length, 2);
			assert.equal(ALIGNER_804N_SERVICES[0]?.code, "A16.07.046");
			assert.equal(ALIGNER_804N_SERVICES[1]?.code, "A16.07.046.001");
		});
	});

	describe("CustomEvent dente-add-services-to-invoice Event Structure", () => {
		it("dispatches dente-add-services-to-invoice with valid structure and stageKind: stage_ortho", () => {
			const services = calculateOrthodonticServices804n({
				selectedActions: ["wire_change", "rebracket"],
				selectedTooth: 13,
			});

			let dispatchedEvent: CustomEvent<{
				services: OrthodonticService804n[];
				toothNumber?: number;
				stageKind: string;
			}> | null = null;

			const mockListener = (e: Event) => {
				dispatchedEvent = e as CustomEvent<{
					services: OrthodonticService804n[];
					toothNumber?: number;
					stageKind: string;
				}>;
			};

			const eventTarget = typeof window !== "undefined" ? window : new EventTarget();

			eventTarget.addEventListener("dente-add-services-to-invoice", mockListener as EventListener);

			try {
				eventTarget.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: {
							services,
							toothNumber: 13,
							stageKind: "stage_ortho",
						},
					}),
				);

				assert.ok(dispatchedEvent !== null, "Event must be received");
				const detail = (dispatchedEvent as any).detail;
				assert.equal(detail.stageKind, "stage_ortho");
				assert.equal(detail.toothNumber, 13);
				assert.equal(detail.services.length, 3);
				assert.ok(detail.services.some((s: any) => s.code === "A16.07.048.002"));
				assert.ok(detail.services.some((s: any) => s.code === "A16.07.048"));
				assert.ok(detail.services.some((s: any) => s.code === "A16.07.048.001" && s.toothNumber === 13));
			} finally {
				eventTarget.removeEventListener("dente-add-services-to-invoice", mockListener as EventListener);
			}
		});
	});
});


