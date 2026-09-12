/**
 * PatientAllergySafetyBanner.tsx
 * Canonical location: components/patients/PatientAllergySafetyBanner.tsx (Mandate 8s)
 */

import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	Baby,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	ClipboardEdit,
	Copy,
	HeartPulse,
	Pill,
	ShieldAlert,
	Syringe,
	ZapOff,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { PatientAnamnesisModal } from "../patient/PatientAnamnesisModal";
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
	readonly hideWhenClean?: boolean | undefined;
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
			hideWhenClean = false,
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

			// 1-Click Соматически здоров / физиологическая норма
			const handleApplySomaticNorm = useCallback(() => {
				const normProfile: PatientClinicalSafetyProfile = {
					hasPacemakerExs: false,
					hasBisphosphonateTherapy: false,
					hasAnticoagulantTherapy: false,
					hasAnestheticAllergy: false,
					hasSulfitesAllergy: false,
					hasPenicillinAllergy: false,
					hasLatexAllergy: false,
					hasIodineAllergy: false,
					hasNsaidAllergy: false,
					hasHypertension: false,
					hasCardiovascularDisease: false,
					hasDiabetesMellitus: false,
					hasBronchialAsthma: false,
					hasEpilepsy: false,
					hasHepatitis: false,
					hasHiv: false,
					hasPheochromocytoma: false,
					hasThyrotoxicosis: false,
					pregnancyTrimester: "none",
					customAllergyNotes: "",
					customChronicNotes: "Соматически здоров / физиологическая норма",
					currentMedicationsList: "",
					lastUpdated: new Date().toISOString(),
				};
				setLocalProfile(normProfile);
				if (onUpdateProfile) {
					onUpdateProfile(normProfile);
				}
				if (onSyncToEmkDiary) {
					onSyncToEmkDiary(
						"Соматический статус: Соматически здоров, физиологическая норма. Аллергоанамнез не отягощен.",
					);
				}
				showToast("Зафиксирована норма: Соматически здоров (1 клик)", "success");
			}, [onUpdateProfile, onSyncToEmkDiary]);

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
				return <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
			}, [evaluation]);

			if (hideWhenClean && evaluation.totalAlertCount === 0) {
				return null;
			}

			return (
				<>
					<section
						role="alert"
						aria-live={evaluation.hasCriticalStopFlags ? "assertive" : "polite"}
						data-testid="patient-allergy-safety-banner"
						className={`patient-safety-banner ${bannerStyleClass} ${compact ? "patient-safety-banner--compact" : ""} ${className}`}
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
												<span className="safety-beacon-ping" aria-hidden="true" />
												КРИТИЧЕСКИЕ СТОП-ФАКТОРЫ ПАЦИЕНТА:
											</span>
										) : evaluation.hasHighRiskFlags ? (
											<span className="font-black uppercase text-xs tracking-wider inline-flex items-center gap-1.5">
												<AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
												СОМАТИЧЕСКИЕ ФАКТОРЫ РИСКА:
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
								{/* 1-Click Соматически здоров / физиологическая норма */}
								{evaluation.activeFlags.length === 0 && (
									<button
										type="button"
										onClick={handleApplySomaticNorm}
										className="safety-btn safety-btn--outline text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 min-h-[44px]"
										data-testid="banner-apply-somatic-norm-btn"
										title="Зафиксировать физиологическую норму в 1 клик"
									>
										<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
										<span>Соматически здоров (норма)</span>
									</button>
								)}

								{/* Кнопка разворачивания деталей */}
								{evaluation.activeFlags.length > 0 && !compact && (
									<button
										type="button"
										onClick={() => setIsDrawerOpen((prev) => !prev)}
										aria-expanded={isDrawerOpen}
										className="safety-btn safety-btn--outline text-xs min-h-[44px]"
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
										className="safety-btn safety-btn--outline text-xs min-h-[44px]"
									>
										<Copy className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
										В 043/у
									</button>
								)}

								{/* Кнопка редактирования анкеты */}
								{showModalButton && (
									<button
										type="button"
										onClick={() => setIsModalOpen(true)}
										className={`safety-btn min-h-[44px] ${
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
													{flag.id.includes("pregnancy") && <Baby className="w-4 h-4 text-pink-500" />}
													{flag.id.includes("hypertension") && <HeartPulse className="w-4 h-4 text-amber-600" />}
													{flag.id.includes("asthma") && <Activity className="w-4 h-4 text-amber-600" />}
													{flag.id.includes("nsaid") && <ShieldAlert className="w-4 h-4 text-rose-600" />}
													{flag.id.includes("penicillin") && <Pill className="w-4 h-4 text-amber-600" />}
													{flag.id.includes("latex") && <AlertOctagon className="w-4 h-4 text-amber-600" />}
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
													<div className="safety-flag-card__section-title safety-flag-card__section-title--forbidden inline-flex items-center gap-1.5">
														<AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" aria-hidden="true" />
														<span>Категорически противопоказано:</span>
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
													<div className="safety-flag-card__section-title safety-flag-card__section-title--precautions inline-flex items-center gap-1.5">
														<ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
														<span>Обязательный протокол ведения:</span>
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
												<div className="safety-flag-card__anesthesia-badge inline-flex items-center gap-1.5">
													<Syringe className="w-3.5 h-3.5 text-teal-600 shrink-0" aria-hidden="true" />
													<span>Обезболивание: {flag.recommendedAnesthesiaNotes}</span>
												</div>
											)}
										</div>
									))}
								</div>

								{/* Общая сводка анестезии и предосторожностей */}
								{evaluation.anestheticRecommendations.length > 0 && (
									<div className="p-3 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal,var(--brand-primary))]/20 text-xs text-[var(--teal-dark,var(--teal))] flex flex-col gap-1">
										<span className="font-bold uppercase tracking-wide inline-flex items-center gap-1.5">
											<Syringe className="w-3.5 h-3.5 text-teal-600 shrink-0" aria-hidden="true" />
											<span>Сводные клинические рекомендации по анестезии:</span>
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

export default PatientAllergySafetyBanner;
