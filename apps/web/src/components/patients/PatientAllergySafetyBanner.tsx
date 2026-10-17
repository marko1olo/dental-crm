import { AlertOctagon, AlertTriangle, CheckCircle2, HeartPulse } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import { PatientAnamnesisModal } from "./PatientAnamnesisModal";
import {
	evaluatePatientSafetyFlags,
	formatSafetyProfileToDiaryText,
	type PatientClinicalSafetyProfile,
	parseSafetyProfileFromText,
} from "./safetyMath";
import { PatientAllergyDrawer } from "./PatientAllergyDrawer";
import { PatientAllergyBannerActions } from "./PatientAllergyBannerActions";
import type { PatientAllergySafetyBannerProps } from "./patientAllergySafetyTypes";
import "./safetyBanner.css";

export type { PatientAllergySafetyBannerProps };

export const PatientAllergySafetyBanner: React.FC<PatientAllergySafetyBannerProps> = React.memo(({
	patientId, patientName, profile: propProfile, notes, onUpdateProfile, onSyncToEmkDiary,
	showModalButton = true, compact = false, hideWhenClean = true, className = "",
}) => {
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [localProfile, setLocalProfile] = useState<Partial<PatientClinicalSafetyProfile> | null>(null);

	React.useEffect(() => {
		setLocalProfile(null);
		setIsDrawerOpen(false);
	}, [patientId]);

	const effectiveProfile = useMemo(() => {
		if (localProfile) return localProfile;
		const fromNotes = notes ? parseSafetyProfileFromText(notes) : null;
		if (propProfile) {
			const fromProp = typeof propProfile === "string" ? parseSafetyProfileFromText(propProfile) : propProfile;
			if (!fromNotes) return fromProp;
			const merged: Record<string, unknown> = { ...fromNotes, ...fromProp };
			for (const key of Object.keys(fromNotes)) {
				if ((fromNotes as unknown as Record<string, unknown>)[key] === true) merged[key] = true;
			}
			return merged as Partial<PatientClinicalSafetyProfile>;
		}
		return fromNotes;
	}, [localProfile, propProfile, notes]);

	const evaluation = useMemo(() => evaluatePatientSafetyFlags(effectiveProfile), [effectiveProfile]);

	const handleApplySomaticNorm = useCallback(() => {
		const normProfile: PatientClinicalSafetyProfile = {
			hasPacemakerExs: false, hasBisphosphonateTherapy: false, hasAnticoagulantTherapy: false,
			hasAnestheticAllergy: false, hasSulfitesAllergy: false, hasPenicillinAllergy: false,
			hasLatexAllergy: false, hasIodineAllergy: false, hasNsaidAllergy: false,
			hasHypertension: false, hasCardiovascularDisease: false, hasDiabetesMellitus: false,
			hasBronchialAsthma: false, hasEpilepsy: false, hasHepatitis: false, hasHiv: false,
			hasPheochromocytoma: false, hasThyrotoxicosis: false, pregnancyTrimester: "none",
			customAllergyNotes: "", customChronicNotes: "Соматически здоров / физиологическая норма",
			currentMedicationsList: "", lastUpdated: new Date().toISOString(),
		};
		setLocalProfile(normProfile);
		onUpdateProfile?.(normProfile);
		onSyncToEmkDiary?.("Соматический статус: Соматически здоров, физиологическая норма. Аллергоанамнез не отягощен.");
		showToast("Зафиксирована норма: Соматически здоров", "success");
	}, [onUpdateProfile, onSyncToEmkDiary]);

	const handleSyncToDiary = useCallback(() => {
		const snippet = formatSafetyProfileToDiaryText(effectiveProfile);
		onSyncToEmkDiary?.(snippet);
		navigator.clipboard?.writeText?.(snippet).catch(() => {});
		showToast("Клинический профиль безопасности скопирован для вставки в карту", "success");
	}, [effectiveProfile, onSyncToEmkDiary]);

	const bannerStyleClass = evaluation.hasCriticalStopFlags ? "patient-safety-banner--critical" : evaluation.hasHighRiskFlags ? "patient-safety-banner--high" : evaluation.totalAlertCount > 0 ? "patient-safety-banner--moderate" : "patient-safety-banner--safe";

	if (hideWhenClean && evaluation.totalAlertCount === 0) {
		return isModalOpen ? <PatientAnamnesisModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} patientId={patientId ?? undefined} patientName={patientName ?? undefined} initialProfile={effectiveProfile} onSaveProfile={(p) => { setLocalProfile(p); onUpdateProfile?.(p); }} onSyncToEmkDiary={onSyncToEmkDiary ?? undefined} /> : null;
	}

	return (
		<>
			<section role="alert" aria-live={evaluation.hasCriticalStopFlags ? "assertive" : "polite"} data-testid="patient-allergy-safety-banner" className={`patient-safety-banner ${bannerStyleClass} ${compact ? "patient-safety-banner--compact" : ""} ${className}`}>
				<div className="patient-safety-banner__header">
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div className="patient-safety-banner__beacon" aria-hidden="true">
							{evaluation.hasCriticalStopFlags ? <AlertOctagon className="w-5 h-5" /> : evaluation.hasHighRiskFlags ? <AlertTriangle className="w-5 h-5" /> : evaluation.totalAlertCount > 0 ? <HeartPulse className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
						</div>
						<div className="patient-safety-banner__title-group">
							<h2 className="patient-safety-banner__title">
								{evaluation.hasCriticalStopFlags ? <span className="inline-flex items-center gap-1.5 font-black uppercase text-xs tracking-wider"><span className="safety-beacon-ping" aria-hidden="true" />КРИТИЧЕСКИЕ СТОП-ФАКТОРЫ ПАЦИЕНТА:</span> : evaluation.hasHighRiskFlags ? <span className="font-black uppercase text-xs tracking-wider inline-flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />СОМАТИЧЕСКИЕ ФАКТОРЫ РИСКА:</span> : <span className="font-bold text-xs">Клинический профиль безопасности:</span>}
								{evaluation.activeFlags.length > 0 && <span className="text-[11px] font-bold opacity-90">({evaluation.activeFlags.length} фактора)</span>}
							</h2>
							<div className="patient-safety-banner__subtitle truncate">{evaluation.formattedSummaryLine}</div>
						</div>
					</div>
					<PatientAllergyBannerActions
						evaluation={evaluation}
						compact={compact}
						isDrawerOpen={isDrawerOpen}
						setIsDrawerOpen={setIsDrawerOpen}
						handleApplySomaticNorm={handleApplySomaticNorm}
						handleSyncToDiary={handleSyncToDiary}
						showModalButton={showModalButton}
						setIsModalOpen={setIsModalOpen}
					/>
				</div>
				{isDrawerOpen && evaluation.activeFlags.length > 0 && <PatientAllergyDrawer evaluation={evaluation} />}
			</section>
			<PatientAnamnesisModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} patientId={patientId ?? undefined} patientName={patientName ?? undefined} initialProfile={effectiveProfile} onSaveProfile={(p) => { setLocalProfile(p); onUpdateProfile?.(p); }} onSyncToEmkDiary={onSyncToEmkDiary ?? undefined} />
		</>
	);
});

PatientAllergySafetyBanner.displayName = "PatientAllergySafetyBanner";
export default PatientAllergySafetyBanner;
