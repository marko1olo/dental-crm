import { buildCommerceMlPackage } from "./modules/packageBuilder.js";
import { syncFrom1C } from "./modules/inboundSyncEngine.js";
import { checkDoublePosting } from "./modules/reconciliationStore.js";

export class ReconciliationEngine {
	static buildCommerceMlPackage = buildCommerceMlPackage;
	static syncFrom1C = syncFrom1C;
	static checkDoublePosting = checkDoublePosting;
}

export { buildCommerceMlPackage, syncFrom1C, checkDoublePosting };
