/**
 * apps/web/src/components/patient/PatientSomaticAlertBanner.tsx
 *
 * Chairside Allergo-Somatic Alert Shield & Emergency Rescue Protocol Bridge.
 *
 * CONSTITUTIONAL MANDATES:
 * - Mandate 8e: Doctor Autonomy (1-click physiological norm by default, 0 disabled buttons due to somatic fields).
 * - Mandate 8i: Ambulatory Dental Context (Direct chairside dental risks: anesthetic allergies, pacemaker -> ultrasound ban, pregnancy, asthma, epilepsy; zero hospital inpatient bloat).
 * - Mandate 8k: Friction-Killer Law (CRM != Reality Simulator, 0-click emergency rescue bridge per Order MZ RF 786n / 1144n).
 * - Mandate 8d item 7: Sanctity of Medical Records (Zero cartoon emojis, strictly Lucide vector icons).
 */

import React, { useState } from "react";
import {
	AlertOctagon,
	AlertTriangle,
	Check,
	HeartPulse,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import {
	type DentalContraindicationBadge,
	type SomaticProfileInput,
	CANONICAL_SOMATIC_NORM_SHORT,
	getPatientSomaticGuardStatus,
} from "../../utils/somaticNorm";
import { EmergencyRescueModal } from "../emergency/EmergencyRescueModal";

export interface PatientSomaticAlertBannerProps {
	readonly patientName?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly patientWeightKg?: number | undefined;
	readonly patientGender?: "male" | "female" | undefined;
	readonly somaticProfile?: SomaticProfileInput | null | undefined;
	readonly allergyText?: string | null | undefined;
	readonly onApplySomaticNorm?: (() => void) | undefined;
	readonly onOpenEmergencyModal?: (() => void) | undefined;
	readonly onApplyToDiary?: ((actText: string) => void) | undefined;
	readonly compact?: boolean | undefined;
	readonly showEmergencyButton?: boolean | undefined;
	readonly className?: string | undefined;
}

export function PatientSomaticAlertBanner({
	patientName = "Пациент",
	patientAgeYears = 42,
	patientWeightKg = 75,
	patientGender = "male",
	somaticProfile = null,
	allergyText = null,
	onApplySomaticNorm,
	onOpenEmergencyModal,
	onApplyToDiary,
	compact = false,
	showEmergencyButton = true,
	className = "",
}: PatientSomaticAlertBannerProps) {
	const [isInternalEmergencyModalOpen, setIsInternalEmergencyModalOpen] =
		useState<boolean>(false);

	const guardStatus = getPatientSomaticGuardStatus(somaticProfile, allergyText);
	const {
		isHealthyNorm,
		badges,
		criticalBadges,
		warningBadges,
		hasCriticalAllergy,
	} = guardStatus;

	const handleOpenEmergency = () => {
		if (onOpenEmergencyModal) {
			onOpenEmergencyModal();
		} else {
			setIsInternalEmergencyModalOpen(true);
		}
	};

	const handleApplyNorm = () => {
		if (onApplySomaticNorm) {
			onApplySomaticNorm();
		}
	};

	// 1. Critical Stop-Factors (Red contrast alert shield)
	if (criticalBadges.length > 0) {
		return (
			<>
				<aside
					data-testid="patient-somatic-alert-banner"
					data-somatic-severity="critical"
					role="alert"
					aria-label="Критические аллерго-соматические стоп-факторы"
					className={`patient-somatic-alert-banner critical-shield border-2 border-rose-500/70 bg-rose-500/10 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 rounded-xl p-2 sm:px-3 sm:py-2 flex items-center justify-between gap-2.5 flex-wrap shadow-sm transition-all min-h-[36px] ${className}`}
				>
					<div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
						<div className="flex items-center gap-1.5 shrink-0">
							<ShieldAlert
								className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse"
								aria-hidden="true"
							/>
							<span className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 hidden sm:inline">
								Щит безопасности:
							</span>
						</div>

						<div className="flex items-center gap-1.5 flex-wrap min-w-0">
							{criticalBadges.map((badge: DentalContraindicationBadge) => (
								<span
									key={badge.id}
									data-testid={badge.testId}
									className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-extrabold text-xs shadow-xs break-words"
									title={badge.title}
								>
									<AlertOctagon size={13} className="shrink-0" />
									<span>{badge.fullLabel}</span>
								</span>
							))}

							{warningBadges.map((badge: DentalContraindicationBadge) => (
								<span
									key={badge.id}
									data-testid={badge.testId}
									className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-950 dark:text-amber-100 border border-amber-500/40 font-bold text-xs shadow-2xs"
									title={badge.title}
								>
									<AlertTriangle
										size={12}
										className="text-amber-600 dark:text-amber-400 shrink-0"
									/>
									<span>{badge.fullLabel}</span>
								</span>
							))}
						</div>
					</div>

					<div className="flex items-center gap-1.5 shrink-0 flex-wrap">
						{showEmergencyButton && (
							<button
								type="button"
								data-testid="btn-chairside-emergency-rescue"
								onClick={handleOpenEmergency}
								className="primary-button h-8 sm:h-8.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all shrink-0"
								title="0-клик вызов протокола экстренной помощи (Укладка «Антишок» по Приказу МЗ РФ № 786н / 1144н: адреналин 0.1%, преднизолон)"
							>
								<HeartPulse size={15} className="shrink-0 animate-pulse" />
								<span>Неотложная помощь / Антишок</span>
							</button>
						)}

						{onApplySomaticNorm && (
							<button
								type="button"
								data-testid="btn-somatic-norm-one-click"
								onClick={handleApplyNorm}
								className="secondary-button h-8 sm:h-8.5 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft,#f1f5f9)] font-semibold text-xs flex items-center gap-1 cursor-pointer shrink-0 transition-all"
								title="1-клик физиологическая норма: зафиксировать отсутствие патологии по автономии врача (Мандат 8e)"
							>
								<Check
									size={14}
									className="text-emerald-600 dark:text-emerald-400 shrink-0"
								/>
								<span className="hidden xl:inline">
									{CANONICAL_SOMATIC_NORM_SHORT}
								</span>
								<span className="xl:hidden">Норма</span>
							</button>
						)}
					</div>
				</aside>

				<EmergencyRescueModal
					isOpen={isInternalEmergencyModalOpen}
					onClose={() => setIsInternalEmergencyModalOpen(false)}
					onApplyToDiary={onApplyToDiary}
					initialPatientName={patientName}
					initialPatientAgeYears={patientAgeYears}
					initialPatientWeightKg={patientWeightKg}
					initialPatientGender={patientGender}
					defaultScenarioId="anaphylactic_shock"
				/>
			</>
		);
	}

	// 2. Warning Factors: Pacemaker, Pregnancy, Asthma, Epilepsy (Yellow alert shield)
	if (warningBadges.length > 0) {
		return (
			<>
				<aside
					data-testid="patient-somatic-alert-banner"
					data-somatic-severity="warning"
					role="status"
					aria-label="Предупреждающие соматические факторы"
					className={`patient-somatic-alert-banner warning-shield border border-amber-500/50 bg-amber-500/10 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 rounded-xl p-2 sm:px-3 sm:py-2 flex items-center justify-between gap-2.5 flex-wrap shadow-xs transition-all min-h-[36px] ${className}`}
				>
					<div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
						<div className="flex items-center gap-1.5 shrink-0">
							<AlertTriangle
								className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0"
								aria-hidden="true"
							/>
							<span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 hidden sm:inline">
								Ограничения у кресла:
							</span>
						</div>

						<div className="flex items-center gap-1.5 flex-wrap min-w-0">
							{warningBadges.map((badge: DentalContraindicationBadge) => (
								<span
									key={badge.id}
									data-testid={badge.testId}
									className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/25 text-amber-950 dark:text-amber-100 border border-amber-500/50 font-bold text-xs shadow-2xs"
									title={badge.title}
								>
									<AlertTriangle
										size={13}
										className="text-amber-600 dark:text-amber-400 shrink-0"
									/>
									<span>{badge.fullLabel}</span>
								</span>
							))}
						</div>
					</div>

					<div className="flex items-center gap-1.5 shrink-0 flex-wrap">
						{showEmergencyButton && (
							<button
								type="button"
								data-testid="btn-chairside-emergency-rescue"
								onClick={handleOpenEmergency}
								className="secondary-button h-8 sm:h-8.5 px-2.5 py-1 rounded-lg border border-amber-500/40 bg-[var(--paper)] text-amber-900 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shrink-0"
								title="Экстренная помощь / Аптечка анти-шок"
							>
								<HeartPulse size={14} className="text-amber-600 shrink-0" />
								<span>Аптечка</span>
							</button>
						)}

						{onApplySomaticNorm && (
							<button
								type="button"
								data-testid="btn-somatic-norm-one-click"
								onClick={handleApplyNorm}
								className="secondary-button h-8 sm:h-8.5 px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft,#f1f5f9)] font-semibold text-xs flex items-center gap-1 cursor-pointer shrink-0 transition-all"
								title="1-клик физиологическая норма: зафиксировать отсутствие патологии"
							>
								<Check
									size={14}
									className="text-emerald-600 dark:text-emerald-400 shrink-0"
								/>
								<span className="hidden xl:inline">
									{CANONICAL_SOMATIC_NORM_SHORT}
								</span>
								<span className="xl:hidden">Норма</span>
							</button>
						)}
					</div>
				</aside>

				<EmergencyRescueModal
					isOpen={isInternalEmergencyModalOpen}
					onClose={() => setIsInternalEmergencyModalOpen(false)}
					onApplyToDiary={onApplyToDiary}
					initialPatientName={patientName}
					initialPatientAgeYears={patientAgeYears}
					initialPatientWeightKg={patientWeightKg}
					initialPatientGender={patientGender}
					defaultScenarioId="anaphylactic_shock"
				/>
			</>
		);
	}

	// 3. Normal / Clean Physiological Status (Green badge, zero visual noise per Mandate 8p)
	return (
		<>
			<aside
				data-testid="patient-somatic-alert-banner"
				data-somatic-severity="healthy"
				role="status"
				aria-label="Соматический статус: физиологическая норма"
				className={`patient-somatic-alert-banner norm-shield border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 flex-wrap min-h-[36px] transition-all ${className}`}
			>
				<div
					className="flex items-center gap-2 min-w-0 flex-1"
					data-testid="patient-somatic-norm-shield"
				>
					<ShieldCheck
						className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
						aria-hidden="true"
					/>
					<span
						data-testid="visit-somatic-norm-badge"
						className="text-xs font-bold text-emerald-800 dark:text-emerald-300"
					>
						{CANONICAL_SOMATIC_NORM_SHORT}
					</span>
					<span className="text-[11px] text-[var(--muted)] hidden md:inline truncate">
						· Противопоказаний к приёму не заявлено
					</span>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					{showEmergencyButton && (
						<button
							type="button"
							data-testid="btn-chairside-emergency-rescue"
							onClick={handleOpenEmergency}
							className="secondary-button h-7 min-h-[28px] px-2 py-0.5 rounded-lg border border-emerald-500/30 bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] font-medium text-xs flex items-center gap-1 cursor-pointer transition-all"
							title="Экстренная аптечка (быстрый доступ при ухудшении состояния)"
						>
							<HeartPulse size={13} className="text-emerald-600 shrink-0" />
							<span className="hidden sm:inline">Аптечка</span>
						</button>
					)}

					{onApplySomaticNorm && (
						<button
							type="button"
							data-testid="btn-somatic-norm-one-click"
							onClick={handleApplyNorm}
							className="secondary-button h-7 min-h-[28px] px-2.5 py-0.5 rounded-lg border border-emerald-500/40 bg-[var(--paper)] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
							title="1-клик физиологическая норма: зафиксировать в карте 043/у"
						>
							<Check
								size={13}
								className="text-emerald-600 dark:text-emerald-400 shrink-0"
							/>
							<span>Норма 043/у</span>
						</button>
					)}
				</div>
			</aside>

			<EmergencyRescueModal
				isOpen={isInternalEmergencyModalOpen}
				onClose={() => setIsInternalEmergencyModalOpen(false)}
				onApplyToDiary={onApplyToDiary}
				initialPatientName={patientName}
				initialPatientAgeYears={patientAgeYears}
				initialPatientWeightKg={patientWeightKg}
				initialPatientGender={patientGender}
				defaultScenarioId="anaphylactic_shock"
			/>
		</>
	);
}
