import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	Clock,
	FileText,
	Lock,
	Pill,
	Printer,
	Scan,
	ShieldCheck,
	Stethoscope,
	User,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { getIcdColor, ICD10_DICTIONARY } from "../../lib/icd10";
import type { DiaryState } from "../useVisitDiaryLogic";

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
	onPrint?: () => void;
	onOpenPrescription?: () => void;
	onOpenRadiologyReferral?: () => void;
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
	onPrint,
	onOpenPrescription,
	onOpenRadiologyReferral,
}) => {
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

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

	const icdEntry = (ICD10_DICTIONARY ?? []).find(
		(i) => i?.code === diary.diagnosisIcd10,
	);

	const abnormalTeeth = (teethData ?? []).filter((t) => {
		const s = (t.state || "").toLowerCase();
		return s !== "healthy" && s !== "" && s !== "0";
	});

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
									<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--teal-surface)] text-[var(--teal-dark)] border border-[var(--teal)]">
										<Lock className="w-3 h-3" /> Подписано 043/у
									</span>
								) : (
									<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--amber-soft,rgba(217,119,6,0.12))] text-[var(--amber,#b45309)] border border-[var(--amber,#b45309)]">
										<Clock className="w-3 h-3" /> Черновик
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
						className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors"
						aria-label="Закрыть сводку"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Modal Scrollable Content */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Patient & Doctor Meta Grid */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs">
						<div className="space-y-1">
							<div className="flex items-center gap-1.5 text-[var(--muted)] font-medium">
								<User className="w-3.5 h-3.5" /> Пациент:
							</div>
							<div className="font-semibold text-sm text-[var(--ink)]">
								{patientName}
							</div>
							{patientBirth ? (
								<div className="text-[var(--muted)]">
									Дата рождения: {patientBirth}
								</div>
							) : null}
						</div>
						<div className="space-y-1">
							<div className="flex items-center gap-1.5 text-[var(--muted)] font-medium">
								<Stethoscope className="w-3.5 h-3.5" /> Лечащий врач:
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

					{/* Odontogram Abnormalities Summary */}
					{abnormalTeeth.length > 0 && (
						<div className="space-y-2">
							<h4 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
								<span>🦷</span> Зубная формула ({abnormalTeeth.length}{" "}
								{abnormalTeeth.length === 1 ? "зуб" : "зубов"} с отметками)
							</h4>
							<div className="flex flex-wrap gap-2">
								{abnormalTeeth.map((t) => (
									<div
										key={t.toothNumber}
										className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs"
									>
										<span className="font-bold text-[var(--ink)]">
											Зуб {t.toothNumber}:
										</span>
										<span className="text-[var(--teal-dark)] font-medium">
											{t.state}
										</span>
										{t.surfaces && t.surfaces.length > 0 ? (
											<span className="text-[var(--muted)]">
												({t.surfaces.join(", ")})
											</span>
										) : null}
									</div>
								))}
							</div>
						</div>
					)}

					{/* SOAP Sections */}
					<div className="space-y-4">
						{/* S - Subjective */}
						<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-1.5">
							<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
								<span className="font-mono font-black">S</span> — Жалобы и
								анамнез (Subjective)
							</div>
							<p className="text-sm text-[var(--ink)] whitespace-pre-wrap leading-relaxed">
								{diary.anamnesis || "—"}
							</p>
						</div>

						{/* O - Objective */}
						<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-1.5">
							<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
								<span className="font-mono font-black">O</span> — Объективно /
								Status Localis (Objective)
							</div>
							<p className="text-sm text-[var(--ink)] whitespace-pre-wrap leading-relaxed">
								{diary.statusLocalis || "—"}
							</p>
						</div>

						{/* A - Assessment */}
						<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2">
							<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
								<span className="font-mono font-black">A</span> — Диагноз
								(Assessment)
							</div>
							<div className="flex flex-wrap items-center gap-2">
								{diary.diagnosisIcd10 ? (
									<div
										className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold ${getIcdColor(diary.diagnosisIcd10)}`}
									>
										<span className="font-mono">{diary.diagnosisIcd10}</span>
										<span>{icdEntry?.label ?? "Диагноз выбран"}</span>
									</div>
								) : (
									<span className="text-xs text-[var(--muted)]">
										Код МКБ-10 не указан
									</span>
								)}
								{diary.diagnosisTooth ? (
									<span className="text-xs text-[var(--muted)] px-2 py-1 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)]">
										Зубы: {diary.diagnosisTooth}
									</span>
								) : null}
							</div>
						</div>

						{/* P - Plan & Treatment */}
						<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-1.5">
							<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--teal)]">
								<span className="font-mono font-black">P</span> — Лечение и
								рекомендации (Plan)
							</div>
							<p className="text-sm text-[var(--ink)] whitespace-pre-wrap leading-relaxed">
								{diary.treatmentDescription || "—"}
							</p>
						</div>

						{/* Complications & Comorbidities */}
						{(diary.complications || diary.comorbidities) && (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs">
								{diary.complications ? (
									<div>
										<div className="font-bold text-[var(--bad-fg)] mb-1 flex items-center gap-1">
											<AlertTriangle className="w-3.5 h-3.5" /> Осложнения:
										</div>
										<p className="text-[var(--ink)]">{diary.complications}</p>
									</div>
								) : null}
								{diary.comorbidities ? (
									<div>
										<div className="font-bold text-[var(--muted)] mb-1">
											Сопутствующие заболевания:
										</div>
										<p className="text-[var(--ink)]">{diary.comorbidities}</p>
									</div>
								) : null}
							</div>
						)}
					</div>

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
				<div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[var(--line)] bg-[var(--paper-soft)]">
					<button
						type="button"
						onClick={onClose}
						className="inline-flex items-center justify-center px-4 py-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-medium hover:bg-[var(--paper-strong)] transition-colors"
					>
						Закрыть
					</button>
					<div className="flex items-center gap-2">
						{onOpenPrescription ? (
							<button
								type="button"
								onClick={() => {
									onClose();
									onOpenPrescription();
								}}
								className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:bg-blue-500/20 transition-colors"
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
								className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400 text-sm font-semibold hover:bg-teal-500/20 transition-colors"
								data-testid="summary-radiology-btn"
							>
								<Scan className="w-4 h-4" />
								Направление КЛКТ/ОПТГ
							</button>
						) : null}
						{onPrint ? (
							<button
								type="button"
								onClick={() => {
									onClose();
									onPrint();
								}}
								className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-xl bg-[var(--teal)] text-[var(--on-teal,white)] text-sm font-semibold hover:bg-[var(--teal-dark)] transition-colors"
							>
								<Printer className="w-4 h-4" />
								Печать Формы 043/у
							</button>
						) : null}
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
};
