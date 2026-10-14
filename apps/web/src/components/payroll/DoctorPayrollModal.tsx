import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
	Calculator,
	X,
	FileText,
	Download,
	Calendar,
	User,
	Send,
	Check,
	CreditCard,
	Percent,
	Building2,
	Share2,
} from "lucide-react";
import {
	calculateDoctorPeriodPayroll,
	filterServicesForDoctor,
	generatePayrollT51Csv,
	generateDoctorPayslipHtml,
	generateDoctorPayslipMessengerText,
	type DoctorCompletedServiceItem,
	type DoctorPayrollResult,
	type DoctorPayrollStornoLineItem,
	SOLO_DOCTOR_SPECIALTY_PRESETS,
	type SoloDoctorSpecialtyPreset,
	DEFAULT_SOLO_DOCTOR,
} from "./staffPayrollEngine";
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
	const [chairRentalRub, setChairRentalRub] = useState<number>(40000);
	const [advanceRub, setAdvanceRub] = useState<number>(0);
	const [isNpdReceiptDone, setIsNpdReceiptDone] = useState<boolean>(false);
	const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
	const [customPercent, setCustomPercent] = useState<number | undefined>(initialBasePercentage);
	const [manualAdjustmentRub, setManualAdjustmentRub] = useState<number>(0);
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
			const month = String(now.getMonth() + 1).padStart(2, "0");
			const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
			setPeriodStart(`${year}-${month}-01`);
			setPeriodEnd(`${year}-${month}-${String(lastDay).padStart(2, "0")}`);
		} else if (preset === "previous_month") {
			const prevMonthDate = new Date(year, now.getMonth() - 1, 1);
			const pYear = prevMonthDate.getFullYear();
			const pMonth = String(prevMonthDate.getMonth() + 1).padStart(2, "0");
			const lastDay = new Date(pYear, prevMonthDate.getMonth() + 1, 0).getDate();
			setPeriodStart(`${pYear}-${pMonth}-01`);
			setPeriodEnd(`${pYear}-${pMonth}-${String(lastDay).padStart(2, "0")}`);
		} else if (preset === "quarter") {
			const currentQuarter = Math.floor(now.getMonth() / 3);
			const startMonth = String(currentQuarter * 3 + 1).padStart(2, "0");
			const endMonthNum = currentQuarter * 3 + 3;
			const lastDay = new Date(year, endMonthNum, 0).getDate();
			setPeriodStart(`${year}-${startMonth}-01`);
			setPeriodEnd(`${year}-${String(endMonthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`);
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
								let category: DoctorCompletedServiceItem["category"] = "therapy";
								if (["therapy", "orthopedics", "surgery", "orthodontics", "hygiene", "retail_hygiene", "pediatric"].includes(srv.category)) {
									category = srv.category as DoctorCompletedServiceItem["category"];
								}
								mapped.push({
									id: srv.id || `srv-${apt.appointmentId}-${mapped.length}`,
									dateIso,
									patientName: apt.patientFullName || "Пациент",
									medicalCardNumber: apt.cardNumber || "—",
									serviceNameRu: srv.nameRu || "Стоматологическая процедура",
									category,
									grossRevenueKop: srv.priceKop ?? Math.round((srv.priceRub || 0) * 100),
									labCostKop: srv.labCostKop ?? Math.round((srv.labCostRub || 0) * 100),
									materialCostKop: srv.materialCostKop ?? Math.round((srv.materialCostRub || 0) * 100),
									customCommissionPercent: srv.commissionPercent,
									doctorId: docId,
									performerId: docId,
								});
							}
						}
					}
				}
				setApiServices(mapped);
				setIsLoadingEarnings(false);
			})
			.catch(() => {
				if (isCancelled) return;
				setIsLoadingEarnings(false);
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
				{/* Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/30">
							<Calculator className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
								Сдельная зарплата и расчетный листок
								<span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20">
									{taxRegime === "self_employed"
										? "ИП / Самозанятый (НДФЛ 0%)"
										: payrollResult.isProgressiveTaxApplied
											? "Расчет зарплаты / Прогрессивный НДФЛ 13-15%"
											: "Расчет зарплаты / НДФЛ 13%"}
								</span>
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{clinicName} • Автоматический вычет материалов и зуботехнической лаборатории
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Закрыть окно"
						className="w-8 h-8 rounded-lg border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors cursor-pointer"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Body Content */}
				<div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-5 flex-1">
					{/* Filter Controls with Segmented Bar */}
					<div className="flex flex-col gap-3 p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex items-center gap-2 flex-wrap">
								<span className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5 shrink-0">
									<Calendar className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
									Период расчета:
								</span>
								<div className="dente-segmented-bar">
									<button
										type="button"
										className={`dente-segmented-item ${periodPreset === "current_month" ? "active" : ""}`}
										onClick={() => handleSelectPeriodPreset("current_month")}
									>
										Текущий месяц
									</button>
									<button
										type="button"
										className={`dente-segmented-item ${periodPreset === "previous_month" ? "active" : ""}`}
										onClick={() => handleSelectPeriodPreset("previous_month")}
									>
										Прошлый месяц
									</button>
									<button
										type="button"
										className={`dente-segmented-item ${periodPreset === "quarter" ? "active" : ""}`}
										onClick={() => handleSelectPeriodPreset("quarter")}
									>
										Квартал
									</button>
									<button
										type="button"
										className={`dente-segmented-item ${periodPreset === "custom" ? "active" : ""}`}
										onClick={() => handleSelectPeriodPreset("custom")}
									>
										Произвольный
									</button>
								</div>
							</div>

							<div className="flex items-center gap-3 flex-wrap">
								<div className="flex items-center gap-1.5">
									<span className="text-xs font-semibold text-[var(--muted,#64748b)] shrink-0">
										Режим:
									</span>
									<div className="dente-segmented-bar" data-testid="doctor-payroll-tax-regime">
										<button
											type="button"
											className={`dente-segmented-item ${taxRegime === "employee" ? "active" : ""}`}
											onClick={() => setTaxRegime("employee")}
										>
											Наёмный (13-15%)
										</button>
										<button
											type="button"
											className={`dente-segmented-item ${taxRegime === "self_employed" ? "active" : ""}`}
											onClick={() => setTaxRegime("self_employed")}
										>
											ИП / Самозанятый (0%)
										</button>
									</div>
								</div>

								<div className="flex items-center gap-1.5">
									<span className="text-xs font-semibold text-[var(--muted,#64748b)] shrink-0">
										Модель:
									</span>
									<div className="dente-segmented-bar" data-testid="doctor-payroll-model-toggle">
										<button
											type="button"
											className={`dente-segmented-item ${payoutModel === "percentage" ? "active" : ""}`}
											onClick={() => setPayoutModel("percentage")}
										>
											Процент от кассы
										</button>
										<button
											type="button"
											className={`dente-segmented-item ${payoutModel === "chair_rental" ? "active" : ""}`}
											onClick={() => {
												setPayoutModel("chair_rental");
												setTaxRegime("self_employed");
											}}
										>
											Аренда кресла (Соло)
										</button>
									</div>
								</div>
							</div>
						</div>

						{/* Chair Rental & Payment Split Toolbar (Mandates 8e, 8n) */}
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-[var(--line,#e2e8f0)]/80 text-xs">
							{payoutModel === "chair_rental" ? (
								<div className="flex items-center gap-2 flex-wrap" data-testid="doctor-payroll-chair-rental-panel">
									<Building2 className="w-4 h-4 text-[var(--teal,#0d9488)]" />
									<label className="font-semibold text-[var(--ink,#0f172a)] whitespace-nowrap">
										Аренда кресла:
									</label>
									<input
										type="number"
										value={chairRentalRub}
										onChange={(e) => setChairRentalRub(Math.max(0, Number(e.target.value) || 0))}
										className="w-24 sm:w-28 h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-right font-bold text-xs"
										data-testid="doctor-payroll-chair-rental-input"
									/>
									<span className="text-[var(--muted,#64748b)]">₽/мес</span>
									<span className="text-[11px] text-[var(--teal,#0d9488)] font-medium">
										(Выручка − Аренда − ЗТЛ − Мат = 100% чистый доход)
									</span>
								</div>
							) : (
								<div className="flex items-center gap-2">
									<Percent className="w-4 h-4 text-[var(--teal,#0d9488)]" />
									<span className="text-[var(--muted,#64748b)]">
										Ставка комиссии врача по пресету: <strong>{payrollResult.baseCommissionPercent}%</strong>
									</span>
								</div>
							)}

							<div className="flex items-center gap-3 flex-wrap">
								<div className="flex items-center gap-1.5">
									<label className="font-semibold text-[var(--muted,#64748b)] whitespace-nowrap">Аванс:</label>
									<input
										type="number"
										value={advanceRub}
										onChange={(e) => setAdvanceRub(Math.max(0, Number(e.target.value) || 0))}
										className="w-20 sm:w-24 h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-right font-bold text-xs"
										data-testid="doctor-payroll-advance-input"
										placeholder="0"
									/>
									<span className="text-[var(--muted,#64748b)]">₽</span>
								</div>

								{(taxRegime === "self_employed" || payoutModel === "chair_rental") && (
									<div className="flex items-center gap-2">
										<span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-800 text-[11px]">
											НПД 6%: {(((payrollResult.npd6TaxKop ?? Math.round(payrollResult.netPayoutToDoctorKop * 0.06))) / 100).toLocaleString("ru-RU")} ₽
										</span>
										<label className="flex items-center gap-1.5 cursor-pointer font-medium text-[var(--ink,#0f172a)] select-none text-xs">
											<input
												type="checkbox"
												checked={isNpdReceiptDone}
												onChange={(e) => setIsNpdReceiptDone(e.target.checked)}
												className="rounded border-[var(--line,#cbd5e1)] text-[var(--teal,#0d9488)]"
												data-testid="doctor-payroll-npd-checkbox"
											/>
											<span>Чек «Мой налог»</span>
										</label>
									</div>
								)}
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2.5 border-t border-[var(--line,#e2e8f0)]/80">
							<div className="flex flex-col gap-1">
								<label className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5">
									<User className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
									{doctorsList.length === 0 ? "Врач / Специализация (соло):" : "Врач / Специалист:"}
								</label>
								<select
									value={doctorsList.length === 0 ? soloSpecialtyId : selectedDoctorId}
									onChange={(e) => {
										if (doctorsList.length === 0) {
											const val = e.target.value === "solo-doctor" ? DEFAULT_SOLO_DOCTOR.specialtyId : e.target.value;
											setSoloSpecialtyId(val);
										} else {
											setSelectedDoctorId(e.target.value);
										}
									}}
									disabled={false}
									data-testid="doctor-payroll-select"
									className="h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)] disabled:opacity-60 disabled:cursor-not-allowed"
								>
									{doctorsList.length === 0 ? (
										SOLO_DOCTOR_SPECIALTY_PRESETS.map((spec) => (
											<option key={spec.specialtyId} value={spec.specialtyId}>
												{spec.labelRu}
											</option>
										))
									) : (
										doctorsList.map((doc) => (
											<option key={doc.id} value={doc.id}>
												{doc.name}
											</option>
										))
									)}
								</select>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-xs font-semibold text-[var(--muted,#64748b)]">
									Начало периода:
								</label>
								<input
									type="date"
									value={periodStart}
									onChange={(e) => {
										setPeriodStart(e.target.value);
										setPeriodPreset("custom");
									}}
									className="h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-medium text-[var(--ink,#0f172a)]"
								/>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-xs font-semibold text-[var(--muted,#64748b)]">
									Конец периода:
								</label>
								<input
									type="date"
									value={periodEnd}
									onChange={(e) => {
										setPeriodEnd(e.target.value);
										setPeriodPreset("custom");
									}}
									className="h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-medium text-[var(--ink,#0f172a)]"
								/>
							</div>
						</div>
					</div>

					{/* 4 Summary Stat Cards — Standardized Typography & Geometry */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						<div className="payroll-stat-card">
							<span className="text-[12px] font-medium text-[var(--muted,#64748b)]">Выручка брутто</span>
							<span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
								{(payrollResult.totalGrossRevenueKop / 100).toLocaleString("ru-RU")} ₽
							</span>
							<span className="text-[12px] text-[var(--muted,#64748b)]">
								{payrollResult.serviceCount} услуг
								{payrollResult.warrantyServicesCount > 0 ? ` • ${payrollResult.warrantyServicesCount} гарантия` : ""}
								{payrollResult.refundedServicesCount > 0 ? ` • ${payrollResult.refundedServicesCount} возврат` : ""}
							</span>
						</div>

						<div className="payroll-stat-card">
							<span className="text-[12px] font-medium text-[var(--muted,#64748b)]">
								{payoutModel === "chair_rental" ? "Вычеты (Аренда/Мат/ЗТЛ)" : "Вычеты (Мат/Лаб)"}
							</span>
							<span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
								-{(( (payrollResult.chairRentalKop ?? 0) + payrollResult.totalLabDeductionsKop + payrollResult.totalMaterialDeductionsKop) / 100).toLocaleString("ru-RU")} ₽
							</span>
							<span className="text-[12px] text-[var(--muted,#64748b)]">
								{payrollResult.totalRefundClawbackKop > 0
									? `Сторно возвратов: -${(payrollResult.totalRefundClawbackKop / 100).toLocaleString("ru-RU")} ₽`
									: `База: ${(payrollResult.totalNetBaseKop / 100).toLocaleString("ru-RU")} ₽`}
							</span>
						</div>

						<div className="payroll-stat-card">
							<span className="text-[12px] font-medium text-[var(--muted,#64748b)]">
								{payoutModel === "chair_rental" ? "Модель дохода" : "Ставка + KPI"}
							</span>
							<span className="text-base sm:text-lg font-black text-[var(--teal,#0d9488)]">
								{payoutModel === "chair_rental"
									? "100% маржа"
									: `${payrollResult.baseCommissionPercent}% ${payrollResult.kpiBonusPercent > 0 ? `+ ${payrollResult.kpiBonusPercent}%` : ""}`}
							</span>
							<span className="text-[12px] text-[var(--teal,#0d9488)] truncate" title={payrollResult.kpiTierBadgeRu}>
								{payoutModel === "chair_rental" ? "Аренда кресла (Соло)" : payrollResult.kpiTierBadgeRu}
							</span>
						</div>

						<div className="payroll-stat-card border-[var(--teal,#0d9488)]/40 bg-[var(--teal-soft,#f0fdfa)]">
							<span className="text-[12px] font-bold text-[var(--teal,#0d9488)]">Итого на руки (нетто)</span>
							<span className="text-base sm:text-lg font-black text-[var(--ok-fg,#059669)]">
								{(payrollResult.netPayoutToDoctorKop / 100).toLocaleString("ru-RU")} ₽
							</span>
							<span className="text-[12px] text-[var(--muted,#64748b)]">
								{(payrollResult.advancePayoutKop ?? 0) > 0 ? (
									<span>
										Аванс: -{((payrollResult.advancePayoutKop ?? 0) / 100).toLocaleString("ru-RU")} ₽ • Ост: {((payrollResult.mainPayoutKop ?? 0) / 100).toLocaleString("ru-RU")} ₽
									</span>
								) : taxRegime === "self_employed" || payoutModel === "chair_rental" ? (
									"ИП / Самозанятый (НДФЛ 0%)"
								) : payrollResult.isProgressiveTaxApplied ? (
									`НДФЛ 13-15%: ${(((payrollResult.ndflTaxKop ?? payrollResult.ndfl13TaxKop)) / 100).toLocaleString("ru-RU")} ₽`
								) : (
									`НДФЛ 13%: ${(payrollResult.ndfl13TaxKop / 100).toLocaleString("ru-RU")} ₽`
								)}
							</span>
						</div>
					</div>

					{/* Clinical Standard Overhead Notice */}
					{payrollResult.overheadConsumablesCoveredKop !== undefined && payrollResult.overheadConsumablesCoveredKop > 0 && (
						<div className="px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 text-xs flex items-center justify-between">
							<span>
								<strong>Клинический стандарт DENTE:</strong> Общеклинические расходники (салфетки, валики, слюноотсосы, перчатки, маски) на сумму <strong>{(payrollResult.overheadConsumablesCoveredKop / 100).toLocaleString("ru-RU")} ₽</strong> покрыты клиникой и не удерживаются из зарплаты врача.
							</span>
						</div>
					)}

					{/* Service Breakdown Table */}
					<div className="flex flex-col gap-2">
						<h3 className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider">
							Детализация выполненных нарядов и приемов за период:
						</h3>
						{isLoadingEarnings ? (
							<div
								className="p-8 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-center flex flex-col items-center justify-center gap-2"
								data-testid="doctor-payroll-services-loading"
							>
								<div className="w-6 h-6 border-2 border-[var(--teal,#0d9488)] border-t-transparent rounded-full animate-spin" />
								<p className="text-xs sm:text-sm font-semibold text-[var(--ink,#0f172a)]">
									Загрузка подтвержденных нарядов и приемов из базы...
								</p>
							</div>
						) : servicesToUse.length === 0 ? (
							<div
								className="p-8 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-center flex flex-col items-center justify-center gap-2"
								data-testid="doctor-payroll-services-empty"
							>
								<FileText className="w-8 h-8 text-[var(--muted,#64748b)]/60" />
								<p className="text-xs sm:text-sm font-semibold text-[var(--ink,#0f172a)]">
									Нет подтвержденных оказанных услуг за выбранный расчетный период
								</p>
								<p className="text-xs text-[var(--muted,#64748b)]">
									За выбранный диапазон дат у специалиста не зафиксировано выполненных приемов или закрытых нарядов
								</p>
							</div>
						) : (
							<>
								{/* Desktop Table View */}
								<div className="hidden sm:block border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden">
									<div className="overflow-x-auto">
										<table className="w-full text-left text-xs">
											<thead className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">
												<tr>
													<th className="p-2.5 font-semibold">Дата</th>
													<th className="p-2.5 font-semibold">Пациент</th>
													<th className="p-2.5 font-semibold">Услуга / Код / Зуб</th>
													<th className="p-2.5 font-semibold text-right">Выручка</th>
													<th className="p-2.5 font-semibold text-right">Материалы</th>
													<th className="p-2.5 font-semibold text-right">ЗТЛ</th>
													<th className="p-2.5 font-semibold text-right">Начислено</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
												{servicesToUse.map((srv) => {
													const isWarranty = srv.isWarrantyRework;
													const isFullyRefunded = srv.isRefunded === true || (srv.refundedAmountKop !== undefined && srv.refundedAmountKop >= srv.grossRevenueKop);
													const hasPartialRefund = !isFullyRefunded && (srv.refundedAmountKop ?? 0) > 0;
													const effectiveGrossKop = Math.max(0, srv.grossRevenueKop - (srv.refundedAmountKop ?? 0));
													const net = isWarranty ? 0 : Math.max(0, effectiveGrossKop - srv.labCostKop - srv.materialCostKop);
													let earned = 0;
													if (isWarranty) {
														if (srv.warrantyType === "clinic_warranty" || srv.warrantyType === "lab_warranty") {
															earned = srv.warrantyFixedCompensationKop ?? 0;
														}
													} else if (!isFullyRefunded) {
														earned = Math.round((net * (srv.customCommissionPercent ?? payrollResult.baseCommissionPercent)) / 100);
													}

													return (
														<tr key={srv.id} className="hover:bg-[var(--paper-soft,#f8fafc)] transition-colors">
															<td className="p-2.5 font-medium whitespace-nowrap">{srv.dateIso}</td>
															<td className="p-2.5 font-medium">
																<div>{srv.patientName}</div>
																<div className="text-[10px] text-[var(--muted,#64748b)]">Карта: {srv.medicalCardNumber}</div>
															</td>
															<td className="p-2.5 text-[var(--ink,#0f172a)]">
																<div className="font-medium">{srv.serviceNameRu}</div>
																<div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
																	{srv.order804nCode && (
																		<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]">
																			Код: {srv.order804nCode}
																		</span>
																	)}
																	{srv.toothCode && (
																		<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]/20 text-[var(--teal,#0d9488)]">
																			Зуб {srv.toothCode}
																		</span>
																	)}
																	{srv.paymentSource === "family_deposit" && (
																		<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30">
																			Семейный депозит
																		</span>
																	)}
																	{isWarranty && (
																		<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
																			Гарантия {srv.warrantyType === "doctor_fault" ? "(вина врача: 0 ₽)" : "(клиника / ЗТЛ)"}
																		</span>
																	)}
																	{isFullyRefunded && (
																		<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
																			Возврат / Сторно
																		</span>
																	)}
																	{hasPartialRefund && (
																		<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
																			Частичный возврат
																		</span>
																	)}
																</div>
															</td>
															<td className="p-2.5 font-bold text-right whitespace-nowrap">
																{isWarranty ? "0 ₽" : `${(srv.grossRevenueKop / 100).toLocaleString("ru-RU")} ₽`}
															</td>
															<td className="p-2.5 text-rose-600 dark:text-rose-400 text-right whitespace-nowrap">
																{srv.materialCostKop > 0 ? `- ${(srv.materialCostKop / 100).toLocaleString("ru-RU")} ₽` : "—"}
															</td>
															<td className="p-2.5 text-amber-600 dark:text-amber-400 text-right whitespace-nowrap font-medium">
																{srv.labCostKop > 0 ? `- ${(srv.labCostKop / 100).toLocaleString("ru-RU")} ₽` : "—"}
															</td>
															<td className="p-2.5 font-bold text-[var(--teal,#0d9488)] text-right whitespace-nowrap">
																{isFullyRefunded
																	? "0 ₽ (сторно)"
																	: `${(earned / 100).toLocaleString("ru-RU")} ₽`}
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								</div>

								{/* Mobile Grouped List Cards (Apple iOS HIG & Touch Ergonomics >= 52px) */}
								<div className="block sm:hidden flex flex-col gap-2.5" data-testid="doctor-payroll-mobile-services">
									{servicesToUse.map((srv) => {
										const isWarranty = srv.isWarrantyRework;
										const isFullyRefunded = srv.isRefunded === true || (srv.refundedAmountKop !== undefined && srv.refundedAmountKop >= srv.grossRevenueKop);
										const hasPartialRefund = !isFullyRefunded && (srv.refundedAmountKop ?? 0) > 0;
										const effectiveGrossKop = Math.max(0, srv.grossRevenueKop - (srv.refundedAmountKop ?? 0));
										const net = isWarranty ? 0 : Math.max(0, effectiveGrossKop - srv.labCostKop - srv.materialCostKop);
										let earned = 0;
										if (isWarranty) {
											if (srv.warrantyType === "clinic_warranty" || srv.warrantyType === "lab_warranty") {
												earned = srv.warrantyFixedCompensationKop ?? 0;
											}
										} else if (!isFullyRefunded) {
											earned = Math.round((net * (srv.customCommissionPercent ?? payrollResult.baseCommissionPercent)) / 100);
										}

										return (
											<div key={srv.id} className="payroll-mobile-card">
												<div className="payroll-mobile-card-header">
													<div className="flex-1 min-w-0 pr-2">
														<div className="font-semibold text-xs text-[var(--ink,#0f172a)] leading-snug">
															{srv.serviceNameRu}
														</div>
														<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
															{srv.dateIso} • {srv.patientName} (карта: {srv.medicalCardNumber})
														</div>
													</div>
													<div className="text-right flex-shrink-0">
														<div className="font-bold text-[var(--teal,#0d9488)] text-sm">
															{isFullyRefunded ? "0 ₽" : `${(earned / 100).toLocaleString("ru-RU")} ₽`}
														</div>
														<div className="text-[10px] text-[var(--muted,#64748b)]">
															{isWarranty ? "Гарантия" : `Чек: ${(srv.grossRevenueKop / 100).toLocaleString("ru-RU")} ₽`}
														</div>
													</div>
												</div>
												<div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-[var(--line,#e2e8f0)]/60 text-[11px]">
													{srv.order804nCode && (
														<span className="font-mono px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] text-[10px]">
															Код: {srv.order804nCode}
														</span>
													)}
													{srv.toothCode && (
														<span className="font-bold px-1.5 py-0.5 rounded bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]/20 text-[var(--teal,#0d9488)] text-[10px]">
															Зуб {srv.toothCode}
														</span>
													)}
													{srv.paymentSource === "family_deposit" && (
														<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30">
															Семейный депозит
														</span>
													)}
													{srv.materialCostKop > 0 && (
														<span className="text-rose-600 dark:text-rose-400 font-medium">
															Мат: -{(srv.materialCostKop / 100).toLocaleString("ru-RU")} ₽
														</span>
													)}
													{srv.labCostKop > 0 && (
														<span className="text-amber-600 dark:text-amber-400 font-medium">
															ЗТЛ: -{(srv.labCostKop / 100).toLocaleString("ru-RU")} ₽
														</span>
													)}
													{isWarranty && (
														<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
															Гарантия
														</span>
													)}
													{isFullyRefunded && (
														<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30">
															Возврат / Сторно
														</span>
													)}
													{hasPartialRefund && (
														<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
															Частичный возврат
														</span>
													)}
												</div>
											</div>
										);
									})}
								</div>
							</>
						)}
					</div>

					{/* Storno Details Section */}
					{payrollResult.stornoItems.length > 0 && (
						<div className="flex flex-col gap-2" data-testid="doctor-payroll-storno-section">
							<h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
								<span>Сторно комиссий при возвратах и перерасчётах:</span>
								<span className="text-[10px] font-normal normal-case text-[var(--muted,#64748b)]">
									(Автоматическое сторнирование начислений при возврате денег пациенту)
								</span>
							</h4>
							{/* Desktop Storno Table */}
							<div className="hidden sm:block border border-rose-200 dark:border-rose-900/60 rounded-xl overflow-hidden bg-rose-50/30 dark:bg-rose-950/20">
								<div className="overflow-x-auto">
									<table className="w-full text-left text-xs">
										<thead className="bg-rose-100/50 dark:bg-rose-900/40 border-b border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200">
											<tr>
												<th className="p-2.5 font-semibold">Дата</th>
												<th className="p-2.5 font-semibold">Чек / Документ</th>
												<th className="p-2.5 font-semibold">Услуга / Основание</th>
												<th className="p-2.5 font-semibold text-right">Возврат пациенту</th>
												<th className="p-2.5 font-semibold text-right">Сторно комиссии</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-rose-200/60 dark:divide-rose-900/40">
											{payrollResult.stornoItems.map((storno) => (
												<tr key={storno.id} className="hover:bg-rose-100/30 dark:hover:bg-rose-900/20 transition-colors">
													<td className="p-2.5 font-medium whitespace-nowrap">{storno.dateIso}</td>
													<td className="p-2.5 font-mono font-bold text-rose-700 dark:text-rose-300">№ {storno.receiptNumber}</td>
													<td className="p-2.5 text-[var(--ink,#0f172a)]">
														<div className="font-semibold">{storno.serviceNameRu}</div>
														<div className="text-[10px] text-rose-600 dark:text-rose-400">{storno.reasonRu}</div>
														<div className="text-[10px] font-bold text-rose-700 dark:text-rose-300 mt-0.5">{storno.labelRu}</div>
													</td>
													<td className="p-2.5 font-bold text-right text-rose-600 dark:text-rose-400 whitespace-nowrap">
														-{(storno.refundedGrossKop / 100).toLocaleString("ru-RU")} ₽
													</td>
													<td className="p-2.5 font-black text-right text-rose-700 dark:text-rose-300 whitespace-nowrap">
														-{(storno.stornoCommissionKop / 100).toLocaleString("ru-RU")} ₽
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>

							{/* Mobile Storno Cards */}
							<div className="block sm:hidden flex flex-col gap-2">
								{payrollResult.stornoItems.map((storno) => (
									<div key={storno.id} className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-xs">
										<div className="flex items-center justify-between gap-2">
											<span className="font-mono font-bold text-rose-700 dark:text-rose-300">№ {storno.receiptNumber}</span>
											<span className="text-[11px] text-[var(--muted,#64748b)]">{storno.dateIso}</span>
										</div>
										<div className="font-semibold text-[var(--ink,#0f172a)] mt-1">{storno.serviceNameRu}</div>
										<div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">{storno.reasonRu}</div>
										<div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-rose-200/50">
											<span className="text-rose-600 dark:text-rose-400">Возврат: -{(storno.refundedGrossKop / 100).toLocaleString("ru-RU")} ₽</span>
											<span className="font-bold text-rose-700 dark:text-rose-300">Сторно: -{(storno.stornoCommissionKop / 100).toLocaleString("ru-RU")} ₽</span>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Footer Actions (Desktop & Tablet) */}
				<div className="hidden sm:flex p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] items-center justify-between flex-wrap gap-3">
					<div className="text-xs text-[var(--muted,#64748b)]">
						Специальность: <span className="font-bold text-[var(--ink,#0f172a)]">{payrollResult.specialtyTitleRu}</span>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => handleSendToMessenger("clipboard")}
							className="dente-btn-secondary"
							data-testid="doctor-payroll-send-messenger"
							title="Скопировать структурированный текст расчетного листка для WhatsApp или Telegram"
						>
							<Share2 className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							<span>{copyFeedback ?? "В мессенджер"}</span>
						</button>
						<button
							type="button"
							onClick={handleDownloadCsv}
							className="dente-btn-secondary"
						>
							<Download className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							<span>Экспорт (CSV)</span>
						</button>
						<button
							type="button"
							onClick={handlePrintPayslip}
							className="dente-btn-primary"
						>
							<FileText className="w-3.5 h-3.5" />
							<span>Печать листка</span>
						</button>
					</div>
				</div>

				{/* Mobile Sticky Thumb Bar (Apple HIG Natural Thumb Zone, touch targets >= 44x44px) */}
				<div className="payroll-mobile-thumb-bar" data-testid="doctor-payroll-mobile-thumb-bar">
					<div className="flex items-center justify-between gap-2 w-full">
						<button
							type="button"
							onClick={() => handleSendToMessenger("clipboard")}
							className="payroll-mobile-touch-btn dente-btn-secondary flex-1 justify-center"
							data-testid="doctor-payroll-mobile-messenger-btn"
						>
							<Share2 className="w-4 h-4 text-[var(--teal,#0d9488)]" />
							<span>{copyFeedback ?? "Мессенджер"}</span>
						</button>
						<button
							type="button"
							onClick={handlePrintPayslip}
							className="payroll-mobile-touch-btn dente-btn-primary flex-1 justify-center"
							data-testid="doctor-payroll-mobile-print-btn"
						>
							<FileText className="w-4 h-4" />
							<span>Печать</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="payroll-mobile-touch-btn dente-btn-secondary px-3"
							aria-label="Закрыть окно"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default DoctorPayrollModal;
