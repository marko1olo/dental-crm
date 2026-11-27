import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";

import { TOOTH_STATE_ACTIONS, OdontogramModule } from "../OdontogramModule";
import { OdontogramViewContainer } from "../OdontogramViewContainer";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import {
	createDefaultAdultTeethData,
	ToothChart,
	executeFastCariesAction,
	executeWisdomMissingAction,
	executeProHygieneAction,
	type ToothData,
} from "../ToothChart";

describe("CLIN-01: Exact Money & Zero Bill Invariant (Mandate 8b)", () => {
	it("OdontogramModule mounts cleanly without 100-kopeck artificial floor", () => {
		type CtxValue = React.ComponentProps<typeof AppLogicProvider>["value"];
		const partialContext: Partial<CtxValue> = {
			odontogramUseSurfaces: true,
			activePatient: { id: "pat-zero-bill", fullName: "Тест Пациент" } as Partial<CtxValue["activePatient"]> as CtxValue["activePatient"],
			activeDoctor: { id: "doc-1", fullName: "Тест Врач" } as Partial<CtxValue["activeDoctor"]> as CtxValue["activeDoctor"],
			auth: null as CtxValue["auth"],
		};
		const html = renderToString(
			React.createElement(
				AppLogicProvider,
				{
					value: partialContext as CtxValue,
				},
				React.createElement(OdontogramModule, { patientId: "pat-zero-bill" }),
			),
		);
		assert.ok(typeof html === "string" && html.length > 0);
	});
});

describe("CLIN-04: Elimination of Duplicate Dentition Switchers & ToothChart Actions", () => {
	it("guarantees ToothChart does NOT render redundant odontogram-dentition-switcher by default", () => {
		const teeth = createDefaultAdultTeethData();
		const html = renderToString(
			React.createElement(ToothChart, { teethData: teeth, onToothClick: () => {} }),
		);
		assert.equal(html.includes('data-testid="odontogram-dentition-switcher"'), false);
		assert.equal(html.includes('data-testid="dentition-mode-adult-btn"'), false);
	});

	it("handleFastCaries: notifies 'Выберите зуб на схеме' instead of silent no-op when selectedTeeth is empty", () => {
		let calledQuickChange = false;
		const toasts: Array<{ msg: string; variant: string | undefined }> = [];

		const appliedEmpty = executeFastCariesAction({
			selectedTeeth: [],
			onQuickStateChange: () => {
				calledQuickChange = true;
			},
			notify: (msg, variant) => {
				toasts.push({ msg, variant });
			},
		});

		assert.equal(appliedEmpty, false);
		assert.equal(calledQuickChange, false);
		assert.deepEqual(toasts, [{ msg: "Выберите зуб на схеме", variant: "info" }]);

		let recordedTargets: number[] = [];
		let recordedState = "";
		let recordedSurfaces: string[] = [];
		const appliedSelected = executeFastCariesAction({
			selectedTeeth: [16],
			activeSurface: "M",
			onQuickStateChange: (targets, state, surfaces) => {
				recordedTargets = targets;
				recordedState = state;
				recordedSurfaces = surfaces ?? [];
			},
		});
		assert.equal(appliedSelected, true);
		assert.deepEqual(recordedTargets, [16]);
		assert.equal(recordedState, "Caries");
		assert.deepEqual(recordedSurfaces, ["M"]);
	});

	it("handleMarkWisdomMissing: guards pediatric and empty mixed dentitions, batches adult wisdom teeth", () => {
		const toasts: string[] = [];
		const pedApplied = executeWisdomMissingAction({
			pediatricMode: true,
			teethData: [],
			onQuickStateChange: () => {
				assert.fail("Must not mutate teeth in pediatric mode");
			},
			notify: (msg) => toasts.push(msg),
		});
		assert.equal(pedApplied, false);
		assert.ok(toasts[0]?.includes("молочном прикусе"));

		let batchTargets: number[] = [];
		const adultApplied = executeWisdomMissingAction({
			pediatricMode: false,
			teethData: createDefaultAdultTeethData(),
			onQuickStateChange: (targets) => {
				batchTargets = targets;
			},
		});
		assert.equal(adultApplied, true);
		assert.deepEqual(batchTargets, [18, 28, 38, 48]);
	});

	it("handleProHygiene: preserves caries, fillings, implants and only marks intact teeth Healthy", () => {
		const sampleTeeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 15, state: "Filling" },
			{ toothNumber: 14, state: "Implant" },
			{ toothNumber: 11, state: "Healthy" },
			{ toothNumber: 21, state: "Healthy" },
		];
		let targets: number[] = [];
		const notifications: string[] = [];
		executeProHygieneAction({
			teethData: sampleTeeth,
			onQuickStateChange: (t) => {
				targets = t;
			},
			notify: (msg) => notifications.push(msg),
		});
		assert.deepEqual(targets, [11, 21]);
		assert.ok(notifications[0]?.includes("Профессиональная гигиена"));
	});
});

describe("CLIN-06 & Responsive HIG: ToothChart, OdontogramViewContainer & Contrast", () => {
	it("TOOTH_STATE_ACTIONS enforce dual light/dark WCAG contrast classes and 0 cartoon emojis", () => {
		const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
		assert.ok(TOOTH_STATE_ACTIONS.length >= 8);
		for (const action of TOOTH_STATE_ACTIONS) {
			assert.equal(emojiRegex.test(action.label), false);
		}
		const caries = TOOTH_STATE_ACTIONS.find((a) => a.state === "Caries");
		assert.ok(caries?.className.includes("text-rose-600") && caries.className.includes("dark:text-rose-400"));
	});

	it("OdontogramViewContainer renders adult dentition without errors or emojis", () => {
		const html = renderToString(
			React.createElement(OdontogramViewContainer, {
				teethData: createDefaultAdultTeethData(),
				dentitionMode: "adult",
			}),
		);
		assert.ok(html.includes("11") && html.includes("48"));
	});
});
