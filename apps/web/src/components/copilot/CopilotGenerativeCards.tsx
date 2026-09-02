import {
	Activity,
	AlertCircle,
	AlertTriangle,
	ArrowRight,
	Brain,
	Calendar,
	Check,
	CheckCircle2,
	CheckSquare,
	Clock,
	CreditCard,
	Edit3,
	FileSignature,
	FileText,
	Flame,
	HeartPulse,
	Layers,
	Loader2,
	MapPin,
	MessageCircle,
	PenTool,
	Percent,
	Phone,
	Pill,
	Printer,
	RotateCcw,
	Save,
	Search,
	Send,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	User,
	UserCheck,
	Users,
	XCircle,
	Zap,
} from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { useVisitStore } from "../../store/visitStore";
import type {
	DdiSafetyAlertData,
	EmrDraftCard,
	GapFillerCard,
	GapFillerPatientOption,
	PatientSentimentBadge,
	PatientSentimentKind,
	ProactiveAlertCardData,
	Protocol043Data,
	ReactStepItem,
	RetentionSummaryCard,
	TriageUrgency,
	WhatsAppApprovalCard,
	ZtlAlertCard,
} from "./copilotTypes";
import {
	formatDateTime,
	formatMoney,
	formatTimeRange,
} from "./useCopilotFormat";

// ============================================================================
// TYPE DEFINITIONS FOR GENERATIVE CARDS
// ============================================================================

export interface PatientProfileCardData {
	id: string;
	fullName: string;
	phone?: string | undefined;
	birthDate?: string | undefined;
	gender?: "male" | "female" | string | undefined;
	cardNumber?: string | undefined;
	status?: string | undefined;
	balanceRub?: number | undefined;
	depositRub?: number | undefined;
	debtRub?: number | undefined;
	familyBalanceRub?: number | undefined;
	allergies?: string[] | undefined;
	lastVisitDate?: string | undefined;
	lastDoctorName?: string | undefined;
	lastDiagnosis?: string | undefined;
	nextAppointmentDate?: string | undefined;
	activePlanStage?: string | undefined;
}

export interface PatientProfileCardProps {
	patient: PatientProfileCardData;
	onOpenCard?: ((patientId: string) => void) | undefined;
	onSelectPatient?: ((patientId: string) => void) | undefined;
	onBookAppointment?: ((patientId: string) => void) | undefined;
	onSelectPlan?: ((patientId: string) => void) | undefined;
}

export interface ScheduleSlotOption {
	id: string;
	time: string;
	endTime?: string | undefined;
	startTime?: string | undefined;
	durationMinutes?: number | undefined;
	cabinet?: string | undefined;
	chairName?: string | undefined;
	isAvailable?: boolean | undefined;
	priceRub?: number | undefined;
}

export interface ScheduleSlotPickerData {
	doctorId?: string | undefined;
	doctorName?: string | undefined;
	doctorSpecialty?: string | undefined;
	cabinet?: string | undefined;
	date?: string | undefined;
	availableDates?: string[] | undefined;
	slots: ScheduleSlotOption[];
}

export interface ScheduleSlotPickerCardProps {
	data: ScheduleSlotPickerData;
	selectedSlotId?: string | undefined;
	onSelectSlot?: ((slot: ScheduleSlotOption) => void) | undefined;
	onBookSlot?: ((slot: ScheduleSlotOption) => void) | undefined;
	onChangeDate?: ((date: string) => void) | undefined;
}

export interface Prescription107DrugItem {
	id: string;
	mnn: string;
	tradeName?: string | undefined;
	latinName: string;
	dosageForm: string;
	dosage: string;
	quantity: string;
	signa: string;
	icd10?: string | undefined;
}

export interface Prescription107Data {
	id?: string | undefined;
	series?: string | undefined;
	number?: string | undefined;
	issueDate?: string | undefined;
	validityDays?: number | string | undefined;
	patientName: string;
	patientBirthDate?: string | undefined;
	patientAgeYears?: number | undefined;
	patientAddress?: string | undefined;
	doctorName: string;
	doctorSpecialty?: string | undefined;
	doctorSnils?: string | undefined;
	clinicName?: string | undefined;
	clinicOgrn?: string | undefined;
	clinicAddress?: string | undefined;
	medicalLicense?: string | undefined;
	diagnosisIcd10?: string | undefined;
	diagnosisName?: string | undefined;
	drugs: Prescription107DrugItem[];
	isChronicallyIll?: boolean | undefined;
	isSignedUkep?: boolean | undefined;
	ukepCertificate?: string | undefined;
	ukepSignedAt?: string | undefined;
}

export interface Prescription107CardProps {
	prescription: Prescription107Data;
	onPrint?: ((prescription: Prescription107Data) => void) | undefined;
	onSignUkep?: ((prescription: Prescription107Data) => void) | undefined;
}

export interface EstimateStageBreakdown {
	stageName: string;
	proceduresCount: number;
	totalRub: number;
}

export interface EstimateTierOption {
	tierKey: "economy" | "optimum" | "premium";
	tierName: string;
	badge: string;
	totalRub: number;
	monthlyInstallmentRub?: number | undefined;
	installmentMonths?: number | undefined;
	taxDeductionRub: number;
	netCostAfterDeductionRub: number;
	warrantyDescription: string;
	materialsDescription: string;
	keyAdvantages: string[];
	stages?: EstimateStageBreakdown[] | undefined;
}

export interface EstimateTierData {
	patientId?: string | undefined;
	patientName?: string | undefined;
	discountPercent?: number | undefined;
	createdAt?: string | undefined;
	diagnoses?: string[] | undefined;
	teeth?: (string | number)[] | undefined;
	selectedTier?: "economy" | "optimum" | "premium" | undefined;
	tiers: EstimateTierOption[];
}

export interface EstimateTierCardProps {
	data: EstimateTierData;
	activeTier?: "economy" | "optimum" | "premium" | undefined;
	onSelectTier?:
		| ((tierKey: "economy" | "optimum" | "premium") => void)
		| undefined;
	onApplyTier?:
		| ((
				tierKey: "economy" | "optimum" | "premium",
				tier: EstimateTierOption,
		  ) => void)
		| undefined;
}

export interface CopilotReactTrackerProps {
	title?: string | undefined;
	steps?: ReactStepItem[] | undefined;
	currentStepIndex?: number | undefined;
	isComplete?: boolean | undefined;
	totalDurationMs?: number | undefined;
	onStepClick?: ((step: ReactStepItem) => void) | undefined;
}

export interface CopilotProtocol043ConfirmCardProps {
	data: Protocol043Data;
	callId?: string | undefined;
	resolved?: ("confirm" | "reject") | undefined;
	onConfirm?: ((data: Protocol043Data) => void) | undefined;
	onReject?: (() => void) | undefined;
	disabled?: boolean | undefined;
}

export interface CopilotDdiSafetyCardProps {
	data: DdiSafetyAlertData;
	callId?: string | undefined;
	resolved?: ("confirm" | "reject") | undefined;
	onReplaceDrug?: ((alternative: string) => void) | undefined;
	onOverride?: (() => void) | undefined;
	disabled?: boolean | undefined;
}

// ============================================================================
// 1. PatientProfileCard COMPONENT
// ============================================================================

