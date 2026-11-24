/**
 * ChairsideSurgeryHubModal.tsx — Единый канонический рабочий стол хирурга-имплантолога у кресла (DENTE CRM).
 * Декомпозиция монолита по Мандатам 8b/8zi.
 * Ровно ОДНА Primary CTA кнопка #0d9488: «✓ Зафиксировать операцию и внести в карту».
 * На смартфонах — нативный Bottom Sheet Apple HIG с Drag Handle и тач-таргетами >= 44x44px.
 */

import React, { useState, useEffect, useCallback, useId, useMemo, useRef } from "react";
import { createPortal, flushSync } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { showToast } from "../GlobalToast";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { usePatientStore } from "../../store/patientStore";
import { useAppStore } from "../../store/appStore";
import {
	SURGERY_SCENARIOS,
	SURGERY_IMPLANT_SYSTEMS,
	SURGERY_DEFAULT_BATCHES,
	SURGERY_GRAFT_CATALOG,
	SURGERY_MEMBRANE_CATALOG,
	SURGERY_SUTURE_CATALOG,
	getImplantSystemById,
	computeOsteointegrationExpectedDate,
	calculateSurgeryFinancials,
	buildSurgicalPostOpMemoText,
	generateSystemSurgeryLot,
	type SurgeryScenarioType,
	type SurgeryCapType,
	type MischBoneDensity,
} from "./surgeryCatalogData";
import { resolveEffectiveSurgeryPatientId } from "./resolveSurgeryPatient";
import { SurgeryPostOpMemoSection } from "./SurgeryPostOpMemoSection";
import { ImplantPassportCard } from "../implants/ImplantPassportCard";
import type { FastImplantPassportData } from "@dental/shared";
import { SurgeryHubHeader } from "./modules/SurgeryHubHeader";
import { SurgeryHubNavigation, type SurgeryHubTab } from "./modules/SurgeryHubNavigation";
import { SurgeryGeneralProtocolSection } from "./modules/SurgeryGeneralProtocolSection";
import { SurgeryHubFooter } from "./modules/SurgeryHubFooter";
import "./surgeryHub.css";

export type { SurgeryHubTab };

export interface ChairsideSurgerySavedProtocolData {
	readonly activeScenario: SurgeryScenarioType;
	readonly toothFdi: number;
	readonly passportData: FastImplantPassportData;
	readonly diaryText: string;
	readonly selectedTeeth: readonly number[];
}

interface StockImplantRecord {
	readonly id: string;
	readonly name: string;
	readonly category?: string;
	readonly sku?: string | null;
	readonly lotNumber?: string | null;
	readonly serialNumber?: string | null;
	readonly expirationDate?: string | null;
	readonly currentQty?: string | null;
	readonly stockQuantity?: string | null;
}

export interface ChairsideSurgeryHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly doctorName?: string;
	readonly doctorId?: string;
	readonly initialTooth?: number;
	readonly initialScenario?: SurgeryScenarioType;
	readonly initialTab?: SurgeryHubTab;
	readonly inventoryOverdraftActive?: boolean;
	readonly initialBrand?: string;
	readonly initialDiameterMm?: number;
	readonly initialLengthMm?: number;
	readonly initialTorqueNcm?: number;
	readonly initialLotNumber?: string;
	readonly initialBoneGraft?: string;
	readonly initialMembrane?: string;
	readonly initialSuture?: string;
	readonly initialTeeth?: readonly number[];
	readonly onSaveProtocol?: (data: ChairsideSurgerySavedProtocolData) => void;
	readonly onInsertIntoDiary?: (diaryText: string) => void;
	readonly className?: string;
}

