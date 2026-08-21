import {
	Activity,
	AlertTriangle,
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
	ZoomIn,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getIcdColor, ICD10_DICTIONARY } from "../../lib/icd10";
import type { DiaryState } from "../useVisitDiaryLogic";
import { DocumentCustomizerModal } from "../documents/DocumentCustomizerModal";
import { PremiumDocumentPrintSheet } from "../documents/PremiumDocumentPrintSheet";

export interface RadiologySnapshotItem {
	id?: string | undefined;
	imageDataUri: string;
	thumbnailDataUri?: string | null | undefined;
	title?: string | null | undefined;
	kind?: string | null | undefined;
	toothCode?: string | null | undefined;
	capturedAt?: string | null | undefined;
	exposureTimeSec?: number | null | undefined;
	exposureParameters?:
		| {
				exposureTimeSec?: number | null | undefined;
				mAs?: number | null | undefined;
				kVp?: number | null | undefined;
				sensorType?: string | null | undefined;
		  }
		| null
		| undefined;
	radiologicalFinding?: string | null | undefined;
	protocolText?: string | null | undefined;
	boneDensity?:
		| {
				classification: string;
				averageHU: number;
		  }
		| null
		| undefined;
	nerveDistanceMm?: number | null | undefined;
	clinicalNote?: string | null | undefined;
}

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
}) => {
	const [zoomImage, setZoomImage] = useState<{
		url: string;
		title?: string;
	} | null>(null);
	const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

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
									className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold"
									data-testid="summary-badge-perio"
								>
									<Activity className="w-3.5 h-3.5 text-emerald-600" />
									Пародонтологический протокол (PSR + AAP/EFP 2018)
								</span>
							)}
							{(diary.statusLocalis?.includes("ПРОТОКОЛ ДЕТСКОГО") ||
								diary.statusLocalis?.includes("Кариограмм")) && (
								<span
									className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-semibold"
									data-testid="summary-badge-pediatric"
								>
									<span className="text-xs">🧒</span>
									Сменный прикус & Кариограмма Bratthall
								</span>
							)}
						</div>
					)}

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

					{/* Radiology & 3D Visiograph Snapshots */}
					{radiologySnapshots && radiologySnapshots.length > 0 && (
						<div
							className="space-y-3 p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] page-break-avoid"
							data-testid="summary-radiology-section"
						>
							<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
								<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--teal)] flex items-center gap-1.5">
									<Scan className="w-4 h-4" />
									<span>Рентгенологическое обследование и 3D-снапшоты (Форма № 043/у)</span>
								</h4>
								<span className="text-[11px] font-semibold text-[var(--muted)]">
									{radiologySnapshots.length}{" "}
									{radiologySnapshots.length === 1
										? "снимок"
										: radiologySnapshots.length < 5
											? "снимка"
											: "снимков"}
								</span>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{radiologySnapshots.map((snap, idx) => (
									<div
										key={snap.id || idx}
										className="flex flex-col sm:flex-row gap-3 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs overflow-hidden page-break-avoid"
										data-testid={`radiology-snapshot-card-${idx}`}
									>
										<div className="relative w-full sm:w-28 h-28 shrink-0 rounded-lg overflow-hidden border border-[var(--line)] bg-black flex items-center justify-center group">
											<img
												src={snap.thumbnailDataUri || snap.imageDataUri}
												alt={snap.title || `Снимок зуба ${snap.toothCode || "043/у"}`}
												className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
												style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
											/>
											<button
												type="button"
												onClick={() =>
													setZoomImage({
														url: snap.imageDataUri,
														title: snap.toothCode
															? `Снимок зуба FDI № ${snap.toothCode}`
															: snap.title || "Рентгенологический снимок",
													})
												}
												className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity no-print"
												title="Увеличить снимок"
												aria-label="Увеличить снимок"
											>
												<ZoomIn className="w-5 h-5" />
											</button>
										</div>

										<div className="flex-1 flex flex-col justify-between gap-1.5 min-w-0">
											<div>
												<div className="flex items-center justify-between gap-1">
													<span className="font-bold text-[var(--ink)] truncate">
														{snap.toothCode
															? `Зуб FDI № ${snap.toothCode}`
															: snap.title || "3D Снимок 043/у"}
													</span>
													{snap.boneDensity && (
														<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap">
															{snap.boneDensity.classification} ({Math.round(snap.boneDensity.averageHU)} HU)
														</span>
													)}
												</div>

												<div className="text-[11px] text-[var(--muted)] flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
													{snap.capturedAt && (
														<span className="flex items-center gap-1">
															<Clock className="w-3 h-3" />
															{new Date(snap.capturedAt).toLocaleString("ru-RU")}
														</span>
													)}
													{snap.exposureTimeSec !== undefined && snap.exposureTimeSec !== null && (
														<span>
															⏱ {snap.exposureTimeSec.toFixed(2)} с
															{snap.exposureParameters?.kVp ? ` (${snap.exposureParameters.kVp} кВ)` : ""}
														</span>
													)}
												</div>

												{snap.radiologicalFinding && (
													<p className="text-[11px] text-[var(--ink)] mt-1 line-clamp-2 leading-relaxed">
														{snap.radiologicalFinding}
													</p>
												)}
											</div>

											{snap.nerveDistanceMm !== undefined && snap.nerveDistanceMm !== null && (
												<div
													className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold w-fit ${
														snap.nerveDistanceMm < 2.0
															? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30"
															: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
													}`}
												>
													{snap.nerveDistanceMm < 2.0 ? (
														<>
															<AlertTriangle className="w-3 h-3" /> Опасная зона ({snap.nerveDistanceMm.toFixed(1)} мм)
														</>
													) : (
														<>
															<CheckCircle2 className="w-3 h-3" /> Канал: {snap.nerveDistanceMm.toFixed(1)} мм
														</>
													)}
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

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
				<div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[var(--line)] bg-[var(--paper-soft)] no-print">
					<button
						type="button"
						onClick={onClose}
						className="inline-flex items-center justify-center px-4 py-2 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-medium hover:bg-[var(--paper-strong)] transition-colors"
					>
						Закрыть
					</button>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setIsCustomizerOpen(true)}
							className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300 text-sm font-semibold hover:bg-teal-500/20 transition-colors"
							title="Настроить фирменный бланк клиники, цвета, логотип и реквизиты"
							data-testid="summary-customize-branding-btn"
						>
							<Palette className="w-4 h-4" />
							<span>Настроить бланк</span>
						</button>
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
						{onOpenEgiszExport ? (
							<button
								type="button"
								onClick={() => {
									onClose();
									onOpenEgiszExport();
								}}
								className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-colors"
								data-testid="summary-egisz-btn"
							>
								<ShieldCheck className="w-4 h-4" />
								СЭМД ЕГИСЗ
							</button>
						) : null}
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
							className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-xl bg-[var(--teal)] text-[var(--on-teal,white)] text-sm font-semibold hover:bg-[var(--teal-dark)] transition-colors"
							data-testid="summary-print-btn"
						>
							<Printer className="w-4 h-4" />
							Печать Формы 043/у
						</button>
					</div>
				</div>
			</div>

			{/* Document Customizer Drawer Modal */}
			<DocumentCustomizerModal
				isOpen={isCustomizerOpen}
				onClose={() => setIsCustomizerOpen(false)}
				samplePatient={{
					fullName: patientName !== "—" ? patientName : undefined,
					birthDate: patientBirth || undefined,
					medicalCardNumber: patientCard || undefined,
					passport: patientPassport || undefined,
					omsPolis: patientOms || undefined,
					snils: patientSnils || undefined,
					phone: typeof patient?.phone === "string" ? patient.phone : undefined,
				}}
				sampleDoctorName={doctorName !== "—" ? (doctorName ?? undefined) : undefined}
				sampleDoctorSpecialty={doctorSpecialty ?? undefined}
			/>

			{/* Zoom Lightbox Modal */}
			{zoomImage && (
				<div
					className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 no-print"
					role="dialog"
					aria-modal="true"
					aria-label="Просмотр снимка"
					onClick={() => setZoomImage(null)}
				>
					<div
						className="relative max-w-4xl max-h-[90vh] bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950 text-white">
							<span className="text-sm font-bold truncate">
								{zoomImage.title || "Рентгенологический снимок (Высокое разрешение)"}
							</span>
							<button
								type="button"
								onClick={() => setZoomImage(null)}
								className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
								aria-label="Закрыть просмотр снимка"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<div className="flex-1 overflow-auto p-2 bg-black flex items-center justify-center">
							<img
								src={zoomImage.url}
								alt={zoomImage.title || "Снимок"}
								className="max-w-full max-h-[75vh] object-contain rounded"
							/>
						</div>
					</div>
				</div>
			)}
		</div>,
		document.body,
	);
};
