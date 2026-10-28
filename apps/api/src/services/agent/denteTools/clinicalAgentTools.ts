/**
 * clinicalAgentTools.ts — Clinical tools aggregator for DENTE Chairside Copilot.
 *
 * Decomposed into domain modules according to Mandate 8b (<= 300 lines each):
 * - clinicalModules/patientRecordTools.ts: Electronic medical record (EMK 043/u)
 * - clinicalModules/toothStatusTools.ts: Odontogram FDI status and MODVLI surfaces
 * - clinicalModules/drugInteractionTools.ts: DDI and pharmacological safety
 * - clinicalModules/labOrderTools.ts: Dental lab (ZTL) order dispatch
 * - clinicalModules/soapDiaryTools.ts: SOAP diary synthesis
 */

export {
	getPatientEmk043uTool,
	getPatientOutpatientRecordTool,
} from "./clinicalModules/patientRecordTools.js";

export {
	normalizeAnatomicalSurfaces,
	updateToothStatusTool,
} from "./clinicalModules/toothStatusTools.js";

export {
	checkDrugInteractionsTool,
} from "./clinicalModules/drugInteractionTools.js";

export {
	createDentalLabOrderTool,
} from "./clinicalModules/labOrderTools.js";

export {
	draft043uSoapDiaryTool,
	draftSoapDiaryTool,
} from "./clinicalModules/soapDiaryTools.js";
