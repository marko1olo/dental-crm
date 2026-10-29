/**
 * apps/web/src/components/odontogram/__tests__/odontogramEmrSoapCohesion.test.ts
 *
 * RED TEAM INQUISITION: EMR & Odontogram 100% Cohesion
 * Validates seamless end-to-end data transmission across:
 * - Tooth Chart 17 Clinical States
 * - Clinical Protocols SOAP (Form 043/u)
 * - Event Bus ('dente-apply-soap-protocol', 'dente-add-services-to-invoice')
 * - useVisitStore (visitToothRecordsByCode, toothStateByCode)
 */

import assert from "node:assert/strict";
import test, { describe, beforeEach } from "node:test";
const it = test;
import {
	dispatchOdontogramSoapAndBundle,
	getClinicalBundleForToothState,
	TOOTH_STATE_ACTIONS,
} from "../odontogramModuleConstants";
import {
	generateSoapFromOdontogramFinding,
	generateSoapFromOdontogramStates,
	getIcdPriority,
} from "../../../lib/clinicalProtocols";
import {
	toVisitToothUiState,
	toOdontogramToothState,
	inferProcedureServiceFromStamp,
} from "../../visit/useVisitEmkToothSync";
import { useVisitStore } from "../../../store/visitStore";

const ALL_17_CLINICAL_STATES = [
	"Healthy",
	"Caries",
	"Defective_Restoration",
	"Filled",
	"Calculus",
	"Pulpitis",
	"Periodontitis",
	"Root_Canal_Treated",
	"Root",
	"Missing",
	"Implant",
	"Planned_Implant",
	"Crown",
	"Bridge",
	"Veneer",
	"Inlay",
	"Retained",
] as const;

