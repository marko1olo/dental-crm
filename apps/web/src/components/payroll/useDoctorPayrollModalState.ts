import { useState, useMemo, useEffect } from "react";
import {
	calculateDoctorPeriodPayroll,
	filterServicesForDoctor,
	type DoctorCompletedServiceItem,
	type DoctorPayrollResult,
	SOLO_DOCTOR_SPECIALTY_PRESETS,
	DEFAULT_SOLO_DOCTOR,
} from "./staffPayrollEngine";
import { getDefaultPayrollPeriod, getDatesForPeriodPreset, type PeriodPresetType } from "./doctorPayrollModalUtils";
import { fetchDoctorEarningsApi } from "./fetchDoctorEarningsApi";

export interface UseDoctorPayrollModalParams {
	readonly isOpen: boolean;
	readonly clinicName?: string;
	readonly doctorsList?: readonly { readonly id: string; readonly name: string; readonly specialtyId: string }[];
	readonly initialDoctorId?: string;
	readonly initialServices?: readonly DoctorCompletedServiceItem[];
	readonly initialPeriodStart?: string;
	readonly initialPeriodEnd?: string;
	readonly initialBasePercentage?: number;
	readonly useClinicalCategoryRates?: boolean;
}

export function useDoctorPayrollModalState(params: UseDoctorPayrollModalParams) {
	const defaultPeriod = useMemo(() => getDefaultPayrollPeriod(), []);
	const [selectedDoctorId, setSelectedDoctorId] = useState(params.initialDoctorId || "");
	const [soloSpecialtyId, setSoloSpecialtyId] = useState<string>(() => {
		if (params.initialDoctorId && params.initialDoctorId !== "solo-doctor") {
			const matched = SOLO_DOCTOR_SPECIALTY_PRESETS.find((s) => s.specialtyId === params.initialDoctorId);
			if (matched) return matched.specialtyId;
		}
		return DEFAULT_SOLO_DOCTOR.specialtyId;
	});
	const [periodStart, setPeriodStart] = useState(params.initialPeriodStart || defaultPeriod.start);
	const [periodEnd, setPeriodEnd] = useState(params.initialPeriodEnd || defaultPeriod.end);
	const [periodPreset, setPeriodPreset] = useState<PeriodPresetType>("current_month");
	const [payoutModel, setPayoutModel] = useState<"percentage" | "chair_rental">("percentage");
	const [chairRentalMode, setChairRentalMode] = useState<"fixed" | "split_70_30">("fixed");
	const [shiftsCount, setShiftsCount] = useState<number>(10);
	const [shiftRateRub, setShiftRateRub] = useState<number>(4000);
	const [chairRentalRub, setChairRentalRub] = useState<number>(40000);
	const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"payroll" | "timesheet">("payroll");
	const timesheetState = null;
	const [advanceRub, setAdvanceRub] = useState<number>(0);
	const [isNpdReceiptDone, setIsNpdReceiptDone] = useState<boolean>(false);
	const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
	const [customPercent, setCustomPercent] = useState<number | undefined>(params.initialBasePercentage);
	const [taxRegime, setTaxRegime] = useState<"employee" | "self_employed">(() =>
		!params.doctorsList || params.doctorsList.length === 0 || params.initialDoctorId === "solo-doctor" ? "self_employed" : "employee"
	);
	const [apiServices, setApiServices] = useState<DoctorCompletedServiceItem[]>([]);
	const [isLoadingEarnings, setIsLoadingEarnings] = useState<boolean>(false);

	const handleSelectPeriodPreset = (preset: PeriodPresetType) => {
		setPeriodPreset(preset);
		const dates = getDatesForPeriodPreset(preset);
		if (dates.start) setPeriodStart(dates.start);
		if (dates.end) setPeriodEnd(dates.end);
	};

	const activeDoc = useMemo(() => {
		if (params.doctorsList && params.doctorsList.length > 0) {
			if (!selectedDoctorId) return null;
			return params.doctorsList.find((d) => d.id === selectedDoctorId) ?? null;
		}
		if (params.initialDoctorId) {
			const specId = soloSpecialtyId === "solo-doctor" || !soloSpecialtyId ? DEFAULT_SOLO_DOCTOR.specialtyId : soloSpecialtyId;
			return { id: params.initialDoctorId, name: DEFAULT_SOLO_DOCTOR.name, specialtyId: specId };
		}
		return null;
	}, [params.doctorsList, selectedDoctorId, params.initialDoctorId, soloSpecialtyId]);

	useEffect(() => {
		if (!params.isOpen || !activeDoc?.id || (params.initialServices && params.initialServices.length > 0)) return;
		const docId = activeDoc.id;
		let cancelled = false;
		setIsLoadingEarnings(true);
		fetchDoctorEarningsApi({ doctorId: docId, periodStart, periodEnd, payoutModel, chairRentalRub, advanceRub, taxRegime })
			.then((items) => { if (!cancelled) { setApiServices(items); setIsLoadingEarnings(false); } })
			.catch(() => { if (!cancelled) setIsLoadingEarnings(false); });
		return () => { cancelled = true; };
	}, [params.isOpen, params.initialServices, activeDoc?.id, periodStart, periodEnd, payoutModel, chairRentalRub, advanceRub, taxRegime]);

	const servicesToUse = useMemo(() => {
		const raw = params.initialServices && params.initialServices.length > 0 ? params.initialServices : apiServices;
		return activeDoc ? filterServicesForDoctor(raw, activeDoc.id) : [];
	}, [params.initialServices, apiServices, activeDoc]);

	const payrollResult: DoctorPayrollResult = useMemo(() => {
		if (!params.isOpen || !activeDoc) {
			return {
				doctorId: "", doctorName: "Врач не выбран", specialtyTitleRu: "—",
				periodLabelRu: `${periodStart} — ${periodEnd}`, totalGrossRevenueKop: 0, totalLabDeductionsKop: 0,
				totalMaterialDeductionsKop: 0, totalNetBaseKop: 0, baseCommissionPercent: customPercent ?? 0,
				earnedBaseCommissionKop: 0, kpiBonusPercent: 0, kpiBonusEarnedKop: 0, kpiTierBadgeRu: "—",
				earnedRetailCommissionKop: 0, grossPayoutBeforeTaxKop: 0, ndfl13TaxKop: 0, netPayoutToDoctorKop: 0,
				minimumGuaranteeApplied: false, manualAdjustmentKop: 0, totalRefundDeductionsKop: 0, totalRefundClawbackKop: 0,
				refundedServicesCount: 0, stornoItems: [], warrantyServicesCount: 0, serviceCount: 0,
			};
		}
		return calculateDoctorPeriodPayroll({
			doctorId: activeDoc.id, doctorName: activeDoc.name, specialtyId: activeDoc.specialtyId, periodStartIso: periodStart, periodEndIso: periodEnd,
			services: servicesToUse, customBasePercentage: customPercent, useClinicalCategoryRates: params.useClinicalCategoryRates,
			taxRegime: payoutModel === "chair_rental" ? "self_employed" : taxRegime,
			isSoloDoctor: !params.doctorsList || params.doctorsList.length === 0 || activeDoc.specialtyId === "solo_practitioner" || activeDoc.specialtyId === "solo-doctor" || payoutModel === "chair_rental",
			manualAdjustmentKop: 0,
			payoutModel,
			chairRentalMode,
			chairRentalKop: payoutModel === "chair_rental" ? Math.round(chairRentalRub * 100) : 0,
			advancePayoutKop: Math.round(advanceRub * 100),
		});
	}, [params.isOpen, activeDoc, periodStart, periodEnd, servicesToUse, customPercent, params.useClinicalCategoryRates, taxRegime, params.doctorsList, payoutModel, chairRentalMode, chairRentalRub, advanceRub]);

	return {
		activeDoc, selectedDoctorId, setSelectedDoctorId, soloSpecialtyId, setSoloSpecialtyId,
		periodStart, setPeriodStart, periodEnd, setPeriodEnd, periodPreset, setPeriodPreset, handleSelectPeriodPreset,
		payoutModel, setPayoutModel, chairRentalMode, setChairRentalMode, shiftsCount, setShiftsCount, shiftRateRub, setShiftRateRub, chairRentalRub, setChairRentalRub,
		activeWorkspaceTab, setActiveWorkspaceTab, timesheetState, advanceRub, setAdvanceRub, isNpdReceiptDone, setIsNpdReceiptDone,
		copyFeedback, setCopyFeedback, customPercent, setCustomPercent, taxRegime, setTaxRegime, isLoadingEarnings, servicesToUse, payrollResult,
	};
}
