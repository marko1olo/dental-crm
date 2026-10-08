import type { FastifyInstance } from "fastify";
import { registerMedicalSecrecyPayloadStripping } from "../../security/medicalSecrecyWarden.js";
import {
	patientArchiveRowsBlockBooking,
	registerPatientAdministrativeRoutes,
	selectPatientArchiveRows,
} from "./administrativeRoutes.js";
import { registerPatientCrudRoutes } from "./crudRoutes.js";
import { registerPatientDuplicateRoutes } from "./duplicateRoutes.js";
import { registerPatientReclamationRoutes } from "./reclamationRoutes.js";
import { registerPatientTicketRoutes } from "./ticketRoutes.js";
import { registerPatientTimelineRoutes } from "./timelineRoutes.js";

export {
	patientArchiveRowsBlockBooking,
	selectPatientArchiveRows,
};

export type * from "./types.js";
export * from "./helpers.js";

export async function registerPatientRoutes(app: FastifyInstance) {
	// 152-ФЗ / 323-ФЗ ст. 13: Аппаратное усечение полезной нагрузки врачебной тайны для неклинических ролей
	registerMedicalSecrecyPayloadStripping(app);

	registerPatientCrudRoutes(app);
	registerPatientDuplicateRoutes(app);
	registerPatientAdministrativeRoutes(app);
	registerPatientReclamationRoutes(app);
	registerPatientTicketRoutes(app);
	registerPatientTimelineRoutes(app);
}
