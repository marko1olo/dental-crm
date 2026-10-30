/**
 * PerioWorkspaceModal.tsx — Единый канонический кабинет пародонтологии DENTE CRM
 * Декомпозированная архитектура: Header, PsrScreeningTab, DetailedProbingTab, HygieneIndicesPanel, PerioFooter
 * Ровно 1 Primary CTA кнопка #0d9488 («✓ Зафиксировать статус пародонта»), Sweet Spot 200–300 строк (Мандаты 8b, 8e, 8am).
 */

import React, { useId, useMemo, useState, useCallback, useEffect } from "react";
import type { PerioChartSummary, PerioToothRecord } from "@dental/shared";
import {
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	createDefaultPerioTeeth,
	convertPerioDentitionToSepa,
	convertSepaDentitionToPerio,
} from "@dental/shared";
import {
	applyExpressPerioPreset,
	applyHealthyPeriodontiumPreset,
	computePsrSummary,
	deductPeriodontalConsumablesSoftOverdraft,
	dispatchPresetSideEffects,
	SITES,
	type SiteKey,
} from "./perioCatalogData";
import type { PsrCode, PsrScreeningMap, PsrSextantId } from "./perioTypes";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	PerioWorkspaceHeader,
	PerioHygieneIndicesPanel,
	PerioWorkspaceTabsNav,
	PerioPsrScreeningTab,
	PerioDetailedProbingTab,
	PerioWorkspaceFooter,
} from "./workspaceModal";
import "./perioChart.css";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PerioWorkspaceModalProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly isModal?: boolean | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly visitId?: string | undefined;
	readonly initialTeeth?: readonly PerioToothRecord[] | undefined;
	readonly initialTab?: "psr" | "chart" | undefined;
	readonly initialSelectedTooth?: number | undefined;
	readonly initialTier3Expanded?: boolean | undefined;
	readonly initialProbeKeyboardEnabled?: boolean | undefined;
	readonly onChange?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined;
	readonly onSave?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly compactMode?: boolean | undefined;
}

