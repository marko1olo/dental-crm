/**
 * apps/api/src/routes/outpatient.ts
 * Фасад амбулаторной карты, одонтограммы, каталогов 043/у и экспертного аудита.
 * Декомпозирован по Mandate 8b (Layer 5 Facade, <= 80 строк).
 */

import type { FastifyInstance } from "fastify";
import { assignPatientToothDefectHandler } from "./outpatient/outpatientAssignDefectHandler.js";
import {
	getTeethCatalogHandler,
	getToothDefectsHandler,
	getToothDefectsTreeHandler,
} from "./outpatient/outpatientCatalogsHandlers.js";
import { getPatientToothDefectsHandler } from "./outpatient/outpatientDefectsQueryHandler.js";
import { deletePatientToothDefectHandler } from "./outpatient/outpatientDeleteDefectHandler.js";
import { checkLockStatusHandler } from "./outpatient/outpatientLockStatusHandler.js";
import { getMkbCategoriesTreeHandler } from "./outpatient/outpatientMkbHandlers.js";
import { handleGetOutpatientTemplates } from "./outpatient/outpatientTemplatesHandlers.js";
import { getVerifyQueueHandler } from "./outpatient/outpatientVerifyQueueHandler.js";
import { updateVerificationStatusHandler } from "./outpatient/outpatientVerifyStatusHandler.js";

export async function registerOutpatientRoutes(app: FastifyInstance): Promise<void> {
	// 1. Каталоги зубной системы (55 сущностей) и дефектов (91 дефект)
	app.get("/api/catalogs/teeth", getTeethCatalogHandler);
	app.get("/api/catalogs/tooth-defects", getToothDefectsHandler);
	app.get("/api/catalogs/tooth-defects/tree", getToothDefectsTreeHandler);
	app.get("/api/catalogs/mkb/categories/tree", getMkbCategoriesTreeHandler);

	// 2. Шаблоны амбулаторной карты (Медицинская карта приёма)
	app.get("/api/outpatient/templates", handleGetOutpatientTemplates);
	app.get("/api/clinical/outpatient-templates", handleGetOutpatientTemplates);

	// 3. Активная одонтограмма пациента (дефекты зубов и челюстей)
	app.get("/api/patients/:patientId/tooth-defects", getPatientToothDefectsHandler);
	app.post("/api/patients/:patientId/tooth-defects", assignPatientToothDefectHandler);
	app.delete("/api/patients/:patientId/tooth-defects/:id", deletePatientToothDefectHandler);

	// 4. Клинический аудит качества и экспертиза ЭМК главным врачом (Мандат 8e)
	app.get("/api/outpatient/verify", getVerifyQueueHandler);
	app.put("/api/outpatient/verify/:id/status", updateVerificationStatusHandler);
	app.get("/api/outpatient/verify/visit/:visitId/lock-status", checkLockStatusHandler);
}

export default registerOutpatientRoutes;
