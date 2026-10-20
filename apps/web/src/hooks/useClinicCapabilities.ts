/**
 * apps/web/src/hooks/useClinicCapabilities.ts
 *
 * Reactive Hook for Mandate 8n (Scale Sovereignty & Small Clinic Presets).
 * Subscribes to settingsStore.clinicMode with zero manual F5 reloads.
 *
 * Authorities:
 * - Mandate 8e: Doctor Autonomy (Solo doctor on chair rental sees zero bureaucracy).
 * - Mandate 8n: Solo Doctor & Scale Sovereignty (1 chair / 1-3 chairs / network).
 * - Mandate 8s: Database-backed preset synchronization.
 * - Mandate 8b: Strictly <= 800 lines.
 */

import { useCallback, useMemo } from "react";
import { useSettingsStore } from "../store/settingsStore";
import {
	type ClinicCapability,
	type ClinicMode,
	clinicCapabilities,
	describeHiddenCapabilities,
	hasCapability,
	resolveClinicMode,
} from "../lib/clinicCapabilities";
import type { SovereignScalePresetId } from "@dental/shared";

export interface ClinicCapabilitiesHookResult {
	/** Active clinic mode (null if unresolved) */
	mode: ClinicMode | null;
	/** Canonical Mandate 8n scale preset ID */
	scalePreset: SovereignScalePresetId;
	/** Russian display label for the active scale preset */
	presetLabel: string;
	/** Array of active capabilities for current mode */
	capabilities: readonly ClinicCapability[];
	/** Check if a specific capability is enabled */
	hasCapability: (capability: ClinicCapability) => boolean;
	/** Human-readable list of capabilities hidden by current mode */
	hiddenCapabilities: string[];
	/** Convenience boolean flags */
	isSoloDoctor: boolean;
	isOneChair: boolean;
	isSmallClinic: boolean;
	isNetworkClinic: boolean;
}

export type ClinicCapabilities = ClinicCapabilitiesHookResult;

/**
 * useClinicCapabilities
 *
 * Provides real-time reactive access to clinic capabilities.
 * Updates instantly when clinicMode changes in useSettingsStore without requiring F5.
 */
export function useClinicCapabilities(
	fallbackMode?: ClinicMode | string | null,
): ClinicCapabilitiesHookResult {
	const subscribedMode = useSettingsStore((s) => s.clinicMode);
	const clinicMode =
		subscribedMode ?? useSettingsStore.getState().clinicMode ?? fallbackMode;
	const resolvedMode = resolveClinicMode(clinicMode);

	const scalePreset: SovereignScalePresetId =
		resolvedMode === "solo_doctor" || resolvedMode === "one_chair"
			? "solo_doctor"
			: resolvedMode === "network_clinic"
				? "network_center"
				: "standard_clinic";

	const presetLabel =
		scalePreset === "solo_doctor"
			? "Частный кабинет / Соло-врач"
			: scalePreset === "network_center"
				? "Многопрофильный центр / Сеть"
				: "Стандартная клиника (1–3 кресла)";

	const capabilities = useMemo(
		() => clinicCapabilities(resolvedMode),
		[resolvedMode],
	);

	const hiddenCapabilities = useMemo(
		() => describeHiddenCapabilities(resolvedMode),
		[resolvedMode],
	);

	const checkCapability = useCallback(
		(capability: ClinicCapability) => hasCapability(resolvedMode, capability),
		[resolvedMode],
	);

	return {
		mode: resolvedMode,
		scalePreset,
		presetLabel,
		capabilities,
		hasCapability: checkCapability,
		hiddenCapabilities,
		isSoloDoctor: resolvedMode === "solo_doctor",
		isOneChair: resolvedMode === "one_chair",
		isSmallClinic: resolvedMode === "small_clinic",
		isNetworkClinic: resolvedMode === "network_clinic",
	};
}

export default useClinicCapabilities;
