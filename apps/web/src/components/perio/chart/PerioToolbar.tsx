/**
 * apps/web/src/components/perio/chart/PerioToolbar.tsx
 *
 * Верхний тулбар пародонтологической карты (Мандат 8b, <= 120 строк).
 */

import type { PeriodontalDiagnosisDetail } from "@dental/shared";
import React from "react";
import type { PerioExpressPresetId } from "../perioMath";
import { PerioToolbarActions } from "./PerioToolbarActions";
import { PerioToolbarInfo } from "./PerioToolbarInfo";

export interface PerioToolbarProps {
	readonly aapDiagnosis: PeriodontalDiagnosisDetail;
	readonly readOnly?: boolean | undefined;
	readonly selectedToothNumber: number;
	readonly isHygieneExpanded: boolean;
	readonly insertStatus: boolean;
	readonly copyStatus: boolean;
	readonly syncStatus?: "idle" | "loading" | "saving" | "synced" | "closed" | "error" | undefined;
	readonly lastSavedAt?: Date | null | undefined;
	readonly onSaveDraft?: (() => void) | undefined;
	readonly onApplyExpressPreset: (presetId: PerioExpressPresetId) => void;
	readonly onSetAllIntact: () => void;
	readonly onMarkSelectedToothPathology: (depth: number, hasBop: boolean) => void;
	readonly onMarkBopOnDeepPockets: () => void;
	readonly onClearPlaque: () => void;
	readonly onToggleHygieneExpanded: () => void;
	readonly onInsertToProtocol: () => void;
	readonly onCopyProtocol: () => void;
	readonly onToggleHelp: () => void;
}

export const PerioToolbar: React.FC<PerioToolbarProps> = React.memo(({
	aapDiagnosis, readOnly = false, syncStatus = "idle",
	insertStatus, copyStatus, onSaveDraft, onApplyExpressPreset,
	onSetAllIntact, onMarkBopOnDeepPockets, onClearPlaque,
	onInsertToProtocol, onCopyProtocol, onToggleHelp,
}) => {
	return (
		<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
			<PerioToolbarInfo aapDiagnosis={aapDiagnosis} syncStatus={syncStatus} />
			<PerioToolbarActions
				readOnly={readOnly}
				insertStatus={insertStatus}
				copyStatus={copyStatus}
				syncStatus={syncStatus}
				onSaveDraft={onSaveDraft}
				onApplyExpressPreset={onApplyExpressPreset}
				onSetAllIntact={onSetAllIntact}
				onMarkBopOnDeepPockets={onMarkBopOnDeepPockets}
				onClearPlaque={onClearPlaque}
				onInsertToProtocol={onInsertToProtocol}
				onCopyProtocol={onCopyProtocol}
				onToggleHelp={onToggleHelp}
			/>
		</div>
	);
});

PerioToolbar.displayName = "PerioToolbar";
