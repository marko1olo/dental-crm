import type { FastifyInstance } from "fastify";
import { createPaymentSchema, documentKindMetadata, paymentSchema, type CreatePaymentInput } from "@dental/shared";
import { createPayment, documents, findVisitById, patients } from "../sampleData.js";
import { requireClinicalMutationAccess } from "../accessGuard.js";

function documentCanReceivePayment(documentKind: keyof typeof documentKindMetadata): boolean {
  const metadata = documentKindMetadata[documentKind];
  return metadata.group === "payment";
}

export async function registerBillingRoutes(app: FastifyInstance) {
  app.post("/api/billing/payments", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "billing payment create"))) return;
    const parsedInput = createPaymentSchema.safeParse(request.body);
    if (!parsedInput.success) {
      const details = parsedInput.error.issues.map((issue) => issue.message).filter(Boolean);
      return reply.code(400).send({
        error: "ValidationError",
        message: details.length
          ? `Оплата не записана: ${details.join(" ")}`
          : "Оплата не записана: проверьте сумму, фискальный чек и явные данные плательщика."
      });
    }
    const input: CreatePaymentInput = parsedInput.data;
    let paymentInput = input;
    const patient = patients.find((candidate) => candidate.id === input.patientId);
    if (!patient) {
      return reply.code(404).send({ error: "Пациент не найден" });
    }
    if (input.visitId) {
      const visit = findVisitById(input.visitId);
      if (!visit) {
        return reply.code(404).send({ error: "Визит не найден" });
      }
      if (visit.patientId !== input.patientId) {
        return reply.code(409).send({ error: "Визит не принадлежит выбранному пациенту" });
      }
    }
    if (input.documentId) {
      const document = documents.find((candidate) => candidate.id === input.documentId);
      if (!document) {
        return reply.code(404).send({ error: "Документ не найден" });
      }
      if (document.patientId !== input.patientId) {
        return reply.code(409).send({ error: "Документ не принадлежит выбранному пациенту" });
      }
      if (document.visitId && input.visitId && document.visitId !== input.visitId) {
        return reply.code(409).send({ error: "Документ не принадлежит выбранному визиту" });
      }
      if (document.visitId && !input.visitId) {
        const visit = findVisitById(document.visitId);
        if (!visit) {
          return reply.code(404).send({ error: "Визит документа не найден" });
        }
        if (visit.patientId !== input.patientId) {
          return reply.code(409).send({ error: "Визит документа не принадлежит выбранному пациенту" });
        }
        paymentInput = { ...input, visitId: document.visitId };
      }
      if (document.status === "voided") {
        return reply.code(409).send({ error: "К аннулированному документу нельзя привязать оплату" });
      }
      if (!documentCanReceivePayment(document.kind)) {
        return reply.code(409).send({ error: "Оплату можно привязать только к финансовому документу: договору, счету, акту, квитанции, смете, рассрочке или возврату." });
      }
    }
    const payment = createPayment(paymentInput);
    return reply.code(201).send(paymentSchema.parse(payment));
  });
}
