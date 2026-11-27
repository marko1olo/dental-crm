/**
 * Маршруты отчётов по клинической загрузке: кресла, расписание, движение пациентов и воронка визитов.
 * Sweet Spot: 80-120 строк.
 */

import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import {
	appointmentFunnel,
	chairLoad,
	patientFlow,
	reminderEffect,
	scheduleLoad,
} from "../../services/reports/managerReports.js";
import { withTenantReportScope } from "./reportsShared.js";

export async function registerClinicalWorkloadReportsRoutes(app: FastifyInstance) {
	/**
	 * Загрузка стоматологических кресел клиники.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/reports/chairs",
		permission: "public",
		handler: async ({ request, reply }) => {
			return withTenantReportScope(
				request,
				reply,
				"report chairs",
				async (resolved, tx) => {
					const options: {
						minutesPerDay?: number;
						workingDaysPerWeek?: number;
					} = {};
					if (resolved.query.minutesPerDay !== undefined)
						options.minutesPerDay = resolved.query.minutesPerDay;
					if (resolved.query.workingDaysPerWeek !== undefined)
						options.workingDaysPerWeek = resolved.query.workingDaysPerWeek;
					const report = await chairLoad(resolved.scope, options, tx);
					return {
						period: { from: resolved.scope.from, to: resolved.scope.to },
						...report,
					};
				},
			);
		},
	});

	/**
	 * Воронка первичных и повторных записей пациентов.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/reports/appointments",
		permission: "public",
		handler: async ({ request, reply }) => {
			return withTenantReportScope(
				request,
				reply,
				"report appointments",
				async (resolved, tx) => {
					const report = await appointmentFunnel(resolved.scope, tx);
					return {
						period: { from: resolved.scope.from, to: resolved.scope.to },
						...report,
					};
				},
			);
		},
	});

	/**
	 * Эффективность напоминаний о визитах (доля неявок и подтверждений).
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/reports/reminder-effect",
		permission: "public",
		handler: async ({ request, reply }) => {
			return withTenantReportScope(
				request,
				reply,
				"report reminder effect",
				async (resolved, tx) => {
					const report = await reminderEffect(resolved.scope, tx);
					return {
						period: { from: resolved.scope.from, to: resolved.scope.to },
						...report,
					};
				},
			);
		},
	});

	/**
	 * Движение пациентов: первичные, завершившие санацию, повторные.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/reports/patient-flow",
		permission: "public",
		handler: async ({ request, reply }) => {
			return withTenantReportScope(
				request,
				reply,
				"report patient flow",
				async (resolved, tx) => {
					const report = await patientFlow(resolved.scope, tx);
					return {
						period: { from: resolved.scope.from, to: resolved.scope.to },
						...report,
					};
				},
			);
		},
	});

	/**
	 * Распределение загрузки расписания по дням недели и часам смен.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/reports/schedule-load",
		permission: "public",
		handler: async ({ request, reply }) => {
			return withTenantReportScope(
				request,
				reply,
				"report schedule load",
				async (resolved, tx) => {
					const report = await scheduleLoad(resolved.scope, tx);
					return {
						period: { from: resolved.scope.from, to: resolved.scope.to },
						...report,
					};
				},
			);
		},
	});
}
