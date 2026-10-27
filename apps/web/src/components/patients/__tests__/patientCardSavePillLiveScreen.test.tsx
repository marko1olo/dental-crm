import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Patient } from "@dental/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	type AppLogicContextType,
	AppLogicProvider,
} from "../../../contexts/AppLogicContext.js";
import { PatientsView } from "../../../PatientsView.js";
import { usePatientStore } from "../../../store/patientStore.js";

function resetPatientStore(): void {
	const store = usePatientStore.getState();
	store.setSelectedPatientId(null);
	store.setPatientCoreSaveState("idle");
	store.setPatientCoreDirty(false);
	store.setPatientAdministrativeProfileSaveState("idle");
	store.setPatientAdministrativeProfileDirty(false);
	store.setNewPatientName("");
	store.setNewPatientPhone("");
	store.setNewPatientBirthDate("");
}

const emptyAppLogicValue = {} as AppLogicContextType;

function patientsViewMarkup(options: {
	readonly selectedPatient?: Patient | null;
	readonly patientAdministrativeProfileValidationMessage?: string | null;
}): string {
	return renderToStaticMarkup(
		<AppLogicProvider value={emptyAppLogicValue}>
			<PatientsView
				createPatient={() => undefined}
				filteredPatients={[]}
				money={(amountRub: number) => `${amountRub} ₽`}
				normalizeOptionalWorkingDaysDraft={(days: number[]) => days}
				patientAdministrativeProfileValidationMessage={
					options.patientAdministrativeProfileValidationMessage ?? null
				}
				patientInsightById={new Map()}
				patientInsightRiskLabels={{ low: "спокойно", watch: "контроль", high: "риск" }}
				query=""
				savePatientAdministrativeProfile={() => undefined}
				savePatientCore={() => undefined}
				selectedPatient={options.selectedPatient ?? null}
				setQuery={() => undefined}
				updatePatientAdministrativeProfileDraft={() => undefined}
				updatePatientCoreDraft={() => undefined}
				weekdayOptions={[{ label: "Пн", value: 1 }]}
			/>
		</AppLogicProvider>,
	);
}

describe("плашка сохранения на живом экране картотеки", () => {
	test("пациент не выбран и ничего не сохранялось — «Сохранено» не отрисовано", () => {
		resetPatientStore();
		const markup = patientsViewMarkup({ selectedPatient: null });
		assert.ok(markup.includes('id="patients"'));
		assert.ok(markup.includes("Карточка пациента"));
		assert.ok(!markup.includes("Сохранено"));
		assert.ok(!markup.includes("save-pill"));
	});
});
