/**
 * doctorEarningsHandlers.ts — Обработчики маршрутов сдельной оплаты врача.
 * Mandate 8e: Doctor Autonomy & Financial Sovereignty.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { validateDoctorEarningsRequest } from "./doctorEarningsValidation.js";
import {
	fetchDoctorProfileAndRates,
	fetchDoctorAppointmentsForPeriod,
	fetchAppointmentsClinicalDetails,
} from "./doctorEarningsDbQueries.js";
import { buildEmptyDoctorEarningsResponse } from "./emptyEarningsResponse.js";
import { calculateLiveDoctorEarnings } from "./liveEarningsCalculator.js";

export async function registerDoctorEarningsHandlers(app: FastifyInstance): Promise<void> {
	app.get("/api/doctor/my-earnings", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = validateDoctorEarningsRequest(request, reply);
		if (!ctx) return;

		const { identity, queryData, targetDoctorId, fromDate, toDate, dateParam } = ctx;
		const effectiveOrgId = identity.organizationId || "00000000-0000-0000-0000-000000000001";

		const { doctorName, doctorSpecialty, categoryRates } = await fetchDoctorProfileAndRates(effectiveOrgId, targetDoctorId);
		const rawAppointments = await fetchDoctorAppointmentsForPeriod(effectiveOrgId, targetDoctorId, fromDate, toDate);

		if (rawAppointments.length === 0) {
			// Честный пустой период: нули и правдивое пояснение. Никакой синтетики в боевом контуре (Мандат 8wy).
			return reply.send(buildEmptyDoctorEarningsResponse({
				targetDoctorId,
				doctorName,
				doctorSpecialty,
				fromDate,
				toDate,
				dateParam,
				payoutModel: queryData.payoutModel,
				chairRentalRub: queryData.chairRentalRub,
				advanceRub: queryData.advanceRub,
				taxRegime: queryData.taxRegime,
			}));
		}

		const appointmentIds = rawAppointments.map((a) => a.id);
		const details = await fetchAppointmentsClinicalDetails(effectiveOrgId, targetDoctorId, fromDate, toDate, appointmentIds);

		const liveResponse = calculateLiveDoctorEarnings({
			targetDoctorId,
			doctorName,
			doctorSpecialty,
			fromDate,
			toDate,
			dateParam,
			categoryRates,
			payoutModel: queryData.payoutModel,
			chairRentalRub: queryData.chairRentalRub,
			advanceRub: queryData.advanceRub,
			taxRegime: queryData.taxRegime,
			rawAppointments,
			appointmentToVisitMap: details.appointmentToVisitMap,
			dbTreatmentItems: details.dbTreatmentItems,
			dbLabOrders: details.dbLabOrders,
			dbPayments: details.dbPayments,
		});

		return reply.send(liveResponse);
	});
}
