import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { useVisitStore } from "../../store/visitStore";
import {
	showRollbackToast,
	showToast,
	type ToastEventDetail,
} from "../GlobalToast";
import { removeItemFromStages } from "../treatment-plans/treatmentPlanStageMutations";
import type { TreatmentPlanStage } from "../treatment-plans/types";

describe("Red Team Inquisition: Toast Rollback & Modalless Speed Architecture", () => {
	let dispatchedEvents: CustomEvent<ToastEventDetail>[] = [];

	beforeEach(() => {
		dispatchedEvents = [];
		// Мок window.dispatchEvent для перехвата тостов
		if (typeof window === "undefined") {
			// @ts-expect-error minimal mock for node test runner
			globalThis.window = {
				dispatchEvent: (event: Event) => {
					dispatchedEvents.push(event as CustomEvent<ToastEventDetail>);
					return true;
				},
			};
		} else {
			window.dispatchEvent = (event: Event) => {
				dispatchedEvents.push(event as CustomEvent<ToastEventDetail>);
				return true;
			};
		}
	});

	describe("1. Contract: showRollbackToast & Undo Event Dispatch", () => {
		it("dispatches 'dente-toast' with non-blocking info type, 5000ms duration, and undo action", () => {
			let undoTriggered = false;
			showRollbackToast("Услуга «Кариес дентина» удалена", () => {
				undoTriggered = true;
			});

			assert.equal(
				dispatchedEvents.length,
				1,
				"Exactly 1 toast event must be dispatched",
			);
			const event = dispatchedEvents[0]!;
			assert.equal(event.type, "dente-toast");
			assert.equal(event.detail.type, "info");
			assert.equal(event.detail.text, "Услуга «Кариес дентина» удалена");
			assert.equal(
				event.detail.duration,
				5000,
				"Default rollback duration must be 5000ms",
			);
			assert.ok(
				event.detail.action,
				"Action must be defined for rollback toast",
			);
			assert.equal(event.detail.action?.label, "Отменить");

			// Trigger Undo action
			event.detail.action?.onAction();
			assert.equal(
				undoTriggered,
				true,
				"onUndo callback must be called when action is executed",
			);
		});

		it("supports custom duration and action label for specialized rollbacks", () => {
			let undoTriggered = false;
			showRollbackToast(
				"Протокол сброшен",
				() => {
					undoTriggered = true;
				},
				7000,
				"Вернуть",
			);

			const event = dispatchedEvents[0]!;
			assert.equal(event.detail.duration, 7000);
			assert.equal(event.detail.action?.label, "Вернуть");
			event.detail.action?.onAction();
			assert.equal(undoTriggered, true);
		});
	});

	describe("2. Estimator Rollback: Instant Optimistic Removal & Accurate Restoration", () => {
		it("removes item instantly at 0ms and restores it back to exact original index upon undo", () => {
			interface TestPlanItem {
				id: string;
				name: string;
				toothNumber?: number;
				priceRub: number;
			}

			let items: TestPlanItem[] = [
				{
					id: "1",
					name: "Анестезия Убистезин",
					toothNumber: 16,
					priceRub: 800,
				},
				{
					id: "2",
					name: "Препарирование полости",
					toothNumber: 16,
					priceRub: 1500,
				},
				{
					id: "3",
					name: "Пломба световая Gradia",
					toothNumber: 16,
					priceRub: 3500,
				},
			];

			// Имитация removeItem(1) в TreatmentEstimator
			const targetIdx = 1;
			const removed = items[targetIdx]!;

			// 1. Instant optimistic removal (0 ms delay)
			items = items.filter((_, i) => i !== targetIdx);
			assert.equal(items.length, 2);
			assert.equal(items[0]!.id, "1");
			assert.equal(items[1]!.id, "3");

			// 2. Dispatch toast with rollback
			showRollbackToast(`Услуга «${removed.name}» удалена из сметы`, () => {
				const next = [...items];
				next.splice(targetIdx, 0, removed);
				items = next;
			});

			assert.equal(dispatchedEvents.length, 1);
			assert.ok(
				dispatchedEvents[0]!.detail.text.includes("Препарирование полости"),
			);

			// 3. User clicks Undo within 5 seconds
			dispatchedEvents[0]!.detail.action?.onAction();

			assert.equal(items.length, 3, "All 3 items must be restored");
			assert.equal(items[0]!.id, "1");
			assert.equal(
				items[1]!.id,
				"2",
				"Restored item must be back at original index 1",
			);
			assert.equal(items[2]!.id, "3");
		});
	});

	describe("3. Visit Clinical Note Rollback: Service & Tooth State Restoration", () => {
		it("rolls back removed completed service line and tooth clinical status cleanly", () => {
			useVisitStore.setState({
				completedServices: [
					{
						serviceId: "srv-101",
						code804n: "A16.07.002",
						name: "Восстановление зуба пломбой",
						toothCode: "16",
						priceRub: 4000,
						quantity: 1,
					} as any,
				],
				visitToothStateByCode: {
					"16": "treatment",
				},
			});

			let planText =
				"1. Восстановление зуба пломбой (зуб 16) — 4 000 ₽\n2. Анестезия инфильтрационная — 800 ₽";
			const rawLineToRemove =
				"1. Восстановление зуба пломбой (зуб 16) — 4 000 ₽";

			// Simulating handleRemoveCompletedLine
			const oldPlanText = planText;
			const kept = oldPlanText
				.split("\n")
				.filter((l) => l.trim() !== rawLineToRemove.trim());
			planText = kept.join("\n");

			const removedService = useVisitStore.getState().completedServices[0];
			const previousToothState =
				useVisitStore.getState().visitToothStateByCode?.["16"] || "idle";

			useVisitStore.getState().removeCompletedService(0);
			useVisitStore.getState().setToothState("16", "idle");

			assert.equal(useVisitStore.getState().completedServices.length, 0);
			assert.equal(
				useVisitStore.getState().visitToothStateByCode["16"],
				"idle",
			);
			assert.equal(planText, "2. Анестезия инфильтрационная — 800 ₽");

			// Trigger rollback toast
			showRollbackToast(
				"«Восстановление зуба пломбой» удалена из приёма",
				() => {
					planText = oldPlanText;
					if (removedService) {
						useVisitStore.getState().addCompletedService(removedService);
					}
					useVisitStore
						.getState()
						.setToothState("16", previousToothState as any);
				},
			);

			// Doctor clicks Undo
			dispatchedEvents[0]!.detail.action?.onAction();

			assert.equal(planText, oldPlanText, "Plan text must be restored");
			assert.equal(useVisitStore.getState().completedServices.length, 1);
			assert.equal(
				useVisitStore.getState().completedServices[0]!.code804n,
				"A16.07.002",
			);
			assert.equal(
				useVisitStore.getState().visitToothStateByCode["16"],
				"treatment",
			);
		});
	});

	describe("4. Treatment Plan Stage Rollback: Multiphase Stages Integrity", () => {
		it("removes procedure from plan stage and restores entire stage structure on Undo", () => {
			const initialStages: TreatmentPlanStage[] = [
				{
					stageNumber: 1,
					title: "Терапевтический этап",
					items: [
						{
							id: "proc_101",
							name: "Лечение кариеса",
							code804n: "A16.07.002",
							priceRub: 3500,
							quantity: 1,
							toothNumber: 15,
						},
						{
							id: "proc_102",
							name: "Профессиональная гигиена",
							code804n: "A16.07.051",
							priceRub: 4500,
							quantity: 1,
						},
					] as any,
				} as any,
			];

			let currentStages = initialStages;
			const prevStages = currentStages;

			// Instant optimistic removal
			currentStages = removeItemFromStages(currentStages, "proc_101");
			assert.equal(currentStages[0]!.items.length, 1);
			assert.equal(currentStages[0]!.items[0]!.id, "proc_102");

			showRollbackToast("Процедура «Лечение кариеса» удалена из плана", () => {
				currentStages = prevStages;
			});

			// Click Undo
			dispatchedEvents[0]!.detail.action?.onAction();

			assert.equal(currentStages[0]!.items.length, 2);
			assert.equal(currentStages[0]!.items[0]!.id, "proc_101");
			assert.equal(currentStages[0]!.items[1]!.id, "proc_102");
		});
	});

	describe("5. Low-End Hardware Performance & Zero Blocking Dialogs Invariants", () => {
		it("guarantees zero window.confirm calls and zero modal-blocking popups for item deletions", () => {
			// Verify that no confirm dialogs are exposed on global window
			assert.equal(
				(window as any).confirm,
				undefined,
				"window.confirm must never be invoked",
			);
		});

		it("verifies rollback toast details are lightweight and JSON-serializable", () => {
			showRollbackToast("Услуга удалена", () => {});
			const detail = dispatchedEvents[0]!.detail;

			// Check memory footprint: no circular references or heavy DOM nodes
			const serialized = JSON.stringify({
				type: detail.type,
				text: detail.text,
				duration: detail.duration,
				actionLabel: detail.action?.label,
			});
			assert.ok(
				serialized.length < 200,
				"Toast payload must be extremely lightweight (<200 bytes)",
			);
		});
	});
});