describe("Red Team Inquisition: EMR & Odontogram Cohesion", () => {
	beforeEach(() => {
		useVisitStore.getState().resetVisitToothState();
	});

	it("covers all 17 clinical states in TOOTH_STATE_ACTIONS without gaps", () => {
		assert.equal(TOOTH_STATE_ACTIONS.length, 17);
		for (const state of ALL_17_CLINICAL_STATES) {
			const action = TOOTH_STATE_ACTIONS.find((a) => a.state === state);
			assert.ok(action, `Action for state ${state} must exist in TOOTH_STATE_ACTIONS`);
			assert.ok(action.label.length > 0, `Action label for ${state} must be non-empty`);
		}
	});

	it("generates authentic, rich StAR-compliant SOAP protocols for every single one of the 17 clinical states", () => {
		for (const state of ALL_17_CLINICAL_STATES) {
			const toothNumber = 46;
			const soap = generateSoapFromOdontogramFinding({
				toothNumber,
				state,
			});

			assert.ok(soap.diagnosisIcd10, `State '${state}' must have ICD-10 diagnosis code`);
			assert.ok(soap.diagnosisIcd10Label, `State '${state}' must have human-readable diagnosis label`);
			assert.ok(soap.anamnesis.length > 15, `State '${state}' must have rich clinical anamnesis`);
			assert.ok(soap.statusLocalis.length > 15, `State '${state}' must have detailed Status Localis`);
			assert.ok(soap.treatmentDescription.length > 15, `State '${state}' must have treatment description`);
			assert.ok(soap.recommendations.length > 5, `State '${state}' must have patient recommendations`);

			if (state !== "Healthy") {
				assert.equal(
					soap.statusLocalis.includes("Интактен"),
					false,
					`State '${state}' must NEVER fall back to Healthy/Интактен default!`,
				);
			}
		}
	});

	it("dispatchOdontogramSoapAndBundle dispatches events and updates useVisitStore seamlessly", () => {
		const capturedEvents: Record<string, any[]> = {};
		const eventNames = [
			"dente-apply-soap-protocol",
			"dente-add-services-to-invoice",
			"dente-update-tooth-state",
			"dente-odontogram-update",
		];
		for (const name of eventNames) {
			capturedEvents[name] = [];
		}

		const originalWindow = (globalThis as any).window;
		const mockEventListeners: Record<string, ((e: any) => void)[]> = {};

		(globalThis as any).window = {
			dispatchEvent: (event: any) => {
				const type = event.type || event.name;
				if (!capturedEvents[type]) capturedEvents[type] = [];
				capturedEvents[type].push(event.detail);
				const handlers = mockEventListeners[type] || [];
				for (const h of handlers) h(event);
				return true;
			},
			addEventListener: (type: string, handler: (e: any) => void) => {
				if (!mockEventListeners[type]) mockEventListeners[type] = [];
				mockEventListeners[type].push(handler);
			},
			removeEventListener: (type: string, handler: (e: any) => void) => {
				if (!mockEventListeners[type]) return;
				mockEventListeners[type] = mockEventListeners[type].filter((h) => h !== handler);
			},
		};

		try {
			// 1. Dispatch Caries on tooth 36
			dispatchOdontogramSoapAndBundle({
				targets: [36],
				state: "Caries",
				findings: [{ toothNumber: 36, state: "Caries", surfaces: ["O", "M"] }],
				patientId: "patient-rt-1",
			});

			assert.equal(capturedEvents["dente-apply-soap-protocol"]!.length, 1);
			const soapDetail = capturedEvents["dente-apply-soap-protocol"]![0];
			assert.equal(soapDetail.finding.toothNumber, 36);
			assert.equal(soapDetail.soap.diagnosisIcd10, "K02.1");

			assert.equal(capturedEvents["dente-add-services-to-invoice"]!.length, 1);
			const invDetail = capturedEvents["dente-add-services-to-invoice"]![0];
			assert.equal(invDetail.bundleId, "caries");
			assert.equal(invDetail.toothNumber, 36);
			assert.ok(invDetail.services.length > 0);

			assert.equal(capturedEvents["dente-update-tooth-state"]!.length, 1);
			assert.equal(capturedEvents["dente-odontogram-update"]!.length, 1);

			// Check useVisitStore synchronization
			const storeState = useVisitStore.getState();
			assert.equal(storeState.visitToothStateByCode["36"], "caries");
			const toothRecord = storeState.visitToothRecordsByCode["36"];
			assert.ok(toothRecord, "Tooth record for 36 must exist in useVisitStore");
			assert.equal(toothRecord.toothNumber, 36);
			assert.equal(toothRecord.diagnosisIcd10, "K02.1");
			assert.ok(toothRecord.treatmentPlan?.includes("Препарирование"));
		} finally {
			(globalThis as any).window = originalWindow;
		}
	});

	it("toVisitToothUiState correctly maps all 17 clinical states to appropriate UI states", () => {
		assert.equal(toVisitToothUiState("Healthy"), "idle");
		assert.equal(toVisitToothUiState("Caries"), "caries");
		assert.equal(toVisitToothUiState("Defective_Restoration"), "caries");
		assert.equal(toVisitToothUiState("Filled"), "done");
		assert.equal(toVisitToothUiState("Calculus"), "treatment");
		assert.equal(toVisitToothUiState("Pulpitis"), "pulpitis");
		assert.equal(toVisitToothUiState("Periodontitis"), "treatment");
		assert.equal(toVisitToothUiState("Root_Canal_Treated"), "done");
		assert.equal(toVisitToothUiState("Root"), "treatment");
		assert.equal(toVisitToothUiState("Missing"), "missing");
		assert.equal(toVisitToothUiState("Implant"), "treatment");
		assert.equal(toVisitToothUiState("Planned_Implant"), "planned");
		assert.equal(toVisitToothUiState("Crown"), "crown");
		assert.equal(toVisitToothUiState("Bridge"), "crown");
		assert.equal(toVisitToothUiState("Veneer"), "crown");
		assert.equal(toVisitToothUiState("Inlay"), "crown");
		assert.equal(toVisitToothUiState("Retained"), "treatment");
	});

	it("inferProcedureServiceFromStamp maps each clinically treatable state to valid 804n nomenclature", () => {
		const testCases = [
			{ stamp: "caries", expectedCode: "A16.07.002" },
			{ stamp: "defective_restoration", expectedCode: "A16.07.002.011" },
			{ stamp: "pulpitis", expectedCode: "A16.07.030" },
			{ stamp: "periodontitis", expectedCode: "A16.07.008" },
			{ stamp: "filled", expectedCode: "A16.07.002.011" },
			{ stamp: "calculus", expectedCode: "A16.07.050.001" },
			{ stamp: "crown", expectedCode: "A16.07.004" },
			{ stamp: "bridge", expectedCode: "A16.07.004.002" },
			{ stamp: "veneer", expectedCode: "A16.07.003.001" },
			{ stamp: "inlay", expectedCode: "A16.07.003" },
			{ stamp: "missing", expectedCode: "A16.07.001" },
			{ stamp: "root", expectedCode: "A16.07.001.002" },
			{ stamp: "retained", expectedCode: "A16.07.001.003" },
			{ stamp: "planned_implant", expectedCode: "A16.07.054" },
		];

		for (const tc of testCases) {
			const srv = inferProcedureServiceFromStamp(tc.stamp, 24);
			assert.ok(srv, `inferProcedureServiceFromStamp must return service for stamp '${tc.stamp}'`);
			assert.equal(srv.code804n, tc.expectedCode);
			assert.ok(srv.priceRub > 0, `Price for '${tc.stamp}' must be positive`);
		}
	});

	it("aggregates multi-tooth odontogram findings with ICD priority ranking", () => {
		const aggregated = generateSoapFromOdontogramStates([
			{ toothNumber: 11, state: "Caries" },
			{ toothNumber: 26, state: "Pulpitis" },
			{ toothNumber: 36, state: "Calculus" },
			{ toothNumber: 48, state: "Retained" },
		]);

		// Highest priority is K04.0 (Pulpitis) over K02.1 (Caries), K01.1 (Retained), K03.6 (Calculus)
		assert.equal(aggregated.diagnosisIcd10, "K04.0");
		assert.ok(aggregated.diagnosisTooth?.includes("26"));
		assert.ok(aggregated.diagnosisTooth?.includes("11"));
		assert.ok(aggregated.anamnesis?.includes("26"));
		assert.ok(aggregated.anamnesis?.includes("11"));
		assert.ok(aggregated.statusLocalis?.includes("26"));
		assert.ok(aggregated.treatmentDescription?.includes("26"));
	});
});