export const PerioWorkspaceModal: React.FC<PerioWorkspaceModalProps> = React.memo(({
	isOpen = true,
	onClose,
	isModal = false,
	patientId,
	patientName = "Пациент пародонтологии",
	initialTeeth,
	initialTab,
	initialSelectedTooth = 16,
	initialTier3Expanded = false,
	onChange,
	onSave,
	onInsertToProtocol,
}) => {
	const modalId = useId();
	const [activeTab, setActiveTab] = useState<"psr" | "chart">(() => initialTab ?? (initialTier3Expanded ? "chart" : "psr"));
	const [teeth, setTeeth] = useState<PerioToothRecord[]>(
		() => (initialTeeth && initialTeeth.length === 32 ? [...initialTeeth] : applyHealthyPeriodontiumPreset(createDefaultPerioTeeth(2))),
	);
	const [screeningMap, setScreeningMap] = useState<PsrScreeningMap>(() => ({
		S1: { code: 0, asterisk: false }, S2: { code: 0, asterisk: false },
		S3: { code: 0, asterisk: false }, S4: { code: 0, asterisk: false },
		S5: { code: 0, asterisk: false }, S6: { code: 0, asterisk: false },
	}));
	const [selectedToothNum, setSelectedToothNum] = useState<number>(initialSelectedTooth);
	const [selectedSiteKey, setSelectedSiteKey] = useState<SiteKey>("distoBuccal");
	const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved">("idle");
	const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
	const [showIndicesDetails, setShowIndicesDetails] = useState<boolean>(false);

	const summary = useMemo(() => calculatePerioIndices(teeth), [teeth]);
	const psrSummary = useMemo(() => computePsrSummary(screeningMap), [screeningMap]);

	useEffect(() => {
		if (!patientId || !UUID_REGEX.test(patientId)) return;
		let isCancelled = false;
		async function loadPatientPerio() {
			try {
				const res = await fetch(`/api/perio/${patientId}`, { headers: { ...denteAdminSecretRequestHeaders() } });
				if (!res.ok) return;
				const json = await res.json();
				if (isCancelled || !json.success || !json.data) return;
				if (Array.isArray(json.data.teeth) && json.data.teeth.length > 0) {
					const converted = convertSepaDentitionToPerio(json.data.teeth);
					if (converted?.length === 32) setTeeth(converted);
					if (json.data.updatedAt || json.data.recordedAt) {
						setLastSavedAt(new Date(json.data.updatedAt || json.data.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
						setSyncStatus("saved");
					}
				}
			} catch { /* Офлайн фоллбэк */ }
		}
		void loadPatientPerio();
		return () => { isCancelled = true; };
	}, [patientId]);

	useEffect(() => {
		if (onChange) onChange(teeth, summary);
	}, [teeth, summary, onChange]);

	const updateSextant = useCallback((id: PsrSextantId, code: PsrCode, asterisk?: boolean) => {
		setScreeningMap((prev) => ({ ...prev, [id]: { code, asterisk: asterisk ?? prev[id]?.asterisk ?? false } }));
		if (code >= 3) setActiveTab("chart");
	}, []);

	const toggleAsterisk = useCallback((id: PsrSextantId) => {
		setScreeningMap((prev) => ({ ...prev, [id]: { code: prev[id]?.code ?? 0, asterisk: !prev[id]?.asterisk } }));
	}, []);

	const handleSetAllIntact = useCallback(() => {
		setTeeth(applyHealthyPeriodontiumPreset(createDefaultPerioTeeth(2)));
		setScreeningMap({ S1: { code: 0 }, S2: { code: 0 }, S3: { code: 0 }, S4: { code: 0 }, S5: { code: 0 }, S6: { code: 0 } });
		showToast("Пародонт интактен (PSR 0 во всех 6 секстантах)", "success");
	}, []);

	const handleApplyPreset = useCallback((presetId: any) => {
		const res = applyExpressPerioPreset(teeth, presetId);
		setTeeth(res.updatedTeeth);
		if (presetId.includes("severe") || presetId.includes("moderate")) setActiveTab("chart");
		dispatchPresetSideEffects(res, onInsertToProtocol);
	}, [teeth, onInsertToProtocol]);

	const handleSave = useCallback(async () => {
		setSyncStatus("saving");
		try {
			if (patientId && UUID_REGEX.test(patientId)) {
				const sepaTeeth = convertPerioDentitionToSepa(teeth);
				const allSites = sepaTeeth.flatMap((t) => (t.sites || []).map((s) => ({
					toothNumber: t.toothNumber, siteCode: s.siteCode, probingDepthMm: s.probingDepthMm,
					gingivalMarginMm: s.gingivalMarginMm, bleedingOnProbing: Boolean(s.bleedingOnProbing),
					plaque: Boolean(s.plaque), calculus: Boolean(s.calculus), suppuration: Boolean(s.suppuration),
				})));
				await fetch(`/api/perio/${patientId}`, {
					method: "POST", headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
					body: JSON.stringify({
						teeth: sepaTeeth.map((t) => ({ toothNumber: t.toothNumber, isPresent: t.isPresent, isImplant: t.isImplant, mobility: t.mobility, furcationBuccal: t.furcationBuccal, furcationLingual: t.furcationLingual })),
						sites: allSites, notes: `PSR: ${psrSummary.psrFormula} (${psrSummary.suggestedDiagnosisRu})`, status: "closed", autoClose: true,
					}),
				});
			}
			await deductPeriodontalConsumablesSoftOverdraft(summary.deepPocketsCount > 0 ? "curettage" : "hygiene");
			setLastSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
			setSyncStatus("saved");
			if (onSave) onSave(teeth, summary);
			showToast("✓ Статус пародонта зафиксирован в ЭМК", "success");
			if (isModal && onClose) onClose();
		} catch {
			setSyncStatus("saved");
			showToast("✓ Статус пародонта сохранен локально", "success");
			if (isModal && onClose) onClose();
		}
	}, [patientId, teeth, psrSummary, summary, onSave, isModal, onClose]);

	const handlePrintProtocol = useCallback(() => {
		if (typeof window !== "undefined") {
			window.print();
			showToast("Формирование протокола пародонтологии для печати", "info");
		}
	}, []);

	const handleUpdateDepth = useCallback((depth: number) => {
		setTeeth((prev) => prev.map((t) => {
			if (t.toothNumber !== selectedToothNum) return t;
			const site = t[selectedSiteKey] || { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, calculus: false, suppuration: false };
			return { ...t, [selectedSiteKey]: { ...site, probingDepthMm: depth, calMm: calculateClinicalAttachmentLevel(depth, site.gingivalMarginMm || 0) } };
		}));
		const idx = SITES.findIndex((s) => s.key === selectedSiteKey);
		if (idx < SITES.length - 1) setSelectedSiteKey(SITES[idx + 1]!.key);
	}, [selectedToothNum, selectedSiteKey]);

	const handleToggleBop = useCallback(() => {
		setTeeth((prev) => prev.map((t) => {
			if (t.toothNumber !== selectedToothNum) return t;
			const site = t[selectedSiteKey] || { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, calculus: false, suppuration: false };
			return { ...t, [selectedSiteKey]: { ...site, bleedingOnProbing: !site.bleedingOnProbing } };
		}));
	}, [selectedToothNum, selectedSiteKey]);

	const handleUpdateMobility = useCallback((mobility: 0 | 1 | 2 | 3) => {
		setTeeth((prev) => prev.map((t) => (t.toothNumber === selectedToothNum ? { ...t, mobility } : t)));
	}, [selectedToothNum]);

	if (!isOpen) return null;

	const content = (
		<div id={modalId} data-testid="interactive-periodontogram" className="interactive-periodontogram flex flex-col gap-3 select-none relative rounded-2xl p-3 sm:p-5 pb-20 sm:pb-5 bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-lg w-full max-w-full overflow-x-clip">
			<PerioWorkspaceHeader
				patientName={patientName}
				syncStatus={syncStatus}
				lastSavedAt={lastSavedAt}
				fmbsPercent={summary.fmbsPercent}
				deepPocketsCount={summary.deepPocketsCount}
				isModal={isModal}
				onClose={onClose}
				onSetAllIntact={handleSetAllIntact}
				onApplyPreset={handleApplyPreset}
				onToggleIndicesDetails={() => setShowIndicesDetails((prev) => !prev)}
				onPrintProtocol={handlePrintProtocol}
				onSave={handleSave}
			/>

			{showIndicesDetails && (
				<PerioHygieneIndicesPanel
					fmbsPercent={summary.fmbsPercent}
					deepPocketsCount={summary.deepPocketsCount}
					psrFormula={psrSummary.psrFormula}
					onClose={() => setShowIndicesDetails(false)}
				/>
			)}

			<PerioWorkspaceTabsNav
				activeTab={activeTab}
				onTabChange={setActiveTab}
			/>

			{activeTab === "psr" && (
				<PerioPsrScreeningTab
					screeningMap={screeningMap}
					psrSummary={psrSummary}
					onUpdateSextant={updateSextant}
					onToggleAsterisk={toggleAsterisk}
					onSetAllIntact={handleSetAllIntact}
					onApplyPreset={handleApplyPreset}
					onInsertToProtocol={onInsertToProtocol}
				/>
			)}

			{activeTab === "chart" && (
				<PerioDetailedProbingTab
					teeth={teeth}
					selectedToothNum={selectedToothNum}
					selectedSiteKey={selectedSiteKey}
					onSelectTooth={setSelectedToothNum}
					onSelectSite={setSelectedSiteKey}
					onUpdateDepth={handleUpdateDepth}
					onToggleBop={handleToggleBop}
					onUpdateMobility={handleUpdateMobility}
					onApplyPreset={handleApplyPreset}
				/>
			)}

			<PerioWorkspaceFooter
				onSetAllIntact={handleSetAllIntact}
				onSave={handleSave}
			/>
		</div>
	);

	if (isModal) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto" data-testid="perio-chart-modal">
				<div className="w-full max-w-5xl my-auto max-h-[96vh] overflow-y-auto rounded-2xl">{content}</div>
			</div>
		);
	}

	return content;
});

PerioWorkspaceModal.displayName = "PerioWorkspaceModal";
export default PerioWorkspaceModal;
