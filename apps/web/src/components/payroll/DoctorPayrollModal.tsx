import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
	calculateDoctorPeriodPayroll,
	filterServicesForDoctor,
	generatePayrollT51Csv,
	generateDoctorPayslipHtml,
	generateDoctorPayslipMessengerText,
	type DoctorCompletedServiceItem,
	type DoctorPayrollResult,
	SOLO_DOCTOR_SPECIALTY_PRESETS,
	type SoloDoctorSpecialtyPreset,
	DEFAULT_SOLO_DOCTOR,
} from "./staffPayrollEngine";
import {
	PayrollHeader,
	PayrollRentalSection,
	PayrollTotalsBar,
	PayrollServicesTable,
} from "./payrollModules";
import "./doctorPayroll.css";

export { DEFAULT_SOLO_DOCTOR, SOLO_DOCTOR_SPECIALTY_PRESETS, type SoloDoctorSpecialtyPreset };

export function getDefaultPayrollPeriod(): { start: string; end: string } {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
	return {
		start: `${year}-${month}-01`,
		end: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
	};
}

export interface DoctorPayrollModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly doctorsList?: readonly { readonly id: string; readonly name: string; readonly specialtyId: string }[] | undefined;
	readonly initialDoctorId?: string | undefined;
	readonly initialServices?: readonly DoctorCompletedServiceItem[] | undefined;
	readonly initialPeriodStart?: string | undefined;
	readonly initialPeriodEnd?: string | undefined;
	readonly initialBasePercentage?: number | undefined;
	readonly useClinicalCategoryRates?: boolean | undefined;
}

