/**
 * apps/web/src/components/perio/chart/PerioMobileTouchCockpit.tsx
 *
 * Сенсорная карта пародонта для смартфонов и планшетов (Apple HIG 390x844).
 * Архитектурный слой Layer 4: UI View (Мандат 8b, <= 120 строк).
 */

import { calculateClinicalAttachmentLevel, PERIO_SITE_KEYS, type PerioChartSummary, type PerioSiteKey, type PerioToothRecord, type PeriodontalDiagnosisDetail } from "@dental/shared";
import { Save } from "lucide-react";
import React, { useState } from "react";
import type { PerioExpressPresetId, PsrCode } from "../perioMath";
import { MobilePerioKeypadDial } from "./MobilePerioKeypadDial";
import { PerioMobileCockpitHeader } from "./PerioMobileCockpitHeader";
import { PerioMobileCockpitKpi } from "./PerioMobileCockpitKpi";
import { PerioMobileDrawer } from "./PerioMobileDrawer";
import { PerioMobileQuadrantBar, type PerioQuadrantKey } from "./PerioMobileQuadrantBar";
import { PerioMobileToothCard } from "./PerioMobileToothCard";

export interface PerioMobileTouchCockpitProps {
	readonly toothMap: Map<number, PerioToothRecord>;
	readonly selectedToothNumber: number;
	readonly onSelectTooth: (num: number) => void;
	readonly focusedSite: { toothNumber: number; siteKey: PerioSiteKey } | null;
	readonly onFocusSite: (num: number, key: PerioSiteKey) => void;
	readonly readOnly?: boolean | undefined;
	readonly onKeypadDepth: (depth: number) => void;
	readonly onToggleBop: () => void;
	readonly onTogglePlaque: () => void;
	readonly onToggleSuppuration: () => void;
	readonly onPrevSite: () => void;
	readonly onNextSite: () => void;
	readonly onCycleMobility: (num: number) => void;
	readonly onCycleFurcation: (num: number) => void;
	readonly updateToothSite: (num: number, key: PerioSiteKey, updater: (p: PerioToothRecord[PerioSiteKey]) => Partial<PerioToothRecord[PerioSiteKey]>) => void;
	readonly updateToothProperties: (num: number, patch: Partial<Pick<PerioToothRecord, "isMissing" | "isImplant" | "mobility" | "furcation">>) => void;
	readonly summary: PerioChartSummary;
	readonly aapDiagnosis: PeriodontalDiagnosisDetail;
	readonly onApplyExpressPreset: (presetId: PerioExpressPresetId) => void;
	readonly onSetAllIntact: () => void;
	readonly onInsertToProtocol: () => void;
	readonly insertStatus: boolean;
	readonly onApplySextantCode?: ((sextantName: string, code: PsrCode, asterisk?: boolean) => void) | undefined;
	readonly onSaveDraft?: (() => void) | undefined;
	readonly syncStatus?: string | undefined;
}

