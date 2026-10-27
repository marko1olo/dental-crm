/**
 * PerioToothCard.tsx — Карточка зуба с 6 точками зондирования, BOP/PLQ маркерами и SVG-схемой.
 * Архитектурный слой Layer 5: Facade (Мандат 8b, <= 120 строк).
 */

import React from "react";
import type { PerioSiteKey, PerioToothRecord } from "@dental/shared";
import { getToothFolkAndAnatomicalNameRu } from "../../../lib/clinicalProtocols";
import { PerioToothCardHeader } from "./PerioToothCardHeader";
import { PerioToothCardSitesRow, SITE_SHORT_RU } from "./PerioToothCardSitesRow";
import { PerioToothVisual } from "./PerioToothVisual";

export { SITE_SHORT_RU };

export interface PerioToothCardProps {
	readonly tooth: PerioToothRecord;
	readonly isUpper: boolean;
	readonly isSelected: boolean;
	readonly focusedSiteKey: PerioSiteKey | null;
	readonly readOnly: boolean;
	readonly onSelectTooth: () => void;
	readonly onFocusSite: (siteKey: PerioSiteKey) => void;
	readonly onCycleMobility?: (() => void) | undefined;
	readonly onCycleFurcation?: (() => void) | undefined;
	readonly onToggleBop: (siteKey: PerioSiteKey) => void;
	readonly onTogglePlaque: (siteKey: PerioSiteKey) => void;
	readonly onToggleSuppuration: (siteKey: PerioSiteKey) => void;
	readonly onSetProbingDepth: (siteKey: PerioSiteKey, depth: number) => void;
	readonly onSetGingivalMargin: (siteKey: PerioSiteKey, gm: number) => void;
}

const BUCCAL_KEYS: readonly PerioSiteKey[] = ["mesioBuccal", "midBuccal", "distoBuccal"];
const LINGUAL_KEYS: readonly PerioSiteKey[] = ["mesioLingual", "midLingual", "distoLingual"];

export const PerioToothCard: React.FC<PerioToothCardProps> = React.memo(({
	tooth, isUpper, isSelected, focusedSiteKey, readOnly,
	onSelectTooth, onFocusSite, onCycleMobility, onCycleFurcation,
	onToggleBop, onTogglePlaque,
}) => {
	const isMissing = Boolean(tooth.isMissing);
	const isImplant = Boolean(tooth.isImplant);
	const toothName = getToothFolkAndAnatomicalNameRu(tooth.toothNumber);

	return (
		<div
			onClick={onSelectTooth}
			className={`flex flex-col items-center p-1 rounded-xl transition-all select-none border cursor-pointer relative group ${
				isSelected
					? "bg-teal-500/15 border-teal-400 ring-2 ring-teal-400/40 shadow-sm"
					: isMissing
						? "bg-[var(--paper-soft)]/30 border-[var(--line)] opacity-40 hover:opacity-75"
						: isImplant
							? "bg-amber-500/10 border-amber-500/30 hover:border-amber-500"
							: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/50 hover:bg-[var(--paper-soft)]"
			}`}
			title={`Зуб ${tooth.toothNumber} (${toothName})`}
			data-testid={`perio-tooth-card-${tooth.toothNumber}`}
		>
			<PerioToothCardHeader
				tooth={tooth}
				isSelected={isSelected}
				isMissing={isMissing}
				isImplant={isImplant}
				readOnly={readOnly}
				onCycleMobility={onCycleMobility}
				onCycleFurcation={onCycleFurcation}
			/>

			<PerioToothCardSitesRow
				tooth={tooth}
				siteKeys={BUCCAL_KEYS}
				focusedSiteKey={focusedSiteKey}
				readOnly={readOnly}
				onFocusSite={onFocusSite}
				onToggleBop={onToggleBop}
				onTogglePlaque={onTogglePlaque}
			/>

			<div className="w-full my-1 flex items-center justify-center">
				<PerioToothVisual
					toothNumber={tooth.toothNumber}
					isUpper={isUpper}
					isMissing={isMissing}
					isImplant={isImplant}
					buccalPd={tooth.midBuccal?.probingDepthMm ?? 2}
					lingualPd={tooth.midLingual?.probingDepthMm ?? 2}
				/>
			</div>

			<PerioToothCardSitesRow
				tooth={tooth}
				siteKeys={LINGUAL_KEYS}
				focusedSiteKey={focusedSiteKey}
				readOnly={readOnly}
				onFocusSite={onFocusSite}
				onToggleBop={onToggleBop}
				onTogglePlaque={onTogglePlaque}
			/>
		</div>
	);
});

PerioToothCard.displayName = "PerioToothCard";
