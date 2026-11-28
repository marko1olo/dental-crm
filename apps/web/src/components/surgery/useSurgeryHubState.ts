/**
 * useSurgeryHubState.ts — Состояние хирургического хаба у кресла (DENTE CRM).
 * Атомарная батч-имплантация, живой выбор пациента/врача из API, Zero-Leak Draft (Мандаты 8e, 8z, 8bo, 8zq).
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { flushSync } from "react-dom";
import { showToast } from "../GlobalToast";
import { clientLogger } from "../../services/logging/clientLogger";
import { usePatientStore } from "../../store/patientStore";
import { useAppStore } from "../../store/appStore";
import {
	SURGERY_SCENARIOS, SURGERY_IMPLANT_SYSTEMS, SURGERY_DEFAULT_BATCHES,
	SURGERY_GRAFT_CATALOG, SURGERY_MEMBRANE_CATALOG, SURGERY_SUTURE_CATALOG,
	findImplantSystemById, calculateSurgeryFinancials, buildSurgicalPostOpMemoText, generateSystemSurgeryLot,
	type SurgeryScenarioType, type SurgeryCapType, type MischBoneDensity,
} from "./surgeryCatalogData";
import { isUuid, resolveEffectiveSurgeryPatientId } from "./resolveSurgeryPatient";
import type { ToothImplantSpec } from "./SurgeryImplantParametersSection";
import type { SurgeryHubTab } from "./modules/SurgeryHubNavigation";
import {
	buildImplantBatchPayload, fetchSurgeryPatients, fetchSurgeryDoctors,
	fetchSurgeryImplantStock, fetchPatientImplantContext, fetchSurgeryPricelist, submitSurgeryToApi,
	type SurgeryPatientOption, type SurgeryDoctorOption, type StockImplantRecord, type BuildImplantBatchPayloadArgs,
	type SurgeryPricelistEntry,
} from "./surgeryHubApi";
import {
	buildSurgeryDiaryText, buildSurgeryPassportData,
	type ChairsideSurgerySavedProtocolData, type UseSurgeryHubStateParams,
} from "./surgeryProtocolHelpers";

export {
	buildImplantBatchPayload,
	type SurgeryPatientOption, type SurgeryDoctorOption, type StockImplantRecord,
	type BuildImplantBatchPayloadArgs, type ChairsideSurgerySavedProtocolData, type UseSurgeryHubStateParams,
};

function isPlainRecord(val: unknown): val is Record<string, unknown> {
	return typeof val === "object" && val !== null && !Array.isArray(val);
}

export function useSurgeryHubState(params: UseSurgeryHubStateParams) {
	const {
		isOpen, onClose,
		patientName: propPatientName, patientId: propPatientId,
		doctorName: propDoctorName, doctorId: propDoctorId,
		initialTooth = 46, initialScenario = "implant", initialTab = "protocol",
		inventoryOverdraftActive = false,
		initialBrand, initialDiameterMm, initialLengthMm, initialTorqueNcm,
		initialLotNumber, initialBoneGraft, initialMembrane, initialSuture, initialTeeth,
		onSaveProtocol, onInsertIntoDiary,
	} = params;

	const storePatientId = usePatientStore((s) => s.selectedPatientId);
	const storePatientCore = usePatientStore((s) => s.patientCoreDraft);
	const appActivePatientId = useAppStore((s) => s.activePatientId);
	const appActiveDoctorName = useAppStore((s) => s.activeDoctorName);
	const appDashboard = useAppStore((s) => s.dashboard);
	const initialSystem = useMemo(
		() => (initialBrand?.trim() ? findImplantSystemById(initialBrand) : null),
		[initialBrand],
	);

	const [manualPatient, setManualPatient] = useState<SurgeryPatientOption | null>(null);
	const [manualDoctor, setManualDoctor] = useState<SurgeryDoctorOption | null>(null);
	const [livePatients, setLivePatients] = useState<readonly SurgeryPatientOption[]>([]);
	const [liveDoctors, setLiveDoctors] = useState<readonly SurgeryDoctorOption[]>([]);
	const [patientSearchQuery, setPatientSearchQuery] = useState<string>("");
	const [isLoadingPatients, setIsLoadingPatients] = useState<boolean>(false);
	const [isLoadingDoctors, setIsLoadingDoctors] = useState<boolean>(false);
	const [apiLoadError, setApiLoadError] = useState<string | null>(null);
	const lastNotifiedErrorRef = useRef<string | null>(null);

	const reportApiLoadError = useCallback((context: string, err: unknown) => {
		const msg = err instanceof Error && err.message
			? err.message
			: "Ошибка загрузки данных хирургического хаба";
		clientLogger.warn(`[useSurgeryHubState] ${context}`, err, { module: "useSurgeryHubState" });
		setApiLoadError(msg);
		if (lastNotifiedErrorRef.current !== msg) {
			lastNotifiedErrorRef.current = msg;
			showToast(msg, "error");
		}
	}, []);

	const effectivePatient = useMemo(() => {
		if (manualPatient) return { id: manualPatient.id, name: manualPatient.fullName, isBound: isUuid(manualPatient.id) || Boolean(manualPatient.id) };
		if (propPatientName?.trim() && propPatientId?.trim()) return { id: propPatientId.trim(), name: propPatientName.trim(), isBound: true };
		const targetId = propPatientId?.trim() || storePatientId?.trim() || appActivePatientId?.trim() || appDashboard?.activeVisit?.patientId?.trim() || "";
		if (appDashboard?.patients?.length) {
			const found = targetId ? appDashboard.patients.find((p) => p.id === targetId) : (propPatientName ? appDashboard.patients.find((p) => p.fullName === propPatientName) : undefined);
			if (found) return { id: found.id, name: found.fullName, isBound: true };
		}
		if (propPatientName?.trim()) return { id: targetId, name: propPatientName.trim(), isBound: Boolean(targetId) };
		if (storePatientCore?.fullName?.trim()) {
			const boundId = targetId || storePatientId?.trim() || "";
			return { id: boundId, name: storePatientCore.fullName.trim(), isBound: Boolean(boundId) };
		}
		if (targetId) return { id: targetId, name: `Пациент (${targetId.slice(0, 8)})`, isBound: true };
		return { id: "", name: "Пациент не выбран", isBound: false };
	}, [manualPatient, propPatientName, propPatientId, storePatientId, appActivePatientId, appDashboard, storePatientCore]);

	const effectiveDoctor = useMemo(() => {
		if (manualDoctor) return { id: manualDoctor.id, name: manualDoctor.fullName, isBound: Boolean(manualDoctor.id) };
		if (propDoctorName?.trim()) return { id: propDoctorId?.trim() || "", name: propDoctorName.trim(), isBound: true };
		if (appActiveDoctorName?.trim()) return { id: propDoctorId?.trim() || "", name: appActiveDoctorName.trim(), isBound: true };
		const rawVisit: unknown = appDashboard?.activeVisit;
		const visit = isPlainRecord(rawVisit) ? rawVisit : null;
		const visitDoctorName = typeof visit?.doctorName === "string" ? visit.doctorName.trim() : "";
		if (visitDoctorName) {
			const visitDoctorId = typeof visit?.doctorId === "string" ? visit.doctorId : (propDoctorId?.trim() || "");
			return { id: visitDoctorId, name: visitDoctorName, isBound: Boolean(visitDoctorId || visitDoctorName) };
		}
		return { id: propDoctorId?.trim() || "", name: "Врач не выбран", isBound: false };
	}, [manualDoctor, propDoctorName, propDoctorId, appActiveDoctorName, appDashboard]);

	const [activeScenario, setActiveScenario] = useState<SurgeryScenarioType>(initialScenario);
	const [activeTab, setActiveTab] = useState<SurgeryHubTab>(initialTab);
	const [toothFdi, setToothFdi] = useState<number>(() => (initialScenario === "implant" && initialTooth >= 51 && initialTooth <= 85 ? 46 : initialTooth));
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>(() => {
		const raw = initialTeeth?.length ? [...initialTeeth] : [initialTooth];
		if (initialScenario !== "implant") return raw;
		const permanent = raw.filter((t) => t < 51 || t > 85);
		return permanent.length > 0 ? permanent : [46];
	});
	const [isOverdraftNoticeDismissed, setIsOverdraftNoticeDismissed] = useState<boolean>(false);
	const [selectedBrand, setSelectedBrand] = useState<string>(initialBrand?.trim() || initialSystem?.brandName || "");
	const [diameterMm, setDiameterMm] = useState<number>(initialDiameterMm ?? initialSystem?.defaultDiameterMm ?? 0);
	const [lengthMm, setLengthMm] = useState<number>(initialLengthMm ?? initialSystem?.defaultLengthMm ?? 0);
	const [torqueNcm, setTorqueNcm] = useState<number>(initialTorqueNcm ?? initialSystem?.defaultTorqueNcm ?? 0);
	const [boneDensity, setBoneDensity] = useState<MischBoneDensity | "">("");
	const [anesthesiaProtocol, setAnesthesiaProtocol] = useState<string>("");
	const [incisionProtocol, setIncisionProtocol] = useState<string>("");
	const [boneBedProtocol, setBoneBedProtocol] = useState<string>("");
	const [isqValue, setIsqValue] = useState<number>(0);
	const [capType, setCapType] = useState<SurgeryCapType>("fdm");
	const [lotNumber, setLotNumber] = useState<string>(() => initialLotNumber || "");
	const [serialNumber, setSerialNumber] = useState<string>("");
	const [catalogArticle, setCatalogArticle] = useState<string>(initialSystem?.defaultArticle || "");
	const [isGuidedSurgery, setIsGuidedSurgery] = useState<boolean>(false);
	const [guidedSleeveDiameterMm, setGuidedSleeveDiameterMm] = useState<number>(5.0);
	const [guidedSleeveOffsetMm, setGuidedSleeveOffsetMm] = useState<number>(2.0);
	const [surgicalGuideTemplateId, setSurgicalGuideTemplateId] = useState<string>("");
	const [selectedGraft, setSelectedGraft] = useState<string>(
		initialBoneGraft || (initialScenario === "sinus_gbr" ? (SURGERY_GRAFT_CATALOG[0]?.name || "") : ""),
	);
	const [selectedMembrane, setSelectedMembrane] = useState<string>(
		initialMembrane || (initialScenario === "sinus_gbr" ? (SURGERY_MEMBRANE_CATALOG[0]?.name || "") : ""),
	);
	const [selectedSuture, setSelectedSuture] = useState<string>(
		initialSuture || (initialScenario === "sinus_gbr" ? (SURGERY_SUTURE_CATALOG[0]?.name || "") : ""),
	);
	const [livePricelistMap, setLivePricelistMap] = useState<Map<string, SurgeryPricelistEntry>>(() => new Map());
	const [stockImplants, setStockImplants] = useState<readonly StockImplantRecord[]>([]);
	const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string | null>(null);
	const [apiPassportData, setApiPassportData] = useState<Record<string, unknown> | null>(null);
	const [activeEditingTooth, setActiveEditingTooth] = useState<number>(() => {
		const raw = initialTeeth?.[0] ?? initialTooth ?? 46;
		return initialScenario === "implant" && raw >= 51 && raw <= 85 ? 46 : raw;
	});
	const [perToothSpecs, setPerToothSpecs] = useState<Record<number, ToothImplantSpec>>({});
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const isSavingRef = useRef<boolean>(false);

	useEffect(() => {
		if (!isOpen || typeof fetch !== "function") return;
		let isCancelled = false;
		const timer = setTimeout(() => {
			setIsLoadingPatients(true);
			void fetchSurgeryPatients(patientSearchQuery)
				.then((rows) => {
					if (!isCancelled) {
						setLivePatients(rows);
						setApiLoadError(null);
					}
				})
				.catch((err) => {
					if (!isCancelled) reportApiLoadError("Ошибка загрузки пациентов", err);
				})
				.finally(() => { if (!isCancelled) setIsLoadingPatients(false); });
		}, patientSearchQuery.trim() ? 220 : 0);
		return () => { isCancelled = true; clearTimeout(timer); };
	}, [isOpen, patientSearchQuery, reportApiLoadError]);

	useEffect(() => {
		if (!isOpen || typeof fetch !== "function") return;
		let isCancelled = false;
		setIsLoadingDoctors(true);
		void fetchSurgeryDoctors()
			.then((rows) => { if (!isCancelled) setLiveDoctors(rows); })
			.catch((err) => { if (!isCancelled) reportApiLoadError("Ошибка загрузки врачей", err); })
			.finally(() => { if (!isCancelled) setIsLoadingDoctors(false); });
		void fetchSurgeryImplantStock()
			.then((implants) => { if (!isCancelled && implants.length > 0) setStockImplants(implants); })
			.catch((err) => { if (!isCancelled) reportApiLoadError("Ошибка загрузки остатков имплантов", err); });
		void fetchSurgeryPricelist()
			.then((map) => { if (!isCancelled && map.size > 0) setLivePricelistMap(map); })
			.catch((err) => { if (!isCancelled) reportApiLoadError("Ошибка загрузки прейскуранта", err); });
		return () => { isCancelled = true; };
	}, [isOpen, reportApiLoadError]);

	useEffect(() => {
		if (!isOpen || typeof fetch !== "function" || !isUuid(effectivePatient.id)) return;
		let isCancelled = false;
		void fetchPatientImplantContext(effectivePatient.id, toothFdi)
			.then((ctx) => {
				if (isCancelled || !ctx) return;
				const { matched, passport, resolvedBrandName } = ctx;
				if (passport) {
					setApiPassportData(passport);
					if (passport.lotNumber) setLotNumber(String(passport.lotNumber));
					if (passport.serialNumber) setSerialNumber(String(passport.serialNumber));
					if (passport.diameterMm) setDiameterMm(Number(passport.diameterMm));
					if (passport.lengthMm) setLengthMm(Number(passport.lengthMm));
					if (passport.torqueNcm) setTorqueNcm(Number(passport.torqueNcm));
					if (passport.baselineIsq) setIsqValue(Number(passport.baselineIsq));
					if (typeof passport.boneDensityClass === "string" && ["D1", "D2", "D3", "D4"].includes(passport.boneDensityClass)) {
						setBoneDensity(passport.boneDensityClass as MischBoneDensity);
					}
				}
				if (resolvedBrandName) setSelectedBrand(resolvedBrandName);
				if (matched.implantDiameterMm != null && Number(matched.implantDiameterMm) > 0) setDiameterMm(Number(matched.implantDiameterMm));
				if (matched.implantLengthMm != null && Number(matched.implantLengthMm) > 0) setLengthMm(Number(matched.implantLengthMm));
				if (matched.finalInsertionTorqueNcm != null && Number(matched.finalInsertionTorqueNcm) > 0) setTorqueNcm(Number(matched.finalInsertionTorqueNcm));
				if (typeof matched.boneDensityClass === "string" && ["D1", "D2", "D3", "D4"].includes(matched.boneDensityClass)) {
					setBoneDensity(matched.boneDensityClass as MischBoneDensity);
				}
				if (matched.lotNumber) setLotNumber(String(matched.lotNumber));
				if (matched.serialNumber) setSerialNumber(String(matched.serialNumber));
				if (matched.catalogArticle) setCatalogArticle(String(matched.catalogArticle));
			})
			.catch((err) => { if (!isCancelled) reportApiLoadError("Ошибка гидратации имплантов пациента", err); });
		return () => { isCancelled = true; };
	}, [isOpen, effectivePatient.id, toothFdi, reportApiLoadError]);

	const matchedStockItem = useMemo(() => {
		const brandLower = selectedBrand.trim().toLowerCase();
		if (!brandLower) return null;
		if (stockImplants.length > 0) {
			const exact = stockImplants.find((item) => {
				const name = (item.name || "").toLowerCase();
				return name.includes(brandLower) && (name.includes(`${diameterMm}`) || name.includes(`ø${diameterMm}`)) && name.includes(`${lengthMm}`);
			});
			if (exact) return exact;
			const brandOnly = stockImplants.find((item) => (item.name || "").toLowerCase().includes(brandLower));
			if (brandOnly) return brandOnly;
		}
		return (
			SURGERY_DEFAULT_BATCHES.find((b) => (b.brand.toLowerCase() === brandLower || brandLower.includes(b.brand.toLowerCase())) && b.diameterMm === diameterMm && b.lengthMm === lengthMm)
			|| SURGERY_DEFAULT_BATCHES.find((b) => b.brand.toLowerCase() === brandLower || brandLower.includes(b.brand.toLowerCase()))
			|| null
		);
	}, [stockImplants, selectedBrand, diameterMm, lengthMm]);

	useEffect(() => {
		if (!matchedStockItem) return;
		if (matchedStockItem.lotNumber) setLotNumber(matchedStockItem.lotNumber);
		if ("sku" in matchedStockItem && matchedStockItem.sku) setCatalogArticle(matchedStockItem.sku);
		if ("serialNumber" in matchedStockItem && matchedStockItem.serialNumber) setSerialNumber(matchedStockItem.serialNumber);
		setSelectedInventoryItemId(matchedStockItem.id);
	}, [matchedStockItem]);

	const effectiveInventoryItemId = useMemo(() => {
		const candidate = selectedInventoryItemId || matchedStockItem?.id || null;
		return isUuid(candidate) ? candidate : undefined;
	}, [selectedInventoryItemId, matchedStockItem]);

	const scenarioConfig = SURGERY_SCENARIOS[activeScenario];
	const currentSystem = useMemo(
		() => (selectedBrand.trim() ? findImplantSystemById(selectedBrand) : null),
		[selectedBrand],
	);

	const resetDraftState = useCallback(() => {
		let resetTooth = initialTooth || 46;
		if (initialScenario === "implant" && resetTooth >= 51 && resetTooth <= 85) resetTooth = 46;
		const sys = initialBrand?.trim() ? findImplantSystemById(initialBrand) : null;
		setActiveScenario(initialScenario);
		setActiveTab(initialTab);
		setToothFdi(resetTooth);
		const rawTeeth = initialTeeth?.length ? [...initialTeeth] : [resetTooth];
		const sanitizedTeeth = initialScenario === "implant" ? rawTeeth.filter((t) => t < 51 || t > 85) : rawTeeth;
		setSelectedTeeth(sanitizedTeeth.length > 0 ? sanitizedTeeth : [resetTooth]);
		setIsOverdraftNoticeDismissed(false);
		setSelectedBrand(initialBrand?.trim() || sys?.brandName || "");
		setDiameterMm(initialDiameterMm ?? sys?.defaultDiameterMm ?? 0);
		setLengthMm(initialLengthMm ?? sys?.defaultLengthMm ?? 0);
		setTorqueNcm(initialTorqueNcm ?? sys?.defaultTorqueNcm ?? 0);
		setBoneDensity("");
		setAnesthesiaProtocol("");
		setIncisionProtocol("");
		setBoneBedProtocol("");
		setIsqValue(0);
		setCapType("fdm");
		setLotNumber(initialLotNumber || "");
		setSerialNumber("");
		setCatalogArticle(sys?.defaultArticle || "");
		setIsGuidedSurgery(false);
		setGuidedSleeveDiameterMm(5.0);
		setGuidedSleeveOffsetMm(2.0);
		setSurgicalGuideTemplateId("");
		setSelectedInventoryItemId(null);
		setApiPassportData(null);
		setActiveEditingTooth(resetTooth);
		setPerToothSpecs({});
		setManualPatient(null);
		setManualDoctor(null);
		setPatientSearchQuery("");
		setApiLoadError(null);
		lastNotifiedErrorRef.current = null;
	}, [initialTooth, initialScenario, initialTab, initialTeeth, initialBrand, initialDiameterMm, initialLengthMm, initialTorqueNcm, initialLotNumber]);

	const buildCurrentFlatSpec = useCallback((): ToothImplantSpec => ({
		diameterMm, lengthMm, torqueNcm, isqValue, capType, lotNumber, serialNumber, catalogArticle,
	}), [diameterMm, lengthMm, torqueNcm, isqValue, capType, lotNumber, serialNumber, catalogArticle]);

	const getToothSpec = useCallback((toothNum: number): ToothImplantSpec => {
		const stored = perToothSpecs[toothNum];
		if (stored) return stored;
		return {
			...buildCurrentFlatSpec(),
			lotNumber: toothNum === activeEditingTooth ? lotNumber : generateSystemSurgeryLot(toothNum),
			serialNumber: toothNum === activeEditingTooth ? serialNumber : "",
		};
	}, [perToothSpecs, buildCurrentFlatSpec, activeEditingTooth, lotNumber, serialNumber]);

	const updateActiveImplantSpec = useCallback((patch: Partial<ToothImplantSpec>) => {
		if (patch.diameterMm !== undefined) setDiameterMm(patch.diameterMm);
		if (patch.lengthMm !== undefined) setLengthMm(patch.lengthMm);
		if (patch.torqueNcm !== undefined) setTorqueNcm(patch.torqueNcm);
		if (patch.isqValue !== undefined) setIsqValue(patch.isqValue);
		if (patch.capType !== undefined) setCapType(patch.capType);
		if (patch.lotNumber !== undefined) setLotNumber(patch.lotNumber);
		if (patch.serialNumber !== undefined) setSerialNumber(patch.serialNumber);
		if (patch.catalogArticle !== undefined) setCatalogArticle(patch.catalogArticle);
		setPerToothSpecs((prev) => ({
			...prev,
			[activeEditingTooth]: { ...(prev[activeEditingTooth] ?? buildCurrentFlatSpec()), ...patch },
		}));
	}, [activeEditingTooth, buildCurrentFlatSpec]);

	const handleSelectActiveEditingTooth = useCallback((targetTooth: number) => {
		setPerToothSpecs((prev) => {
			const withCurrent = prev[activeEditingTooth] ? prev : { ...prev, [activeEditingTooth]: buildCurrentFlatSpec() };
			const nextSpec = withCurrent[targetTooth] ?? { ...buildCurrentFlatSpec(), lotNumber: generateSystemSurgeryLot(targetTooth), serialNumber: "" };
			setDiameterMm(nextSpec.diameterMm);
			setLengthMm(nextSpec.lengthMm);
			setTorqueNcm(nextSpec.torqueNcm);
			setIsqValue(nextSpec.isqValue);
			setCapType(nextSpec.capType);
			setLotNumber(nextSpec.lotNumber);
			setSerialNumber(nextSpec.serialNumber);
			setCatalogArticle(nextSpec.catalogArticle);
			return withCurrent[targetTooth] ? withCurrent : { ...withCurrent, [targetTooth]: nextSpec };
		});
		setActiveEditingTooth(targetTooth);
	}, [activeEditingTooth, buildCurrentFlatSpec]);

	const handleSelectScenario = useCallback((scen: SurgeryScenarioType) => {
		setActiveScenario(scen);
		if (scen === "sinus_gbr") {
			setSelectedGraft((prev) => prev || SURGERY_GRAFT_CATALOG[0]?.name || "");
			setSelectedMembrane((prev) => prev || SURGERY_MEMBRANE_CATALOG[0]?.name || "");
			setSelectedSuture((prev) => prev || SURGERY_SUTURE_CATALOG[0]?.name || "");
		} else if (scen === "implant") {
			if (!initialBoneGraft) setSelectedGraft("");
			if (!initialMembrane) setSelectedMembrane("");
			if (!initialSuture) setSelectedSuture("");
			setSelectedTeeth((prev) => {
				const permanent = prev.filter((t) => t < 51 || t > 85);
				return permanent.length > 0 ? permanent : [46];
			});
			setToothFdi((prev) => (prev >= 51 && prev <= 85 ? 46 : prev));
		}
	}, [initialBoneGraft, initialMembrane, initialSuture]);

	const handleClose = useCallback(() => { resetDraftState(); onClose(); }, [resetDraftState, onClose]);

	const prevExternalPatientRef = useRef(propPatientId ?? storePatientId ?? appActivePatientId ?? "");
	useEffect(() => {
		const nextExtId = propPatientId ?? storePatientId ?? appActivePatientId ?? "";
		if (prevExternalPatientRef.current !== nextExtId) {
			prevExternalPatientRef.current = nextExtId;
			resetDraftState();
		}
	}, [propPatientId, storePatientId, appActivePatientId, resetDraftState]);

	useEffect(() => { if (!isOpen) resetDraftState(); }, [isOpen, resetDraftState]);
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && isOpen) handleClose(); };
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, handleClose]);

	const handleSelectBrand = useCallback((brand: string) => {
		setSelectedBrand(brand);
		setSelectedInventoryItemId(null);
		const sys = findImplantSystemById(brand);
		if (!sys) return;
		setDiameterMm(sys.defaultDiameterMm);
		setLengthMm(sys.defaultLengthMm);
		setCatalogArticle(sys.defaultArticle);
		setLotNumber(sys.defaultLotNumber);
		setSerialNumber(sys.defaultSerialNumber);
		setTorqueNcm(sys.defaultTorqueNcm);
		setPerToothSpecs({});
	}, []);

	const handleApplyPhysiologicalNorm = useCallback(() => {
		if (activeScenario === "implant") {
			setAnesthesiaProtocol("Инфильтрационная анестезия 1.7 мл");
			setIncisionProtocol("По гребню альвеолы, лоскут отслоен");
			setBoneBedProtocol("Препарирование фрезами с NaCl 0.9%");
			setTorqueNcm(35);
			setCapType("fdm");
			setBoneDensity("D2");
			setIsqValue(74);
			showToast("✓ Стандартный протокол имплантации без осложнений: 35 Н·см, ФДМ, D2 (ISQ 74)", "success");
		} else if (activeScenario === "extraction") {
			showToast("✓ Стандартное атравматичное удаление: кюретаж, гемостаз, швы ПГА 4-0", "success");
		} else if (activeScenario === "sinus_gbr") {
			showToast("✓ Стандартный синус-лифтинг: ксеногенный гранулят 0.5 г и резорбируемая мембрана 16×22", "success");
		} else {
			showToast("✓ Стандартная периостотомия: разрез по переходной складке, дренаж", "success");
		}
	}, [activeScenario]);

	const diaryText = useMemo(() => buildSurgeryDiaryText({
		activeScenario, scenarioConfig, toothFdi, selectedTeeth, getToothSpec,
		doctorName: effectiveDoctor.name, patientName: effectivePatient.name, selectedBrand,
		diameterMm, lengthMm, catalogArticle, lotNumber, torqueNcm, isqValue, boneDensity, capType, selectedSuture,
		anesthesiaProtocol, incisionProtocol, boneBedProtocol,
	}), [activeScenario, scenarioConfig, toothFdi, selectedTeeth, getToothSpec, effectiveDoctor.name, effectivePatient.name, selectedBrand, diameterMm, lengthMm, catalogArticle, lotNumber, torqueNcm, isqValue, boneDensity, capType, selectedSuture, anesthesiaProtocol, incisionProtocol, boneBedProtocol]);

	const liveScenarioEntry = livePricelistMap.get(scenarioConfig.serviceCode);

	const financials = useMemo(() => calculateSurgeryFinancials({
		scenario: activeScenario,
		implantBrand: selectedBrand,
		graftName: selectedGraft,
		membraneName: selectedMembrane,
		sutureName: selectedSuture,
		overrideOperationPriceRub: liveScenarioEntry?.priceRub,
	}), [activeScenario, selectedBrand, selectedGraft, selectedMembrane, selectedSuture, liveScenarioEntry?.priceRub]);

	const passportData = useMemo(() => buildSurgeryPassportData({
		apiPassportData, toothFdi, currentSystem, catalogArticle, diameterMm, lengthMm, torqueNcm,
		lotNumber, serialNumber, boneDensity, isqValue, capType,
		patientName: effectivePatient.name, patientId: effectivePatient.id, doctorName: effectiveDoctor.name, doctorId: effectiveDoctor.id,
		inventoryOverdraftActive, effectiveInventoryItemId, selectedInventoryItemId, matchedStockItemId: matchedStockItem?.id,
		selectedBrand, financials, selectedGraft, selectedMembrane, selectedSuture,
	}), [apiPassportData, toothFdi, currentSystem, catalogArticle, diameterMm, lengthMm, torqueNcm, lotNumber, serialNumber, boneDensity, isqValue, capType, effectivePatient.name, effectivePatient.id, effectiveDoctor.name, effectiveDoctor.id, inventoryOverdraftActive, effectiveInventoryItemId, selectedInventoryItemId, matchedStockItem?.id, selectedBrand, financials, selectedGraft, selectedMembrane, selectedSuture]);

	const handleSaveOperationAndCommit = useCallback(async () => {
		if (isSavingRef.current) return;
		isSavingRef.current = true;
		setIsSaving(true);
		const teethToProcess = selectedTeeth.length > 0 ? selectedTeeth : [toothFdi];
		const dateIso = new Date().toISOString();
		const baseLot = lotNumber || generateSystemSurgeryLot(toothFdi, dateIso);
		try {
			if (typeof fetch === "function") {
				const targetId = await resolveEffectiveSurgeryPatientId(effectivePatient.id, effectivePatient.name);
				if (!targetId) { showToast("Пациент не выбран. Выберите пациента из списка для сохранения протокола.", "error"); return; }
				const apiRes = await submitSurgeryToApi({
					targetId, activeScenario, scenarioConfig, toothFdi, teethToProcess, getToothSpec,
					implantBrandId: currentSystem?.id || selectedBrand.trim(), effectiveInventoryItemId,
					boneDensity: boneDensity || "D2", isGuidedSurgery,
					guidedSleeveDiameterMm, guidedSleeveOffsetMm, surgicalGuideTemplateId,
					selectedGraft, selectedMembrane, selectedSuture,
					...(liveScenarioEntry
						? { operationPriceRub: liveScenarioEntry.priceRub, operationPriceKopecks: liveScenarioEntry.priceKopecks }
						: {}),
					diaryText, baseLot, dateIso, inventoryOverdraftActive,
				});
				if (!apiRes.ok) { showToast(apiRes.errorMessage || "Ошибка сохранения операции", "error"); return; }
				if (apiRes.deductDeferred) showToast("Протокол сохранён, но списание материалов по техкарте отложено", "warning");
			}
			onSaveProtocol?.({ activeScenario, toothFdi, passportData, diaryText, selectedTeeth: teethToProcess });
			onInsertIntoDiary?.(diaryText);
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:cart-add-items", {
					detail: { items: teethToProcess.map((t) => ({ code: scenarioConfig.serviceCode, name: `${scenarioConfig.serviceNameRu} (#${t})`, priceRub: liveScenarioEntry?.priceRub ?? scenarioConfig.defaultPriceRub, quantity: 1 })) },
				}));
				window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
					detail: { soap: { treatmentDescription: diaryText }, text: diaryText, protocolText: diaryText, mode: "smart_append", tooth: toothFdi, teeth: teethToProcess, scenario: activeScenario },
				}));
			}
			showToast(`✓ Операция «${scenarioConfig.titleRu} #${teethToProcess.join(", #")}» зафиксирована в карте приёма`, "success");
			handleClose();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : "Ошибка связи с сервером при фиксации операции", "error");
		} finally {
			isSavingRef.current = false;
			setIsSaving(false);
		}
	}, [onSaveProtocol, activeScenario, toothFdi, selectedTeeth, passportData, diaryText, onInsertIntoDiary, scenarioConfig, inventoryOverdraftActive, currentSystem?.id, selectedBrand, lotNumber, boneDensity, selectedGraft, selectedMembrane, selectedSuture, liveScenarioEntry, effectivePatient.id, effectivePatient.name, handleClose, effectiveInventoryItemId, getToothSpec, isGuidedSurgery, guidedSleeveDiameterMm, guidedSleeveOffsetMm, surgicalGuideTemplateId]);

	const memoText = useMemo(() => buildSurgicalPostOpMemoText(activeScenario, {
		patientName: effectivePatient.name, toothFdi, doctorName: effectiveDoctor.name, implantBrand: selectedBrand, capType, hasSutures: true,
	}), [activeScenario, effectivePatient.name, toothFdi, effectiveDoctor.name, selectedBrand, capType]);

	const handleCopyMemo = useCallback(() => { navigator.clipboard?.writeText(memoText); showToast("Памятка для пациента скопирована в буфер обмена", "success"); }, [memoText]);
	const handleShareWhatsAppMemo = useCallback(() => { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(memoText)}`, "_blank", "noopener,noreferrer"); showToast("Памятка пациенту открыта для отправки в WhatsApp", "success"); }, [memoText]);
	const handleShareTelegramMemo = useCallback(() => { window.open(`https://t.me/share/url?text=${encodeURIComponent(memoText)}`, "_blank", "noopener,noreferrer"); showToast("Памятка пациенту открыта для отправки в Telegram", "success"); }, [memoText]);
	const handlePrintDocument = useCallback(() => {
		if (activeTab === "protocol") flushSync(() => { setActiveTab(activeScenario === "implant" ? "passport" : "diary"); });
		try { window.print?.(); } catch (err) { clientLogger.warn("[useSurgeryHubState] Ошибка печати", err, { module: "useSurgeryHubState" }); }
		showToast(`Печать документа операции #${toothFdi}`, "success");
	}, [activeTab, activeScenario, toothFdi]);

	const handleSelectTooth = useCallback((t: number) => {
		if (activeScenario === "implant" && t >= 51 && t <= 85) {
			showToast(`Установка дентального имплантата в область молочного зуба (#${t}) категорически запрещена анатомическим протоколом`, "error");
			return;
		}
		setSelectedTeeth((prev) => {
			const exists = prev.includes(t);
			const next = exists ? (prev.length > 1 ? prev.filter((x) => x !== t) : prev) : [...prev, t];
			setToothFdi(next[0] ?? t);
			if (!exists && activeScenario === "implant") {
				const base = buildCurrentFlatSpec();
				const newSpec: ToothImplantSpec = { ...base, lotNumber: generateSystemSurgeryLot(t), serialNumber: "" };
				setPerToothSpecs((specs) => ({ ...specs, ...(specs[activeEditingTooth] ? {} : { [activeEditingTooth]: base }), [t]: specs[t] ?? newSpec }));
				setActiveEditingTooth(t);
				setLotNumber(newSpec.lotNumber);
				setSerialNumber("");
			} else if (exists && next.length > 0 && activeEditingTooth === t) {
				handleSelectActiveEditingTooth(next[0] ?? t);
			}
			return next;
		});
	}, [activeScenario, activeEditingTooth, buildCurrentFlatSpec, handleSelectActiveEditingTooth]);

	return {
		effectivePatient, effectiveDoctor, livePatients, liveDoctors, isLoadingPatients, isLoadingDoctors, apiLoadError,
		patientSearchQuery, setPatientSearchQuery, selectPatient: setManualPatient, selectDoctor: setManualDoctor,
		activeScenario, scenarioConfig, activeTab, setActiveTab, toothFdi, selectedTeeth, activeEditingTooth,
		perToothSpecs, getToothSpec, isOverdraftNoticeDismissed, dismissOverdraftNotice: () => setIsOverdraftNoticeDismissed(true),
		selectedBrand, diameterMm, lengthMm, torqueNcm, boneDensity, setBoneDensity,
		anesthesiaProtocol, setAnesthesiaProtocol, incisionProtocol, setIncisionProtocol, boneBedProtocol, setBoneBedProtocol,
		isqValue, capType, lotNumber, serialNumber, catalogArticle,
		isGuidedSurgery, setIsGuidedSurgery, guidedSleeveDiameterMm, setGuidedSleeveDiameterMm,
		guidedSleeveOffsetMm, setGuidedSleeveOffsetMm, surgicalGuideTemplateId, setSurgicalGuideTemplateId,
		selectedGraft, setSelectedGraft, selectedMembrane, setSelectedMembrane,
		selectedSuture, setSelectedSuture, diaryText, memoText, passportData, isSaving,
		handleSelectScenario, handleSelectBrand, handleSelectTooth, handleSelectActiveEditingTooth,
		updateActiveImplantSpec, handleApplyPhysiologicalNorm, handleSaveOperationAndCommit,
		handleCopyMemo, handleShareWhatsAppMemo, handleShareTelegramMemo, handlePrintDocument, handleClose,
	};
}
