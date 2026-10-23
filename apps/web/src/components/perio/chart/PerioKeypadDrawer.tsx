/**
 * PerioKeypadDrawer.tsx — Выдвижная панель ввода глубины карманов (NumPad 1–12 мм) и маркеров.
 * Архитектурный слой Layer 5: Facade (Мандат 8b, <= 120 строк).
 */

import type { PerioSiteKey, PerioToothRecord } from "@dental/shared";
import React from "react";
import { PerioKeypadNumButtons } from "./PerioKeypadNumButtons";
import { PerioKeypadSiteInfo } from "./PerioKeypadSiteInfo";

export interface PerioKeypadDrawerProps {
	readonly focusedSite: {
		toothNumber: number;
		siteKey: PerioSiteKey;
	} | null;
	readonly toothMap: Map<number, PerioToothRecord>;
	readonly isProbeKeyboardEnabled: boolean;
	readonly onToggleProbeKeyboard: (enabled: boolean) => void;
	readonly readOnly?: boolean | undefined;
	readonly onKeypadDepth: (depth: number) => void;
	readonly onToggleBop: () => void;
	readonly onTogglePlaque: () => void;
	readonly onToggleSuppuration: () => void;
	readonly onPrevSite: () => void;
	readonly onNextSite: () => void;
}

export const PerioKeypadDrawer: React.FC<PerioKeypadDrawerProps> = React.memo(({
	focusedSite,
	toothMap,
	isProbeKeyboardEnabled,
	onToggleProbeKeyboard,
	readOnly = false,
	onKeypadDepth,
	onToggleBop,
	onTogglePlaque,
	onToggleSuppuration,
	onPrevSite,
	onNextSite,
}) => {
	const currentTooth = focusedSite ? toothMap.get(focusedSite.toothNumber) : null;
	const currentSite = focusedSite && currentTooth ? currentTooth[focusedSite.siteKey] : null;

	return (
		<div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-teal-500/30 shadow-xs">
			<PerioKeypadSiteInfo
				focusedSite={focusedSite}
				toothMap={toothMap}
				isProbeKeyboardEnabled={isProbeKeyboardEnabled}
				onToggleProbeKeyboard={onToggleProbeKeyboard}
			/>
			<PerioKeypadNumButtons
				readOnly={readOnly}
				currentSite={currentSite}
				onKeypadDepth={onKeypadDepth}
				onToggleBop={onToggleBop}
				onTogglePlaque={onTogglePlaque}
				onToggleSuppuration={onToggleSuppuration}
				onPrevSite={onPrevSite}
				onNextSite={onNextSite}
			/>
		</div>
	);
});

PerioKeypadDrawer.displayName = "PerioKeypadDrawer";
