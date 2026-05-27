import type { FastifyInstance } from "fastify";
import { createPatientSchema, patientSchema, updatePatientAdministrativeProfileSchema, updatePatientSchema } from "@dental/shared";
import { createPatient, patients, updatePatient, updatePatientAdministrativeProfile } from "../sampleData.js";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";

export async function registerPatientRoutes(app: FastifyInstance) {
  app.get("/api/patients", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "patient list"))) return;
    return patients.map((patient) => patientSchema.parse(patient));
  });

  app.post("/api/patients", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "patient create"))) return;
    const input = createPatientSchema.parse(request.body);
    const patient = createPatient(input);
    return reply.code(201).send(patientSchema.parse(patient));
  });

  app.put("/api/patients/:patientId", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "patient update"))) return;
    const params = request.params as { patientId?: string };
    if (!params.patientId) return reply.code(400).send({ error: "Не указан patientId пациента" });
    const input = updatePatientSchema.parse(request.body);
    try {
      const patient = updatePatient(params.patientId, input);
      return patientSchema.parse(patient);
    } catch (error) {
      return reply.code(404).send({ error: error instanceof Error ? error.message : "Пациент не найден" });
    }
  });

  app.put("/api/patients/:patientId/administrative-profile", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "patient administrative profile update"))) return;
    const params = request.params as { patientId?: string };
    if (!params.patientId) return reply.code(400).send({ error: "Не указан patientId пациента" });
    const input = updatePatientAdministrativeProfileSchema.parse(request.body);
    try {
      const patient = updatePatientAdministrativeProfile(params.patientId, input);
      return patientSchema.parse(patient);
    } catch (error) {
      return reply.code(404).send({ error: error instanceof Error ? error.message : "Пациент не найден" });
    }
  });
}
