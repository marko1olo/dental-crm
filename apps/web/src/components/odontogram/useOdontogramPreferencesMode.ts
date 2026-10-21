import type { OdontogramViewMode } from "@dental/shared";
import { useCallback, useState } from "react";
import { useAppStore } from "../../store/appStore";
import {
	loadUiPreferences,
	saveUiPreferences,
} from "../../utils/preferencesUtils";

export function useOdontogramPreferencesMode(
	initialViewMode?: OdontogramViewMode | undefined,
	onViewModeChange?: ((mode: OdontogramViewMode) => void) | undefined,
) {
	const storeMode = useAppStore((state) => state.odontogramViewMode);
	const setStoreMode = useAppStore((state) => state.setOdontogramViewMode);

	const [localMode, setLocalMode] = useState<OdontogramViewMode>(() => {
		if (initialViewMode) return initialViewMode;
		if (storeMode) return storeMode;
		const prefs = loadUiPreferences();
		return prefs.odontogramViewMode ?? "anatomical_svg";
	});

	const activeMode = storeMode || localMode || "anatomical_svg";

	const handleModeSwitch = useCallback(
		(newMode: OdontogramViewMode) => {
			setLocalMode(newMode);
			try {
				if (typeof setStoreMode === "function") setStoreMode(newMode);
				const currentPrefs = loadUiPreferences();
				saveUiPreferences({ ...currentPrefs, odontogramViewMode: newMode });
			} catch {
				/* safe fallback */
			}
			onViewModeChange?.(newMode);
		},
		[setStoreMode, onViewModeChange],
	);

	return { activeMode, handleModeSwitch };
}
