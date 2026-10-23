/**
 * apps/web/src/components/perio/chart/PerioExpressBanner.tsx
 *
 * Фасад панели экспресс-скрининга ВОЗ/PSR и клинических карточек (Мандат 8b, <= 120 строк).
 */

import type { PsrSextantResult } from "@dental/shared";
import React from "react";
import type { PerioExpressPresetId, PsrCode } from "../perioMath";
import { PerioExpressHeader } from "./PerioExpressHeader";
import { PerioExpressPresetCards } from "./PerioExpressPresetCards";
import { PerioExpressPsrGrid } from "./PerioExpressPsrGrid";
import { PerioExpressTherapistRow } from "./PerioExpressTherapistRow";

export interface PerioExpressBannerProps {
	readonly readOnly?: boolean | undefined;
	readonly isProbeKeyboardEnabled: boolean;
	readonly onToggleProbeKeyboard: (enabled: boolean) => void;
	readonly insertStatus: boolean;
	readonly onInsertToProtocol: () => void;
	readonly isTier3ProbingExpanded: boolean;
	readonly onToggleTier3Probing: () => void;
	readonly onApplyExpressPreset: (presetId: PerioExpressPresetId) => void;
	readonly onApplyTherapistPreset: (presetId: string) => void;
	readonly psrSummaryText: string;
	readonly psrSextants: Record<string, PsrSextantResult>;
	readonly onApplySextantCode: (
		sextantName: string,
		code: PsrCode,
		asterisk?: boolean,
	) => void;
}

export const PerioExpressBanner: React.FC<PerioExpressBannerProps> = React.memo(({
	readOnly = false,
	isProbeKeyboardEnabled,
	onToggleProbeKeyboard,
	insertStatus,
	onInsertToProtocol,
	isTier3ProbingExpanded,
	onToggleTier3Probing,
	onApplyExpressPreset,
	onApplyTherapistPreset,
	psrSummaryText,
	psrSextants,
	onApplySextantCode,
}) => {
	return (
		<div className="flex flex-col gap-3 p-3 sm:p-4 rounded-2xl bg-[var(--paper-soft)] border border-teal-500/30 shadow-xs">
			<PerioExpressHeader
				readOnly={readOnly}
				isProbeKeyboardEnabled={isProbeKeyboardEnabled}
				onToggleProbeKeyboard={onToggleProbeKeyboard}
				insertStatus={insertStatus}
				onInsertToProtocol={onInsertToProtocol}
				isTier3ProbingExpanded={isTier3ProbingExpanded}
				onToggleTier3Probing={onToggleTier3Probing}
			/>

			{/* 7 Clinical Preset Cards */}
			<PerioExpressPresetCards
				readOnly={readOnly}
				onApplyExpressPreset={onApplyExpressPreset}
			/>

			{/* WHO PSR Sextants Grid */}
			<PerioExpressPsrGrid
				readOnly={readOnly}
				psrSummaryText={psrSummaryText}
				psrSextants={psrSextants}
				onApplySextantCode={onApplySextantCode}
			/>

			{/* Secondary Therapist Presets */}
			<PerioExpressTherapistRow
				readOnly={readOnly}
				onApplyTherapistPreset={onApplyTherapistPreset}
			/>
		</div>
	);
});

PerioExpressBanner.displayName = "PerioExpressBanner";