export const ChairsideSurgeryHubModal: React.FC<ChairsideSurgeryHubModalProps> = ({
	isOpen, onClose,
	patientName: propPatientName, patientId: propPatientId,
	doctorName: propDoctorName, doctorId: propDoctorId,
	initialTooth = 46, initialScenario = "implant", initialTab = "protocol",
	inventoryOverdraftActive = false,
	initialBrand, initialDiameterMm, initialLengthMm, initialTorqueNcm,
	initialLotNumber, initialBoneGraft, initialMembrane, initialSuture, initialTeeth,
	onSaveProtocol, onInsertIntoDiary, className = "",
}) => {
	const titleId = useId();

	const storePatientId = usePatientStore((s) => s.selectedPatientId);
	const storePatientCore = usePatientStore((s) => s.patientCoreDraft);
	const appActivePatientId = useAppStore((s) => s.activePatientId);
	const appActiveDoctorName = useAppStore((s) => s.activeDoctorName);
	const appDashboard = useAppStore((s) => s.dashboard);

	const effectivePatient = useMemo(() => {
		if (propPatientName && propPatientName.trim() && propPatientId && propPatientId.trim()) {
			return { id: propPatientId.trim(), name: propPatientName.trim() };
		}
		const targetId = propPatientId || storePatientId || appActivePatientId || appDashboard?.activeVisit?.patientId || null;

		if (appDashboard?.patients && appDashboard.patients.length > 0) {
			const found = targetId
				? appDashboard.patients.find((p) => p.id === targetId)
				: (propPatientName ? appDashboard.patients.find((p) => p.fullName === propPatientName) : null);
			if (found) {
				return { id: found.id, name: found.fullName };
			}
		}

		if (propPatientName && propPatientName.trim()) {
			return { id: targetId || "PAT-CURRENT", name: propPatientName.trim() };
		}

		if (storePatientCore?.fullName?.trim()) {
			return { id: targetId || storePatientId || "PAT-CURRENT", name: storePatientCore.fullName.trim() };
		}

		if (targetId) {
			return { id: targetId, name: `Пациент (${targetId.slice(0, 8)})` };
		}

		return { id: "PAT-BLANK", name: "Пациент не выбран" };
	}, [propPatientName, propPatientId, storePatientId, appActivePatientId, appDashboard, storePatientCore]);

	const effectiveDoctor = useMemo(() => {
		if (propDoctorName && propDoctorName.trim()) {
			return { id: propDoctorId || "DOC-CURRENT", name: propDoctorName.trim() };
		}
		if (appActiveDoctorName && appActiveDoctorName.trim()) {
			return { id: propDoctorId || "DOC-ACTIVE", name: appActiveDoctorName.trim() };
		}
		const activeVisitCandidate = appDashboard?.activeVisit as Record<string, unknown> | null | undefined;
		const visitDoctorName = typeof activeVisitCandidate?.doctorName === "string" ? activeVisitCandidate.doctorName.trim() : "";
		if (visitDoctorName) {
			const visitDoctorId = typeof activeVisitCandidate?.doctorId === "string" ? activeVisitCandidate.doctorId : propDoctorId || "DOC-VISIT";
			return { id: visitDoctorId, name: visitDoctorName };
		}
		return { id: propDoctorId || "DOC-SURG", name: "Врач-хирург" };
	}, [propDoctorName, propDoctorId, appActiveDoctorName, appDashboard]);

	const patientName = effectivePatient.name;
	const patientId = effectivePatient.id;
	const doctorName = effectiveDoctor.name;
	const doctorId = effectiveDoctor.id;
	const [activeScenario, setActiveScenario] = useState<SurgeryScenarioType>(initialScenario);
	const [activeTab, setActiveTab] = useState<SurgeryHubTab>(initialTab);
	const [toothFdi, setToothFdi] = useState<number>(() => {
		if (initialScenario === "implant" && initialTooth >= 51 && initialTooth <= 85) {
			return 46;
		}
		return initialTooth;
	});
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>(() => {
		const raw = initialTeeth && initialTeeth.length > 0 ? [...initialTeeth] : [initialTooth];
		if (initialScenario === "implant") {
			const filtered = raw.filter((t) => t < 51 || t > 85);
			return filtered.length > 0 ? filtered : [46];
		}
		return raw;
	});
	const [isOverdraftNoticeDismissed, setIsOverdraftNoticeDismissed] = useState<boolean>(false);
	const [selectedBrand, setSelectedBrand] = useState<string>(initialBrand || "Osstem");
	const [diameterMm, setDiameterMm] = useState<number>(initialDiameterMm || 4.0);
	const [lengthMm, setLengthMm] = useState<number>(initialLengthMm || 10.0);
	const [torqueNcm, setTorqueNcm] = useState<number>(initialTorqueNcm || 35);
	const [boneDensity, setBoneDensity] = useState<MischBoneDensity>("D2");
	const [isqValue, setIsqValue] = useState<number>(() => {
		switch (boneDensity) {
			case "D1": return 78;
			case "D2": return 74;
			case "D3": return 68;
			case "D4": return 60;
			default: return 72;
		}
	});
	const [capType, setCapType] = useState<SurgeryCapType>("fdm");
	const [lotNumber, setLotNumber] = useState<string>(
		() => initialLotNumber || generateSystemSurgeryLot(initialTooth),
	);
	const [serialNumber, setSerialNumber] = useState<string>("");
	const [catalogArticle, setCatalogArticle] = useState<string>("TS3S4010S");
	const [isGuidedSurgery, setIsGuidedSurgery] = useState<boolean>(false);
	const [guidedSleeveDiameterMm, setGuidedSleeveDiameterMm] = useState<number>(5.0);
	const [guidedSleeveOffsetMm, setGuidedSleeveOffsetMm] = useState<number>(2.0);
	const [surgicalGuideTemplateId, setSurgicalGuideTemplateId] = useState<string>("");
	const [selectedGraft] = useState<string>(initialBoneGraft || SURGERY_GRAFT_CATALOG[0].name);
	const [selectedMembrane] = useState<string>(initialMembrane || SURGERY_MEMBRANE_CATALOG[0].name);
	const [selectedSuture] = useState<string>(initialSuture || SURGERY_SUTURE_CATALOG[0].name);

	const [stockImplants, setStockImplants] = useState<readonly StockImplantRecord[]>([]);
	const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string | null>(null);
	const [apiPassportData, setApiPassportData] = useState<Record<string, unknown> | null>(null);

	useEffect(() => {
		if (!isOpen || typeof fetch !== "function") return;
		let isCancelled = false;
		async function loadStock() {
			try {
				const res = await fetch("/api/clinical/implants/stock", {
					headers: getDenteAuthHeaders(),
				});
				if (res.ok) {
					const data = await res.json();
					if (!isCancelled && data?.success && Array.isArray(data.implants) && data.implants.length > 0) {
						setStockImplants(data.implants);
					}
				}
			} catch (err) {
				console.warn("[ChairsideSurgeryHub] Не удалось загрузить остатки имплантатов из API, используется локальный каталог:", err);
			}
		}
		void loadStock();
		return () => { isCancelled = true; };
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen || typeof fetch !== "function") return;
		const targetPatientId = effectivePatient.id;
		if (!targetPatientId || targetPatientId === "PAT-BLANK" || targetPatientId === "PAT-CURRENT") return;
		if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetPatientId)) return;

		let isCancelled = false;
		async function hydratePatientImplants() {
			try {
				const res = await fetch(`/api/clinical/implants/patient/${targetPatientId}`, {
					headers: getDenteAuthHeaders(),
				});
				if (!res.ok) return;
				const body = await res.json();
				if (isCancelled || !body?.success || !Array.isArray(body.installations) || body.installations.length === 0) return;

				interface RawInstallation {
					readonly id?: string | null;
					readonly toothNumberFdi?: number | null;
					readonly implantBrand?: string | null;
					readonly implantDiameterMm?: string | number | null;
					readonly implantLengthMm?: string | number | null;
					readonly finalInsertionTorqueNcm?: string | number | null;
					readonly boneDensityClass?: string | null;
					readonly lotNumber?: string | null;
					readonly serialNumber?: string | null;
					readonly catalogArticle?: string | null;
				}

				const installations = body.installations as readonly RawInstallation[];
				const matched = installations.find((inst) => inst.toothNumberFdi === toothFdi) ?? installations[0];
				if (!matched) return;

				if (matched.id) {
					try {
						const passRes = await fetch(`/api/clinical/implants/${matched.id}/passport`, {
							headers: getDenteAuthHeaders(),
						});
						if (passRes.ok) {
							const passJson = await passRes.json();
							if (passJson?.success && passJson.passport) {
								setApiPassportData(passJson.passport);
								const p = passJson.passport;
								if (p.lotNumber) setLotNumber(String(p.lotNumber));
								if (p.serialNumber) setSerialNumber(String(p.serialNumber));
								if (p.diameterMm) setDiameterMm(Number(p.diameterMm));
								if (p.lengthMm) setLengthMm(Number(p.lengthMm));
								if (p.torqueNcm) setTorqueNcm(Number(p.torqueNcm));
								if (p.baselineIsq) setIsqValue(Number(p.baselineIsq));
								if (p.boneDensityClass && ["D1", "D2", "D3", "D4"].includes(p.boneDensityClass)) {
									setBoneDensity(p.boneDensityClass as MischBoneDensity);
								}
							}
						}
					} catch (e) {
						console.warn("[ChairsideSurgeryHub] Ошибка запроса паспорта имплантата из API:", e);
					}
				}

				if (matched.implantBrand) {
					const brandStr = String(matched.implantBrand).trim();
					const matchedSystem = SURGERY_IMPLANT_SYSTEMS.find(
						(s) => s.id.toLowerCase() === brandStr.toLowerCase() || s.brandName.toLowerCase() === brandStr.toLowerCase(),
					);
					if (matchedSystem) {
						setSelectedBrand(matchedSystem.brandName);
					}
				}
				if (matched.implantDiameterMm != null) {
					const d = Number(matched.implantDiameterMm);
					if (!Number.isNaN(d) && d > 0) setDiameterMm(d);
				}
				if (matched.implantLengthMm != null) {
					const l = Number(matched.implantLengthMm);
					if (!Number.isNaN(l) && l > 0) setLengthMm(l);
				}
				if (matched.finalInsertionTorqueNcm != null) {
					const t = Number(matched.finalInsertionTorqueNcm);
					if (!Number.isNaN(t) && t > 0) setTorqueNcm(t);
				}
				if (matched.boneDensityClass && ["D1", "D2", "D3", "D4"].includes(matched.boneDensityClass)) {
					setBoneDensity(matched.boneDensityClass as MischBoneDensity);
				}
				if (matched.lotNumber) setLotNumber(String(matched.lotNumber));
				if (matched.serialNumber) setSerialNumber(String(matched.serialNumber));
				if (matched.catalogArticle) setCatalogArticle(String(matched.catalogArticle));
			} catch (err) {
				console.warn("[ChairsideSurgeryHub] Ошибка гидратации предыдущих имплантатов пациента:", err);
			}
		}
		void hydratePatientImplants();
		return () => { isCancelled = true; };
	}, [isOpen, effectivePatient.id, toothFdi]);

	const matchedStockItem = useMemo(() => {
		const brandLower = selectedBrand.toLowerCase();
		if (stockImplants.length > 0) {
			const exact = stockImplants.find((item) => {
				const name = (item.name || "").toLowerCase();
				return name.includes(brandLower) &&
					(name.includes(`${diameterMm}`) || name.includes(`ø${diameterMm}`)) &&
					name.includes(`${lengthMm}`);
			});
			if (exact) return exact;
			const brandOnly = stockImplants.find((item) => (item.name || "").toLowerCase().includes(brandLower));
			if (brandOnly) return brandOnly;
		}
		const defaultBatch = SURGERY_DEFAULT_BATCHES.find(
			(b) => b.brand.toLowerCase() === brandLower && b.diameterMm === diameterMm && b.lengthMm === lengthMm
		) || SURGERY_DEFAULT_BATCHES.find((b) => b.brand.toLowerCase() === brandLower);
		return defaultBatch || null;
	}, [stockImplants, selectedBrand, diameterMm, lengthMm]);

	useEffect(() => {
		if (matchedStockItem) {
			if (matchedStockItem.lotNumber) setLotNumber(matchedStockItem.lotNumber);
			if ("sku" in matchedStockItem && matchedStockItem.sku) setCatalogArticle(matchedStockItem.sku);
			if ("serialNumber" in matchedStockItem && matchedStockItem.serialNumber) setSerialNumber(matchedStockItem.serialNumber);
			setSelectedInventoryItemId(matchedStockItem.id);
		}
	}, [matchedStockItem]);

	const effectiveInventoryItemId = useMemo(() => {
		const candidate = selectedInventoryItemId || matchedStockItem?.id || null;
		if (candidate && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)) {
			return candidate;
		}
		return undefined;
	}, [selectedInventoryItemId, matchedStockItem]);

	const scenarioConfig = SURGERY_SCENARIOS[activeScenario];
	const currentSystem = useMemo(() => getImplantSystemById(selectedBrand), [selectedBrand]);

	// Мандат 8zq (Zero-Leak Draft): Гарантированный сброс локального состояния хирурга
	const resetDraftState = useCallback(() => {
		let resetTooth = initialTooth || 46;
		if (initialScenario === "implant" && resetTooth >= 51 && resetTooth <= 85) {
			resetTooth = 46;
		}
		setActiveScenario(initialScenario);
		setActiveTab(initialTab);
		setToothFdi(resetTooth);
		const rawTeeth = initialTeeth && initialTeeth.length > 0 ? [...initialTeeth] : [resetTooth];
		const sanitizedTeeth = initialScenario === "implant" ? rawTeeth.filter((t) => t < 51 || t > 85) : rawTeeth;
		setSelectedTeeth(sanitizedTeeth.length > 0 ? sanitizedTeeth : [resetTooth]);
		setIsOverdraftNoticeDismissed(false);
		const defaultBrand = initialBrand || "Osstem";
		setSelectedBrand(defaultBrand);
		const sys = getImplantSystemById(defaultBrand);
		setDiameterMm(initialDiameterMm || sys.defaultDiameterMm || 4.0);
		setLengthMm(initialLengthMm || sys.defaultLengthMm || 10.0);
		setTorqueNcm(initialTorqueNcm || sys.defaultTorqueNcm || 35);
		setBoneDensity("D2");
		setIsqValue(74);
		setCapType("fdm");
		setLotNumber(initialLotNumber || generateSystemSurgeryLot(resetTooth));
		setSerialNumber("");
		setCatalogArticle(sys.defaultArticle || "TS3S4010S");
		setSelectedInventoryItemId(null);
		setApiPassportData(null);
	}, [initialTooth, initialScenario, initialTab, initialTeeth, initialBrand, initialDiameterMm, initialLengthMm, initialTorqueNcm, initialLotNumber]);

	const handleSelectScenario = useCallback((scen: SurgeryScenarioType) => {
		setActiveScenario(scen);
		if (scen === "implant") {
			setSelectedTeeth((prev) => {
				const permanent = prev.filter((t) => t < 51 || t > 85);
				return permanent.length > 0 ? permanent : [46];
			});
			setToothFdi((prev) => (prev >= 51 && prev <= 85 ? 46 : prev));
		}
	}, []);

	const handleClose = useCallback(() => {
		resetDraftState();
		onClose();
	}, [resetDraftState, onClose]);

	// Защита от утечки черновика при смене пациента или закрытии модального хаба
	const prevPatientIdRef = useRef(patientId);
	useEffect(() => {
		if (prevPatientIdRef.current !== patientId) {
			prevPatientIdRef.current = patientId;
			resetDraftState();
		}
	}, [patientId, resetDraftState]);

	useEffect(() => {
		if (!isOpen) {
			resetDraftState();
		}
	}, [isOpen, resetDraftState]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				handleClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, handleClose]);

	const handleSelectBrand = useCallback((brand: string) => {
		setSelectedBrand(brand);
		setSelectedInventoryItemId(null);
		const sys = getImplantSystemById(brand);
		setDiameterMm(sys.defaultDiameterMm); setLengthMm(sys.defaultLengthMm);
		setCatalogArticle(sys.defaultArticle); setLotNumber(sys.defaultLotNumber);
		setSerialNumber(sys.defaultSerialNumber); setTorqueNcm(sys.defaultTorqueNcm);
	}, []);

	const handleApplyPhysiologicalNorm = useCallback(() => {
		if (activeScenario === "implant") {
			setTorqueNcm(35); setCapType("fdm"); setBoneDensity("D2"); setIsqValue(74);
			showToast("✓ Стандартный протокол имплантации без осложнений: 35 Н·см, ФДМ, D2 (ISQ 74)", "success");
		} else if (activeScenario === "extraction") {
			showToast("✓ Стандартное атравматичное удаление: кюретаж, гемостаз, швы Викрил 4-0", "success");
		} else if (activeScenario === "sinus_gbr") {
			showToast("✓ Стандартный синус-лифтинг: Bio-Oss 0.5 г + мембрана Bio-Gide 16×22", "success");
		} else {
			showToast("✓ Стандартная периостотомия: разрез по переходной складке, дренаж", "success");
		}
	}, [activeScenario]);

	const diaryText = useMemo((): string => {
		const nowStr = new Date().toLocaleDateString("ru-RU");
		if (activeScenario === "implant") {
			const capStr = capType === "plug" ? "винт-заглушка (ушивание наглухо)" : "формирователь десны (ФДМ)";
			return `МЕДИЦИНСКАЯ КАРТА ПРИЁМА · ХИРУРГИЧЕСКИЙ ПРОТОКОЛ (Зуб FDI #${toothFdi})\nДата: ${nowStr} · Врач: ${doctorName} · Пациент: ${patientName}\nДиагноз: ${scenarioConfig.icd10} ${scenarioConfig.icd10Label}.\n\nХОД ОПЕРАЦИИ (SOAP):\nИнфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Разрез по гребню альвеолярного отростка, отслоен лоскут. Препарирование костного ложа фрезами с охлаждением физраствором. Плотность кости: ${boneDensity}. Установлен имплантат ${selectedBrand} Ø ${diameterMm} × ${lengthMm} мм (REF: ${catalogArticle}, LOT: ${lotNumber}). Первичная стабильность: ${torqueNcm} Н·см (ISQ ${isqValue}). Установлен ${capStr}. Наложены швы (${selectedSuture}). Гемостаз полный. Паспорт выдан пациенту.\n\nНАЗНАЧЕНИЯ И РЕКОМЕНДАЦИИ:\n${scenarioConfig.defaultRecommendationsRu}`;
		}
		return `МЕДИЦИНСКАЯ КАРТА ПРИЁМА · ${scenarioConfig.titleRu.toUpperCase()} (Зуб FDI #${toothFdi})\nДата: ${nowStr} · Врач: ${doctorName} · Пациент: ${patientName}\nДиагноз: ${scenarioConfig.icd10} ${scenarioConfig.icd10Label}.\n\nХОД ОПЕРАЦИИ (SOAP):\n${scenarioConfig.defaultProtocolRu}\n\nНАЗНАЧЕНИЯ И РЕКОМЕНДАЦИИ:\n${scenarioConfig.defaultRecommendationsRu}`;
	}, [activeScenario, scenarioConfig, toothFdi, doctorName, patientName, selectedBrand, diameterMm, lengthMm, catalogArticle, lotNumber, torqueNcm, isqValue, boneDensity, capType, selectedSuture]);

	const financials = useMemo(() => {
		return calculateSurgeryFinancials({
			scenario: activeScenario,
			implantBrand: selectedBrand,
			graftName: selectedGraft,
			membraneName: selectedMembrane,
			sutureName: selectedSuture,
		});
	}, [activeScenario, selectedBrand, selectedGraft, selectedMembrane, selectedSuture]);

	const passportData: FastImplantPassportData = useMemo(() => {
		const dateIso = apiPassportData?.installedAt ? new Date(String(apiPassportData.installedAt)).toISOString() : new Date().toISOString();
		const effectiveLot = lotNumber || (apiPassportData?.lotNumber ? String(apiPassportData.lotNumber) : "") || generateSystemSurgeryLot(toothFdi, dateIso);
		return {
			passportId: (apiPassportData?.passportId ? String(apiPassportData.passportId) : null) || `IMP-SSOT-${toothFdi}-${Date.now().toString().slice(-6)}`,
			toothFdi, brand: currentSystem.brandName, model: currentSystem.popularLines[0] || "Standard",
			catalogArticle, diameterMm, lengthMm, torqueNcm, lotNumber: effectiveLot, serialNumber: serialNumber || (apiPassportData?.serialNumber ? String(apiPassportData.serialNumber) : ""), boneDensity,
			isqDay0: isqValue, capType,
			patientName: (apiPassportData?.patientName ? String(apiPassportData.patientName) : null) || patientName,
			patientId,
			doctorName: (apiPassportData?.doctorName ? String(apiPassportData.doctorName) : null) || doctorName,
			doctorId, dateIso,
			osteointegrationExpectedDate: computeOsteointegrationExpectedDate(dateIso, toothFdi),
			isWarehouseOverdraft: Boolean(inventoryOverdraftActive),
			inventoryItemId: effectiveInventoryItemId || selectedInventoryItemId || matchedStockItem?.id || `inv-${selectedBrand.toLowerCase()}-${diameterMm * 10}${lengthMm}`,
			expirationDate: currentSystem.defaultExpirationDate,
			operationPriceRub: financials.operationPriceRub,
			implantCostRub: financials.implantCostRub,
			consumablesCostRub: financials.consumablesCostRub,
			doctorGrossMarginRub: financials.doctorGrossMarginRub,
			netDoctorIncomeRub: financials.netDoctorIncomeRub,
			operationPriceKopecks: financials.operationPriceKopecks,
			implantCostKopecks: financials.implantCostKopecks,
			consumablesCostKopecks: financials.consumablesCostKopecks,
			doctorGrossMarginKopecks: financials.doctorGrossMarginKopecks,
			netDoctorIncomeKopecks: financials.netDoctorIncomeKopecks,
			isImmediateLoadingFeasible: torqueNcm >= 35,
			boneGraftMaterial: selectedGraft, membraneUsed: selectedMembrane, sutureMaterial: selectedSuture,
		};
	}, [toothFdi, currentSystem, catalogArticle, diameterMm, lengthMm, torqueNcm, lotNumber, serialNumber, boneDensity, capType, patientName, patientId, doctorName, doctorId, inventoryOverdraftActive, selectedBrand, financials, selectedGraft, selectedMembrane, selectedSuture, apiPassportData]);

	const handleSaveOperationAndCommit = useCallback(async () => {
		onSaveProtocol?.({ activeScenario, toothFdi, passportData, diaryText, selectedTeeth });
		onInsertIntoDiary?.(diaryText);

		const teethToProcess = selectedTeeth.length > 0 ? selectedTeeth : [toothFdi];
		const dateIso = new Date().toISOString();
		const baseLot = lotNumber || generateSystemSurgeryLot(toothFdi, dateIso);

		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente:cart-add-items", {
				detail: {
					items: teethToProcess.map((t) => ({
						code: scenarioConfig.serviceCode,
						name: `${scenarioConfig.serviceNameRu} (#${t})`,
						priceRub: scenarioConfig.defaultPriceRub,
						quantity: 1,
					})),
				},
			}));
			window.dispatchEvent(new CustomEvent("dente:diary-update", { detail: { diaryText, toothFdi, teeth: teethToProcess, scenario: activeScenario } }));
			window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: { treatmentDescription: diaryText },
					text: diaryText,
					protocolText: diaryText,
					mode: "smart_append",
					tooth: toothFdi,
					teeth: teethToProcess,
					scenario: activeScenario,
				},
			}));
		}

		if (typeof fetch === "function") {
			const targetId = await resolveEffectiveSurgeryPatientId(patientId, patientName);
			if (!targetId) {
				showToast("Пациент не выбран. Выберите пациента для сохранения протокола.", "error");
				return;
			}
			try {
				let saveError: string | null = null;
				const idempKey = crypto.randomUUID();
				const headers = getDenteAuthHeaders({
					"Content-Type": "application/json",
					"X-Idempotency-Key": idempKey,
				});

				if (activeScenario === "implant") {
					if (teethToProcess.length > 1) {
						// Неделимый пакетный запрос для All-on-4 / множественной имплантации (Мандат 8bo)
						const batchPayload = JSON.stringify({
							patientId: targetId,
							teeth: teethToProcess,
							toothNumberFdi: teethToProcess[0],
							implantBrand: currentSystem.id,
							inventoryItemId: effectiveInventoryItemId,
							implantDiameterMm: diameterMm,
							implantLengthMm: lengthMm,
							catalogArticle: catalogArticle || undefined,
							lotNumber: baseLot,
							serialNumber,
							isGuidedSurgery,
							guidedSleeveDiameterMm: isGuidedSurgery ? guidedSleeveDiameterMm : undefined,
							guidedSleeveOffsetMm: isGuidedSurgery ? guidedSleeveOffsetMm : undefined,
							surgicalGuideTemplateId: isGuidedSurgery && surgicalGuideTemplateId ? surgicalGuideTemplateId : undefined,
							boneDensityClass: boneDensity,
							finalInsertionTorqueNcm: torqueNcm,
							baselineIsqMesiodistal: isqValue,
							baselineIsqBuccolingual: isqValue,
							boneGraftMaterial: selectedGraft,
							membraneUsed: selectedMembrane,
							sutureMaterial: selectedSuture,
							operationPriceRub: financials.operationPriceRub,
							operationPriceKopecks: financials.operationPriceKopecks.toString(),
							notes: diaryText,
							idempotencyKey: idempKey,
						});
						const apiRes = await fetch("/api/clinical/implants/installations/batch", {
							method: "POST",
							headers,
							body: batchPayload,
						});
						if (!apiRes.ok) {
							const errBody = await apiRes.json().catch(() => null);
							saveError = errBody?.message || errBody?.error || `Ошибка сохранения имплантатов (${apiRes.status})`;
						}
					} else {
						const currentTooth = teethToProcess[0] ?? toothFdi;
						const implantPayload = JSON.stringify({
							patientId: targetId,
							toothNumberFdi: currentTooth,
							implantBrand: currentSystem.id,
							inventoryItemId: effectiveInventoryItemId,
							implantDiameterMm: diameterMm,
							implantLengthMm: lengthMm,
							catalogArticle: catalogArticle || undefined,
							lotNumber: baseLot,
							serialNumber,
							isGuidedSurgery,
							guidedSleeveDiameterMm: isGuidedSurgery ? guidedSleeveDiameterMm : undefined,
							guidedSleeveOffsetMm: isGuidedSurgery ? guidedSleeveOffsetMm : undefined,
							surgicalGuideTemplateId: isGuidedSurgery && surgicalGuideTemplateId ? surgicalGuideTemplateId : undefined,
							boneDensityClass: boneDensity,
							finalInsertionTorqueNcm: torqueNcm,
							baselineIsqMesiodistal: isqValue,
							baselineIsqBuccolingual: isqValue,
							boneGraftMaterial: selectedGraft,
							membraneUsed: selectedMembrane,
							sutureMaterial: selectedSuture,
							operationPriceRub: financials.operationPriceRub,
							operationPriceKopecks: financials.operationPriceKopecks.toString(),
							notes: diaryText,
							idempotencyKey: idempKey,
						});
						const apiRes = await fetch("/api/clinical/implants/installations", {
							method: "POST",
							headers,
							body: implantPayload,
						});
						if (!apiRes.ok) {
							const errBody = await apiRes.json().catch(() => null);
							saveError = errBody?.message || errBody?.error || `Ошибка сохранения имплантата (${apiRes.status})`;
						}
					}
				} else {
					const protoRes = await fetch("/api/surgery/protocols", {
						method: "POST",
						headers,
						body: JSON.stringify({
							patientId: targetId,
							normId: scenarioConfig.id,
							toothNumberFdi: toothFdi,
							teeth: teethToProcess,
							protocolText: diaryText,
							services: teethToProcess.map((currentTooth) => ({
								code: scenarioConfig.serviceCode,
								nameRu: `${scenarioConfig.serviceNameRu} (#${currentTooth})`,
								name: scenarioConfig.serviceNameRu,
								priceRub: scenarioConfig.defaultPriceRub,
								quantity: 1,
								toothNumber: currentTooth,
							})),
							materialsUsed: scenarioConfig.standardMaterials.map((m) => ({
								name: m.name,
								unit: m.unit,
								quantity: m.quantity,
								isWarehouseCritical: Boolean(m.isWarehouseCritical),
							})),
							isOverdraftActive: Boolean(inventoryOverdraftActive),
							notes: scenarioConfig.defaultRecommendationsRu,
							idempotencyKey: idempKey,
						}),
					});
					if (!protoRes.ok) {
						const errBody = await protoRes.json().catch(() => null);
						saveError = errBody?.message || errBody?.error || `Ошибка сохранения протокола (${protoRes.status})`;
					} else {
						await fetch("/api/surgery/materials/quick-deduct", {
							method: "POST",
							headers,
							body: JSON.stringify({
								bundleType: activeScenario === "sinus_gbr" ? "sinus_gbr" : "surgery",
								toothNumberFdi: toothFdi,
								notes: `Списание по техкарте: ${scenarioConfig.titleRu} #${teethToProcess.join(", #")}`,
							}),
						});
					}
				}
				if (saveError) {
					showToast(saveError, "error");
					return;
				}
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Ошибка связи с сервером при фиксации операции";
				showToast(msg, "error");
				return;
			}
		}

		showToast(`✓ Операция «${scenarioConfig.titleRu} #${teethToProcess.join(", #")}» зафиксирована в карте приёма`, "success");
		handleClose();
	}, [onSaveProtocol, activeScenario, toothFdi, selectedTeeth, passportData, diaryText, onInsertIntoDiary, scenarioConfig, inventoryOverdraftActive, currentSystem.id, diameterMm, lengthMm, lotNumber, serialNumber, boneDensity, torqueNcm, selectedGraft, selectedMembrane, selectedSuture, financials, selectedBrand, patientId, patientName, handleClose, effectiveInventoryItemId, isqValue]);

	const memoText = useMemo((): string => {
		return buildSurgicalPostOpMemoText(activeScenario, {
			patientName, toothFdi, doctorName, implantBrand: selectedBrand, capType, hasSutures: true,
		});
	}, [activeScenario, patientName, toothFdi, doctorName, selectedBrand, capType]);

	const handleCopyMemo = useCallback(() => {
		navigator.clipboard?.writeText(memoText);
		showToast("Памятка для пациента скопирована в буфер обмена", "success");
	}, [memoText]);

	const handleShareWhatsAppMemo = useCallback(() => {
		const text = encodeURIComponent(memoText);
		window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank", "noopener,noreferrer");
		showToast("Памятка пациенту открыта для отправки в WhatsApp", "success");
	}, [memoText]);

	const handleShareTelegramMemo = useCallback(() => {
		const text = encodeURIComponent(memoText);
		window.open(`https://t.me/share/url?text=${text}`, "_blank", "noopener,noreferrer");
		showToast("Памятка пациенту открыта для отправки в Telegram", "success");
	}, [memoText]);

	const handlePrintDocument = useCallback(() => {
		if (activeTab === "protocol") {
			flushSync(() => {
				setActiveTab(activeScenario === "implant" ? "passport" : "diary");
			});
		}
		try {
			window.print?.();
		} catch (err) {
			console.warn("[ChairsideSurgeryHub] Не удалось открыть диалог печати:", err);
		}
		showToast(`Печать документа операции #${toothFdi}`, "success");
	}, [activeTab, activeScenario, toothFdi]);

	const handleSelectTooth = useCallback((t: number) => {
		if (activeScenario === "implant" && t >= 51 && t <= 85) {
			showToast(
				`Установка дентального имплантата в область молочного зуба (#${t}) категорически запрещена анатомическим протоколом`,
				"error",
			);
			return;
		}
		setSelectedTeeth((prev) => {
			const next = prev.includes(t)
				? (prev.length > 1 ? prev.filter((x) => x !== t) : prev)
				: [...prev, t];
			setToothFdi(next[0] ?? t);
			return next;
		});
	}, [activeScenario]);

	if (!isOpen) return null;

	const toothBadge = selectedTeeth.length > 1 ? `#${selectedTeeth.join(", #")}` : `#${toothFdi}`;

	const modalContent = (
		<div
			className="surgery-hub-modal-backdrop"
			data-testid="chairside-surgery-hub-backdrop"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					handleClose();
				}
			}}
		>
			<div
				className={`surgery-hub-card-container ${className}`.trim()}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				data-testid="chairside-surgery-hub-modal"
			>
				<SurgeryHubHeader
					titleId={titleId}
					toothBadge={toothBadge}
					patientName={patientName}
					doctorName={doctorName}
					onPrint={handlePrintDocument}
					onClose={handleClose}
				/>

				<SurgeryHubNavigation
					activeScenario={activeScenario}
					onSelectScenario={handleSelectScenario}
					activeTab={activeTab}
					onSelectTab={setActiveTab}
				/>

				<div className="surgery-hub-content">
					{Boolean(inventoryOverdraftActive) && !isOverdraftNoticeDismissed && (
						<div
							className="p-3 rounded-xl bg-[var(--amber-surface,rgba(245,158,11,0.1))] border border-[var(--amber-soft,rgba(245,158,11,0.3))] text-xs text-[var(--ink)] flex items-center gap-2.5 shrink-0"
							data-testid="surgery-hub-overdraft-notice"
						>
							<AlertTriangle size={18} className="text-[var(--amber,#f59e0b)] shrink-0" />
							<div className="flex-1 min-w-0">
								<strong className="text-[var(--amber,#f59e0b)]">Мягкий овердрафт склада: </strong>
								<span>Задержка накладной не блокирует операцию. Списание расходников зафиксировано.</span>
							</div>
							<button
								type="button"
								onClick={() => setIsOverdraftNoticeDismissed(true)}
								className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] cursor-pointer shrink-0 hover:bg-[var(--paper-soft)]"
							>
								Закрыть
							</button>
						</div>
					)}

					{activeTab === "memo" ? (
						<SurgeryPostOpMemoSection
							memoText={memoText}
							toothFdi={toothFdi}
							scenarioTitle={scenarioConfig.titleRu}
							onShareWhatsApp={handleShareWhatsAppMemo}
							onShareTelegram={handleShareTelegramMemo}
							onCopy={handleCopyMemo}
							onPrint={handlePrintDocument}
						/>
					) : activeTab === "passport" && activeScenario === "implant" ? (
						<div data-testid="surgery-passport-content">
							<ImplantPassportCard data={passportData} />
						</div>
					) : activeTab === "diary" ? (
						<div className="flex flex-col gap-3 min-h-0" data-testid="surgery-diary-content">
							<div className="text-xs font-semibold text-[var(--muted)]">
								Автоматический протокол SOAP для внесения в медицинскую карту приёма:
							</div>
							<textarea
								readOnly
								value={diaryText}
								className="w-full h-72 sm:h-80 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono leading-relaxed resize-none focus:outline-none"
								data-testid="surgery-soap-textarea"
							/>
						</div>
					) : (
						<SurgeryGeneralProtocolSection
							activeScenario={activeScenario}
							scenarioConfig={scenarioConfig}
							onApplyPhysiologicalNorm={handleApplyPhysiologicalNorm}
							boneDensity={boneDensity}
							selectedBrand={selectedBrand}
							diameterMm={diameterMm}
							lengthMm={lengthMm}
							catalogArticle={catalogArticle}
							torqueNcm={torqueNcm}
							isqValue={isqValue}
							capType={capType}
							selectedSuture={selectedSuture}
							selectedTeeth={selectedTeeth}
							onSelectTooth={handleSelectTooth}
							onSelectBrand={handleSelectBrand}
							onSelectDiameter={setDiameterMm}
							onSelectLength={setLengthMm}
							onSelectTorque={setTorqueNcm}
							onSelectIsq={setIsqValue}
							onSelectCapType={setCapType}
							lotNumber={lotNumber}
							serialNumber={serialNumber}
							isGuidedSurgery={isGuidedSurgery}
							onToggleGuidedSurgery={setIsGuidedSurgery}
							guidedSleeveDiameterMm={guidedSleeveDiameterMm}
							onSelectGuidedSleeveDiameter={setGuidedSleeveDiameterMm}
							guidedSleeveOffsetMm={guidedSleeveOffsetMm}
							onSelectGuidedSleeveOffset={setGuidedSleeveOffsetMm}
							surgicalGuideTemplateId={surgicalGuideTemplateId}
							onChangeSurgicalGuideTemplateId={setSurgicalGuideTemplateId}
						/>
					)}
				</div>

				<SurgeryHubFooter
					scenarioConfig={scenarioConfig}
					selectedTeeth={selectedTeeth}
					toothFdi={toothFdi}
					onPrint={handlePrintDocument}
					onSave={handleSaveOperationAndCommit}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined" && document.body
		? createPortal(modalContent, document.body)
		: modalContent;
};

export const SurgeryStudioModal = ChairsideSurgeryHubModal;
export type SurgeryStudioModalProps = ChairsideSurgeryHubModalProps;

export default ChairsideSurgeryHubModal;
