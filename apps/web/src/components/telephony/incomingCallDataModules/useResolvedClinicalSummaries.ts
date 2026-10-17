import { useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import type {
	CallerLookupResult,
	PatientFinancialSummary,
	PatientLastVisitSummary,
	PatientUpcomingAppointmentSummary,
	TelephonyPatientCategory,
} from "../../../store/telephonyTypes";
import {
	calculatePatientFinancialStatus,
	resolvePatientLastVisit,
	resolvePatientUpcomingAppointment,
	resolvePatientCategory,
} from "../../../store/telephonyStore";

export interface ResolvedClinicalSummaries {
	// biome-ignore lint/suspicious/noExplicitAny: insight like compatibility
	patientInsight: any;
	financialSummary: PatientFinancialSummary;
	lastVisitSummary: PatientLastVisitSummary | null;
	upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	patientCategory: TelephonyPatientCategory;
}

export function useResolvedClinicalSummaries(
	serverLookup: CallerLookupResult | null,
	// biome-ignore lint/suspicious/noExplicitAny: patient like compatibility
	resolvedPatient: any | null,
	dashboard: Dashboard | undefined,
): ResolvedClinicalSummaries {
	const patientInsight = useMemo(() => {
		if (!resolvedPatient || !dashboard?.patientInsights) return null;
		return (
			dashboard.patientInsights.find(
				(pi) => pi.patientId === resolvedPatient.id,
			) || null
		);
	}, [resolvedPatient, dashboard?.patientInsights]);

	const financialSummary: PatientFinancialSummary = useMemo(() => {
		if (serverLookup?.found && serverLookup.financialSummary) {
			return serverLookup.financialSummary;
		}
		return calculatePatientFinancialStatus(
			resolvedPatient,
			patientInsight,
			dashboard?.insuranceContracts,
		);
	}, [serverLookup, resolvedPatient, patientInsight, dashboard?.insuranceContracts]);

	const lastVisitSummary: PatientLastVisitSummary | null = useMemo(() => {
		if (serverLookup?.found && serverLookup.lastVisitSummary !== undefined) {
			return serverLookup.lastVisitSummary;
		}
		return resolvePatientLastVisit(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [
		serverLookup,
		resolvedPatient?.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.todayIso,
	]);

	const upcomingAppointment: PatientUpcomingAppointmentSummary | null = useMemo(() => {
		if (serverLookup?.found && serverLookup.upcomingAppointment !== undefined) {
			return serverLookup.upcomingAppointment;
		}
		return resolvePatientUpcomingAppointment(
			resolvedPatient?.id || null,
			dashboard?.appointments,
			dashboard?.clinicSettings?.staff,
			dashboard?.todayIso,
		);
	}, [
		serverLookup,
		resolvedPatient?.id,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.todayIso,
	]);

	const patientCategory: TelephonyPatientCategory = useMemo(() => {
		if (serverLookup?.found && serverLookup.patientCategory) {
			return serverLookup.patientCategory;
		}
		if (!resolvedPatient) return "Первичный";
		return resolvePatientCategory(
			resolvedPatient,
			lastVisitSummary,
			patientInsight,
		);
	}, [serverLookup, resolvedPatient, lastVisitSummary, patientInsight]);

	return {
		patientInsight,
		financialSummary,
		lastVisitSummary,
		upcomingAppointment,
		patientCategory,
	};
}
