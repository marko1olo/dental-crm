import type { Dashboard, Patient } from "@dental/shared";
import { useMemo } from "react";
import { findPatient } from "../../../AppHelpers";
import { matchesPatientSearch } from "../../../utils/patientSearchUtils";
import {
	NIL_VISIT_UUID,
	type UsePatientSearchAndFilterProps,
	type UsePatientSearchAndFilterReturn,
} from "./patientLogicTypes";

/**
 * Хук поиска, фильтрации и контекстного разрешения активного пациента.
 * Не содержит сайд-эффектов мутаций, гарантирует стабильную мемоизацию выборки.
 */
export function usePatientSearchAndFilter({
	dashboard,
	query,
	selectedPatientId,
}: UsePatientSearchAndFilterProps): UsePatientSearchAndFilterReturn {
	const activePatient = useMemo(() => {
		const rawPatients: Patient[] = dashboard?.patients ?? [];
		if (rawPatients.length === 0) return null;
		const targetId: string | null =
			selectedPatientId || dashboard?.activeVisit?.patientId || null;
		return (
			(targetId ? findPatient(rawPatients, targetId) : null) ??
			rawPatients.find((patient) => patient.status === "active") ??
			rawPatients[0] ??
			null
		);
	}, [dashboard, selectedPatientId]);

	/**
	 * Пациент открытого приёма — и только он. `activePatient` выше при
	 * отсутствии приёма подставляет первого пациента списка.
	 *
	 * Гидратация базы кладёт в `activeVisit` заготовку с нулевым UUID, когда
	 * черновиков нет вовсе, — она пациентом не считается.
	 */
	const activeVisitPatient = useMemo(() => {
		const visit = dashboard?.activeVisit;
		if (!visit?.id || visit.id === NIL_VISIT_UUID) return null;
		if (!visit.patientId || visit.patientId === NIL_VISIT_UUID) return null;
		const rawPatients: Patient[] = dashboard?.patients ?? [];
		return findPatient(rawPatients, visit.patientId) ?? null;
	}, [dashboard?.activeVisit, dashboard?.patients]);

	const selectedPatient = useMemo(() => {
		const rawPatients: Patient[] = dashboard?.patients ?? [];
		if (rawPatients.length === 0) return null;
		return (
			(selectedPatientId
				? findPatient(rawPatients, selectedPatientId)
				: null) ?? activePatient
		);
	}, [activePatient, dashboard, selectedPatientId]);

	const documentPatient = selectedPatient ?? activePatient;

	const documentPatientMatchesActiveVisit = Boolean(
		documentPatient && dashboard?.activeVisit?.patientId === documentPatient.id,
	);

	/*
	 * КАССА: visitId необязателен (авансы, документы, долг).
	 * Риск ровно один: открыт приём ДРУГОГО пациента, и деньги уйдут не тому.
	 */
	const activeVisitPatientId =
		dashboard?.activeVisit?.id && dashboard.activeVisit.id !== NIL_VISIT_UUID
			? dashboard.activeVisit.patientId
			: null;

	const openVisitBelongsToSomeoneElse = Boolean(
		documentPatient &&
			activeVisitPatientId &&
			activeVisitPatientId !== NIL_VISIT_UUID &&
			activeVisitPatientId !== documentPatient.id,
	);

	const paymentPatientContextReady = Boolean(
		documentPatient && !openVisitBelongsToSomeoneElse,
	);

	const paymentPatientContextMessage = !documentPatient
		? "Выберите пациента, за которого принимаете оплату."
		: openVisitBelongsToSomeoneElse
			? `Сейчас выбран пациент ${documentPatient.fullName}, но открытый прием идёт у другого пациента. Переключите приём, иначе оплата уйдёт не тому.`
			: "";

	const patientInsightById = useMemo(() => {
		if (!dashboard)
			return new Map<string, Dashboard["patientInsights"][number]>();
		return new Map(
			(dashboard?.patientInsights ?? []).map((insight) => [
				insight.patientId,
				insight,
			]),
		);
	}, [dashboard]);

	const activePatientInsight = activePatient
		? (patientInsightById.get(activePatient.id) ?? null)
		: null;

	const activePatientCallablePhone =
		activePatient?.phone?.trim().replace(/[^\d+]/g, "") ?? "";

	const activePatientHasCallablePhone = activePatientCallablePhone.length >= 5;

	const filteredPatients = useMemo(() => {
		const rawPatients: Patient[] = dashboard?.patients ?? [];
		if (rawPatients.length === 0) return [];
		if (!query.trim()) return rawPatients;
		return rawPatients.filter((patient) =>
			matchesPatientSearch(patient, query),
		);
	}, [dashboard, query]);

	return {
		activePatient,
		activeVisitPatient,
		selectedPatient,
		documentPatient,
		documentPatientMatchesActiveVisit,
		paymentPatientContextReady,
		paymentPatientContextMessage,
		patientInsightById,
		activePatientInsight,
		activePatientCallablePhone,
		activePatientHasCallablePhone,
		filteredPatients,
	};
}
