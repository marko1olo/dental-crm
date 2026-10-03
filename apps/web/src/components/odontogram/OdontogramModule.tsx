import { calculateAge } from "@dental/shared";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evaluatePatientSafetyFlags, isNegativeAllergyStatement } from "../patients/safetyMath";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { panelStateText } from "../../lib/panelStateText";
import { PanelLoadFailure } from "../PanelLoadFailure";
import {
	ALL_ADULT_TEETH_NUMBERS,
	createDefaultAdultTeethData,
	type ToothData,
	type ToothState,
} from "./ToothChart";
import { OdontogramViewContainer } from "./OdontogramViewContainer";
import type { CheckoutPaymentMethodType } from "../payments/checkout/fastCheckoutPresets";
import { calculateLiveInvoiceItems } from "./OdontogramLiveInvoice";
import {
	generateSoapFromOdontogramFinding,
	generateSoapFromOdontogramStates,
} from "../../lib/clinicalProtocols043";
import "./odontogram.css";
import { usePerspectiveStore } from "../../store/perspectiveStore";
import { useAppStore } from "../../store/appStore";

import {
	TOOTH_STATE_ACTIONS,
	TEETH_SUBJECT,
	getInitialShowcaseTeeth,
} from "./odontogramModuleConstants";
import {
	ToothActionMenuPortal,
	type ToothActionMenuConfig,
} from "./ToothActionMenuPortal";
import { ToothRadialMenu } from "./ToothRadialMenu";
import { OdontogramAiBanners } from "./OdontogramAiBanners";
import { OdontogramPrintA4 } from "./OdontogramPrintA4";
import { OdontogramModalsLayer } from "./OdontogramModalsLayer";
import { useOdontogramSync } from "./useOdontogramSync";
import { useOdontogramAiIntegration } from "./useOdontogramAiIntegration";
import { useOdontogramQuickActions } from "./useOdontogramQuickActions";
import {
	CLINICAL_SERVICE_BUNDLES,
	type ClinicalServiceBundle,
} from "../visit/clinicalServiceBundles";

function getClinicalBundleForToothState(state: ToothState): ClinicalServiceBundle | null {
	if (state === "Caries") {
		return CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "caries") ?? null;
	}
	if (state === "Pulpitis" || state === "Periodontitis") {
		return CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "endo_1") ?? null;
	}
	if (state === "Missing") {
		return CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "surgery_extraction") ?? null;
	}
	return null;
}

// Re-exports for 100% backward compatibility
export {
	ALL_ADULT_TEETH_NUMBERS,
	createDefaultAdultTeethData,
	TOOTH_STATE_ACTIONS,
	TEETH_SUBJECT,
	getInitialShowcaseTeeth,
	ToothActionMenuPortal,
	OdontogramAiBanners,
	OdontogramPrintA4,
	OdontogramModalsLayer,
	useOdontogramSync,
	useOdontogramAiIntegration,
	useOdontogramQuickActions,
};

// PeriodontogramChart is strictly lazy-loaded via import("../perio/PeriodontogramChart") inside OdontogramModalsLayer

export interface OdontogramModuleProps {
	patientId: string;
	pediatricMode?: boolean | undefined;
	dentitionMode?: "adult" | "pediatric" | "mixed" | undefined;
}

