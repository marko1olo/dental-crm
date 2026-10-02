import {
	Activity,
	Calendar,
	CheckCircle2,
	Clock,
	FileText,
	Lock,
	Palette,
	Pill,
	Printer,
	Scan,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	User,
	X,
	ArrowRight,
	Save,
} from "lucide-react";
import type React from "react";
import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import type { DiaryState } from "../useVisitDiaryLogic";
import { AppointmentModal } from "../schedule/AppointmentModal";
import type { Appointment } from "@dental/shared";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import { PremiumDocumentPrintSheet } from "../documents/PremiumDocumentPrintSheet";
import {
	EmrProtocolGeneratorModal,
	type VisitDiaryEntry043,
	type FdiToothRecord,
	type ToothSurface,
} from "../emr";
import { useVisitCompletion } from "./useVisitCompletion";
import { logger } from "../../utils/logger";
import {
	type RadiologySnapshotItem,
	VisitSummaryRadiologyGallery,
	RadiologyZoomLightbox,
} from "./VisitSummaryRadiologyGallery";
import { VisitSummaryDiarySections } from "./VisitSummaryDiarySections";
import { PatientMemoPrintModal } from "./PatientMemoPrintModal";

export {
	type RadiologySnapshotItem,
	VisitSummaryRadiologyGallery,
	RadiologyZoomLightbox,
} from "./VisitSummaryRadiologyGallery";
export { VisitSummaryDiarySections } from "./VisitSummaryDiarySections";


export interface VisitSummaryModalProps {
	isOpen: boolean;
	onClose: () => void;
	patient: {
		id?: string;
		fullName?: string | null;
		firstName?: string | null;
		lastName?: string | null;
		middleName?: string | null;
		birthDate?: string | null;
		dateOfBirth?: string | null;
		cardNumber?: string | null;
		medicalCardNumber?: string | null;
		chartNumber?: string | null;
		phone?: string | null;
		address?: string | null;
		administrativeProfile?: {
			identityDocument?: string | null;
			insurancePolicyNumber?: string | null;
			omsPolis?: string | null;
			snils?: string | null;
			registrationAddress?: string | null;
			residentialAddress?: string | null;
		} | null;
		identityDocument?: string | null;
		passport?: string | null;
		insurancePolicyNumber?: string | null;
		omsPolis?: string | null;
		snils?: string | null;
	} | null;
	diary: DiaryState;
	doctorName?: string | null;
	doctorSpecialty?: string | null;
	lockedAt?: string | null;
	diaryHash?: string | null;
	hasCryptoSignature?: boolean;
	isLocked?: boolean;
	teethData?: readonly {
		toothNumber: number;
		state: string;
		surfaces?: readonly string[] | null;
	}[];
	radiologySnapshots?: readonly RadiologySnapshotItem[];
	onPrint?: () => void;
	onOpenPrescription?: () => void;
	onOpenRadiologyReferral?: () => void;
	onOpenEgiszExport?: () => void;
	onApplySynthesizedDiary?: (diary: VisitDiaryEntry043) => void;
	onOpenProtocolGenerator?: () => void;
	onScheduleNextVisit?: () => void;
	onCompleteVisit?: () => void;
}

function formatPatientFullName(
	p: VisitSummaryModalProps["patient"],
): string {
	if (!p) return "—";
	if (typeof p.fullName === "string" && p.fullName.trim())
		return p.fullName.trim();
	const parts = [p.lastName, p.firstName, p.middleName]
		.map((x) => (typeof x === "string" ? x.trim() : ""))
		.filter(Boolean);
	return parts.length ? parts.join(" ") : "—";
}

