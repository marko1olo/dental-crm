/**
 * Маршруты отчётов по клинической загрузке: кресла, расписание, движение пациентов и воронка визитов.
 * Sweet Spot: 80-120 строк.
 */

import type { FastifyInstance } from "fastify";
import {
	appointmentFunnel,
	chairLoad,
	patientFlow,
	reminderEffect,
	scheduleLoad,
} from "../../services/reports/managerReports.js";
import { scopeForReport } from "./reportsShared.js";

export async function registerClinicalWorkloadReportsRoutes(app: FastifyInstance) {
	/**
	 * Загрузка стоматологических кресел клиники.
	 */
	app.get("/api/reports/chairs", async (request, reply) => {
		const resolved = await scopeForReport(request, reply, "report chairs");
		if (!resolved) return;
		const options: { minutesPerDay?: number; workingDaysPerWeek?: number } = {};
		if (resolved.query.minutesPerDay !== undefined)
			options.minutesPerDay = resolved.query.minutesPerDay;
		if (resolved.query.workingDaysPerWeek !== undefined)
			options.workingDaysPerWeek = resolved.query.workingDaysPerWeek;
		const report = await chairLoad(resolved.scope, options);
		return {
			period: { from: resolved.scope.from, to: resolved.scope.to },
			...report,
		};
	});

	/**
	 * Воронка первичных и повторных записей пациентов.
	 */
	app.get("/api/reports/appointments", async (request, reply) => {
		const resolved = await scopeForReport(request, reply, "report appointments");
		if (!resolved) return;
		const report = await appointmentFunnel(resolved.scope);
		return {
			period: { from: resolved.scope.from, to: resolved.scope.to },
			...report,
		};
	});

	/**
	 * Эффективность напоминаний о визитах (доля неявок и подтверждений).
	 */
	app.get("/api/reports/reminder-effect", async (request, reply) => {
		const resolved = await scopeForReport(request, reply, "report reminder effect");
		if (!resolved) return;
		const report = await reminderEffect(resolved.scope);
		return {
			period: { from: resolved.scope.from, to: resolved.scope.to },
			...report,
		};
	});

	/**
	 * Движение пациентов: первичные, завершившие санацию, повторные.
	 */
	app.get("/api/reports/patient-flow", async (request, reply) => {
		const resolved = await scopeForReport(request, reply, "report patient flow");
		if (!resolved) return;
		const report = await patientFlow(resolved.scope);
		return {
			period: { from: resolved.scope.from, to: resolved.scope.to },
			...report,
		};
	});

	/**
	 * Распределение загрузки расписания по дням недели и часам смен.
	 */
	app.get("/api/reports/schedule-load", async (request, reply) => {
		const resolved = await scopeForReport(request, reply, "report schedule load");
		if (!resolved) return;
		const report = await scheduleLoad(resolved.scope);
		return {
			period: { from: resolved.scope.from, to: resolved.scope.to },
			...report,
		};
	});
}