export const OdontogramModule = React.memo(({
	patientId,
	pediatricMode,
	dentitionMode: propDentitionMode,
}: OdontogramModuleProps) => {
	const { odontogramUseSurfaces, activePatient, activeDoctor, auth } =
		useAppLogicContext();

	const [menuConfig, setMenuConfig] = useState<ToothActionMenuConfig | null>(null);
	const [radialMenuData, setRadialMenuData] = useState<{
		toothNumber: number;
		anchorRect: { x: number; y: number; width: number; height: number };
		currentState: ToothState;
		surfaces?: readonly string[] | undefined;
	} | null>(null);
	const [historyTooth, setHistoryTooth] = useState<number | null>(null);
	const [endoTooth, setEndoTooth] = useState<number | null>(null);
	const [contextDrawerTooth, setContextDrawerTooth] = useState<number | null>(null);

	const [isFastCheckoutOpen, setIsFastCheckoutOpen] = useState(false);
	const [fastCheckoutMethod, setFastCheckoutMethod] = useState<CheckoutPaymentMethodType>("sbp_qr");
	const [isPediatricModalOpen, setIsPediatricModalOpen] = useState(false);
	const [isEstimatorOpen, setIsEstimatorOpen] = useState(false);
	const [isPerioOpen, setIsPerioOpen] = useState(false);
	const [isVoiceOpen, setIsVoiceOpen] = useState(false);

	const clearMenu = useCallback(() => {
		setMenuConfig(null);
	}, []);

	// Primary sync hook for data hydration, local persistence, and real-time updates
	const {
		teethData,
		setTeethData,
		teethLoad,
		setTeethReloadToken,
		teethDataRef,
		selectedTeeth,
		setSelectedTeeth,
		activeSurfaces,
		setActiveSurfaces,
		activeSurfacesRef,
		isMultiSelectMode,
		setIsMultiSelectMode,
		updateToothState,
	} = useOdontogramSync({
		patientId,
		pediatricMode,
		onClearMenu: clearMenu,
	});

	// AI and Diagnocat findings proposal integration
	const {
		diagnocatLoading,
		diagnocatPendingReport,
		loadDiagnocatReport,
		handleApplyDiagnocatFindings,
		handleRejectDiagnocatFindings,
		aiPendingProposal,
		setAiPendingProposal,
		handleApplyAiProposal,
		handleRejectAiProposal,
	} = useOdontogramAiIntegration({
		patientId,
		setTeethData,
		updateToothState,
	});

	// Auto-compute live invoice items and gross total in rubles for In-Chair Hot Path Cockpit
	const liveInvoiceItems = useMemo(() => {
		return calculateLiveInvoiceItems(teethData);
	}, [teethData]);

	const liveGrossTotalRub = useMemo(() => {
		return liveInvoiceItems.reduce(
			(acc, item) => acc + item.price * item.quantity,
			0,
		);
	}, [liveInvoiceItems]);

	// Extract allergy and somatic risk warnings from active patient
	const allergyText = useMemo(() => {
		const pat = activePatient as any;
		if (!pat) return null;
		if (pat.allergies && !isNegativeAllergyStatement(String(pat.allergies))) return String(pat.allergies);
		if (pat.anamnesis?.allergies && !isNegativeAllergyStatement(String(pat.anamnesis.allergies))) return String(pat.anamnesis.allergies);
		if (pat.clinicalSafetyProfile) {
			const flags = evaluatePatientSafetyFlags(pat.clinicalSafetyProfile);
			const allergyFlags = flags.activeFlags.filter(
				(f: { category: string }) =>
					f.category === "anesthesia_allergy" || f.category === "general_allergy",
			);
			if (allergyFlags.length > 0) {
				return allergyFlags.map((f: { shortBadge: string; titleRu: string }) => f.shortBadge || f.titleRu).join(", ");
			}
			if (
				pat.clinicalSafetyProfile.customAllergyNotes &&
				!isNegativeAllergyStatement(String(pat.clinicalSafetyProfile.customAllergyNotes))
			) {
				return String(pat.clinicalSafetyProfile.customAllergyNotes);
			}
		}
		if (
			typeof pat.notes === "string" &&
			/аллерг|новокаин|лидокаин|артикаин/i.test(pat.notes) &&
			!isNegativeAllergyStatement(pat.notes)
		) {
			return pat.notes;
		}
		return null;
	}, [activePatient]);

	const perspective = usePerspectiveStore((state) => state.perspective);
	const patientAge = useMemo(() => {
		const bDate = (activePatient as { birthDate?: string | null } | undefined)?.birthDate;
		if (!bDate) return null;
		return calculateAge(bDate);
	}, [activePatient]);

	const initialSmartMode = useMemo<"adult" | "pediatric" | "mixed">(() => {
		if (propDentitionMode) return propDentitionMode;
		if (pediatricMode !== undefined) return pediatricMode ? "pediatric" : "adult";
		if (patientAge !== null) {
			if (patientAge < 6) return "pediatric";
			if (patientAge < 12) return "mixed";
			return "adult";
		}
		if (perspective === "pediatric") return "pediatric";
		return "adult";
	}, [propDentitionMode, pediatricMode, patientAge, perspective]);

	const [dentitionMode, setDentitionMode] = useState<"adult" | "pediatric" | "mixed">(initialSmartMode);
	const isPediatricMode = dentitionMode === "pediatric" || dentitionMode === "mixed";
	const setIsPediatricMode = useCallback((val: boolean) => {
		setDentitionMode(val ? "pediatric" : "adult");
	}, []);

	// Doctor autonomy: honor explicit prop override when it changes
	useEffect(() => {
		if (propDentitionMode) {
			setDentitionMode(propDentitionMode);
		}
	}, [propDentitionMode]);

	// When patient changes, automatically derive initial smart mode, but preserve chairside doctor manual switch
	const lastPatientIdRef = useRef(patientId);
	useEffect(() => {
		if (lastPatientIdRef.current !== patientId) {
			lastPatientIdRef.current = patientId;
			setDentitionMode(initialSmartMode);
		}
	}, [patientId, initialSmartMode]);

	// Quick Clinical Actions and 1-Click Lab Orders
	const {
		handleMarkAllHealthy,
		handleMarkWisdomMissing,
		handleSyncAllToDiary,
		handleOneClickLabOrder,
	} = useOdontogramQuickActions({
		patientId,
		activeDoctor,
		isPediatricMode,
		dentitionMode,
		teethData,
		teethDataRef,
		updateToothState,
	});

	const handleApplyToothState = useCallback(
		(state: ToothState) => {
			if (!menuConfig) return;
			const num = menuConfig.toothNumber;
			const targets =
				selectedTeeth.length > 0 && selectedTeeth.includes(num)
					? selectedTeeth
					: [num];
			// Если activeSurfaces.length === 0, состояние применяется ко всему зубу целиком (surfaces = undefined / [])
			const toothSurfaces =
				activeSurfaces.length > 0 ? [...activeSurfaces] : undefined;
			void updateToothState(targets, state, toothSurfaces ?? []);
			try {
				const findingPayload =
					toothSurfaces && toothSurfaces.length > 0
						? {
								toothNumber: num,
								state,
								surfaces: toothSurfaces,
						  }
						: { toothNumber: num, state };
				const soap = generateSoapFromOdontogramFinding(findingPayload);
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							finding: findingPayload,
							soap,
							mode: "smart_append",
							immediate: true,
						},
					}),
				);

				const bundle = getClinicalBundleForToothState(state);
				if (bundle) {
					targets.forEach((tNum) => {
						window.dispatchEvent(
							new CustomEvent("dente-add-services-to-invoice", {
								detail: {
									bundleId: bundle.id,
									bundleTitle: bundle.title,
									toothNumber: tNum,
									toothCode: String(tNum),
									patientId,
									source: "odontogram_bundle",
									services: bundle.services.map((s, idx) => ({
										id: `srv_${patientId || "pat"}_tooth_${tNum}_${bundle.id}_${s.code804n}_${idx}`,
										code: s.code804n,
										code804n: s.code804n,
										title: s.title,
										price: s.priceRub,
										priceRub: s.priceRub,
										unitPriceRub: s.priceRub,
										quantity: 1,
										toothCode: String(tNum),
										toothNumber: tNum,
									})),
								},
							}),
						);
					});
				}
			} catch {
				// Safe event dispatch fallback
			}
			setMenuConfig(null);
		},
		[menuConfig, selectedTeeth, updateToothState, activeSurfaces, patientId],
	);

	// Hotkey handling for radial menu
	useEffect(() => {
		if (!menuConfig) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable)
			) {
				return;
			}

			if (e.key === "Escape") {
				e.preventDefault();
				setMenuConfig(null);
				return;
			}

			const key = e.key.toLowerCase();
			if (key === "c" || key === "с") {
				e.preventDefault();
				handleApplyToothState("Caries");
			} else if (key === "p" || key === "п") {
				e.preventDefault();
				handleApplyToothState("Pulpitis");
			} else if (key === "t" || key === "т") {
				e.preventDefault();
				handleApplyToothState("Periodontitis");
			} else if (key === "f" || key === "а") {
				e.preventDefault();
				handleApplyToothState("Filled");
			} else if (key === "k" || key === "к" || key === "r") {
				e.preventDefault();
				handleApplyToothState("Crown");
			} else if (key === "i" || key === "ш") {
				e.preventDefault();
				handleApplyToothState("Implant");
			} else if (key === "x" || key === "ч") {
				e.preventDefault();
				handleApplyToothState("Missing");
			} else if (key === "0" || key === "h" || key === "з") {
				e.preventDefault();
				handleApplyToothState("Healthy");
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [menuConfig, handleApplyToothState]);

	const containerRef = useRef<HTMLDivElement>(null);

	const handleToothClick = (
		arg1: number | React.MouseEvent,
		arg2?: DOMRect | number,
		surface?: string,
	) => {
		let toothNumber: number;
		let rect: DOMRect;
		if (typeof arg1 === "number") {
			toothNumber = arg1;
			rect =
				(arg2 as DOMRect) ||
				(typeof DOMRect !== "undefined"
					? new DOMRect(0, 0, 0, 0)
					: ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect));
		} else {
			toothNumber = typeof arg2 === "number" ? arg2 : 0;
			const el =
				(arg1?.currentTarget as HTMLElement) ??
				(arg1?.target as HTMLElement);
			rect =
				el && typeof el.getBoundingClientRect === "function"
					? el.getBoundingClientRect()
					: typeof DOMRect !== "undefined"
						? new DOMRect(0, 0, 0, 0)
						: ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
		}
		if (!toothNumber) return;
		useAppStore.getState().setActiveTooth(toothNumber);
		if (isMultiSelectMode) {
			const next = selectedTeeth.includes(toothNumber)
				? selectedTeeth.filter((t) => t !== toothNumber)
				: [...selectedTeeth, toothNumber];
			setSelectedTeeth(next);
			if (next.length > 0) {
				const isUpperJaw =
					toothNumber < 30 || (toothNumber >= 51 && toothNumber <= 65);
				const menuW = 270;
				const menuH = 400;
				const gap = 12;
				const vw = typeof window !== "undefined" ? window.innerWidth : 1440;

				let x = rect.left + rect.width / 2 - menuW / 2;
				let y = isUpperJaw ? rect.bottom + gap + 10 : rect.top - menuH - gap - 10;
				const clampedX = Math.max(8, Math.min(x, vw - menuW - 8));
				let caretOffset = 50;
				if (clampedX !== x) {
					const toothCenter = rect.left + rect.width / 2;
					caretOffset = ((toothCenter - clampedX) / menuW) * 100;
				}
				x = clampedX;
				const vh = typeof window !== "undefined" ? window.innerHeight : 900;
				y = Math.max(10, Math.min(vh - 400, y));

				setMenuConfig({
					toothNumber,
					x,
					y,
					position: isUpperJaw ? "bottom" : "top",
					caretOffset,
					surfaces: activeSurfaces,
				});
			} else {
				setMenuConfig(null);
			}
		} else {
			let activeSelection = selectedTeeth;
			let currentSurfaces: string[] = [];

			if (!odontogramUseSurfaces) {
				surface = undefined;
			}

			if (!selectedTeeth.includes(toothNumber)) {
				activeSelection = [toothNumber];
				setSelectedTeeth(activeSelection);
				// Базово: сбрасываем поверхности в [], не подтягивая случайные поверхности из старых состояний
				currentSurfaces = [];
			} else if (!surface) {
				// Обычный повторный клик по зубу без указания поверхности также сбрасывает поверхности в []
				currentSurfaces = [];
			} else {
				currentSurfaces = [...activeSurfaces];
			}

			// Если врач явно кликнул на конкретную поверхность в активном режиме поверхностей
			if (surface && activeSelection.length === 1 && odontogramUseSurfaces) {
				if (currentSurfaces.includes(surface)) {
					currentSurfaces = currentSurfaces.filter((s) => s !== surface);
				} else {
					currentSurfaces = [...currentSurfaces, surface];
				}
			}

			if (activeSelection.length !== 1 || !odontogramUseSurfaces) {
				currentSurfaces = [];
			}

			setActiveSurfaces(currentSurfaces);

			const isUpperJaw =
				toothNumber < 30 || (toothNumber >= 51 && toothNumber <= 65);
			const menuW = 254;
			const menuH = 380;
			const gap = 12;
			const vw = window.innerWidth;

			let x = rect.left + rect.width / 2 - menuW / 2;
			let y = isUpperJaw ? rect.bottom + 10 : rect.top - menuH - 10;

			const clampedX = Math.max(8, Math.min(x, vw - menuW - 8));
			let caretOffset = 50;
			if (clampedX !== x) {
				const toothCenter = rect.left + rect.width / 2;
				caretOffset = ((toothCenter - clampedX) / menuW) * 100;
			}
			x = clampedX;
			if (isUpperJaw) {
				y = rect.bottom + gap + 10;
			} else {
				y = rect.top - menuH - gap - 10;
			}
			y = Math.max(10, Math.min(window.innerHeight - 400, y));

			setMenuConfig({
				toothNumber,
				x,
				y,
				position: isUpperJaw ? "bottom" : "top",
				caretOffset,
				...(currentSurfaces.length > 0 ? { surfaces: currentSurfaces } : {}),
			});

			const currentTooth = teethDataRef.current.find((t) => t.toothNumber === toothNumber);
			setRadialMenuData({
				toothNumber,
				anchorRect: {
					x: rect.left,
					y: rect.top,
					width: rect.width || 48,
					height: rect.height || 90,
				},
				currentState: currentTooth?.state ?? "Healthy",
				surfaces: currentSurfaces.length > 0 ? currentSurfaces : undefined,
			});
		}
	};

	const handleQuickStateChange = useCallback(
		(targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => {
			void updateToothState(targets, state, surfaces ? [...surfaces] : undefined);
			try {
				const findings = targets.map((num) => {
					const existing = teethDataRef.current.find((t) => t.toothNumber === num);
					const toothSurfaces =
						surfaces && surfaces.length > 0
							? surfaces
							: existing?.surfaces && existing.surfaces.length > 0
								? existing.surfaces
								: undefined;
					return toothSurfaces && toothSurfaces.length > 0
						? { toothNumber: num, state, surfaces: toothSurfaces }
						: { toothNumber: num, state };
				});
				const soap =
					findings.length > 1
						? generateSoapFromOdontogramStates(findings)
						: generateSoapFromOdontogramFinding(findings[0]!);
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							finding: findings[0],
							soap,
							mode: "smart_append",
							immediate: true,
						},
					}),
				);

				const bundle = getClinicalBundleForToothState(state);
				if (bundle) {
					targets.forEach((tNum) => {
						window.dispatchEvent(
							new CustomEvent("dente-add-services-to-invoice", {
								detail: {
									bundleId: bundle.id,
									bundleTitle: bundle.title,
									toothNumber: tNum,
									toothCode: String(tNum),
									patientId,
									source: "odontogram_bundle",
									services: bundle.services.map((s, idx) => ({
										id: `srv_${patientId || "pat"}_tooth_${tNum}_${bundle.id}_${s.code804n}_${idx}`,
										code: s.code804n,
										code804n: s.code804n,
										title: s.title,
										price: s.priceRub,
										priceRub: s.priceRub,
										unitPriceRub: s.priceRub,
										quantity: 1,
										toothCode: String(tNum),
										toothNumber: tNum,
									})),
								},
							}),
						);
					});
				}
			} catch {
				// Safe event dispatch fallback
			}
		},
		[updateToothState, teethDataRef, patientId],
	);

	const handleOpenVoiceDictation = useCallback(() => setIsVoiceOpen(true), []);
	const handleOpenPediatricModal = useCallback(() => setIsPediatricModalOpen(true), []);
	const handleTogglePerio = useCallback(() => setIsPerioOpen((prev) => !prev), []);
	const handleToggleEstimator = useCallback(() => setIsEstimatorOpen((prev) => !prev), []);
	const handleToggleMultiSelect = useCallback((enabled: boolean) => {
		setIsMultiSelectMode(enabled);
		if (!enabled) setMenuConfig(null);
	}, [setIsMultiSelectMode]);
	const handleSelectTeethGroup = useCallback((targets: number[]) => {
		setSelectedTeeth(targets);
		setIsMultiSelectMode(true);
	}, [setSelectedTeeth, setIsMultiSelectMode]);

	return (
		<div className="flex flex-col gap-1.5 w-full text-[var(--odontogram-ink,#0f172a)]">
			<div
				className="w-full min-w-0 flex flex-col gap-1.5 relative"
				ref={containerRef}
			>
				{/* Accessibility loading announcement without causing CLS layout shift */}
				{teethLoad.phase === "loading" && (
					<div
						role="status"
						aria-live="polite"
						className="sr-only"
					>
						{panelStateText(TEETH_SUBJECT, { phase: "loading" }).title}
					</div>
				)}
				{teethLoad.phase === "failed" && (
					<PanelLoadFailure
						subject={TEETH_SUBJECT}
						status={teethLoad.status}
						onRetry={() => setTeethReloadToken((token) => token + 1)}
					/>
				)}

				<OdontogramAiBanners
					diagnocatPendingReport={diagnocatPendingReport}
					onApplyDiagnocat={handleApplyDiagnocatFindings}
					onRejectDiagnocat={handleRejectDiagnocatFindings}
					aiPendingProposal={aiPendingProposal}
					onApplyAiProposal={handleApplyAiProposal}
					onRejectAiProposal={handleRejectAiProposal}
				/>

				<OdontogramViewContainer
					teethData={teethData}
					pediatricMode={isPediatricMode}
					dentitionMode={dentitionMode}
					onDentitionModeChange={setDentitionMode}
					selectedTeeth={selectedTeeth}
					onToothClick={isMultiSelectMode ? handleToothClick : undefined}
					onMarkIntactDentition={handleMarkAllHealthy}
					onMarkWisdomTeethMissing={handleMarkWisdomMissing}
					onQuickStateChange={handleQuickStateChange}
					useSurfaces={odontogramUseSurfaces}
					onOpenVoiceDictation={handleOpenVoiceDictation}
					onOpenPediatricModal={handleOpenPediatricModal}
					onTogglePerio={handleTogglePerio}
					isPerioOpen={isPerioOpen}
					onToggleEstimator={handleToggleEstimator}
					isEstimatorOpen={isEstimatorOpen}
					onLoadDiagnocat={loadDiagnocatReport}
					diagnocatLoading={diagnocatLoading}
					isMultiSelectMode={isMultiSelectMode}
					onToggleMultiSelect={handleToggleMultiSelect}
					onSelectTeethGroup={handleSelectTeethGroup}
					onSyncAllToDiary={handleSyncAllToDiary}
					liveGrossTotalRub={liveGrossTotalRub}
					onOpenFastCheckout={() => {
						setFastCheckoutMethod("sbp_qr");
						setIsFastCheckoutOpen(true);
					}}
					allergyText={allergyText}
					onOneClickLabOrder={handleOneClickLabOrder}
					contextDrawerTooth={contextDrawerTooth}
					setContextDrawerTooth={setContextDrawerTooth}
				/>

				<ToothActionMenuPortal
					menuConfig={radialMenuData ? null : menuConfig}
					onClose={clearMenu}
					selectedTeeth={selectedTeeth}
					activeSurfaces={activeSurfaces}
					setActiveSurfaces={setActiveSurfaces}
					onApplyToothState={handleApplyToothState}
					onOpenContextDrawer={(num) => setContextDrawerTooth(num)}
					onOpenHistory={(num) => setHistoryTooth(num)}
					onOpenEndo={(num) => setEndoTooth(num)}
					onOneClickLabOrder={handleOneClickLabOrder}
					teethData={teethData}
				/>

				{radialMenuData && (
					<ToothRadialMenu
						toothNumber={radialMenuData.toothNumber}
						anchorRect={radialMenuData.anchorRect}
						currentState={radialMenuData.currentState}
						surfaces={radialMenuData.surfaces}
						onSelectState={(state, surfs) => {
							const num = radialMenuData.toothNumber;
							const targets =
								selectedTeeth.length > 0 && selectedTeeth.includes(num)
									? selectedTeeth
									: [num];
							const toothSurfaces =
								surfs && surfs.length > 0 ? [...surfs] : undefined;
							void updateToothState(targets, state, toothSurfaces ?? []);
							try {
								const findingPayload =
									toothSurfaces && toothSurfaces.length > 0
										? {
												toothNumber: num,
												state,
												surfaces: toothSurfaces,
										  }
										: { toothNumber: num, state };
								const soap = generateSoapFromOdontogramFinding(findingPayload);
								window.dispatchEvent(
									new CustomEvent("dente-apply-soap-protocol", {
										detail: {
											finding: findingPayload,
											soap,
											mode: "smart_append",
											immediate: true,
										},
									}),
								);

								const bundle = getClinicalBundleForToothState(state);
								if (bundle) {
									targets.forEach((tNum) => {
										window.dispatchEvent(
											new CustomEvent("dente-add-services-to-invoice", {
												detail: {
													bundleId: bundle.id,
													bundleTitle: bundle.title,
													toothNumber: tNum,
													toothCode: String(tNum),
													patientId,
													source: "odontogram_bundle",
													services: bundle.services.map((s, idx) => ({
														id: `srv_${patientId || "pat"}_tooth_${tNum}_${bundle.id}_${s.code804n}_${idx}`,
														code: s.code804n,
														code804n: s.code804n,
														title: s.title,
														price: s.priceRub,
														priceRub: s.priceRub,
														unitPriceRub: s.priceRub,
														quantity: 1,
														toothCode: String(tNum),
														toothNumber: tNum,
													})),
												},
											}),
										);
									});
								}
							} catch {
								// Safe event dispatch fallback
							}
							setRadialMenuData(null);
						}}
						onSelectSurfaces={(surfs) => {
							setActiveSurfaces([...surfs]);
						}}
						onOpenEndo={() => {
							setEndoTooth(radialMenuData.toothNumber);
							setRadialMenuData(null);
						}}
						onOpenTherapy={() => {
							setContextDrawerTooth(radialMenuData.toothNumber);
							setRadialMenuData(null);
						}}
						onAddToInvoice={() => {
							setIsFastCheckoutOpen(true);
							setRadialMenuData(null);
						}}
						onClose={() => setRadialMenuData(null)}
					/>
				)}

				<OdontogramModalsLayer
					patientId={patientId}
					teethData={teethData}
					setTeethData={setTeethData}
					historyTooth={historyTooth}
					setHistoryTooth={setHistoryTooth}
					endoTooth={endoTooth}
					setEndoTooth={setEndoTooth}
					isEstimatorOpen={isEstimatorOpen}
					isPerioOpen={isPerioOpen}
					isVoiceOpen={isVoiceOpen}
					setIsVoiceOpen={setIsVoiceOpen}
					isPediatricModalOpen={isPediatricModalOpen}
					setIsPediatricModalOpen={setIsPediatricModalOpen}
					isFastCheckoutOpen={isFastCheckoutOpen}
					setIsFastCheckoutOpen={setIsFastCheckoutOpen}
					fastCheckoutMethod={fastCheckoutMethod}
					liveGrossTotalRub={liveGrossTotalRub}
					activePatient={activePatient}
					activeDoctor={activeDoctor}
					auth={auth}
					setAiPendingProposal={setAiPendingProposal}
				/>

				<OdontogramPrintA4
					patientId={patientId}
					teethData={teethData}
					isPediatricMode={isPediatricMode}
					odontogramUseSurfaces={odontogramUseSurfaces}
					activePatient={activePatient}
					activeDoctor={activeDoctor}
					auth={auth}
				/>
			</div>
		</div>
	);
}, (prev, next) => prev.patientId === next.patientId && prev.pediatricMode === next.pediatricMode);

OdontogramModule.displayName = "OdontogramModule";