export const PatientProfileCard: React.FC<PatientProfileCardProps> = ({
	patient,
	onOpenCard,
	onSelectPatient,
	onBookAppointment,
	onSelectPlan,
}) => {
	const handleOpen = onOpenCard || onSelectPatient;

	const initials = useMemo(() => {
		if (!patient.fullName) return "П";
		const parts = patient.fullName.trim().split(/\s+/);
		const first = parts[0] || "П";
		const second = parts[1] || "";
		if (parts.length === 1) return first.slice(0, 2).toUpperCase();
		return (first.charAt(0) + second.charAt(0)).toUpperCase();
	}, [patient.fullName]);

	const rawBalance = useMemo(() => {
		if (
			typeof patient.balanceRub === "number" &&
			Number.isFinite(patient.balanceRub)
		) {
			return patient.balanceRub;
		}
		if (
			typeof patient.depositRub === "number" &&
			Number.isFinite(patient.depositRub)
		) {
			return patient.depositRub;
		}
		if (
			typeof patient.debtRub === "number" &&
			Number.isFinite(patient.debtRub)
		) {
			return -patient.debtRub;
		}
		return 0;
	}, [patient.balanceRub, patient.depositRub, patient.debtRub]);

	const isPositive = rawBalance >= 0;
	const statusLower = (patient.status || "active").toLowerCase();

	const allergiesList = patient.allergies || [];
	const hasAllergies = allergiesList.length > 0;

	return (
		<div
			className="copilot-gen-card copilot-patient-profile-card"
			data-testid="copilot-patient-profile-card"
		>
			{/* Top Identity Block */}
			<div className="copilot-pp-header">
				<div className="copilot-pp-identity">
					<div className="copilot-pp-avatar">{initials}</div>
					<div style={{ minWidth: 0 }}>
						<div className="copilot-pp-name-row">
							<h4 className="copilot-pp-name">{patient.fullName}</h4>
							<span
								className={`copilot-pp-status-badge ${statusLower.includes("vip") ? "vip" : statusLower.includes("active") ? "active" : "primary"}`}
							>
								{patient.status || "Пациент клиники"}
							</span>
						</div>
						<div className="copilot-pp-meta">
							{Boolean(patient.phone) && (
								<span className="copilot-pp-meta-item">
									<Phone size={12} />
									{patient.phone}
								</span>
							)}
							{Boolean(patient.birthDate) && (
								<span className="copilot-pp-meta-item">
									<Calendar size={12} />
									{patient.birthDate}
								</span>
							)}
							{Boolean(patient.cardNumber) && (
								<span className="copilot-pp-meta-item">
									<FileText size={12} />№ {patient.cardNumber}
								</span>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Financial Metrics Strip */}
			<div className="copilot-pp-finance-strip">
				<div className="copilot-pp-finance-cell">
					<span className="copilot-pp-finance-label">Личный баланс</span>
					<span
						className={`copilot-pp-finance-val ${isPositive ? "positive" : "negative"} tabular-nums`}
					>
						{isPositive
							? `+${formatMoney(rawBalance)}`
							: formatMoney(rawBalance)}
					</span>
				</div>

				{patient.familyBalanceRub !== undefined && (
					<div className="copilot-pp-finance-cell">
						<span className="copilot-pp-finance-label flex items-center gap-1">
							<Users size={11} className="inline" />
							<span>Семейный счёт</span>
						</span>
						<span className="copilot-pp-finance-val tabular-nums">
							{formatMoney(patient.familyBalanceRub)}
						</span>
					</div>
				)}

				{Boolean(patient.activePlanStage) && (
					<div className="copilot-pp-finance-cell">
						<span className="copilot-pp-finance-label">Этап лечения</span>
						<span className="copilot-pp-finance-val text-xs text-[var(--teal-dark)] truncate">
							{patient.activePlanStage}
						</span>
					</div>
				)}
			</div>

			{/* Allergy & Safety Alert */}
			{hasAllergies ? (
				<div className="copilot-pp-allergy-alert danger">
					<ShieldAlert size={15} style={{ flexShrink: 0 }} />
					<span>
						<strong>Аллергический статус:</strong> {allergiesList.join(", ")}
					</span>
				</div>
			) : (
				<div className="copilot-pp-allergy-alert clean">
					<ShieldCheck
						size={14}
						style={{ flexShrink: 0, color: "var(--green, #15803d)" }}
					/>
					<span>Аллергоанамнез не отягощен</span>
				</div>
			)}

			{/* Clinical History & Next Visit */}
			{(patient.lastVisitDate ||
				patient.lastDiagnosis ||
				patient.nextAppointmentDate) && (
				<div className="copilot-pp-history-row">
					{patient.lastVisitDate && (
						<div className="copilot-pp-history-title">
							<Activity size={13} className="text-[var(--teal)]" />
							<span>Последний приём: {patient.lastVisitDate}</span>
							{patient.lastDoctorName && (
								<span className="text-[var(--muted)] font-normal">
									({patient.lastDoctorName})
								</span>
							)}
						</div>
					)}
					{patient.lastDiagnosis && (
						<div className="copilot-pp-history-text">
							Диагноз:{" "}
							<span className="font-semibold text-[var(--ink)]">
								{patient.lastDiagnosis}
							</span>
						</div>
					)}
					{patient.nextAppointmentDate && (
						<div className="copilot-pp-history-text flex items-center gap-1 text-[var(--teal-dark)] font-medium">
							<Clock size={12} />
							<span>Следующий визит: {patient.nextAppointmentDate}</span>
						</div>
					)}
				</div>
			)}

			{/* Action Buttons */}
			<div className="copilot-pp-actions">
				{handleOpen && (
					<button
						type="button"
						onClick={() => handleOpen(patient.id)}
						className="copilot-pp-primary-btn"
						title="Открыть электронную медицинскую карту 043/у"
					>
						<User size={15} />
						<span>Открыть карту</span>
						<ArrowRight size={14} />
					</button>
				)}

				{onBookAppointment ? (
					<button
						type="button"
						onClick={() => onBookAppointment(patient.id)}
						className="copilot-pp-secondary-btn"
						title="Записать пациента на приём"
					>
						<Calendar size={14} />
						<span>+ Запись</span>
					</button>
				) : onSelectPlan ? (
					<button
						type="button"
						onClick={() => onSelectPlan(patient.id)}
						className="copilot-pp-secondary-btn"
						title="Перейти к плану лечения"
					>
						<FileText size={14} />
						<span>План лечения</span>
					</button>
				) : null}
			</div>
		</div>
	);
};

// ============================================================================
// 2. ScheduleSlotPickerCard COMPONENT
// ============================================================================

export const ScheduleSlotPickerCard: React.FC<ScheduleSlotPickerCardProps> = ({
	data,
	selectedSlotId,
	onSelectSlot,
	onBookSlot,
	onChangeDate,
}) => {
	const [selectedId, setSelectedId] = useState<string | undefined>(
		selectedSlotId || data.slots?.[0]?.id,
	);
	const [activeDate, setActiveDate] = useState<string>(data.date || "Сегодня");
	const [bookedStatus, setBookedStatus] = useState<boolean>(false);

	const availableDates = data.availableDates || [
		"Сегодня",
		"Завтра",
		"Послезавтра",
	];

	const handleSlotClick = (slot: ScheduleSlotOption) => {
		if (slot.isAvailable === false) return;
		setSelectedId(slot.id);
		setBookedStatus(false);
		onSelectSlot?.(slot);
	};

	const selectedSlot = useMemo(() => {
		return data.slots.find((s) => s.id === selectedId) || data.slots[0];
	}, [data.slots, selectedId]);

	const handleBook = () => {
		if (!selectedSlot) return;
		setBookedStatus(true);
		onBookSlot?.(selectedSlot);
	};

	const handleDateSelect = (d: string) => {
		setActiveDate(d);
		onChangeDate?.(d);
	};

	return (
		<div
			className="copilot-gen-card copilot-schedule-picker-card"
			data-testid="copilot-schedule-picker-card"
		>
			{/* Header with Doctor info */}
			<div className="copilot-sp-header">
				<div className="copilot-sp-doctor-info">
					<div className="copilot-sp-doctor-icon">
						<Stethoscope size={18} />
					</div>
					<div>
						<div className="copilot-sp-doctor-name">
							{data.doctorName || "Врач клиники"}
						</div>
						<div className="copilot-sp-doctor-meta">
							{data.doctorSpecialty && <span>{data.doctorSpecialty}</span>}
							{data.cabinet && (
								<span className="flex items-center gap-1">
									<MapPin size={11} />
									{data.cabinet}
								</span>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Date Selector Tabs */}
			<div className="copilot-sp-date-bar">
				{availableDates.map((d) => (
					<button
						key={d}
						type="button"
						onClick={() => handleDateSelect(d)}
						className={`copilot-sp-date-chip ${activeDate === d ? "active" : ""}`}
					>
						<span>{d}</span>
					</button>
				))}
			</div>

			{/* Interactive Slots Grid */}
			<div className="copilot-sp-slots-grid">
				{data.slots.map((slot) => {
					const isSelected = slot.id === selectedId;
					const isAvail = slot.isAvailable !== false;
					const label =
						slot.time || formatTimeRange(slot.startTime || "", slot.endTime);

					return (
						<button
							key={slot.id}
							type="button"
							disabled={!isAvail}
							onClick={() => handleSlotClick(slot)}
							className={`copilot-sp-slot-btn ${isSelected ? "selected" : ""}`}
							title={isAvail ? `Выбрать время ${label}` : "Слот уже занят"}
						>
							<span>{label}</span>
							<span className="copilot-sp-slot-duration">
								{slot.durationMinutes
									? `${slot.durationMinutes} мин`
									: "30 мин"}
							</span>
						</button>
					);
				})}
			</div>

			{/* 1-Click Booking Confirmation Bar */}
			{selectedSlot && (
				<div className="copilot-sp-booking-footer">
					<div className="copilot-sp-booking-info">
						<Clock size={14} className="inline mr-1.5" />
						<span>
							{activeDate}:{" "}
							<strong>{selectedSlot.time || selectedSlot.startTime}</strong> (
							{selectedSlot.cabinet || data.cabinet || "Кабинет 1"})
						</span>
					</div>

					<button
						type="button"
						onClick={handleBook}
						disabled={bookedStatus}
						className={`copilot-sp-book-btn ${bookedStatus ? "bg-[var(--green)]" : ""}`}
						title="Забронировать слот в 1 клик"
					>
						{bookedStatus ? (
							<>
								<CheckCircle2 size={15} />
								<span>Забронировано</span>
							</>
						) : (
							<>
								<Check size={15} />
								<span>Забронировать</span>
							</>
						)}
					</button>
				</div>
			)}
		</div>
	);
};

// ============================================================================
// 3. Prescription107Card COMPONENT
// ============================================================================

export const Prescription107Card: React.FC<Prescription107CardProps> = ({
	prescription,
	onPrint,
	onSignUkep,
}) => {
	const [isSigned, setIsSigned] = useState<boolean>(
		Boolean(prescription.isSignedUkep),
	);
	const [signing, setSigning] = useState<boolean>(false);

	const handlePrint = useCallback(() => {
		if (onPrint) {
			onPrint(prescription);
		} else if (typeof window !== "undefined") {
			window.print();
		}
	}, [onPrint, prescription]);

	const handleSign = useCallback(() => {
		if (isSigned) return;
		setSigning(true);
		setTimeout(() => {
			setIsSigned(true);
			setSigning(false);
			onSignUkep?.(prescription);
		}, 300);
	}, [isSigned, onSignUkep, prescription]);

	const series = prescription.series || "77-АА";
	const number = prescription.number || "004821";
	const validityText = prescription.isChronicallyIll
		? "Действителен 1 год (для хроников)"
		: `Срок действия: ${prescription.validityDays || 60} дней`;

	return (
		<div
			className="copilot-gen-card copilot-prescription-card"
			data-testid="copilot-prescription-card"
		>
			{/* Header */}
			<div className="copilot-rx-header">
				<div className="copilot-rx-title-box">
					<h4 className="copilot-rx-title">
						<Pill size={16} className="text-[var(--teal)]" />
						<span>Рецептурный бланк № 107-1/у</span>
					</h4>
					<span className="copilot-rx-subtitle">
						Приказ Минздрава России от 24.11.2021 № 1094н
					</span>
				</div>
				<div className="flex flex-col items-end gap-1">
					<span className="copilot-rx-series-badge">
						{`${series} № ${number}`}
					</span>
					<span className="text-[10px] font-semibold text-[var(--muted)]">
						{validityText}
					</span>
				</div>
			</div>

			{/* Patient & Doctor metadata grid */}
			<div className="copilot-rx-meta-grid">
				<div className="copilot-rx-meta-col">
					<span className="copilot-rx-meta-label">Пациент</span>
					<span className="copilot-rx-meta-val">
						{prescription.patientName}
					</span>
					{prescription.patientBirthDate && (
						<span className="text-[11px] text-[var(--muted)]">
							Дата рожд.: {prescription.patientBirthDate}
						</span>
					)}
				</div>

				<div className="copilot-rx-meta-col">
					<span className="copilot-rx-meta-label">Врач</span>
					<span className="copilot-rx-meta-val">{prescription.doctorName}</span>
					{prescription.doctorSpecialty && (
						<span className="text-[11px] text-[var(--muted)]">
							{prescription.doctorSpecialty}
						</span>
					)}
				</div>
			</div>

			{/* Diagnosis if present */}
			{Boolean(prescription.diagnosisIcd10 || prescription.diagnosisName) && (
				<div className="text-xs text-[var(--ink)] bg-[var(--paper-soft)] p-2 rounded border border-[var(--line)]">
					<strong>Диагноз:</strong> {prescription.diagnosisIcd10}{" "}
					{prescription.diagnosisName ? `(${prescription.diagnosisName})` : ""}
				</div>
			)}

			{/* Drug List (Rp: items in Latin + Signa in Russian per Order 1094n) */}
			<div className="copilot-rx-drug-list">
				{prescription.drugs.map((drug, idx) => (
					<div key={drug.id || idx} className="copilot-rx-drug-item">
						<div className="copilot-rx-latin-line">
							{`Rp.: ${drug.latinName || drug.mnn} ${drug.dosage || ""}`.trim()}
						</div>
						<div className="copilot-rx-signa-line">
							<strong>D.t.d.</strong> N {drug.quantity || "1"} •{" "}
							<strong>D.S.</strong> {drug.signa}
						</div>
						{drug.tradeName && (
							<div className="text-xs text-[var(--muted)] mt-0.5">
								Торговое наименование: {drug.tradeName} ({drug.dosageForm})
							</div>
						)}
					</div>
				))}
			</div>

			{/* DDI Safety Badge */}
			<div className="copilot-rx-safety-badge">
				<ShieldCheck size={14} />
				<span>Клинический контроль: DDI Safe • Регламент СтАР соблюден</span>
			</div>

			{/* UKEP Stamp Box */}
			{isSigned ? (
				<div className="copilot-rx-ukep-stamp signed">
					<FileSignature
						size={18}
						className="text-[var(--teal)] flex-shrink-0"
					/>
					<div style={{ minWidth: 0 }}>
						<div className="font-bold text-xs uppercase tracking-wider text-[var(--teal-dark)]">
							Электронный документ подписан УКЭП
						</div>
						<div className="text-[11px] text-[var(--ink)] mt-0.5">
							Сертификат:{" "}
							<code className="font-mono">
								{prescription.ukepCertificate || "00E10352F71B39D48C19"}
							</code>
						</div>
						<div className="text-[10px] text-[var(--muted)]">
							Владелец: {prescription.doctorName} •{" "}
							{prescription.ukepSignedAt || "31.08.2026 22:30"}
						</div>
					</div>
				</div>
			) : (
				<div className="copilot-rx-ukep-stamp">
					<AlertCircle
						size={15}
						className="text-[var(--amber)] flex-shrink-0"
					/>
					<span>Черновик рецепта. Требуется подписание УКЭП врача.</span>
				</div>
			)}

			{/* Action Buttons */}
			<div className="copilot-rx-actions">
				<button
					type="button"
					onClick={handlePrint}
					className="copilot-rx-print-btn"
					title="Распечатать официальный бланк 107-1/у"
				>
					<Printer size={15} />
					<span>Печать 107-1/у</span>
				</button>

				<button
					type="button"
					disabled={isSigned || signing}
					onClick={handleSign}
					className="copilot-rx-sign-btn"
					title="Подписать рецепт усиленной квалифицированной электронной подписью"
				>
					{isSigned ? (
						<>
							<CheckCircle2 size={15} />
							<span>Подписано УКЭП</span>
						</>
					) : signing ? (
						<span>Подписание...</span>
					) : (
						<>
							<PenTool size={15} />
							<span>Подписать УКЭП</span>
						</>
					)}
				</button>
			</div>
		</div>
	);
};

// ============================================================================
// 4. EstimateTierCard COMPONENT
// ============================================================================

export const EstimateTierCard: React.FC<EstimateTierCardProps> = ({
	data,
	activeTier,
	onSelectTier,
	onApplyTier,
}) => {
	const defaultTier = data.selectedTier || activeTier || "optimum";
	const [currentTierKey, setCurrentTierKey] = useState<
		"economy" | "optimum" | "premium"
	>(defaultTier);
	const [appliedTierKey, setAppliedTierKey] = useState<string | null>(null);

	const tiers = useMemo(() => {
		const rawTiers =
			data.tiers && data.tiers.length > 0
				? data.tiers
				: [
						{
							tierKey: "economy" as const,
							tierName: "Тариф «Эконом»",
							badge: "Базовый",
							totalRub: 42000,
							taxDeductionRub: 5460,
							netCostAfterDeductionRub: 36540,
							monthlyInstallmentRub: 3500,
							installmentMonths: 12,
							warrantyDescription: "1 год официальной гарантии",
							materialsDescription:
								"Базовые сертифицированные композиты (Filtek Z250) и металлокерамика Co-Cr",
							keyAdvantages: [
								"Доступная стоимость санации",
								"Сертифицированные материалы",
								"Гарантия 1 год",
							],
						},
						{
							tierKey: "optimum" as const,
							tierName: "Тариф «Оптимум»",
							badge: "★ Рекомендуемый (Выбор врачей)",
							totalRub: 78500,
							taxDeductionRub: 10205,
							netCostAfterDeductionRub: 68295,
							monthlyInstallmentRub: 6540,
							installmentMonths: 12,
							warrantyDescription: "2 года расширенной гарантии",
							materialsDescription:
								"Нанокомпозиты Estelite Sigma Quick, безметалловая керамика IPS e.max Press",
							keyAdvantages: [
								"Идеальный баланс эстетики и долговечности",
								"Керамика e.max и наногибрид",
								"Расширенная гарантия 2 года",
							],
						},
						{
							tierKey: "premium" as const,
							tierName: "Тариф «Премиум»",
							badge: "VIP / Индивидуальный",
							totalRub: 135000,
							taxDeductionRub: 17550,
							netCostAfterDeductionRub: 117450,
							monthlyInstallmentRub: 11250,
							installmentMonths: 12,
							warrantyDescription: "Пожизненная гарантия на конструкции",
							materialsDescription:
								"CAD/CAM диоксид циркония Multi-Layer, индивидуальные титановые абатменты",
							keyAdvantages: [
								"Максимальная биосовместимость",
								"Персональный куратор лечения",
								"Пожизненная гарантия",
							],
						},
					];

		return rawTiers.map((t) => {
			const total =
				typeof t.totalRub === "number" && Number.isFinite(t.totalRub)
					? t.totalRub
					: 0;
			const taxDeduction =
				typeof t.taxDeductionRub === "number" &&
				Number.isFinite(t.taxDeductionRub)
					? t.taxDeductionRub
					: Math.round(total * 0.13);
			const netCost =
				typeof t.netCostAfterDeductionRub === "number" &&
				Number.isFinite(t.netCostAfterDeductionRub)
					? t.netCostAfterDeductionRub
					: Math.max(0, total - taxDeduction);
			const months =
				typeof t.installmentMonths === "number" && t.installmentMonths > 0
					? t.installmentMonths
					: 12;
			const installment =
				typeof t.monthlyInstallmentRub === "number" &&
				Number.isFinite(t.monthlyInstallmentRub)
					? t.monthlyInstallmentRub
					: Math.round(total / months);

			return {
				...t,
				totalRub: total,
				taxDeductionRub: taxDeduction,
				netCostAfterDeductionRub: netCost,
				monthlyInstallmentRub: installment,
				installmentMonths: months,
			};
		});
	}, [data.tiers]);

	const activeTierObj = useMemo(() => {
		return (
			tiers.find((t) => t.tierKey === currentTierKey) || tiers[1] || tiers[0]
		);
	}, [tiers, currentTierKey]);

	const handleTierSwitch = (key: "economy" | "optimum" | "premium") => {
		setCurrentTierKey(key);
		onSelectTier?.(key);
	};

	const handleApply = () => {
		if (!activeTierObj) return;
		setAppliedTierKey(currentTierKey);
		// Instant zero-reload state sync with useVisitStore
		try {
			const teethList =
				data.teeth && data.teeth.length > 0 ? data.teeth.map(String) : ["36"];
			const plannedMap: Record<string, "planned"> = {};
			teethList.forEach((t) => {
				plannedMap[t] = "planned";
			});
			useVisitStore
				.getState()
				.applyAiToothCodes(teethList, "planned", plannedMap);
		} catch {
			// store sync resilience
		}
		onApplyTier?.(currentTierKey, activeTierObj);
	};

	return (
		<div
			className="copilot-gen-card copilot-estimate-tier-card"
			data-testid="copilot-estimate-tier-card"
		>
			{/* Header */}
			<div className="copilot-et-header">
				<div>
					<h4 className="copilot-et-title">
						ДЕНТА предлагает план лечения: 3 тарифных варианта
					</h4>
					<div className="copilot-et-subtitle">
						{data.patientName && <span>Пациент: {data.patientName} • </span>}
						{data.teeth && data.teeth.length > 0 && (
							<span>Зубы: {data.teeth.join(", ")} • </span>
						)}
						<span>Расчёт по ст. 149 НК РФ / 804н</span>
					</div>
				</div>
			</div>

			{/* Segmented Control Switcher (Apple HIG standard, no 2500px scroll!) */}
			<div className="copilot-et-segmented-control" role="tablist">
				{tiers.map((tier) => {
					const isSelected = tier.tierKey === currentTierKey;
					return (
						<button
							key={tier.tierKey}
							type="button"
							role="tab"
							aria-selected={isSelected}
							onClick={() => handleTierSwitch(tier.tierKey)}
							className={`copilot-et-segment-btn ${isSelected ? `active ${tier.tierKey}` : ""}`}
						>
							<span>
								{tier.tierKey === "optimum"
									? "★ Оптимум"
									: tier.tierKey === "premium"
										? "Премиум"
										: "Эконом"}
							</span>
						</button>
					);
				})}
			</div>

			{/* Active Tier Presentation Body */}
			{activeTierObj && (
				<div className={`copilot-et-tier-body ${activeTierObj.tierKey}`}>
					{/* Price & Badge */}
					<div className="copilot-et-price-row">
						<div>
							<h5 className="copilot-et-tier-title">
								{activeTierObj.tierName}
							</h5>
							<span className="text-xs font-semibold text-[var(--teal-dark)]">
								{activeTierObj.badge}
							</span>
						</div>
						<div className="text-right">
							<span className="copilot-et-price tabular-nums">
								{formatMoney(activeTierObj.totalRub)}
							</span>
						</div>
					</div>

					{/* Tax Deduction & Installments Grid */}
					<div className="copilot-et-perks-grid">
						<div className="copilot-et-perk-box">
							<span className="copilot-et-perk-label flex items-center gap-1">
								<Percent size={11} className="text-[var(--teal)]" />
								<span>Вычет 13% НДФЛ</span>
							</span>
							<span className="copilot-et-perk-val text-[var(--teal)] tabular-nums">
								-{formatMoney(activeTierObj.taxDeductionRub)}
							</span>
							<span className="text-[10px] text-[var(--muted)]">
								К оплате: {formatMoney(activeTierObj.netCostAfterDeductionRub)}
							</span>
						</div>

						<div className="copilot-et-perk-box">
							<span className="copilot-et-perk-label flex items-center gap-1">
								<CreditCard size={11} className="text-[var(--amber)]" />
								<span>Рассрочка 0%</span>
							</span>
							<span className="copilot-et-perk-val text-[var(--ink)] tabular-nums">
								от{" "}
								{formatMoney(
									activeTierObj.monthlyInstallmentRub ||
										Math.round(activeTierObj.totalRub / 12),
								)}{" "}
								/ мес
							</span>
							<span className="text-[10px] text-[var(--muted)]">
								на {activeTierObj.installmentMonths || 12} месяцев
							</span>
						</div>
					</div>

					{/* Warranty & Materials */}
					<div className="copilot-et-materials">
						<div className="font-semibold text-[var(--ink)] mb-1 flex items-center gap-1.5">
							<ShieldCheck size={13} className="text-[var(--teal)]" />
							<span>{activeTierObj.warrantyDescription}</span>
						</div>
						<div>{activeTierObj.materialsDescription}</div>
					</div>

					{/* Key Advantages */}
					<ul className="copilot-et-advantages-list">
						{activeTierObj.keyAdvantages.map((adv, i) => (
							<li key={i} className="copilot-et-adv-item">
								<CheckCircle2
									size={13}
									className="text-[var(--teal)] flex-shrink-0 mt-0.5"
								/>
								<span>{adv}</span>
							</li>
						))}
					</ul>

					{/* Stage breakdown if available */}
					{activeTierObj.stages && activeTierObj.stages.length > 0 && (
						<div className="pt-2 border-t border-[var(--line)] space-y-1">
							<div className="text-[11px] font-bold uppercase text-[var(--muted)] tracking-wider">
								Этапы лечения:
							</div>
							{activeTierObj.stages.map((stage, idx) => (
								<div
									key={idx}
									className="flex justify-between text-xs text-[var(--ink)]"
								>
									<span>
										{stage.stageName} ({stage.proceduresCount} проц.)
									</span>
									<span className="font-semibold tabular-nums">
										{formatMoney(stage.totalRub)}
									</span>
								</div>
							))}
						</div>
					)}

					{/* Apply Tier Action */}
					<button
						type="button"
						onClick={handleApply}
						className={`copilot-et-apply-btn ${appliedTierKey === currentTierKey ? "applied" : ""}`}
						title={`Утвердить ${activeTierObj.tierName} в качестве активного плана лечения`}
					>
						{appliedTierKey === currentTierKey ? (
							<>
								<CheckCircle2 size={16} />
								<span>
									Тариф «{activeTierObj.tierName}» утверждён в план лечения
								</span>
							</>
						) : (
							<>
								<Sparkles size={16} />
								<span>Применить тариф в план лечения</span>
							</>
						)}
					</button>
				</div>
			)}
		</div>
	);
};

// ============================================================================
// 5. CopilotReactTracker COMPONENT (Animated ReAct Execution Cycle)
// ============================================================================

export const DEFAULT_DENTE_REACT_STEPS: ReactStepItem[] = [
	{
		id: "step_patient_anamnesis",
		stepNumber: 1,
		title: "Поиск карты пациента и анамнеза (allergies, pregnancy)...",
		status: "done",
		detail: "Пациент идентифицирован • Аллергоанамнез проверен",
		icon: "search",
	},
	{
		id: "step_xray_tooth_36",
		stepNumber: 2,
		title: "Анализ прицельного снимка зуба 36 (глубокий кариес K02.1)...",
		status: "done",
		detail: "Зуб 36 FDI • Кариес дентина K02.1 MOD",
		icon: "xray",
	},
	{
		id: "step_ddi_safety",
		stepNumber: 3,
		title: "Проверка лекарственной безопасности DDI...",
		status: "done",
		detail: "DDI Safe • Противопоказания исключены",
		icon: "shield",
	},
	{
		id: "step_treatment_tiers",
		stepNumber: 4,
		title:
			"Формирование 3-уровневого плана лечения (Эконом / Оптимум / Премиум)...",
		status: "done",
		detail: "3 тарифа рассчитаны по ст. 149 НК РФ / 804н",
		icon: "plan",
	},
];

export const CopilotReactTracker: React.FC<CopilotReactTrackerProps> = ({
	title = "ReAct Цикл ДЕНТЫ: Автономное выполнение",
	steps = DEFAULT_DENTE_REACT_STEPS,
	currentStepIndex,
	isComplete,
	totalDurationMs,
	onStepClick,
}) => {
	const [expanded, setExpanded] = useState<boolean>(true);

	const completedCount = useMemo(() => {
		return steps.filter((s) => s.status === "done").length;
	}, [steps]);

	const activeIndex = useMemo(() => {
		if (typeof currentStepIndex === "number") return currentStepIndex;
		const runningIdx = steps.findIndex((s) => s.status === "running");
		if (runningIdx >= 0) return runningIdx;
		if (isComplete || completedCount === steps.length) return steps.length;
		return completedCount;
	}, [currentStepIndex, steps, isComplete, completedCount]);

	const allDone = isComplete || completedCount === steps.length;
	const progressPercent = Math.round(
		(completedCount / (steps.length || 1)) * 100,
	);

	const getStepIcon = (step: ReactStepItem) => {
		if (step.status === "running") {
			return (
				<Loader2
					size={16}
					className="copilot-rt-step-icon running animate-spin"
				/>
			);
		}
		if (step.status === "done") {
			return (
				<CheckCircle2
					size={16}
					className="copilot-rt-step-icon done text-[var(--teal)]"
				/>
			);
		}
		if (step.status === "failed") {
			return (
				<AlertTriangle
					size={16}
					className="copilot-rt-step-icon failed text-[var(--rust)]"
				/>
			);
		}
		return (
			<Clock
				size={16}
				className="copilot-rt-step-icon pending text-[var(--muted)]"
			/>
		);
	};

	return (
		<div
			className={`copilot-gen-card copilot-react-tracker ${allDone ? "all-done" : "running"}`}
			data-testid="copilot-react-tracker"
			role="region"
			aria-label="Живой пошаговый ReAct трекер ДЕНТЫ"
		>
			{/* Header with Title and Progress */}
			<div
				className="copilot-rt-header"
				onClick={() => setExpanded((prev) => !prev)}
				role="button"
				tabIndex={0}
				aria-expanded={expanded}
			>
				<div className="copilot-rt-title-block">
					<div className="copilot-rt-badge" aria-hidden="true">
						{allDone ? (
							<CheckCircle2 size={18} />
						) : (
							<Brain size={18} className="animate-pulse" />
						)}
					</div>
					<div>
						<h4 className="copilot-rt-title">{title}</h4>
						<div className="copilot-rt-subtitle">
							{allDone
								? "✅ Все шаги клинического рассуждения успешно завершены"
								: `Выполняется шаг ${Math.min(activeIndex + 1, steps.length)} из ${steps.length}...`}
						</div>
					</div>
				</div>

				<div className="copilot-rt-status-box">
					<span
						className={`copilot-rt-status-pill ${allDone ? "done" : "active"}`}
					>
						{allDone
							? "Завершено (4/4)"
							: `Шаг ${Math.min(activeIndex + 1, steps.length)}/${steps.length}`}
					</span>
				</div>
			</div>

			{/* Progress Track */}
			<div className="copilot-rt-progress-track" aria-hidden="true">
				<div
					className="copilot-rt-progress-fill"
					style={{ width: `${progressPercent}%` }}
				/>
			</div>

			{/* Steps List */}
			{expanded && (
				<div className="copilot-rt-steps-list">
					{steps.map((step, idx) => {
						const isCurrent =
							step.status === "running" || (!allDone && idx === activeIndex);

						return (
							<div
								key={step.id || idx}
								className={`copilot-rt-step-item ${step.status} ${isCurrent ? "current" : ""}`}
								onClick={() => onStepClick?.(step)}
							>
								<div className="copilot-rt-step-left">
									<div className="copilot-rt-step-icon-wrap">
										{getStepIcon(step)}
									</div>
									<div className="copilot-rt-step-num-badge">
										{`Шаг ${step.stepNumber || idx + 1}`}
									</div>
								</div>

								<div className="copilot-rt-step-body">
									<div className="copilot-rt-step-title">{step.title}</div>
									{Boolean(step.detail) && (
										<div className="copilot-rt-step-detail">{step.detail}</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

// ============================================================================
// 6. CopilotProtocol043ConfirmCard (1-Click Save to EMR 043/u)
// ============================================================================

export const CopilotProtocol043ConfirmCard: React.FC<
	CopilotProtocol043ConfirmCardProps
> = ({
	data,
	callId = "save_043",
	resolved,
	onConfirm,
	onReject,
	disabled = false,
}) => {
	const [isEditing, setIsEditing] = useState<boolean>(false);
	const [formData, setFormData] = useState<Protocol043Data>(() => {
		const d = data || {};
		return {
			patientName: d.patientName || "Барабаш Сергей Владимирович",
			tooth: d.tooth || "36",
			diagnosis: d.diagnosis || "K02.1 Кариес дентина (глубокий кариес)",
			complaints:
				d.complaints ||
				d.complaint ||
				"Боль от температурных раздражителей (холодное, сладкое) в области зуба 36, быстро проходящая после устранения фактора.",
			complaint:
				d.complaint ||
				d.complaints ||
				"Боль от температурных раздражителей (холодное, сладкое) в области зуба 36, быстро проходящая после устранения фактора.",
			anamnesis:
				d.anamnesis ||
				"Полость обнаружена 2 недели назад, ранее зуб 36 не лечен. Аллергоанамнез не отягощен.",
			objective:
				d.objective ||
				d.objectiveStatus ||
				"На жевательно-медиальной поверхности (MOD) зуба 36 глубокая кариозная полость, заполненная размягченным пигментированным дентином. Зондирование дна болезненно, перкуссия безболезненна, ЭОД 8 мкА.",
			objectiveStatus:
				d.objectiveStatus ||
				d.objective ||
				"На жевательно-медиальной поверхности (MOD) зуба 36 глубокая кариозная полость, заполненная размягченным пигментированным дентином. Зондирование дна болезненно, перкуссия безболезненна, ЭОД 8 мкА.",
			treatment:
				d.treatment ||
				d.treatmentPlan ||
				"Обезболивание: Ультракаин Д-С 1.7 мл. Препарирование полости MOD 36. Медикаментозная обработка 2% хлоргексидином. Лечебная подкладка Life, изолирующая прокладка Ionosit. Пломбирование нанокомпозитом Estelite Sigma Quick A2/OA2. Шлифовка, полировка дисками Sof-Lex.",
			treatmentPlan:
				d.treatmentPlan ||
				d.treatment ||
				"Обезболивание: Ультракаин Д-С 1.7 мл. Препарирование полости MOD 36. Медикаментозная обработка 2% хлоргексидином. Лечебная подкладка Life, изолирующая прокладка Ionosit. Пломбирование нанокомпозитом Estelite Sigma Quick A2/OA2. Шлифовка, полировка дисками Sof-Lex.",
			recommendations: d.recommendations,
			doctorName: d.doctorName,
			date: d.date,
		};
	});
	const [savedStatus, setSavedStatus] = useState<boolean>(
		resolved === "confirm",
	);

	const handleFieldChange = (key: keyof Protocol043Data, val: string) => {
		setFormData((prev) => ({ ...prev, [key]: val }));
	};

	const handleSave = () => {
		setSavedStatus(true);
		setIsEditing(false);

		// Instant zero-reload state sync with useVisitStore
		try {
			const store = useVisitStore.getState();
			const toothCode = String(formData.tooth || "36");
			const diagStr = String(formData.diagnosis || "K02.1");

			store.applyAiToothCodes(
				[toothCode],
				"done",
				{ [toothCode]: "treatment" },
				{ [toothCode]: diagStr },
			);

			store.setVisitNoteForm((prev) => ({
				...prev,
				complaint: String(
					formData.complaint || formData.complaints || prev.complaint,
				),
				anamnesis: String(formData.anamnesis || prev.anamnesis),
				objectiveStatus: String(
					formData.objectiveStatus ||
						formData.objective ||
						prev.objectiveStatus,
				),
				diagnosis: String(formData.diagnosis || prev.diagnosis),
				treatmentPlan: String(
					formData.treatmentPlan || formData.treatment || prev.treatmentPlan,
				),
			}));
		} catch {
			// store sync resilience
		}

		onConfirm?.(formData);
	};

	return (
		<div
			className={`copilot-gen-card copilot-043-confirm-card ${savedStatus ? "saved" : ""}`}
			data-testid="copilot-protocol-043-card"
			role="region"
			aria-label="Карточка дневника 043/у"
		>
			{/* Header */}
			<div className="copilot-043-header">
				<div className="copilot-043-title-row">
					<div className="copilot-043-icon">
						<FileText size={18} />
					</div>
					<div>
						<h4 className="copilot-043-title">
							ДЕНТА сформировала дневник 043/у
						</h4>
						<div className="copilot-043-meta">
							<span>{`${formData.patientName} • Зуб ${formData.tooth} (FDI) • ${formData.diagnosis}`}</span>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{!savedStatus && !isEditing && (
						<button
							type="button"
							className="copilot-043-edit-btn"
							onClick={() => setIsEditing(true)}
							disabled={disabled}
							title="Редактировать запись 043/у"
						>
							<Edit3 size={13} />
							<span>Изменить</span>
						</button>
					)}
					<span
						className={`copilot-043-status-pill ${savedStatus ? "saved" : isEditing ? "editing" : "pending"}`}
					>
						{savedStatus
							? "В ЭМК визита"
							: isEditing
								? "Правка"
								: "Черновик 043/у"}
					</span>
				</div>
			</div>

			{/* Form Content / View Grid */}
			<div className="copilot-043-grid">
				<div className="copilot-043-field">
					<span className="copilot-043-field-label">Жалобы:</span>
					{isEditing ? (
						<textarea
							className="copilot-043-textarea"
							value={formData.complaints || formData.complaint || ""}
							onChange={(e) => handleFieldChange("complaints", e.target.value)}
							rows={2}
						/>
					) : (
						<p className="copilot-043-field-text">
							{formData.complaints || formData.complaint}
						</p>
					)}
				</div>

				<div className="copilot-043-field">
					<span className="copilot-043-field-label">Анамнез заболевания:</span>
					{isEditing ? (
						<textarea
							className="copilot-043-textarea"
							value={formData.anamnesis || ""}
							onChange={(e) => handleFieldChange("anamnesis", e.target.value)}
							rows={2}
						/>
					) : (
						<p className="copilot-043-field-text">{formData.anamnesis}</p>
					)}
				</div>

				<div className="copilot-043-field">
					<span className="copilot-043-field-label">Объективный статус:</span>
					{isEditing ? (
						<textarea
							className="copilot-043-textarea"
							value={formData.objective || formData.objectiveStatus || ""}
							onChange={(e) => handleFieldChange("objective", e.target.value)}
							rows={2}
						/>
					) : (
						<p className="copilot-043-field-text">
							{formData.objective || formData.objectiveStatus}
						</p>
					)}
				</div>

				<div className="copilot-043-field">
					<span className="copilot-043-field-label">
						Лечение и пломбирование:
					</span>
					{isEditing ? (
						<textarea
							className="copilot-043-textarea"
							value={formData.treatment || formData.treatmentPlan || ""}
							onChange={(e) => handleFieldChange("treatment", e.target.value)}
							rows={3}
						/>
					) : (
						<p className="copilot-043-field-text font-medium">
							{formData.treatment || formData.treatmentPlan}
						</p>
					)}
				</div>
			</div>

			{/* Action Footer */}
			<div className="copilot-043-actions">
				{isEditing ? (
					<>
						<button
							type="button"
							className="copilot-pp-secondary-btn"
							onClick={() => setIsEditing(false)}
						>
							<RotateCcw size={14} />
							<span>Отмена</span>
						</button>
						<button
							type="button"
							className="copilot-043-save-btn"
							onClick={handleSave}
							disabled={disabled}
						>
							<Save size={15} />
							<span>Сохранить в ЭМК визита (1 клик)</span>
						</button>
					</>
				) : (
					<button
						type="button"
						className={`copilot-043-save-btn ${savedStatus ? "saved" : ""}`}
						onClick={handleSave}
						disabled={savedStatus || disabled}
						title="Сохранить дневник 043/у в электронную медкарту визита"
					>
						{savedStatus ? (
							<>
								<CheckCircle2 size={16} />
								<span>Дневник 043/у сохранён в ЭМК визита</span>
							</>
						) : (
							<>
								<Check size={16} />
								<span>Сохранить в ЭМК визита (1 клик)</span>
							</>
						)}
					</button>
				)}
			</div>
		</div>
	);
};

// ============================================================================
// 7. CopilotDdiSafetyCard (Critical DDI & Allergy Blocking Alert)
// ============================================================================

export const CopilotDdiSafetyCard: React.FC<CopilotDdiSafetyCardProps> = ({
	data,
	callId = "ddi_alert",
	resolved,
	onReplaceDrug,
	onOverride,
	disabled = false,
}) => {
	const alternatives =
		data.safeAlternatives && data.safeAlternatives.length > 0
			? data.safeAlternatives
			: [
					"Кларитромицин 500 мг (Macrolide Safe)",
					"Азитромицин 500 мг",
					"Спирамицин 3 млн МЕ",
				];

	const [selectedAlt, setSelectedAlt] = useState<string>(
		data.recommendedAlternative || alternatives[0] || "Кларитромицин 500 мг",
	);
	const [replacedStatus, setReplacedStatus] = useState<boolean>(
		resolved === "confirm",
	);

	const handleReplace = () => {
		setReplacedStatus(true);
		onReplaceDrug?.(selectedAlt);
	};

	return (
		<div
			className={`copilot-gen-card copilot-ddi-alert-card ${replacedStatus ? "replaced" : "critical"}`}
			data-testid="copilot-ddi-safety-card"
			role="alert"
		>
			{/* Header with Critical Alert Badge */}
			<div className="copilot-ddi-header">
				<div className="copilot-ddi-badge">
					{replacedStatus ? (
						<ShieldCheck size={20} />
					) : (
						<ShieldAlert size={20} />
					)}
				</div>
				<div style={{ minWidth: 0, flex: 1 }}>
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<h4 className="copilot-ddi-title">
							{replacedStatus
								? "Лекарственная безопасность восстановлена"
								: data.title || "Блокировка DDI / Аллергии"}
						</h4>
						<span
							className={`copilot-ddi-severity-pill ${replacedStatus ? "safe" : "danger"}`}
						>
							{replacedStatus ? "DDI Safe" : "Критический риск"}
						</span>
					</div>
					<p className="copilot-ddi-desc">
						{data.description ||
							"Обнаружена аллергия на пенициллины в анамнезе пациента (K02.1 / K04.0). Назначение препарата заблокировано клиническим протоколом."}
					</p>
				</div>
			</div>

			{/* Allergies / Contraindications List */}
			{data.patientAllergies && data.patientAllergies.length > 0 && (
				<div className="copilot-ddi-allergies-box">
					<AlertCircle size={14} className="text-[var(--rust)] flex-shrink-0" />
					<span>
						<strong>Аллергены в карте:</strong>{" "}
						{data.patientAllergies.join(", ")}
					</span>
				</div>
			)}

			{/* Safe Alternatives Selector */}
			{!replacedStatus && (
				<div className="copilot-ddi-alts-box">
					<div className="copilot-ddi-alts-label">
						<ShieldCheck size={13} className="text-[var(--teal)]" />
						<span>Рекомендованные безопасные аналоги (Регламент СтАР):</span>
					</div>

					<div className="copilot-ddi-alts-list">
						{alternatives.map((alt) => {
							const isSelected = alt === selectedAlt;
							return (
								<button
									key={alt}
									type="button"
									onClick={() => setSelectedAlt(alt)}
									className={`copilot-ddi-alt-btn ${isSelected ? "selected" : ""}`}
									disabled={disabled}
								>
									<Pill size={13} />
									<span>{alt}</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Action Button */}
			<div className="copilot-ddi-actions">
				{replacedStatus ? (
					<div className="copilot-ddi-success-box">
						<CheckCircle2 size={16} className="text-[var(--green)]" />
						<span>
							Препарат успешно заменен на <strong>{selectedAlt}</strong>
						</span>
					</div>
				) : (
					<button
						type="button"
						className="copilot-ddi-replace-btn"
						onClick={handleReplace}
						disabled={disabled}
						title="Заменить опасный препарат на клинически безопасный аналог"
					>
						<ShieldCheck size={16} />
						<span>Заменить на безопасный препарат ({selectedAlt})</span>
					</button>
				)}
			</div>
		</div>
	);
};

// ============================================================================
// 8. PatientSentimentBadgeView
// ============================================================================

export interface PatientSentimentBadgeViewProps {
	sentiment: PatientSentimentKind;
	score?: number | undefined;
	showIcon?: boolean | undefined;
}

export const PatientSentimentBadgeView: React.FC<
	PatientSentimentBadgeViewProps
> = ({ sentiment, score, showIcon = true }) => {
	let label = "Нейтрально";
	let className = "sentiment-neutral";
	let icon = <Activity size={12} />;

	if (sentiment === "emergency") {
		label = "🚨 Экстренно (10/10)";
		className = "sentiment-emergency";
		icon = <Flame size={12} />;
	} else if (sentiment === "anxious") {
		label = "⚠️ Тревога / Боль";
		className = "sentiment-anxious";
		icon = <AlertTriangle size={12} />;
	} else if (sentiment === "negative") {
		label = "Недовольство";
		className = "sentiment-negative";
		icon = <AlertCircle size={12} />;
	} else if (sentiment === "positive") {
		label = "Позитивно";
		className = "sentiment-positive";
		icon = <CheckCircle2 size={12} />;
	}

	return (
		<span
			className={`copilot-sentiment-badge ${className}`}
			title={score ? `Оценка тональности: ${(score * 100).toFixed(0)}%` : label}
		>
			{showIcon && icon}
			<span>{label}</span>
		</span>
	);
};

// ============================================================================
// 9. ProactiveAlertCardView (Red Emergency & Clinical Alerts)
// ============================================================================

export interface ProactiveAlertCardViewProps {
	alert: ProactiveAlertCardData;
	onDismiss?: ((alertId: string) => void) | undefined;
	onExecuteAction?:
		| ((action: ProactiveAlertCardData["actions"][0]) => void)
		| undefined;
	onSendPrompt?: ((prompt: string) => void) | undefined;
}

export const ProactiveAlertCardView: React.FC<ProactiveAlertCardViewProps> = ({
	alert,
	onDismiss,
	onExecuteAction,
	onSendPrompt,
}) => {
	const isCritical = alert.urgency === "CRITICAL";
	const isUrgent = alert.urgency === "URGENT";

	const handleActionClick = (act: ProactiveAlertCardData["actions"][0]) => {
		if (onExecuteAction) {
			onExecuteAction(act);
		}
		if (act.prompt && onSendPrompt) {
			onSendPrompt(act.prompt);
		}
	};

	return (
		<div
			className={`copilot-gen-card copilot-proactive-card ${isCritical ? "critical" : isUrgent ? "urgent" : "normal"}`}
			data-testid="copilot-proactive-alert-card"
			role="alert"
		>
			{/* Header */}
			<div className="copilot-proactive-header">
				<div className="copilot-proactive-badge">
					{isCritical ? (
						<Flame size={18} className="animate-pulse" />
					) : isUrgent ? (
						<AlertTriangle size={18} />
					) : (
						<Zap size={18} />
					)}
				</div>

				<div className="copilot-proactive-title-block">
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<h4 className="copilot-proactive-title">{alert.title}</h4>
						<span
							className={`copilot-urgency-pill ${isCritical ? "critical" : isUrgent ? "urgent" : "normal"}`}
						>
							{isCritical ? "Критично (0-Click)" : isUrgent ? "Срочно" : "Инфо"}
						</span>
					</div>
					{alert.subtitle && (
						<div className="copilot-proactive-subtitle">{alert.subtitle}</div>
					)}
				</div>

				{onDismiss && (
					<button
						type="button"
						className="copilot-proactive-dismiss-btn"
						onClick={() => onDismiss(alert.id)}
						title="Скрыть оповещение"
					>
						<XCircle size={16} />
					</button>
				)}
			</div>

			{/* Description */}
			<div className="copilot-proactive-body">
				<p className="copilot-proactive-desc">{alert.description}</p>
				{alert.patientPhone && (
					<div className="copilot-proactive-patient-meta">
						<Phone size={12} />
						<span>{alert.patientPhone}</span>
						{alert.patientName && <span>• {alert.patientName}</span>}
					</div>
				)}
			</div>

			{/* 1-Click Action Buttons Strip */}
			{alert.actions && alert.actions.length > 0 && (
				<div className="copilot-proactive-actions">
					{alert.actions.map((act) => {
						const isDanger = act.kind === "danger";
						const isPrimary = act.kind === "primary";
						return (
							<button
								key={act.id}
								type="button"
								className={`copilot-proactive-action-btn ${isDanger ? "danger" : isPrimary ? "primary" : "secondary"}`}
								onClick={() => handleActionClick(act)}
							>
								<span>{act.label}</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};

// ============================================================================
// 10. WhatsAppApprovalCardView (Human-in-the-Loop 1-Click Approval)
// ============================================================================

export interface WhatsAppApprovalCardViewProps {
	card: WhatsAppApprovalCard;
	onApprove?:
		| ((approvalId: string, modifiedReply?: string) => void)
		| undefined;
	onReject?: ((approvalId: string, reason?: string) => void) | undefined;
	onSendPrompt?: ((prompt: string) => void) | undefined;
}

export const WhatsAppApprovalCardView: React.FC<
	WhatsAppApprovalCardViewProps
> = ({ card, onApprove, onReject, onSendPrompt }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [draftText, setDraftText] = useState(card.draftReply);
	const [isApproved, setIsApproved] = useState(
		card.status === "approved" || card.status === "sent",
	);
	const [isRejected, setIsRejected] = useState(card.status === "rejected");

	const handleApprove = () => {
		setIsApproved(true);
		if (onApprove) {
			onApprove(
				card.approvalId,
				draftText !== card.draftReply ? draftText : undefined,
			);
		}
	};

	const handleReject = () => {
		setIsRejected(true);
		if (onReject) {
			onReject(card.approvalId);
		}
	};

	const handleDiscuss = () => {
		if (onSendPrompt) {
			onSendPrompt(
				`По поводу сообщения пациента ${card.patientName} (${card.phone}): "${card.incomingSnippet}". Как лучше ответить?`,
			);
		}
	};

	return (
		<div
			className={`copilot-gen-card copilot-hitl-card ${isApproved ? "approved" : isRejected ? "rejected" : ""}`}
			data-testid="copilot-whatsapp-approval-card"
		>
			{/* Header */}
			<div className="copilot-hitl-header">
				<div className="copilot-hitl-channel-badge">
					<MessageCircle size={16} />
					<span>WhatsApp HitL</span>
				</div>

				<div className="flex items-center gap-2">
					<span className="copilot-hitl-confidence">
						ИИ Точность: {((card.confidenceScore || 0.9) * 100).toFixed(0)}%
					</span>
					<span
						className={`copilot-urgency-pill ${card.urgency === "CRITICAL" ? "critical" : card.urgency === "URGENT" ? "urgent" : "normal"}`}
					>
						{card.urgency}
					</span>
				</div>
			</div>

			{/* Patient Info */}
			<div className="copilot-hitl-patient-row">
				<div className="copilot-hitl-patient-name">
					<User size={13} />
					<span>{card.patientName}</span>
				</div>
				<div className="copilot-hitl-patient-phone">
					<Phone size={12} />
					<span>{card.phone}</span>
				</div>
			</div>

			{/* Incoming Message Snippet */}
			<div className="copilot-hitl-snippet-box">
				<div className="copilot-hitl-snippet-label">Пациент написал:</div>
				<p className="copilot-hitl-snippet-text">"{card.incomingSnippet}"</p>
			</div>

			{/* AI Draft Response */}
			<div className="copilot-hitl-draft-box">
				<div className="flex items-center justify-between gap-2 mb-1">
					<div className="copilot-hitl-draft-label">
						<Sparkles size={13} className="text-[var(--teal)]" />
						<span>Сформированный ответ клиники:</span>
					</div>
					{!isApproved && !isRejected && (
						<button
							type="button"
							className="copilot-hitl-edit-toggle"
							onClick={() => setIsEditing(!isEditing)}
						>
							<Edit3 size={12} />
							<span>{isEditing ? "Готово" : "Править"}</span>
						</button>
					)}
				</div>

				{isEditing ? (
					<textarea
						className="copilot-hitl-textarea"
						value={draftText}
						onChange={(e) => setDraftText(e.target.value)}
						rows={3}
					/>
				) : (
					<div className="copilot-hitl-draft-text">{draftText}</div>
				)}
			</div>

			{/* 1-Click Action Footer */}
			<div className="copilot-hitl-actions">
				{isApproved ? (
					<div className="copilot-hitl-success-banner">
						<CheckCircle2 size={16} className="text-[var(--green)]" />
						<span>Сообщение одобрено и отправлено пациенту</span>
					</div>
				) : isRejected ? (
					<div className="copilot-hitl-rejected-banner">
						<XCircle size={16} className="text-[var(--muted)]" />
						<span>Черновик отклонён</span>
					</div>
				) : (
					<div className="copilot-hitl-btn-group">
						<button
							type="button"
							className="copilot-hitl-approve-btn"
							onClick={handleApprove}
							title="Отправить сообщение в WhatsApp в 1 клик"
						>
							<Send size={14} />
							<span>Одобрить и отправить (1 клик)</span>
						</button>

						<button
							type="button"
							className="copilot-hitl-reject-btn"
							onClick={handleReject}
							title="Отклонить отправку сообщения"
						>
							<XCircle size={14} />
							<span>Отклонить</span>
						</button>

						<button
							type="button"
							className="copilot-hitl-discuss-btn"
							onClick={handleDiscuss}
							title="Обсудить с Copilot"
						>
							<Sparkles size={14} />
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

// ============================================================================
// 11. ZtlAlertCardView (Dental Lab Ready & Delay Alerts)
// ============================================================================

export interface ZtlAlertCardViewProps {
	card: ZtlAlertCard;
	onBookFitting?:
		| ((patientId: string, tooth?: string | number) => void)
		| undefined;
	onSendPrompt?: ((prompt: string) => void) | undefined;
}

export const ZtlAlertCardView: React.FC<ZtlAlertCardViewProps> = ({
	card,
	onBookFitting,
	onSendPrompt,
}) => {
	const isReady = card.status === "ready";

	const handleBook = () => {
		if (onBookFitting) {
			onBookFitting(card.patientId, card.tooth);
		} else if (onSendPrompt) {
			onSendPrompt(
				`Записать пациента ${card.patientName} на примерку конструкции ${card.prosthesisType} (зуб #${card.tooth || "N/A"}).`,
			);
		}
	};

	return (
		<div
			className={`copilot-gen-card copilot-ztl-card ${isReady ? "ready" : "delayed"}`}
			data-testid="copilot-ztl-card"
		>
			<div className="copilot-ztl-header">
				<div className="copilot-ztl-icon">
					<Layers size={18} />
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div className="flex items-center justify-between gap-2">
						<h4 className="copilot-ztl-title">
							ЗТЛ #{card.orderNumber}: {card.prosthesisType}
						</h4>
						<span className={`copilot-ztl-status-pill ${card.status}`}>
							{isReady
								? "Готово к установке"
								: card.status === "delayed"
									? "Задержка ЗТЛ"
									: "В работе"}
						</span>
					</div>
					<div className="copilot-ztl-meta">
						<span>
							Пациент: <strong>{card.patientName}</strong>
						</span>
						{card.tooth && <span>• Зуб FDI #{card.tooth}</span>}
						<span>• Лаборатория: {card.labName}</span>
					</div>
				</div>
			</div>

			{card.warning && (
				<div className="copilot-ztl-warning">
					<AlertTriangle
						size={14}
						className="text-[var(--rust)] flex-shrink-0"
					/>
					<span>{card.warning}</span>
				</div>
			)}

			<div className="copilot-ztl-actions">
				{isReady ? (
					<button
						type="button"
						className="copilot-ztl-book-btn"
						onClick={handleBook}
					>
						<Calendar size={14} />
						<span>Записать на примерку / фиксацию (1 клик)</span>
					</button>
				) : (
					<button
						type="button"
						className="copilot-ztl-secondary-btn"
						onClick={() =>
							onSendPrompt?.(
								`Уточнить статус наряда ЗТЛ #${card.orderNumber} у лаборатории ${card.labName}`,
							)
						}
					>
						<Clock size={14} />
						<span>Запросить статус у ЗТЛ</span>
					</button>
				)}
			</div>
		</div>
	);
};

// ============================================================================
// 12. GapFillerCardView (Schedule Optimization)
// ============================================================================

export interface GapFillerCardViewProps {
	card: GapFillerCard;
	onInvitePatient?: ((patient: GapFillerPatientOption) => void) | undefined;
	onSendPrompt?: ((prompt: string) => void) | undefined;
}

export const GapFillerCardView: React.FC<GapFillerCardViewProps> = ({
	card,
	onInvitePatient,
	onSendPrompt,
}) => {
	const topCandidate = card.suggestedPatients[0];

	return (
		<div
			className="copilot-gen-card copilot-gap-card"
			data-testid="copilot-gap-filler-card"
		>
			<div className="copilot-gap-header">
				<div className="copilot-gap-icon">
					<Zap size={18} />
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<h4 className="copilot-gap-title">
						Свободное окно: {card.date} ({card.timeRange})
					</h4>
					<div className="copilot-gap-subtitle">
						Врач: {card.doctorName} {card.cabinet ? `• ${card.cabinet}` : ""}
					</div>
				</div>
			</div>

			{/* Suggested candidates list */}
			<div className="copilot-gap-candidates-list">
				<div className="copilot-gap-candidates-label">
					Рекомендованные пациенты из листа ожидания:
				</div>
				{card.suggestedPatients.map((pat, idx) => (
					<div key={pat.id} className="copilot-gap-candidate-row">
						<div className="copilot-gap-cand-info">
							<span className="copilot-gap-cand-name">{pat.name}</span>
							<span className="copilot-gap-cand-reason">{pat.reason}</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="copilot-gap-cand-score">
								{(pat.matchScore * 100).toFixed(0)}% Match
							</span>
							<button
								type="button"
								className="copilot-gap-invite-btn"
								onClick={() => {
									if (onInvitePatient) onInvitePatient(pat);
									else if (onSendPrompt)
										onSendPrompt(
											`Пригласить пациента ${pat.name} на окно ${card.date} ${card.timeRange}`,
										);
								}}
							>
								<Send size={12} />
								<span>Пригласить</span>
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

// ============================================================================
// 13. RetentionSummaryCardView (Patient Retention & Recall Campaigns)
// ============================================================================

export interface RetentionSummaryCardViewProps {
	card: RetentionSummaryCard;
	onLaunchCampaign?: ((summaryId: string) => void) | undefined;
	onSendPrompt?: ((prompt: string) => void) | undefined;
}

export const RetentionSummaryCardView: React.FC<
	RetentionSummaryCardViewProps
> = ({ card, onLaunchCampaign, onSendPrompt }) => {
	return (
		<div
			className="copilot-gen-card copilot-retention-card"
			data-testid="copilot-retention-card"
		>
			<div className="copilot-retention-header">
				<div className="copilot-retention-icon">
					<Users size={18} />
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<h4 className="copilot-retention-title">{card.cohortName}</h4>
					<div className="copilot-retention-meta">
						<span>
							<strong>{card.atRiskCount}</strong> пациентов без визитов
						</span>
						<span>
							• Потенциал:{" "}
							<strong>
								{card.potentialRevenueRub.toLocaleString("ru-RU")} ₽
							</strong>
						</span>
					</div>
				</div>
			</div>

			<p className="copilot-retention-campaign-desc">
				Кампания: <strong>"{card.suggestedCampaign}"</strong>. Рассылка
				персонализированных напоминаний через WhatsApp/Telegram.
			</p>

			<div className="copilot-retention-actions">
				<button
					type="button"
					className="copilot-retention-launch-btn"
					onClick={() => {
						if (onLaunchCampaign) onLaunchCampaign(card.summaryId);
						else if (onSendPrompt)
							onSendPrompt(
								`Запустить кампанию удержания "${card.cohortName}" на ${card.atRiskCount} пациентов.`,
							);
					}}
				>
					<Zap size={14} />
					<span>Запустить кампанию в 1 клик</span>
				</button>
			</div>
		</div>
	);
};

// ============================================================================
// 14. EmrDraftCardView (Form 043/u Sync)
// ============================================================================

export interface EmrDraftCardViewProps {
	card: EmrDraftCard;
	onApplyDiary?: ((card: EmrDraftCard) => void) | undefined;
	onSendPrompt?: ((prompt: string) => void) | undefined;
}

export const EmrDraftCardView: React.FC<EmrDraftCardViewProps> = ({
	card,
	onApplyDiary,
	onSendPrompt,
}) => {
	return (
		<div
			className="copilot-gen-card copilot-emr-card"
			data-testid="copilot-emr-draft-card"
		>
			<div className="copilot-emr-header">
				<div className="copilot-emr-icon">
					<FileText size={18} />
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<h4 className="copilot-emr-title">
						Дневник 043/у: {card.patientName}
					</h4>
					<div className="copilot-emr-meta">
						<span>
							Диагноз: <strong>{card.diagnosis}</strong>{" "}
							{card.icd10 ? `(${card.icd10})` : ""}
						</span>
						{card.tooth && <span>• Зуб FDI #{card.tooth}</span>}
					</div>
				</div>
			</div>

			<div className="copilot-emr-diary-preview">
				<div className="copilot-emr-diary-label">Текст протокола:</div>
				<p className="copilot-emr-diary-text">{card.proposedDiary}</p>
			</div>

			<div className="copilot-emr-actions">
				<button
					type="button"
					className="copilot-emr-apply-btn"
					onClick={() => {
						if (onApplyDiary) onApplyDiary(card);
						else if (onSendPrompt)
							onSendPrompt(
								`Сохранить протокол 043/у для пациента ${card.patientName}: "${card.proposedDiary}"`,
							);
					}}
				>
					<CheckSquare size={14} />
					<span>Внести в карту 043/у (1 клик)</span>
				</button>
			</div>
		</div>
	);
};