export const DoctorPayrollModal: React.FC<DoctorPayrollModalProps> = ({
	isOpen,
	onClose,
	clinicName = "ООО «Денте Стоматология»",
	doctorsList = [],
	initialDoctorId,
	initialServices,
	initialPeriodStart,
	initialPeriodEnd,
	initialBasePercentage,
	useClinicalCategoryRates,
}) => {
	const defaultPeriod = useMemo(() => getDefaultPayrollPeriod(), []);
	const effectivePeriodStart = initialPeriodStart || defaultPeriod.start;
	const effectivePeriodEnd = initialPeriodEnd || defaultPeriod.end;

	const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctorId || doctorsList[0]?.id || "");
	const [soloSpecialtyId, setSoloSpecialtyId] = useState<string>(() => {
		if (initialDoctorId && initialDoctorId !== "solo-doctor") {
			const matched = SOLO_DOCTOR_SPECIALTY_PRESETS.find((s) => s.specialtyId === initialDoctorId);
			if (matched) return matched.specialtyId;
		}
		return DEFAULT_SOLO_DOCTOR.specialtyId;
	});
	const [periodStart, setPeriodStart] = useState(effectivePeriodStart);
	const [periodEnd, setPeriodEnd] = useState(effectivePeriodEnd);
	const [periodPreset, setPeriodPreset] = useState<"current_month" | "previous_month" | "quarter" | "custom">("current_month");
	const [payoutModel, setPayoutModel] = useState<"percentage" | "chair_rental">(() => {
		return doctorsList.length === 0 || initialDoctorId === "solo-doctor" ? "chair_rental" : "percentage";
	});

	// Chair rental calculation: Количество смен × Ставка смены (Mandate 8n)
	const [shiftsCount, setShiftsCount] = useState<number>(10);
	const [shiftRateRub, setShiftRateRub] = useState<number>(4000);
	const [chairRentalRub, setChairRentalRub] = useState<number>(40000);

	const [advanceRub, setAdvanceRub] = useState<number>(0);
	const [isNpdReceiptDone, setIsNpdReceiptDone] = useState<boolean>(false);
	const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
	const [customPercent, setCustomPercent] = useState<number | undefined>(initialBasePercentage);
	const [manualAdjustmentRub] = useState<number>(0);
	const [taxRegime, setTaxRegime] = useState<"employee" | "self_employed">(() => {
		return doctorsList.length === 0 || initialDoctorId === "solo-doctor" ? "self_employed" : "employee";
	});
	const [apiServices, setApiServices] = useState<DoctorCompletedServiceItem[]>([]);
	const [isLoadingEarnings, setIsLoadingEarnings] = useState<boolean>(false);

	const handleSelectPeriodPreset = (preset: "current_month" | "previous_month" | "quarter" | "custom") => {
		setPeriodPreset(preset);
		const now = new Date();
		const year = now.getFullYear();
		if (preset === "current_month") {
			const m = String(now.getMonth() + 1).padStart(2, "0");
			const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
			setPeriodStart(`${year}-${m}-01`);
			setPeriodEnd(`${year}-${m}-${String(lastDay).padStart(2, "0")}`);
		} else if (preset === "previous_month") {
			const prev = new Date(year, now.getMonth() - 1, 1);
			const pYear = prev.getFullYear();
			const pMonth = String(prev.getMonth() + 1).padStart(2, "0");
			const lastDay = new Date(pYear, prev.getMonth() + 1, 0).getDate();
			setPeriodStart(`${pYear}-${pMonth}-01`);
			setPeriodEnd(`${pYear}-${pMonth}-${String(lastDay).padStart(2, "0")}`);
		} else if (preset === "quarter") {
			const q = Math.floor(now.getMonth() / 3);
			const startM = String(q * 3 + 1).padStart(2, "0");
			const endM = q * 3 + 3;
			const lastDay = new Date(year, endM, 0).getDate();
			setPeriodStart(`${year}-${startM}-01`);
			setPeriodEnd(`${year}-${String(endM).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`);
		}
	};

	// Sync when initial values change
	React.useEffect(() => {
		if (initialDoctorId) {
			setSelectedDoctorId(initialDoctorId);
			if (initialDoctorId === "solo-doctor") {
				setSoloSpecialtyId(DEFAULT_SOLO_DOCTOR.specialtyId);
			} else {
				const matched = SOLO_DOCTOR_SPECIALTY_PRESETS.find((s) => s.specialtyId === initialDoctorId);
				if (matched) setSoloSpecialtyId(matched.specialtyId);
			}
		} else if (doctorsList.length > 0 && !doctorsList.some((d) => d.id === selectedDoctorId)) {
			setSelectedDoctorId(doctorsList[0]?.id ?? "");
		}
		if (initialPeriodStart) {
			setPeriodStart(initialPeriodStart);
			setPeriodPreset("custom");
		}
		if (initialPeriodEnd) {
			setPeriodEnd(initialPeriodEnd);
			setPeriodPreset("custom");
		}
		if (initialBasePercentage !== undefined) setCustomPercent(initialBasePercentage);
	}, [initialDoctorId, initialPeriodStart, initialPeriodEnd, initialBasePercentage, doctorsList, selectedDoctorId]);

	const activeDoc = useMemo(() => {
		if (doctorsList.length === 0) {
			const specId =
				soloSpecialtyId === "solo-doctor" || !soloSpecialtyId
					? DEFAULT_SOLO_DOCTOR.specialtyId
					: soloSpecialtyId;
			return {
				id: DEFAULT_SOLO_DOCTOR.id,
				name: DEFAULT_SOLO_DOCTOR.name,
				specialtyId: specId,
			};
		}
		const found = doctorsList.find((d) => d.id === selectedDoctorId);
		return found ?? doctorsList[0] ?? null;
	}, [doctorsList, selectedDoctorId, soloSpecialtyId]);

	// Fetch live doctor earnings when initialServices is not provided
	React.useEffect(() => {
		if (!isOpen) return;
		if (initialServices && initialServices.length > 0) return;

		const docId = activeDoc?.id || selectedDoctorId || "doc-1";
		let isCancelled = false;
		setIsLoadingEarnings(true);

		const query = new URLSearchParams({
			doctorId: docId,
			from: periodStart,
			to: periodEnd,
			payoutModel,
			chairRentalRub: String(chairRentalRub),
			advanceRub: String(advanceRub),
			taxRegime,
		});

		fetch(`/api/doctor/my-earnings?${query.toString()}`)
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				if (isCancelled) return;
				const mapped: DoctorCompletedServiceItem[] = [];
				if (data && Array.isArray(data.appointments)) {
					for (const apt of data.appointments) {
						const dateIso = apt.startsAtIso ? apt.startsAtIso.slice(0, 10) : periodStart;
						if (Array.isArray(apt.services) && apt.services.length > 0) {
							for (const srv of apt.services) {
								const cat = ["therapy", "orthopedics", "surgery", "orthodontics", "hygiene", "retail_hygiene", "pediatric"].includes(srv.category) ? srv.category : "therapy";
								mapped.push({
									id: srv.id || `srv-${apt.appointmentId}-${mapped.length}`,
									dateIso,
									patientName: apt.patientFullName || "Пациент",
									medicalCardNumber: apt.cardNumber || "—",
									serviceNameRu: srv.nameRu || "Стоматологическая процедура",
									category: cat as DoctorCompletedServiceItem["category"],
									grossRevenueKop: srv.priceKop ?? Math.round((srv.priceRub || 0) * 100),
									labCostKop: srv.labCostKop ?? Math.round((srv.labCostRub || 0) * 100),
									materialCostKop: srv.materialCostKop ?? Math.round((srv.materialCostRub || 0) * 100),
									customCommissionPercent: srv.commissionPercent,
									doctorId: docId,
									performerId: docId,
									isPaid: srv.isPaid,
									paidAmountKop: srv.paidKop ?? (srv.isPaid ? (srv.priceKop ?? Math.round((srv.priceRub || 0) * 100)) : 0),
								});
							}
						}
					}
				}
				setApiServices(mapped);
				setIsLoadingEarnings(false);
			})
			.catch(() => {
				if (!isCancelled) setIsLoadingEarnings(false);
			});

		return () => {
			isCancelled = true;
		};
	}, [isOpen, initialServices, activeDoc?.id, selectedDoctorId, periodStart, periodEnd, payoutModel, chairRentalRub, advanceRub, taxRegime]);

	const servicesToUse = useMemo(() => {
		const raw = initialServices && initialServices.length > 0 ? initialServices : apiServices;
		if (!activeDoc) return raw;
		return filterServicesForDoctor(raw, activeDoc.id);
	}, [initialServices, apiServices, activeDoc]);

	const payrollResult: DoctorPayrollResult = useMemo(() => {
		if (!isOpen || !activeDoc) {
			return {
				doctorId: activeDoc?.id ?? "",
				doctorName: activeDoc?.name ?? "Сотрудник не выбран",
				specialtyTitleRu: "—",
				periodLabelRu: `${periodStart} — ${periodEnd}`,
				totalGrossRevenueKop: 0,
				totalLabDeductionsKop: 0,
				totalMaterialDeductionsKop: 0,
				totalNetBaseKop: 0,
				baseCommissionPercent: customPercent ?? 0,
				earnedBaseCommissionKop: 0,
				kpiBonusPercent: 0,
				kpiBonusEarnedKop: 0,
				kpiTierBadgeRu: "—",
				earnedRetailCommissionKop: 0,
				grossPayoutBeforeTaxKop: 0,
				ndfl13TaxKop: 0,
				netPayoutToDoctorKop: 0,
				minimumGuaranteeApplied: false,
				manualAdjustmentKop: 0,
				totalRefundDeductionsKop: 0,
				totalRefundClawbackKop: 0,
				refundedServicesCount: 0,
				stornoItems: [],
				warrantyServicesCount: 0,
				serviceCount: 0,
			};
		}
		return calculateDoctorPeriodPayroll({
			doctorId: activeDoc.id,
			doctorName: activeDoc.name,
			specialtyId: activeDoc.specialtyId,
			periodStartIso: periodStart,
			periodEndIso: periodEnd,
			services: servicesToUse,
			customBasePercentage: customPercent,
			useClinicalCategoryRates,
			taxRegime: payoutModel === "chair_rental" ? "self_employed" : taxRegime,
			isSoloDoctor: doctorsList.length === 0 || activeDoc.specialtyId === "solo_practitioner" || activeDoc.specialtyId === "solo-doctor" || payoutModel === "chair_rental",
			manualAdjustmentKop: Math.round(manualAdjustmentRub * 100),
			payoutModel,
			chairRentalKop: payoutModel === "chair_rental" ? Math.round(chairRentalRub * 100) : 0,
			advancePayoutKop: Math.round(advanceRub * 100),
		});
	}, [isOpen, activeDoc, periodStart, periodEnd, servicesToUse, customPercent, manualAdjustmentRub, useClinicalCategoryRates, taxRegime, doctorsList.length, payoutModel, chairRentalRub, advanceRub]);

	if (!isOpen) return null;

	const handleSendToMessenger = (platform: "clipboard" | "whatsapp" | "telegram" = "clipboard") => {
		const text = generateDoctorPayslipMessengerText(payrollResult, clinicName);
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(text);
			setCopyFeedback("Текст листка скопирован!");
			setTimeout(() => setCopyFeedback(null), 3000);
		}
		if (typeof window !== "undefined") {
			if (platform === "whatsapp") {
				window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
			} else if (platform === "telegram") {
				window.open(`https://t.me/share/url?url=${encodeURIComponent(text)}`, "_blank");
			}
		}
	};

	const handleDownloadCsv = () => {
		const csv = generatePayrollT51Csv([payrollResult]);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `payroll_${payrollResult.doctorId || "report"}_${periodStart}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handlePrintPayslip = () => {
		const printWindow = window.open("", "_blank", "width=800,height=900");
		const html = generateDoctorPayslipHtml(payrollResult, clinicName);

		if (!printWindow) {
			window.print();
			return;
		}

		printWindow.document.open();
		printWindow.document.write(html);
		printWindow.document.close();
	};

	const modalContent = (
		<div className="payroll-modal-overlay" data-testid="doctor-payroll-modal">
			<div className="payroll-modal-container">
				{/* 1. Header & Period Filter Bar */}
				<PayrollHeader
					clinicName={clinicName}
					taxRegime={taxRegime}
					isProgressiveTaxApplied={payrollResult.isProgressiveTaxApplied}
					payoutModel={payoutModel}
					periodPreset={periodPreset}
					periodStart={periodStart}
					periodEnd={periodEnd}
					doctorsList={doctorsList}
					selectedDoctorId={selectedDoctorId}
					soloSpecialtyId={soloSpecialtyId}
					onClose={onClose}
					onSelectPeriodPreset={handleSelectPeriodPreset}
					onSetTaxRegime={setTaxRegime}
					onSetPayoutModel={setPayoutModel}
					onSetPeriodStart={(val) => {
						setPeriodStart(val);
						setPeriodPreset("custom");
					}}
					onSetPeriodEnd={(val) => {
						setPeriodEnd(val);
						setPeriodPreset("custom");
					}}
					onSelectDoctorId={setSelectedDoctorId}
					onSelectSoloSpecialtyId={setSoloSpecialtyId}
				/>

				{/* 2. Scrollable Body: Rental/Split Section, Services Table, Totals */}
				<div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-5 flex-1">
					<PayrollRentalSection
						payoutModel={payoutModel}
						baseCommissionPercent={payrollResult.baseCommissionPercent}
						chairRentalRub={chairRentalRub}
						shiftsCount={shiftsCount}
						shiftRateRub={shiftRateRub}
						advanceRub={advanceRub}
						taxRegime={taxRegime}
						npd6TaxKop={payrollResult.npd6TaxKop}
						netPayoutToDoctorKop={payrollResult.netPayoutToDoctorKop}
						isNpdReceiptDone={isNpdReceiptDone}
						onSetChairRentalRub={setChairRentalRub}
						onSetShiftsCount={setShiftsCount}
						onSetShiftRateRub={setShiftRateRub}
						onSetAdvanceRub={setAdvanceRub}
						onSetIsNpdReceiptDone={setIsNpdReceiptDone}
					/>

					<PayrollTotalsBar
						payrollResult={payrollResult}
						payoutModel={payoutModel}
						taxRegime={taxRegime}
						copyFeedback={copyFeedback}
						onSendToMessenger={handleSendToMessenger}
						onDownloadCsv={handleDownloadCsv}
						onPrintPayslip={handlePrintPayslip}
						onClose={onClose}
					/>

					<PayrollServicesTable
						services={servicesToUse}
						isLoading={isLoadingEarnings}
						baseCommissionPercent={payrollResult.baseCommissionPercent}
					/>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default DoctorPayrollModal;
