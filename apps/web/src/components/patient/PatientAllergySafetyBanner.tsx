import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Baby,
	ChevronDown,
	ChevronUp,
	ClipboardEdit,
	Copy,
	HeartPulse,
	Pill,
	ShieldAlert,
	Sparkles,
	ZapOff,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { PatientAnamnesisModal } from "./PatientAnamnesisModal";
import {
	type PatientClinicalSafetyProfile,
	evaluatePatientSafetyFlags,
	formatSafetyProfileToDiaryText,
	parseSafetyProfileFromText,
} from "./safetyMath";
import "./safetyBanner.css";

export interface PatientAllergySafetyBannerProps {
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly profile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined;
	readonly notes?: string | null | undefined;
	readonly onUpdateProfile?: ((profile: PatientClinicalSafetyProfile) => void) | undefined;
	readonly onSyncToEmkDiary?: ((diarySnippet: string) => void) | undefined;
	readonly showModalButton?: boolean | undefined;
	readonly compact?: boolean | undefined;
	readonly className?: string | undefined;
}

export const PatientAllergySafetyBanner: React.FC<PatientAllergySafetyBannerProps> =
	React.memo(
		({
			patientId,
			patientName,
			profile: propProfile,
			notes,
			onUpdateProfile,
			onSyncToEmkDiary,
			showModalButton = true,
			compact = false,
			className = "",
		}) => {
			const [isDrawerOpen, setIsDrawerOpen] = useState(false);
			const [isModalOpen, setIsModalOpen] = useState(false);
			const [localProfile, setLocalProfile] = useState<Partial<PatientClinicalSafetyProfile> | null>(null);

			// Вычисляем объединенный профиль безопасности
			const effectiveProfile = useMemo(() => {
				if (localProfile) return localProfile;
				if (propProfile) {
					if (typeof propProfile === "string") {
						return parseSafetyProfileFromText(propProfile);
					}
					return propProfile;
				}
				if (notes) {
					return parseSafetyProfileFromText(notes);
				}
				return null;
			}, [localProfile, propProfile, notes]);

			const evaluation = useMemo(() => {
				return evaluatePatientSafetyFlags(effectiveProfile);
			}, [effectiveProfile]);

			const handleSaveModalProfile = useCallback(
				(savedProfile: PatientClinicalSafetyProfile) => {
					setLocalProfile(savedProfile);
					if (onUpdateProfile) {
						onUpdateProfile(savedProfile);
					}
				},
				[onUpdateProfile],
			);

			const handleSyncToDiary = useCallback(() => {
				const snippet = formatSafetyProfileToDiaryText(effectiveProfile);
				if (onSyncToEmkDiary) {
					onSyncToEmkDiary(snippet);
				}
				navigator.clipboard?.writeText?.(snippet).catch(() => {});
				showToast(
					"Клинический профиль безопасности скопирован для вставки в форму 043/у",
					"success",
				);
			}, [effectiveProfile, onSyncToEmkDiary]);

			const bannerStyleClass = useMemo(() => {
				if (evaluation.hasCriticalStopFlags) return "patient-safety-banner--critical";
				if (evaluation.hasHighRiskFlags) return "patient-safety-banner--high";
				if (evaluation.totalAlertCount > 0) return "patient-safety-banner--moderate";
				return "patient-safety-banner--safe";
			}, [evaluation]);

			const beaconIcon = useMemo(() => {
				if (evaluation.hasCriticalStopFlags) {
					return <AlertOctagon className="w-5 h-5" />;
				}
				if (evaluation.hasHighRiskFlags) {
					return <AlertTriangle className="w-5 h-5" />;
				}
				if (evaluation.totalAlertCount > 0) {
					return <HeartPulse className="w-5 h-5" />;
				}
				return <Sparkles className="w-5 h-5" />;
			}, [evaluation]);

			return (
				<>
					<section
						role="alert"
						aria-live={evaluation.hasCriticalStopFlags ? "assertive" : "polite"}
						data-testid="patient-allergy-safety-banner"
						className={`patient-safety-banner ${bannerStyleClass} ${className}`}
					>
						<div className="patient-safety-banner__header">
							<div className="flex items-center gap-3 min-w-0 flex-1">
								<div className="patient-safety-banner__beacon" aria-hidden="true">
									{beaconIcon}
								</div>

								<div className="patient-safety-banner__title-group">
									<h2 className="patient-safety-banner__title">
										{evaluation.hasCriticalStopFlags ? (
											<span className="inline-flex items-center gap-1.5 font-black uppercase text-xs tracking-wider">
												<span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
												КРИТИЧЕСКИЕ СТОП-ФАКТОРЫ ПАЦИЕНТА:
											</span>
										) : evaluation.hasHighRiskFlags ? (
											<span className="font-black uppercase text-xs tracking-wider">
												⚠️ СОМАТИЧЕСКИЕ ФАКТОРЫ РИСКА:
											</span>
										) : (
											<span className="font-bold text-xs">
												Клинический профиль безопасности:
											</span>
										)}

										{evaluation.activeFlags.length > 0 ? (
											<span className="text-[11px] font-bold opacity-90">
												({evaluation.activeFlags.length} фактора)
											</span>
										) : null}
									</h2>

									<div className="patient-safety-banner__subtitle truncate">
										{evaluation.formattedSummaryLine}
									</div>
								</div>
							</div>

							<div className="patient-safety-banner__actions">
								{/* Кнопка разворачивания деталей */}
								{evaluation.activeFlags.length > 0 && !compact && (
									<button
										type="button"
										onClick={() => setIsDrawerOpen((prev) => !prev)}
										aria-expanded={isDrawerOpen}
										className="safety-btn safety-btn--outline text-xs"
									>
										{isDrawerOpen ? (
											<>
												<ChevronUp className="w-4 h-4" />
												Скрыть протокол
											</>
										) : (
											<>
												<ChevronDown className="w-4 h-4" />
												Протокол безопасности ({evaluation.activeFlags.length})
											</>
										)}
									</button>
								)}

								{/* 1-Click Sync to Form 043/u EMR Diary */}
								{onSyncToEmkDiary && evaluation.activeFlags.length > 0 && (
									<button
										type="button"
										onClick={handleSyncToDiary}
										title="Скопировать и вставить в дневник 043/у"
										className="safety-btn safety-btn--outline text-xs"
									>
										<Copy className="w-3.5 h-3.5 text-teal-600" />
										В 043/у
									</button>
								)}

								{/* Кнопка редактирования анкеты */}
								{showModalButton && (
									<button
										type="button"
										onClick={() => setIsModalOpen(true)}
										className={`safety-btn ${
											evaluation.hasCriticalStopFlags
												? "safety-btn--primary-red"
												: "safety-btn--outline"
										}`}
									>
										<ClipboardEdit className="w-4 h-4" />
										Анкета здоровья
									</button>
								)}
							</div>
						</div>

						{/* Expandable Clinical Details Drawer */}
						{isDrawerOpen && evaluation.activeFlags.length > 0 && (
							<div className="patient-safety-banner__drawer">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{evaluation.activeFlags.map((flag) => (
										<div
											key={flag.id}
											className={`safety-flag-card ${
												flag.severity === "critical"
													? "safety-flag-card--critical"
													: "safety-flag-card--high"
											}`}
										>
											<div className="safety-flag-card__header">
												<div className="safety-flag-card__title">
													{flag.id.includes("pacemaker") && <ZapOff className="w-4 h-4 text-rose-600" />}
													{flag.id.includes("bisphosphonate") && <ShieldAlert className="w-4 h-4 text-rose-600" />}
													{flag.id.includes("anticoagulant") && <Pill className="w-4 h-4 text-rose-600" />}
													{flag.id.includes("pregnancy") && <Baby className="w-4 h-4 text-sky-600" />}
													{flag.id.includes("hypertension") && <HeartPulse className="w-4 h-4 text-amber-600" />}
													{flag.id.includes("asthma") && <Activity className="w-4 h-4 text-amber-600" />}
													<span>{flag.titleRu}</span>
												</div>
												<span
													className={`safety-flag-card__badge ${
														flag.severity === "critical"
															? "safety-flag-card__badge--critical"
															: "safety-flag-card__badge--high"
													}`}
												>
													{flag.severity === "critical" ? "Стоп-фактор" : "Внимание"}
												</span>
											</div>

											<div className="safety-flag-card__body">
												{flag.description}
											</div>

											{/* Запрещенные процедуры */}
											{flag.forbiddenProcedures.length > 0 && (
												<div className="safety-flag-card__section">
													<div className="safety-flag-card__section-title safety-flag-card__section-title--forbidden">
														🚫 Категорически противопоказано:
													</div>
													<ul className="safety-flag-card__list">
														{flag.forbiddenProcedures.map((proc, i) => (
															<li key={`${flag.id}-proc-${i}`}>{proc}</li>
														))}
													</ul>
												</div>
											)}

											{/* Обязательные меры предосторожности */}
											{flag.mandatoryPrecautions.length > 0 && (
												<div className="safety-flag-card__section">
													<div className="safety-flag-card__section-title safety-flag-card__section-title--precautions">
														🛡️ Обязательный протокол ведения:
													</div>
													<ul className="safety-flag-card__list">
														{flag.mandatoryPrecautions.map((prec, i) => (
															<li key={`${flag.id}-prec-${i}`}>{prec}</li>
														))}
													</ul>
												</div>
											)}

											{/* Рекомендации по анестезии */}
											{flag.recommendedAnesthesiaNotes && (
												<div className="safety-flag-card__section text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
													💉 Обезболивание: {flag.recommendedAnesthesiaNotes}
												</div>
											)}
										</div>
									))}
								</div>

								{/* Общая сводка анестезии и предосторожностей */}
								{evaluation.anestheticRecommendations.length > 0 && (
									<div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/50 text-xs text-teal-950 dark:text-teal-200 flex flex-col gap-1">
										<span className="font-bold uppercase tracking-wide">
											💉 Сводные клинические рекомендации по анестезии:
										</span>
										<ul className="m-0 pl-4 space-y-0.5">
											{evaluation.anestheticRecommendations.map((rec, i) => (
												<li key={`anesthetic-rec-${i}`}>{rec}</li>
											))}
										</ul>
									</div>
								)}
							</div>
						)}
					</section>

					{/* Modal Anamnesis Wizard */}
					<PatientAnamnesisModal
						isOpen={isModalOpen}
						onClose={() => setIsModalOpen(false)}
						patientId={patientId ?? undefined}
						patientName={patientName ?? undefined}
						initialProfile={effectiveProfile}
						onSaveProfile={handleSaveModalProfile}
						onSyncToEmkDiary={onSyncToEmkDiary ?? undefined}
					/>
				</>
			);
		},
	);

PatientAllergySafetyBanner.displayName = "PatientAllergySafetyBanner";