export const VisitSummaryModal: React.FC<VisitSummaryModalProps> = ({
	isOpen,
	onClose,
	patient,
	diary,
	doctorName,
	doctorSpecialty,
	lockedAt,
	diaryHash,
	hasCryptoSignature,
	isLocked,
	teethData = [],
	radiologySnapshots = [],
	onPrint,
	onOpenPrescription,
	onOpenRadiologyReferral,
	onOpenEgiszExport,
	onApplySynthesizedDiary,
	onOpenProtocolGenerator,
	onScheduleNextVisit,
	onCompleteVisit,
}) => {
	const appLogic = useAppLogicContext() as any;
	const [isNextStageModalOpen, setIsNextStageModalOpen] = useState(false);
	const [nextVisitDraft, setNextVisitDraft] = useState<Appointment | null>(null);
	const [zoomImage, setZoomImage] = useState<{
		url: string;
		title?: string;
	} | null>(null);
	const [isProtocolGeneratorOpen, setIsProtocolGeneratorOpen] = useState(false);
	const [synthesizedDiaryPreview, setSynthesizedDiaryPreview] = useState<VisitDiaryEntry043 | null>(null);
	const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);

	const mappedOdontogramTeeth = useMemo<FdiToothRecord[]>(() => {
		return (teethData ?? []).map((t) => ({
			toothNumber: t.toothNumber,
			statusCode: (t.state as any) || "healthy",
			surfaces: (t.surfaces as ToothSurface[]) || [],
			mobility: "none",
			furcationInvolvement: "none",
		}));
	}, [teethData]);


	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (zoomImage) {
					setZoomImage(null);
				} else {
					onClose();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose, zoomImage]);

	const formattedPatientName = useMemo(() => {
		return patient ? formatPatientFullName(patient) : "Пациент";
	}, [patient]);

	const { completeVisit, isCompleting } = useVisitCompletion({
		visitId: appLogic?.activeVisitId,
		patientId: patient?.id,
		patientName: formattedPatientName,
		patientPhone: patient?.phone || "",
		doctorName: doctorName || appLogic?.activeDoctor?.fullName,
		doctorSpecialty: doctorSpecialty || appLogic?.activeDoctor?.specialties?.[0],
		diary,
		completedPlanItems: appLogic?.activeTreatmentPlanItems || [],
	});

	if (!isOpen || typeof document === "undefined") return null;

	const patientName = formatPatientFullName(patient);
	const patientBirth =
		typeof patient?.birthDate === "string" && patient.birthDate
			? patient.birthDate
			: typeof patient?.dateOfBirth === "string" && patient.dateOfBirth
				? patient.dateOfBirth
				: "";
	const patientCard =
		typeof patient?.cardNumber === "string" && patient.cardNumber
			? patient.cardNumber
			: typeof patient?.medicalCardNumber === "string" &&
					patient.medicalCardNumber
				? patient.medicalCardNumber
				: typeof patient?.chartNumber === "string" && patient.chartNumber
					? patient.chartNumber
					: "";

	const patientPassport =
		typeof patient?.administrativeProfile?.identityDocument === "string" &&
		patient.administrativeProfile.identityDocument.trim()
			? patient.administrativeProfile.identityDocument.trim()
			: typeof patient?.passport === "string" && patient.passport.trim()
				? patient.passport.trim()
				: typeof patient?.identityDocument === "string" &&
						patient.identityDocument.trim()
					? patient.identityDocument.trim()
					: "";

	const patientOms =
		typeof patient?.administrativeProfile?.omsPolis === "string" &&
		patient.administrativeProfile.omsPolis.trim()
			? patient.administrativeProfile.omsPolis.trim()
			: typeof patient?.administrativeProfile?.insurancePolicyNumber ===
						"string" &&
					patient.administrativeProfile.insurancePolicyNumber.trim()
				? patient.administrativeProfile.insurancePolicyNumber.trim()
				: typeof patient?.omsPolis === "string" && patient.omsPolis.trim()
					? patient.omsPolis.trim()
					: typeof patient?.insurancePolicyNumber === "string" &&
							patient.insurancePolicyNumber.trim()
						? patient.insurancePolicyNumber.trim()
						: "";

	const patientSnils =
		typeof patient?.administrativeProfile?.snils === "string" &&
		patient.administrativeProfile.snils.trim()
			? patient.administrativeProfile.snils.trim()
			: typeof patient?.snils === "string" && patient.snils.trim()
				? patient.snils.trim()
				: "";


	const abnormalTeeth = (teethData ?? []).filter((t) => {
		const s = (t.state || "").toLowerCase();
		return s !== "healthy" && s !== "" && s !== "0";
	});

	// Anti-Matryoshka (Sin 6, Mandate 8d): Render sequentially with depth strictly 1.
	// When protocol generator or next stage appointment modal is open, do NOT stack dialogs on top of each other.
	if (isProtocolGeneratorOpen) {
		return (
			<EmrProtocolGeneratorModal
				isOpen={true}
				onClose={() => setIsProtocolGeneratorOpen(false)}
				patientFullName={patientName !== "—" ? patientName : undefined}
				patientBirthDate={patientBirth || undefined}
				medicalCardNumber={patientCard || undefined}
				initialToothNumber={diary.diagnosisTooth || (abnormalTeeth[0] ? String(abnormalTeeth[0].toothNumber) : undefined)}
				initialIcd10Code={diary.diagnosisIcd10 || undefined}
				initialSurfaces={(abnormalTeeth[0]?.surfaces as ToothSurface[]) || undefined}
				doctorFullName={doctorName !== "—" ? (doctorName ?? undefined) : undefined}
				doctorSpecialty={doctorSpecialty ?? undefined}
				odontogramTeeth={mappedOdontogramTeeth}
				onApplyDiary={(synthesized) => {
					setSynthesizedDiaryPreview(synthesized);
					if (onApplySynthesizedDiary) {
						onApplySynthesizedDiary(synthesized);
					}
					setIsProtocolGeneratorOpen(false);
				}}
			/>
		);
	}

	if (isNextStageModalOpen) {
		return (
			<AppointmentModal
				isOpen={true}
				appointment={nextVisitDraft}
				dashboard={appLogic?.dashboard || { patients: [patient].filter(Boolean), clinicSettings: { staff: [], chairs: [] } }}
				onClose={() => setIsNextStageModalOpen(false)}
				onSave={async (appointmentId, draft) => {
					try {
						const res = await fetch("/api/appointments", {
							method: "POST",
							headers: appLogic?.auth?.scheduleMutationHeaders
								? appLogic.auth.scheduleMutationHeaders({ "Content-Type": "application/json" })
								: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
							body: JSON.stringify({
								patientId: draft.patientId,
								doctorUserId: draft.doctorUserId,
								assistantUserId: draft.assistantUserId,
								chairId: draft.chairId,
								startsAt: draft.startsAt,
								endsAt: draft.endsAt,
								status: draft.status,
								reason: draft.reason,
								comment: draft.comment,
								clientMutationId: `next-visit-${Date.now()}`,
							}),
						});
						if (!res.ok) {
							showToast("Не удалось записать пациента на прием", "error");
							return false;
						}
						const nextDash = await res.json();
						if (appLogic?.setDashboard) appLogic.setDashboard(nextDash);
						showToast("Пациент успешно записан на следующий этап!", "success", 4000);
						setIsNextStageModalOpen(false);
						return true;
					} catch {
						showToast("Ошибка сохранения записи", "error");
						return false;
					}
				}}
				patientName={(patients, pid) => {
					const found = (patients || []).find((p: any) => p.id === pid);
					return found?.fullName || patientName || "Пациент";
				}}
				formatTime={(iso) => (iso ? iso.slice(11, 16) : "10:00")}
				toDateTimeLocalValue={(iso) => {
					if (!iso) return "";
					return iso.slice(0, 16);
				}}
				fromDateTimeLocalValue={(val) => {
					if (!val) return new Date().toISOString();
					return new Date(val).toISOString();
				}}
				appointmentLabels={{
					planned: "Запланирован",
					confirmed: "Подтвержден",
					arrived: "Пришел",
					in_treatment: "В кресле",
					completed: "Завершен",
					cancelled: "Отменен",
					no_show: "Не явился",
				}}
				activeVisitLockedAppointmentStatuses={new Set()}
			/>
		);
	}

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Клиническая сводка приёма"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xl overflow-hidden">
				{/* Modal Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--line)]">
							<Activity className="w-5 h-5" />
						</div>
						<div>
							<h3 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
								Клиническая сводка приёма
								{isLocked ? (
									<span className="inline-flex items-center gap-1 px-3 py-1 min-h-[32px] sm:min-h-[44px] rounded-full text-xs font-semibold bg-[var(--teal-surface)] text-[var(--teal-dark)] border border-[var(--teal)] min-w-0 break-words">
										<Lock className="w-3 h-3 shrink-0" />
										<span className="min-w-0 break-words">Подписано в карте</span>
									</span>
								) : (
									<span className="inline-flex items-center gap-1 px-3 py-1 min-h-[32px] sm:min-h-[44px] rounded-full text-xs font-semibold bg-[var(--amber-soft,rgba(217,119,6,0.12))] text-[var(--amber,#b45309)] border border-[var(--amber,#b45309)] min-w-0 break-words">
										<Clock className="w-3 h-3 shrink-0" />
										<span className="min-w-0 break-words">Черновик</span>
									</span>
								)}
							</h3>
							<p className="text-xs text-[var(--muted)]">
								{patientName} {patientCard ? `· Карта № ${patientCard}` : ""}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors cursor-pointer"
						aria-label="Закрыть сводку"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Modal Scrollable Content */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Step-by-Step Guidance Ribbon & Autosave Status */}
					<div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs flex-wrap">
						<div className="flex items-center gap-1.5 font-bold text-[var(--teal,var(--brand-primary))]">
							<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] text-xs font-bold">1</span>
							<span>Шаг 1: Проверка диагноза и данных</span>
						</div>
						<ArrowRight size={12} className="text-[var(--muted)]" />
						<div className="flex items-center gap-1.5 font-bold text-[var(--teal,var(--brand-primary))]">
							<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] text-xs font-bold">2</span>
							<span>Шаг 2: Дневник приёма (1 клик)</span>
						</div>
						<ArrowRight size={12} className="text-[var(--muted)]" />
						<div className="flex items-center gap-1.5 font-bold text-[var(--ok-fg)]">
							<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ok-fg)] text-white text-xs font-bold">3</span>
							<span>Шаг 3: Печать медицинской карты</span>
						</div>
						<div className="ml-auto flex items-center gap-2">
							<button
								type="button"
								onClick={() => {
									if (onScheduleNextVisit) {
										onScheduleNextVisit();
									} else {
										const d = new Date();
										d.setDate(d.getDate() + 5);
										d.setHours(10, 0, 0, 0);
										const draft: Appointment = {
											id: `new-stage-${Date.now()}`,
											organizationId: appLogic?.dashboard?.activeVisit?.organizationId || "org-1",
											patientId: patient?.id || "",
											doctorUserId: (appLogic?.dashboard?.clinicSettings?.staff || []).find((s: any) => s.active && (s.role === "doctor" || s.role === "owner"))?.id || "",
											assistantUserId: null,
											chairId: (appLogic?.dashboard?.clinicSettings?.chairs || []).find((c: any) => c.active)?.id || "",
											startsAt: d.toISOString(),
											endsAt: new Date(d.getTime() + 45 * 60 * 1000).toISOString(),
											status: "planned",
											reason: `Следующий этап лечения: ${diary.diagnosisIcd10 || "Стоматологический приём"}`,
											comment: `Назначено из сводки визита от ${new Date().toLocaleDateString("ru-RU")}`,
										};
										setNextVisitDraft(draft);
										setIsNextStageModalOpen(true);
									}
								}}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-xs transition-all cursor-pointer touch-manipulation active:scale-95"
								title="Записать пациента на следующий этап через 5-7 дней"
								data-testid="ribbon-schedule-next-stage-btn"
							>
								<Calendar size={14} />
								<span>Записать на след. этап (+5 дней)</span>
							</button>
							<div className="flex items-center gap-1 text-[var(--muted)] text-xs">
								<Save size={12} className="text-[var(--ok-fg)]" />
								<span>Автосохранено</span>
							</div>
						</div>
					</div>

					{/* Patient & Doctor Meta Grid */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs">
						<div className="space-y-1">
							<div className="flex items-center gap-1.5 text-[var(--muted)] font-medium">
								<User className="w-3.5 h-3.5 text-[var(--teal)]" /> Пациент:
							</div>
							<div className="font-semibold text-sm text-[var(--ink)]">
								{patientName}
							</div>
							<div className="grid grid-cols-1 gap-1 text-[var(--muted)] pt-0.5">
								{patientBirth ? (
									<div>
										<span className="font-medium text-[var(--ink)]">Дата рождения:</span> {patientBirth}
									</div>
								) : null}
								{patientCard ? (
									<div>
										<span className="font-medium text-[var(--ink)]">№ медкарты:</span> {patientCard}
									</div>
								) : null}
								{patientPassport ? (
									<div>
										<span className="font-medium text-[var(--ink)]">Паспорт:</span> {patientPassport}
									</div>
								) : null}
								{patientOms ? (
									<div>
										<span className="font-medium text-[var(--ink)]">Полис ОМС/ДМС:</span> {patientOms}
									</div>
								) : null}
								{patientSnils ? (
									<div>
										<span className="font-medium text-[var(--ink)]">СНИЛС:</span> {patientSnils}
									</div>
								) : null}
							</div>
						</div>
						<div className="space-y-1">
							<div className="flex items-center gap-1.5 text-[var(--muted)] font-medium">
								<Stethoscope className="w-3.5 h-3.5 text-[var(--teal)]" /> Лечащий врач:
							</div>
							<div className="font-semibold text-sm text-[var(--ink)]">
								{doctorName || "—"}
							</div>
							{doctorSpecialty ? (
								<div className="text-[var(--muted)]">
									Специальность: {doctorSpecialty}
								</div>
							) : null}
						</div>
					</div>

					{/* Clinical Protocols Badges */}
					{(diary.statusLocalis?.includes("ПРОТОКОЛ ПАРОДОНТОЛОГИЧЕСКОГО") ||
						diary.diagnosisIcd10?.startsWith("K05") ||
						diary.statusLocalis?.includes("ПРОТОКОЛ ДЕТСКОГО") ||
						diary.statusLocalis?.includes("Кариограмм")) && (
						<div className="flex flex-wrap gap-2 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
							{(diary.statusLocalis?.includes("ПРОТОКОЛ ПАРОДОНТОЛОГИЧЕСКОГО") ||
								diary.diagnosisIcd10?.startsWith("K05")) && (
								<span
									className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-[var(--ok-bg)] text-[var(--ok-fg)] border border-[var(--ok-fg)]/30 text-xs font-semibold min-w-0 break-words"
									data-testid="summary-badge-perio"
								>
									<Activity className="w-3.5 h-3.5 text-[var(--ok-fg)] shrink-0" />
									<span className="min-w-0 break-words">Пародонтологический протокол (PSR + AAP/EFP 2018)</span>
								</span>
							)}
							{(diary.statusLocalis?.includes("ПРОТОКОЛ ДЕТСКОГО") ||
								diary.statusLocalis?.includes("Кариограмм")) && (
								<span
									className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-semibold min-w-0 break-words"
									data-testid="summary-badge-pediatric"
								>
									<Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
									<span className="min-w-0 break-words">Сменный прикус & Кариограмма Bratthall</span>
								</span>
							)}
						</div>
					)}

					{/* Odontogram Abnormalities Summary */}
					{abnormalTeeth.length > 0 && (
						<div className="space-y-2">
							<h4 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
								<Activity className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" /> Зубная формула ({abnormalTeeth.length}{" "}
								{abnormalTeeth.length === 1 ? "зуб" : "зубов"} с отметками)
							</h4>
							<div className="flex flex-wrap gap-2">
								{abnormalTeeth.map((t) => (
									<div
										key={t.toothNumber}
										className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs min-w-0 break-words"
									>
										<span className="font-bold text-[var(--ink)] shrink-0">
											Зуб {t.toothNumber}:
										</span>
										<span className="text-[var(--teal-dark)] font-medium min-w-0 break-words">
											{t.state}
										</span>
										{t.surfaces && t.surfaces.length > 0 ? (
											<span className="text-[var(--muted)] min-w-0 break-words">
												({t.surfaces.join(", ")})
											</span>
										) : null}
									</div>
								))}
							</div>
						</div>
					)}

					{/* 1-Click EMR Form 043/u Clinical Diary Synthesis Quick Banner */}
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-[var(--teal,var(--line))]/30 bg-[var(--teal-surface)]">
						<div className="flex items-center gap-3">
							<div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] shadow-sm shrink-0">
								<Sparkles className="w-5 h-5" />
							</div>
							<div>
								<div className="font-bold text-sm text-[var(--ink)]">
									1-Click Синтез дневника по МКБ-10 и формуле
								</div>
								<div className="text-xs text-[var(--muted)]">
									Автозаполнение жалоб (S), статуса (O), диагноза (A) и протокола (P) по клиническим стандартам СтАР
								</div>
							</div>
						</div>
						<button
							type="button"
							onClick={() => {
								if (onScheduleNextVisit) {
									onClose();
									onScheduleNextVisit();
								} else {
									const d = new Date();
									d.setDate(d.getDate() + 5);
									d.setHours(10, 0, 0, 0);
									const draft: Appointment = {
										id: `new-stage-${Date.now()}`,
										organizationId: appLogic?.dashboard?.activeVisit?.organizationId || "org-1",
										patientId: patient?.id || "",
										doctorUserId: (appLogic?.dashboard?.clinicSettings?.staff || []).find((s: any) => s.active && (s.role === "doctor" || s.role === "owner"))?.id || "",
										assistantUserId: null,
										chairId: (appLogic?.dashboard?.clinicSettings?.chairs || []).find((c: any) => c.active)?.id || "",
										startsAt: d.toISOString(),
										endsAt: new Date(d.getTime() + 45 * 60 * 1000).toISOString(),
										status: "planned",
										reason: `Следующий этап лечения: ${diary.diagnosisIcd10 || "Стоматологический приём"}`,
										comment: `Назначено из сводки визита от ${new Date().toLocaleDateString("ru-RU")}`,
									};
									setNextVisitDraft(draft);
									setIsNextStageModalOpen(true);
								}
							}}
							className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-extrabold shadow-md transition-all cursor-pointer touch-manipulation active:scale-[0.98]"
							title="Записать пациента на следующий этап лечения через 5-7 дней"
							data-testid="summary-schedule-next-stage-btn"
						>
							<Calendar className="w-4 h-4" />
							<span>След. этап (+5 дней)</span>
						</button>
						<button
							type="button"
							onClick={() => {
								if (onOpenProtocolGenerator) {
									onClose();
									onOpenProtocolGenerator();
								} else {
									setIsProtocolGeneratorOpen(true);
								}
							}}
							className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer"
							data-testid="summary-synthesize-protocol-btn"
						>
							<Sparkles className="w-4 h-4" />
							<span>Сформировать дневник по МКБ-10 и формуле</span>
						</button>
						<button
							type="button"
							onClick={() => setIsMemoModalOpen(true)}
							className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer"
							data-testid="summary-quick-memo-btn"
							title="Открыть памятку пациенту с рекомендациями после приёма"
						>
							<FileText className="w-4 h-4" />
							<span>📄 Памятка пациенту</span>
						</button>
					</div>

					{/* Разделы Формы 043/у */}
					<VisitSummaryDiarySections
						diary={diary}
						synthesizedDiaryPreview={synthesizedDiaryPreview}
					/>

					{/* Radiology & 3D Visiograph Snapshots */}
					<VisitSummaryRadiologyGallery
						radiologySnapshots={radiologySnapshots}
						onZoomImage={setZoomImage}
					/>

					{/* Legal Status Stamp */}
					{isLocked && diaryHash ? (
						<div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--teal)] bg-[var(--teal-surface)] text-xs text-[var(--ink)]">
							<ShieldCheck className="w-6 h-6 text-[var(--teal)] shrink-0" />
							<div>
								<div className="font-bold text-sm text-[var(--teal-dark)]">
									{hasCryptoSignature
										? "Документ заверен квалифицированной ЭЦП (УКЭП)"
										: "Дневник заблокирован (SHA-256)"}
								</div>
								<div className="text-[var(--muted)] font-mono">
									SHA-256: {diaryHash}
								</div>
								{lockedAt ? (
									<div className="text-[var(--muted)]">
										Подписано: {new Date(lockedAt).toLocaleString("ru-RU")}
									</div>
								) : null}
							</div>
						</div>
					) : null}
				</div>

				{/* Modal Footer */}
				<div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[var(--line)] bg-[var(--paper-soft)] no-print">
					<button
						type="button"
						onClick={onClose}
						className="inline-flex items-center justify-center px-5 py-2.5 min-h-[48px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-bold hover:bg-[var(--paper-strong)] transition-colors cursor-pointer"
					>
						Закрыть
					</button>
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={() => {
								if (onOpenProtocolGenerator) {
									onClose();
									onOpenProtocolGenerator();
								} else {
									setIsProtocolGeneratorOpen(true);
								}
							}}
							className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl border border-[var(--teal,var(--line))]/40 bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] text-sm font-bold hover:bg-[var(--teal-soft,var(--paper-soft))] transition-colors cursor-pointer"
							title="Сформировать дневник приёма по МКБ-10 и формуле зубов"
							data-testid="summary-open-protocol-generator-btn"
						>
							<Sparkles className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
							<span>Дневник приёма (1 клик)</span>
						</button>
						{onOpenPrescription ? (
							<button
								type="button"
								onClick={() => {
									onClose();
									onOpenPrescription();
								}}
								className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-sm font-bold hover:bg-blue-500/20 transition-colors cursor-pointer"
								data-testid="summary-prescription-btn"
							>
								<Pill className="w-4 h-4" />
								Рецепт (107-1/у)
							</button>
						) : null}
						{onOpenRadiologyReferral ? (
							<button
								type="button"
								onClick={() => {
									onClose();
									onOpenRadiologyReferral();
								}}
								className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl border border-[var(--teal,var(--line))]/30 bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] text-sm font-bold hover:bg-[var(--teal-soft,var(--paper-soft))] transition-colors cursor-pointer"
								data-testid="summary-radiology-btn"
							>
								<Scan className="w-4 h-4" />
								Направление КЛКТ/ОПТГ
							</button>
						) : null}
						{onOpenEgiszExport ? (
							<button
								type="button"
								onClick={() => {
									onClose();
									onOpenEgiszExport();
								}}
								className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl border border-[var(--ok-fg)]/30 bg-[var(--ok-bg)] text-[var(--ok-fg)] text-sm font-bold hover:opacity-90 transition-colors cursor-pointer"
								data-testid="summary-egisz-btn"
							>
								<ShieldCheck className="w-4 h-4" />
								СЭМД ЕГИСЗ
							</button>
						) : null}
						<button
							type="button"
							onClick={() => setIsMemoModalOpen(true)}
							className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-sm font-bold hover:bg-indigo-500/20 transition-colors cursor-pointer"
							data-testid="summary-print-memo-btn"
							title="Распечатать памятку пациенту с рекомендациями после приёма"
						>
							<FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
							<span>📄 Памятка пациенту</span>
						</button>
						<button
							type="button"
							onClick={() => {
								if (onPrint) {
									onClose();
									onPrint();
								} else {
									window.print();
								}
							}}
							className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[48px] rounded-xl bg-[var(--teal)] text-[var(--on-teal,white)] text-sm sm:text-base font-extrabold hover:bg-[var(--teal-dark)] transition-colors shadow-md cursor-pointer"
							data-testid="summary-print-btn"
							title="Печать медицинской карты"
							aria-label="Печать медицинской карты"
						>
							<Printer className="w-4 h-4" />
							Печать медицинской карты
						</button>
						<button
							type="button"
							onClick={async () => {
								try {
									if (onCompleteVisit) {
										await onCompleteVisit();
									} else {
										await completeVisit();
									}
									onClose();
								} catch (err) {
									logger.error("[VisitSummaryModal] Ошибка завершения приёма:", err);
								}
							}}
							disabled={isCompleting}
							className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-base font-black transition-colors shadow-md cursor-pointer disabled:opacity-50"
							data-testid="summary-complete-visit-btn"
							title="Завершить приём и сформировать чек"
						>
							<CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
							<span>{isCompleting ? "Завершаю..." : "Завершить приём"}</span>
						</button>
					</div>
				</div>

				{/* 1-Click Human Post-Op Memo Print Modal */}
				<PatientMemoPrintModal
					isOpen={isMemoModalOpen}
					onClose={() => setIsMemoModalOpen(false)}
					initialMemoId={
						diary.treatmentDescription?.toLowerCase().includes("удален") ||
						diary.diagnosisIcd10?.startsWith("K01")
							? "surgery_extraction"
							: diary.diagnosisIcd10?.startsWith("K04") ||
							  diary.treatmentDescription?.toLowerCase().includes("канал")
							? "endodontics"
							: "anesthesia_caries"
					}
					patient={
						patient
							? {
									fullName: formatPatientFullName(patient),
									birthDate: patient.birthDate || patient.dateOfBirth,
									phone: patient.phone,
									cardNumber:
										patient.cardNumber ||
										patient.medicalCardNumber ||
										patient.chartNumber,
								}
							: null
					}
					doctorName={doctorName}
					doctorSpecialty={doctorSpecialty || "Врач-стоматолог"}
					toothNumber={abnormalTeeth[0]?.toothNumber}
				/>

				{/* Zoom Lightbox In-Modal Overlay (Zero full-screen viewport nesting) */}
				<RadiologyZoomLightbox
					zoomImage={zoomImage}
					onClose={() => setZoomImage(null)}
				/>
			</div>
		</div>,
		document.body,
	);
};