export const PerioMobileTouchCockpit: React.FC<PerioMobileTouchCockpitProps> = React.memo(({
	toothMap, selectedToothNumber, onSelectTooth, focusedSite, onFocusSite, readOnly = false,
	onKeypadDepth, onToggleBop, onTogglePlaque, onToggleSuppuration, onPrevSite, onNextSite,
	onCycleMobility, onCycleFurcation, updateToothSite, updateToothProperties, summary,
	aapDiagnosis, onApplyExpressPreset, onSetAllIntact, onInsertToProtocol, insertStatus,
	onApplySextantCode, onSaveDraft, syncStatus = "idle",
}) => {
	const [activeQuadrant, setActiveQuadrant] = useState<PerioQuadrantKey>("Q1");
	const [isPsrDrawerOpen, setIsPsrDrawerOpen] = useState<boolean>(false);
	const selectedTooth = toothMap.get(selectedToothNumber);
	const isUpper = selectedToothNumber >= 11 && selectedToothNumber <= 28;
	const isRight = (selectedToothNumber >= 11 && selectedToothNumber <= 18) || (selectedToothNumber >= 41 && selectedToothNumber <= 48);
	const buccalSites: PerioSiteKey[] = isRight ? ["distoBuccal", "midBuccal", "mesioBuccal"] : ["mesioBuccal", "midBuccal", "distoBuccal"];
	const lingualSites: PerioSiteKey[] = isRight ? ["distoLingual", "midLingual", "mesioLingual"] : ["mesioLingual", "midLingual", "distoLingual"];
	const currentFocusedSiteKey = focusedSite?.toothNumber === selectedToothNumber ? focusedSite.siteKey : "midBuccal";
	const currentSiteData = selectedTooth?.[currentFocusedSiteKey];

	return (
		<div className="perio-mobile-touch-cockpit flex flex-col gap-3 w-full max-w-full overflow-x-clip select-none" data-testid="perio-mobile-cockpit">
			<PerioMobileCockpitHeader
				aapDiagnosis={aapDiagnosis}
				insertStatus={insertStatus}
				onApplyExpressPreset={onApplyExpressPreset}
				onInsertToProtocol={onInsertToProtocol}
				onOpenPsrDrawer={() => setIsPsrDrawerOpen(true)}
			/>
			<PerioMobileCockpitKpi summary={summary} />
			<PerioMobileQuadrantBar
				activeQuadrant={activeQuadrant} onSelectQuadrant={setActiveQuadrant} selectedToothNumber={selectedToothNumber}
				toothMap={toothMap} onSelectTooth={onSelectTooth} onFocusSite={(num, key) => onFocusSite(num, key as PerioSiteKey)}
			/>
			{selectedTooth && (
				<PerioMobileToothCard
					selectedTooth={selectedTooth} focusedSiteKey={currentFocusedSiteKey} readOnly={readOnly} isUpper={isUpper}
					buccalSites={buccalSites} lingualSites={lingualSites} onFocusSite={onFocusSite} onCycleMobility={onCycleMobility}
					onCycleFurcation={onCycleFurcation} updateToothProperties={updateToothProperties}
				/>
			)}
			<MobilePerioKeypadDial
				selectedToothNumber={selectedToothNumber} currentFocusedSiteKey={currentFocusedSiteKey}
				currentPd={currentSiteData?.probingDepthMm ?? 2} currentBop={currentSiteData?.bleedingOnProbing ?? false}
				currentPlq={currentSiteData?.plaque ?? false} currentPus={currentSiteData?.suppuration ?? false}
				readOnly={readOnly} onKeypadDepth={onKeypadDepth} onToggleBop={onToggleBop} onTogglePlaque={onTogglePlaque}
				onToggleSuppuration={onToggleSuppuration} onPrevSite={onPrevSite} onNextSite={onNextSite}
				onSetToothNorm={() => {
					for (const key of PERIO_SITE_KEYS) updateToothSite(selectedToothNumber, key, () => ({ probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, suppuration: false, plaque: false, calMm: 2 }));
					updateToothProperties(selectedToothNumber, { mobility: 0, furcation: 0 });
				}}
				onSetToothPathology={(depth, hasBop) => {
					for (const key of PERIO_SITE_KEYS) updateToothSite(selectedToothNumber, key, (p) => ({ probingDepthMm: depth, bleedingOnProbing: hasBop, calMm: calculateClinicalAttachmentLevel(depth, p.gingivalMarginMm ?? 0) }));
				}}
			/>
			{onSaveDraft && (
				<div className="w-full pt-1 pb-2">
					<button
						type="button" onClick={onSaveDraft} disabled={syncStatus === "saving"}
						className="primary-button button-lg min-h-[48px] h-12 w-full font-bold shadow-md"
						data-testid="perio-mobile-save-primary-btn"
					>
						<Save size={18} className={syncStatus === "saving" ? "animate-spin text-white" : "text-white"} />
						<span>Сохранить периодонтограмму</span>
					</button>
				</div>
			)}
			<PerioMobileDrawer
				isOpen={isPsrDrawerOpen}
				onClose={() => setIsPsrDrawerOpen(false)}
				onApplyNormAll={onSetAllIntact}
				onApplySextantCode={onApplySextantCode}
			/>
		</div>
	);
});

PerioMobileTouchCockpit.displayName = "PerioMobileTouchCockpit";
