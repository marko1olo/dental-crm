/**
 * apps/web/src/components/settings/DoctorCbctPreferencesCard.tsx
 *
 * Dedicated UI card for doctor's default CBCT reconstruction parameters.
 * Decomposed facade strictly <= 120 lines following Mandate 8b.
 */

import React, { useCallback, useEffect, useState } from "react";
import { showToast } from "../GlobalToast";
import {
	CANONICAL_CBCT_SETTINGS,
	CBCT_INTERPOLATION_METHODS,
	type CbctInterpolationMethod,
	type DoctorCbctDefaultSettings,
	loadDoctorCbctSettings,
	resetDoctorCbctSettings,
	saveDoctorCbctSettings,
} from "../radiology/cbctLutMath";
import { DoctorCbctSettingsModal } from "./DoctorCbctSettingsModal";
import {
	useHardwareProfile,
	useHardwareAdaptiveSettings,
	getHardwareTierOverride,
	setHardwareTierOverride,
	reevaluateHardwareProfile,
} from "../../lib/hardwareCapabilities";
import type { HardwareTier } from "@dental/shared";
import { DoctorCbctCardHeader } from "./cbct/DoctorCbctCardHeader";
import { DoctorCbctMetricsGrid } from "./cbct/DoctorCbctMetricsGrid";
import { DoctorCbctInterpolationSelector } from "./cbct/DoctorCbctInterpolationSelector";
import { DoctorCbctHardwareBar } from "./cbct/DoctorCbctHardwareBar";

export function DoctorCbctPreferencesCard() {
	const [settings, setSettings] = useState<DoctorCbctDefaultSettings>(() => loadDoctorCbctSettings());
	const [isModalOpen, setIsModalOpen] = useState(false);
	const hwProfile = useHardwareProfile();
	const hwAdaptive = useHardwareAdaptiveSettings();
	const [overrideTier, setOverrideTierState] = useState<HardwareTier | null>(() => getHardwareTierOverride());
	const [isReevaluating, setIsReevaluating] = useState(false);

	const handleTierSelect = useCallback((tier: HardwareTier | null) => {
		setHardwareTierOverride(tier);
		setOverrideTierState(tier);
		showToast(tier ? `Профиль железа: ${tier.toUpperCase()}` : "Автоадаптация производительности включена", "info");
	}, []);

	const handleReevaluate = useCallback(() => {
		setIsReevaluating(true);
		try {
			const fresh = reevaluateHardwareProfile();
			showToast(`Железо переоценено: ${fresh.tier.toUpperCase()} (${fresh.score}/100)`, "success");
		} catch {
			showToast("Ошибка при переоценке оборудования", "error");
		} finally {
			setTimeout(() => setIsReevaluating(false), 300);
		}
	}, []);

	const handleInterpolationSelect = useCallback((method: CbctInterpolationMethod) => {
		const updated = saveDoctorCbctSettings({ interpolationMethod: method });
		setSettings(updated);
		const meta = CBCT_INTERPOLATION_METHODS.find((m) => m.id === method);
		showToast(`Метод 2D-интерполяции КТ: ${meta?.shortLabel ?? method}`, "info");
	}, []);

	useEffect(() => {
		const handleUpdated = (e: Event) => {
			const detail = (e as CustomEvent<DoctorCbctDefaultSettings>).detail;
			setSettings(detail ?? loadDoctorCbctSettings());
		};
		window.addEventListener("dente:cbct-defaults-updated", handleUpdated);
		return () => window.removeEventListener("dente:cbct-defaults-updated", handleUpdated);
	}, []);

	const activeInterpolation = settings.interpolationMethod ?? "bilinear";
	const activeInterpMeta = CBCT_INTERPOLATION_METHODS.find((m) => m.id === activeInterpolation) ?? CBCT_INTERPOLATION_METHODS[1];
	const isCanonical =
		settings.windowWidth === CANONICAL_CBCT_SETTINGS.windowWidth &&
		settings.windowLevel === CANONICAL_CBCT_SETTINGS.windowLevel &&
		Math.abs(settings.gamma - CANONICAL_CBCT_SETTINGS.gamma) < 0.001 &&
		settings.airCutoffHU === CANONICAL_CBCT_SETTINGS.airCutoffHU &&
		Math.abs(settings.mprThicknessMm - CANONICAL_CBCT_SETTINGS.mprThicknessMm) < 0.001 &&
		Math.abs(settings.panoThicknessMm - CANONICAL_CBCT_SETTINGS.panoThicknessMm) < 0.001 &&
		activeInterpolation === (CANONICAL_CBCT_SETTINGS.interpolationMethod ?? "bilinear");

	const handleReset = useCallback(() => {
		const canon = resetDoctorCbctSettings();
		setSettings(canon);
		showToast("Параметры КЛКТ сброшены на канон (4025 HU / 525 HU / Bilinear)", "info");
	}, []);

	return (
		<article className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4" data-testid="doctor-cbct-preferences-card">
			<DoctorCbctCardHeader isCanonical={isCanonical} onReset={handleReset} onOpenTuner={() => setIsModalOpen(true)} />
			<DoctorCbctMetricsGrid settings={settings} interpolationLabel={activeInterpMeta?.shortLabel ?? "Bilinear"} interpolationTooltip={activeInterpMeta?.labelRu} />
			<DoctorCbctInterpolationSelector activeInterpolation={activeInterpolation} onSelect={handleInterpolationSelect} />
			<DoctorCbctHardwareBar hwProfile={hwProfile} hwAdaptive={hwAdaptive} overrideTier={overrideTier} isReevaluating={isReevaluating} onReevaluate={handleReevaluate} onSelectTier={handleTierSelect} />
			<DoctorCbctSettingsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaved={(updated) => setSettings(updated)} />
		</article>
	);
}

export default DoctorCbctPreferencesCard;
