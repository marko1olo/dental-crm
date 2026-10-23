/**
 * apps/web/src/components/perio/chart/MobilePerioKeypadDial.tsx
 *
 * DENTE Dental CRM — Сенсорный клинический пульт пародонтологии для смартфонов и планшетов
 * Apple HIG Touch Ergonomics (Мандаты 8e, 8n, 8am).
 * Архитектурный слой Layer 5: Facade (Мандат 8b, <= 120 строк).
 */

import React, { memo } from "react";
import type { PerioSiteKey } from "@dental/shared";
import { triggerHaptic } from "../../../native/mobileBridge";
import { MobilePerioKeypadButtons } from "./MobilePerioKeypadButtons";
import { MobilePerioKeypadHeader } from "./MobilePerioKeypadHeader";

export const SITE_NAME_FULL_RU: Record<PerioSiteKey, string> = {
	distoBuccal: "Дистально-щечная (ДВ)",
	midBuccal: "Щечная (В)",
	mesioBuccal: "Медиально-щечная (МВ)",
	distoLingual: "Дистально-язычная (ДО)",
	midLingual: "Язычная (О)",
	mesioLingual: "Медиально-язычная (МО)",
};

export interface MobilePerioKeypadDialProps {
	readonly selectedToothNumber: number;
	readonly currentFocusedSiteKey: PerioSiteKey;
	readonly currentPd: number;
	readonly currentBop: boolean;
	readonly currentPlq: boolean;
	readonly currentPus: boolean;
	readonly readOnly?: boolean | undefined;
	readonly onKeypadDepth: (depth: number) => void;
	readonly onToggleBop: () => void;
	readonly onTogglePlaque: () => void;
	readonly onToggleSuppuration: () => void;
	readonly onPrevSite?: (() => void) | undefined;
	readonly onNextSite?: (() => void) | undefined;
	readonly onSetToothNorm?: (() => void) | undefined;
	readonly onSetToothPathology?: ((depth: number, hasBop: boolean) => void) | undefined;
}

export const MobilePerioKeypadDial: React.FC<MobilePerioKeypadDialProps> = memo(({
	selectedToothNumber,
	currentFocusedSiteKey,
	currentPd,
	currentBop,
	currentPlq,
	currentPus,
	readOnly = false,
	onKeypadDepth,
	onToggleBop,
	onTogglePlaque,
	onToggleSuppuration,
	onPrevSite,
	onNextSite,
	onSetToothNorm,
}) => {
	const handleDepthTap = (depth: number) => {
		triggerHaptic("selection");
		onKeypadDepth(depth);
	};

	const handleToothNorm = () => {
		triggerHaptic("selection");
		if (onSetToothNorm) {
			onSetToothNorm();
		} else {
			onKeypadDepth(2);
		}
	};

	return (
		<div
			className="sticky bottom-0 z-20 w-full p-2.5 sm:p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] rounded-2xl bg-[var(--paper)]/95 backdrop-blur-md border border-[var(--line)] shadow-xl flex flex-col gap-2 select-none"
			data-testid="mobile-perio-keypad-dial"
		>
			<MobilePerioKeypadHeader
				selectedToothNumber={selectedToothNumber}
				currentFocusedSiteKey={currentFocusedSiteKey}
				currentPd={currentPd}
				readOnly={readOnly}
				onToothNorm={handleToothNorm}
				onPrevSite={onPrevSite}
				onNextSite={onNextSite}
			/>

			<MobilePerioKeypadButtons
				readOnly={readOnly}
				currentBop={currentBop}
				currentPlq={currentPlq}
				currentPus={currentPus}
				onDepthTap={handleDepthTap}
				onToggleBop={onToggleBop}
				onTogglePlaque={onTogglePlaque}
				onToggleSuppuration={onToggleSuppuration}
			/>
		</div>
	);
});

MobilePerioKeypadDial.displayName = "MobilePerioKeypadDial";
