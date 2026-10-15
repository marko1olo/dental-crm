import React from "react";
import { Calculator, X, Calendar, User } from "lucide-react";
import {
	SOLO_DOCTOR_SPECIALTY_PRESETS,
	DEFAULT_SOLO_DOCTOR,
} from "../staffPayrollEngine";

export interface PayrollHeaderProps {
	readonly clinicName: string;
	readonly taxRegime: "employee" | "self_employed";
	readonly isProgressiveTaxApplied?: boolean | undefined;
	readonly payoutModel: "percentage" | "chair_rental";
	readonly periodPreset: "current_month" | "previous_month" | "quarter" | "custom";
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly doctorsList: readonly { readonly id: string; readonly name: string; readonly specialtyId: string }[];
	readonly selectedDoctorId: string;
	readonly soloSpecialtyId: string;
	readonly activeWorkspaceTab?: "payroll" | "timesheet" | undefined;
	readonly onSelectWorkspaceTab?: ((tab: "payroll" | "timesheet") => void) | undefined;
	readonly onClose: () => void;
	readonly onSelectPeriodPreset: (preset: "current_month" | "previous_month" | "quarter" | "custom") => void;
	readonly onSetTaxRegime: (regime: "employee" | "self_employed") => void;
	readonly onSetPayoutModel: (model: "percentage" | "chair_rental") => void;
	readonly onSetPeriodStart: (val: string) => void;
	readonly onSetPeriodEnd: (val: string) => void;
	readonly onSelectDoctorId: (id: string) => void;
	readonly onSelectSoloSpecialtyId: (val: string) => void;
}

export const PayrollHeader: React.FC<PayrollHeaderProps> = ({
	clinicName,
	taxRegime,
	isProgressiveTaxApplied,
	payoutModel,
	periodPreset,
	periodStart,
	periodEnd,
	doctorsList,
	selectedDoctorId,
	soloSpecialtyId,
	activeWorkspaceTab = "payroll",
	onSelectWorkspaceTab,
	onClose,
	onSelectPeriodPreset,
	onSetTaxRegime,
	onSetPayoutModel,
	onSetPeriodStart,
	onSetPeriodEnd,
	onSelectDoctorId,
	onSelectSoloSpecialtyId,
}) => {
	const taxBadgeText =
		taxRegime === "self_employed"
			? "ИП / Самозанятый (НДФЛ 0%)"
			: isProgressiveTaxApplied
				? "Расчет зарплаты / Прогрессивный НДФЛ 13-15%"
				: "Расчет зарплаты / НДФЛ 13%";

	return (
		<>
			{/* Top Bar Header */}
			<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex flex-wrap items-center justify-between gap-3 bg-[var(--paper-soft,#f8fafc)]">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/30">
						<Calculator className="w-5 h-5" />
					</div>
					<div>
						<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
							Сдельная зарплата и расчетный листок
							<span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/20">
								{taxBadgeText}
							</span>
						</h2>
						<p className="text-xs text-[var(--muted,#64748b)]">
							{clinicName} • Автоматический вычет материалов и зуботехнической лаборатории
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					{onSelectWorkspaceTab && (
						<div className="dente-segmented-bar" data-testid="payroll-workspace-tab-toggle">
							<button
								type="button"
								className={`dente-segmented-item ${activeWorkspaceTab === "payroll" ? "active" : ""}`}
								onClick={() => onSelectWorkspaceTab("payroll")}
							>
								Зарплата врача (Net Revenue)
							</button>
							<button
								type="button"
								className={`dente-segmented-item ${activeWorkspaceTab === "timesheet" ? "active" : ""}`}
								onClick={() => onSelectWorkspaceTab("timesheet")}
							>
								Учёт рабочих часов
							</button>
						</div>
					)}
					<button
						type="button"
						onClick={onClose}
						aria-label="Закрыть окно"
						className="w-8 h-8 rounded-lg border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors cursor-pointer"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Filter Controls with Segmented Bars & Inputs */}
			{activeWorkspaceTab === "payroll" && (
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
								onClick={() => onSelectPeriodPreset("current_month")}
							>
								Текущий месяц
							</button>
							<button
								type="button"
								className={`dente-segmented-item ${periodPreset === "previous_month" ? "active" : ""}`}
								onClick={() => onSelectPeriodPreset("previous_month")}
							>
								Прошлый месяц
							</button>
							<button
								type="button"
								className={`dente-segmented-item ${periodPreset === "quarter" ? "active" : ""}`}
								onClick={() => onSelectPeriodPreset("quarter")}
							>
								Квартал
							</button>
							<button
								type="button"
								className={`dente-segmented-item ${periodPreset === "custom" ? "active" : ""}`}
								onClick={() => onSelectPeriodPreset("custom")}
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
									onClick={() => onSetTaxRegime("employee")}
								>
									Наёмный (13-15%)
								</button>
								<button
									type="button"
									className={`dente-segmented-item ${taxRegime === "self_employed" ? "active" : ""}`}
									onClick={() => onSetTaxRegime("self_employed")}
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
									onClick={() => onSetPayoutModel("percentage")}
								>
									Процент от кассы
								</button>
								<button
									type="button"
									className={`dente-segmented-item ${payoutModel === "chair_rental" ? "active" : ""}`}
									onClick={() => {
										onSetPayoutModel("chair_rental");
										onSetTaxRegime("self_employed");
									}}
								>
									Аренда кресла (Соло)
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Doctor and Dates Row */}
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
									onSelectSoloSpecialtyId(val);
								} else {
									onSelectDoctorId(e.target.value);
								}
							}}
							data-testid="doctor-payroll-select"
							className="h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
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
							onChange={(e) => onSetPeriodStart(e.target.value)}
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
							onChange={(e) => onSetPeriodEnd(e.target.value)}
							className="h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-medium text-[var(--ink,#0f172a)]"
						/>
					</div>
				</div>
			</div>
			)}
		</>
	);
};

export default PayrollHeader;
