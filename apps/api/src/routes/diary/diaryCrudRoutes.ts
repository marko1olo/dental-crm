import type { FastifyInstance } from "fastify";
import { handleDiaryVisitGet } from "./crud/diaryVisitGetHandler.js";
import { handleDiaryUpsertPost } from "./crud/diaryUpsertHandler.js";
import { handleDiarySyncProgressPost } from "./crud/diarySyncProgressHandler.js";
import { handleTreatmentPlanSignaturePut } from "./crud/treatmentPlanSignatureHandler.js";
import { handleDoctorShiftsGet, handleDoctorShiftsPost } from "./crud/doctorShiftsHandlers.js";

export async function registerDiaryCrudRoutes(app: FastifyInstance): Promise<void> {
	app.get("/api/diaries/visit/:visitId", handleDiaryVisitGet);
	app.post("/api/diaries", handleDiaryUpsertPost);
	app.post("/api/diaries/sync-progress", handleDiarySyncProgressPost);
	app.put("/api/treatment-plans/:planId/signature", handleTreatmentPlanSignaturePut);
	app.get("/api/diary/shifts", handleDoctorShiftsGet);
	app.post("/api/diary/shifts", handleDoctorShiftsPost);
}
