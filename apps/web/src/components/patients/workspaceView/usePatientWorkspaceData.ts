import { useEffect, useMemo, useState } from "react";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode";
import { sliceDomList } from "../../../utils/domVirtualizationHelper";
import type { ImagingStudyItem, PatientWorkspaceViewProps } from "./types";
import { getDemoImagingStudies } from "./demoStudies";

export const DEFAULT_WORKSPACE_PAGE_SIZE = 30;

export function usePatientWorkspaceData(props: PatientWorkspaceViewProps, dashboard: any) {
	const { patientId } = props;

	const staffMap = useMemo(() => {
		const map = new Map<string, string>();
		for (const s of dashboard?.clinicSettings?.staff ?? []) {
			if (s.id && s.fullName) map.set(s.id, s.fullName);
		}
		return map;
	}, [dashboard?.clinicSettings?.staff]);

	const patientAppointments = useMemo(() => {
		const list = (dashboard?.appointments ?? []).filter((a: any) => a?.patientId === patientId);
		return list.sort((a: any, b: any) => new Date(b?.startsAt ?? 0).getTime() - new Date(a?.startsAt ?? 0).getTime());
	}, [dashboard?.appointments, patientId]);

	const patientPlanItems = useMemo(() => {
		return (dashboard?.treatmentPlanItems ?? []).filter((item: any) => item?.patientId === patientId);
	}, [dashboard?.treatmentPlanItems, patientId]);

	const patientLabOrdersCount = useMemo(() => {
		return (dashboard?.labOrders ?? []).filter((item: any) => String(item?.patientId) === String(patientId)).length;
	}, [dashboard?.labOrders, patientId]);

	const currentPatient = useMemo(() => {
		return (dashboard?.patients ?? []).find((p: any) => String(p?.id) === String(patientId));
	}, [dashboard?.patients, patientId]);

	const patientCardNumber = useMemo(() => {
		return (currentPatient as any)?.cardNumber || (currentPatient as any)?.chartNumber || (currentPatient as any)?.medicalCardNumber || null;
	}, [currentPatient]);

	const patientBalanceRub = useMemo(() => {
		const b = (currentPatient as any)?.balanceRub ?? (currentPatient as any)?.balance;
		return typeof b === "number" ? b : null;
	}, [currentPatient]);

	const patientStudies = useMemo((): ImagingStudyItem[] => {
		const all = (dashboard?.imagingStudies ?? []) as any[];
		const filtered = all.filter((s) => String(s?.patientId) === String(patientId));
		if (filtered.length > 0) return filtered;
		if (isDemoShowcaseMode() || isDemoPatientId(patientId)) {
			return getDemoImagingStudies(patientId);
		}
		return [];
	}, [dashboard?.imagingStudies, patientId]);

	const [visibleVisitsLimit, setVisibleVisitsLimit] = useState<number>(DEFAULT_WORKSPACE_PAGE_SIZE);
	const [visiblePlansLimit, setVisiblePlansLimit] = useState<number>(DEFAULT_WORKSPACE_PAGE_SIZE);

	useEffect(() => {
		setVisibleVisitsLimit(DEFAULT_WORKSPACE_PAGE_SIZE);
		setVisiblePlansLimit(DEFAULT_WORKSPACE_PAGE_SIZE);
	}, [patientId]);

	const visitsSlice = useMemo(() => sliceDomList(patientAppointments ?? [], visibleVisitsLimit, 0), [patientAppointments, visibleVisitsLimit]);
	const plansSlice = useMemo(() => sliceDomList(patientPlanItems ?? [], visiblePlansLimit, 0), [patientPlanItems, visiblePlansLimit]);

	const patientAddendums = useMemo(() => {
		return (dashboard?.documents ?? []).filter((doc: any) => doc?.patientId === patientId && doc?.kind === "treatment_plan_acceptance" && doc?.status === "issued");
	}, [dashboard?.documents, patientId]);

	return {
		staffMap,
		patientAppointments,
		patientPlanItems,
		currentPatient,
		patientCardNumber,
		patientBalanceRub,
		patientStudies,
		visibleVisitsLimit,
		setVisibleVisitsLimit,
		visiblePlansLimit,
		setVisiblePlansLimit,
		visitsSlice,
		plansSlice,
		patientAddendums,
		patientLabOrdersCount,
	};
}
