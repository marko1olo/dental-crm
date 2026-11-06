/**
 * ChairsideSurgeryHubModal.tsx — Единый канонический рабочий стол хирурга-имплантолога у кресла (DENTE CRM).
 * Ликвидация микро-шредера: протоколы всех 4 сценариев, автогенерация паспорта имплантата для пациента,
 * интеграция с Soft Negative Stock склада (списание расходников без блокировок, Мандаты 8e, 8n, 8am, 8b).
 * Ровно ОДНА Primary CTA кнопка #0d9488: «✓ Зафиксировать операцию и внести в карту».
 * На смартфонах — нативный Bottom Sheet Apple HIG с Drag Handle 36x5px и тач-таргетами >= 44x44px.
 */

import React, { useState, useCallback, useId, useMemo } from "react";
import { createPortal, flushSync } from "react-dom";
import { AlertTriangle, Award, Check, FileText, MessageSquare, Printer, ShieldCheck, Stethoscope, Wrench, X } from "lucide-react";
import { DentalImplant } from "../icons/DentalIcons";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { usePatientStore } from "../../store/patientStore";
import { useAppStore } from "../../store/appStore";
import {
	SURGERY_SCENARIOS,
	SURGERY_IMPLANT_SYSTEMS,
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
import { SurgeryImplantParametersSection } from "./SurgeryImplantParametersSection";
import { ImplantPassportCard } from "../implants/ImplantPassportCard";
import type { FastImplantPassportData } from "../implants/implantQuickPresets";
import "./surgeryHub.css";

export type SurgeryHubTab = "protocol" | "diary" | "passport" | "memo";

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
	readonly onSaveProtocol?: (data: any) => void;
	readonly onInsertIntoDiary?: (diaryText: string) => void;
	readonly className?: string;
}

const FREQUENT_SURGERY_TEETH = [16, 26, 36, 46, 11, 21, 14, 24, 34, 44, 18, 28, 38, 48] as const;

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

		if (appDashboard?.patients && appDashboard.patients.length > 0) {
			return { id: appDashboard.patients[0].id, name: appDashboard.patients[0].fullName };
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
		if (appDashboard?.activeVisit?.doctorName?.trim()) {
			return {
				id: appDashboard.activeVisit.doctorId || propDoctorId || "DOC-VISIT",
				name: appDashboard.activeVisit.doctorName.trim(),
			};
		}
		return { id: propDoctorId || "DOC-SURG", name: "Врач-хирург" };
	}, [propDoctorName, propDoctorId, appActiveDoctorName, appDashboard]);

	const patientName = effectivePatient.name;
	const patientId = effectivePatient.id;
	const doctorName = effectiveDoctor.name;
	const doctorId = effectiveDoctor.id;
	const [activeScenario, setActiveScenario] = useState<SurgeryScenarioType>(initialScenario);
	const [activeTab, setActiveTab] = useState<SurgeryHubTab>(initialTab);
	const [toothFdi, setToothFdi] = useState<number>(initialTooth);
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>(() =>
		initialTeeth && initialTeeth.length > 0 ? [...initialTeeth] : [initialTooth],
	);
	const [isOverdraftNoticeDismissed, setIsOverdraftNoticeDismissed] = useState<boolean>(false);
	const [selectedBrand, setSelectedBrand] = useState<string>(initialBrand || "Osstem");
	const [diameterMm, setDiameterMm] = useState<number>(initialDiameterMm || 4.0);
	const [lengthMm, setLengthMm] = useState<number>(initialLengthMm || 10.0);
	const [torqueNcm, setTorqueNcm] = useState<number>(initialTorqueNcm || 35);
	const [boneDensity, setBoneDensity] = useState<MischBoneDensity>("D2");
	const [capType, setCapType] = useState<SurgeryCapType>("fdm");
	const [lotNumber, setLotNumber] = useState<string>(
		() => initialLotNumber || generateSystemSurgeryLot(initialTooth),
	);
	const [serialNumber, setSerialNumber] = useState<string>("SN-884210");
	const [catalogArticle, setCatalogArticle] = useState<string>("TS3S4010S");
	const [selectedGraft] = useState<string>(initialBoneGraft || SURGERY_GRAFT_CATALOG[0].name);
	const [selectedMembrane] = useState<string>(initialMembrane || SURGERY_MEMBRANE_CATALOG[0].name);
	const [selectedSuture] = useState<string>(initialSuture || SURGERY_SUTURE_CATALOG[0].name);

	const scenarioConfig = SURGERY_SCENARIOS[activeScenario];
	const currentSystem = useMemo(() => getImplantSystemById(selectedBrand), [selectedBrand]);

	const handleSelectBrand = useCallback((brand: string) => {
		setSelectedBrand(brand);
		const sys = getImplantSystemById(brand);
		setDiameterMm(sys.defaultDiameterMm); setLengthMm(sys.defaultLengthMm);
		setCatalogArticle(sys.defaultArticle); setLotNumber(sys.defaultLotNumber);
		setSerialNumber(sys.defaultSerialNumber); setTorqueNcm(sys.defaultTorqueNcm);
	}, []);

	const handleApplyPhysiologicalNorm = useCallback(() => {
		if (activeScenario === "implant") {
			setTorqueNcm(35); setCapType("fdm"); setBoneDensity("D2");
			showToast("✓ Стандартный протокол имплантации без осложнений: 35 Н·см, ФДМ, D2", "success");
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
			return `МЕДИЦИНСКАЯ КАРТА ПРИЁМА · ХИРУРГИЧЕСКИЙ ПРОТОКОЛ (Зуб FDI #${toothFdi})\nДата: ${nowStr} · Врач: ${doctorName} · Пациент: ${patientName}\nДиагноз: ${scenarioConfig.icd10} ${scenarioConfig.icd10Label}.\n\nХОД ОПЕРАЦИИ (SOAP):\nИнфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл. Разрез по гребню альвеолярного отростка, отслоен лоскут. Препарирование костного ложа фрезами с охлаждением физраствором. Плотность кости: ${boneDensity}. Установлен имплантат ${selectedBrand} Ø ${diameterMm} × ${lengthMm} мм (REF: ${catalogArticle}, LOT: ${lotNumber}). Первичная стабильность: ${torqueNcm} Н·см (ISQ 72). Установлен ${capStr}. Наложены швы (${selectedSuture}). Гемостаз полный. Паспорт выдан пациенту.\n\nНАЗНАЧЕНИЯ И РЕКОМЕНДАЦИИ:\n${scenarioConfig.defaultRecommendationsRu}`;
		}
		return `МЕДИЦИНСКАЯ КАРТА ПРИЁМА · ${scenarioConfig.titleRu.toUpperCase()} (Зуб FDI #${toothFdi})\nДата: ${nowStr} · Врач: ${doctorName} · Пациент: ${patientName}\nДиагноз: ${scenarioConfig.icd10} ${scenarioConfig.icd10Label}.\n\nХОД ОПЕРАЦИИ (SOAP):\n${scenarioConfig.defaultProtocolRu}\n\nНАЗНАЧЕНИЯ И РЕКОМЕНДАЦИИ:\n${scenarioConfig.defaultRecommendationsRu}`;
	}, [activeScenario, scenarioConfig, toothFdi, doctorName, patientName, selectedBrand, diameterMm, lengthMm, catalogArticle, lotNumber, torqueNcm, boneDensity, capType, selectedSuture]);

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
		const dateIso = new Date().toISOString();
		const effectiveLot = lotNumber || generateSystemSurgeryLot(toothFdi, dateIso);
		return {
			passportId: `IMP-SSOT-${toothFdi}-${Date.now().toString().slice(-6)}`,
			toothFdi, brand: currentSystem.brandName, model: currentSystem.popularLines[0] || "Standard",
			catalogArticle, diameterMm, lengthMm, torqueNcm, lotNumber: effectiveLot, serialNumber, boneDensity,
			isqDay0: 72, capType, patientName, patientId, doctorName, doctorId, dateIso,
			osteointegrationExpectedDate: computeOsteointegrationExpectedDate(dateIso, toothFdi),
			isWarehouseOverdraft: Boolean(inventoryOverdraftActive),
			inventoryItemId: `inv-${selectedBrand.toLowerCase()}-${diameterMm * 10}${lengthMm}`,
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
	}, [toothFdi, currentSystem, catalogArticle, diameterMm, lengthMm, torqueNcm, lotNumber, serialNumber, boneDensity, capType, patientName, patientId, doctorName, doctorId, inventoryOverdraftActive, selectedBrand, financials, selectedGraft, selectedMembrane, selectedSuture]);

	const handleSaveOperationAndCommit = useCallback(async () => {
		onSaveProtocol?.({ activeScenario, toothFdi, passportData, diaryText, selectedTeeth });
		onInsertIntoDiary?.(diaryText);

		const teethToProcess = selectedTeeth.length > 0 ? selectedTeeth : [toothFdi];
		const dateIso = new Date().toISOString();
		const baseLot = lotNumber || generateSystemSurgeryLot(toothFdi, dateIso);

		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-quick-writeoff-surgical-materials", {
				detail: {
					operationTitle: scenarioConfig.titleRu,
					toothFdi,
					teeth: teethToProcess,
					materials: scenarioConfig.standardMaterials,
					isOverdraft: Boolean(inventoryOverdraftActive),
					lotNumber: baseLot,
					timestamp: dateIso,
				},
			}));
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
			try {
				if (targetId) {
					for (const currentTooth of teethToProcess) {
						const toothLot = teethToProcess.length > 1 ? `${baseLot}-T${currentTooth}` : baseLot;
						const idempKey = `idemp-surg-${targetId}-T${currentTooth}-${Date.now().toString().slice(0, 8)}`;
						const headers = denteAdminSecretRequestHeaders({
							"Content-Type": "application/json",
							"X-Idempotency-Key": idempKey,
						});

						if (activeScenario === "implant") {
							const implantPayload = JSON.stringify({
								patientId: targetId, toothNumberFdi: currentTooth, implantBrand: currentSystem.id,
								implantDiameterMm: diameterMm, implantLengthMm: lengthMm, lotNumber: toothLot, serialNumber,
								boneDensityClass: boneDensity, finalInsertionTorqueNcm: torqueNcm, baselineIsqMesiodistal: 72,
								baselineIsqBuccolingual: 72, boneGraftMaterial: selectedGraft, membraneUsed: selectedMembrane,
								sutureMaterial: selectedSuture, operationPriceRub: financials.operationPriceRub, notes: diaryText,
								idempotencyKey: idempKey,
							});
							const apiRes = await fetch("/api/v1/surgery/implants", {
								method: "POST", headers,
								body: implantPayload,
							});
							if (!apiRes.ok) {
								await fetch("/api/clinical/implants/installations", {
									method: "POST", headers,
									body: implantPayload,
								});
							}
							await fetch("/api/surgery/materials/quick-deduct", {
								method: "POST", headers,
								body: JSON.stringify({
									bundleType: "implant",
									toothNumberFdi: currentTooth,
									notes: `Списание по техкарте: Имплантация ${selectedBrand} #${currentTooth} (LOT: ${toothLot})`,
								}),
							});
						} else {
							await fetch("/api/surgery/protocols", {
								method: "POST", headers,
								body: JSON.stringify({
									patientId: targetId, normId: scenarioConfig.id, toothNumberFdi: currentTooth, protocolText: diaryText,
									services: [{ code: scenarioConfig.serviceCode, nameRu: `${scenarioConfig.serviceNameRu} (#${currentTooth})`, name: scenarioConfig.serviceNameRu, priceRub: scenarioConfig.defaultPriceRub, quantity: 1, toothNumber: currentTooth }],
									materialsUsed: scenarioConfig.standardMaterials.map((m) => ({ name: m.name, unit: m.unit, quantity: m.quantity, isWarehouseCritical: Boolean(m.isWarehouseCritical) })),
									isOverdraftActive: Boolean(inventoryOverdraftActive), notes: scenarioConfig.defaultRecommendationsRu,
								}),
							});
							await fetch("/api/surgery/materials/quick-deduct", {
								method: "POST", headers,
								body: JSON.stringify({
									bundleType: activeScenario === "sinus_gbr" ? "sinus_gbr" : "surgery",
									toothNumberFdi: currentTooth,
									notes: `Списание по техкарте: ${scenarioConfig.titleRu} #${currentTooth}`,
								}),
							});
						}
					}
				}
			} catch { /* Офлайн автономия врача (Мандат 8e) */ }
		}

		showToast(`✓ Операция «${scenarioConfig.titleRu} #${teethToProcess.join(", #")}» зафиксирована в карте приёма`, "success");
		onClose();
	}, [onSaveProtocol, activeScenario, toothFdi, selectedTeeth, passportData, diaryText, onInsertIntoDiary, scenarioConfig, inventoryOverdraftActive, currentSystem.id, diameterMm, lengthMm, lotNumber, serialNumber, boneDensity, torqueNcm, selectedGraft, selectedMembrane, selectedSuture, financials, selectedBrand, patientId, patientName, onClose]);

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
		} catch { /* диалог печати */ }
		showToast(`Печать документа операции #${toothFdi}`, "success");
	}, [activeTab, activeScenario, toothFdi]);

	if (!isOpen) return null;

	const modalContent = (
		<div className="surgery-hub-modal-backdrop" data-testid="chairside-surgery-hub-backdrop">
			<div className={`surgery-hub-card-container ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid="chairside-surgery-hub-modal">
				<div className="surgery-hub-drag-handle" aria-hidden="true" />
				<header className="surgery-hub-header-bar">
					<div className="surgery-hub-header-title">
						<div className="w-9 h-9 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0 border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
							<DentalImplant size={19} />
						</div>
						<div className="min-w-0 flex-1 overflow-hidden">
							<h2 id={titleId}>
								<span>Хирургический хаб &amp; Паспорт имплантации</span>
								<span className="text-xs px-2 py-0.5 rounded-lg font-mono font-bold bg-[var(--teal,#0d9488)] text-white shrink-0">{selectedTeeth.length > 1 ? `#${selectedTeeth.join(", #")}` : `#${toothFdi}`}</span>
							</h2>
							<p className="text-[11px] sm:text-xs text-[var(--muted)] leading-tight" title={`${patientName} · ${doctorName}`}>{patientName} · {doctorName}</p>
						</div>
					</div>
					<div className="surgery-hub-header-actions">
						<button type="button" onClick={handlePrintDocument} className="secondary-button min-h-[44px] h-11 px-3.5 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer flex items-center gap-1.5" data-testid="btn-print-surgery-hub" title="Распечатать медицинскую документацию">
							<Printer size={15} className="text-[var(--teal,#0d9488)] shrink-0" /><span className="hidden sm:inline">Печать</span>
						</button>
						<button type="button" onClick={onClose} className="min-h-[44px] h-11 w-11 rounded-xl flex items-center justify-center border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer" aria-label="Закрыть хирургический хаб" data-testid="btn-close-surgery-hub">
							<X size={18} />
						</button>
					</div>
				</header>

				<nav className="surgery-hub-scenarios-nav" role="region" aria-label="Хирургические сценарии">
					{(Object.keys(SURGERY_SCENARIOS) as SurgeryScenarioType[]).map((scenKey) => {
						const sc = SURGERY_SCENARIOS[scenKey];
						return (
							<button key={scenKey} type="button" onClick={() => setActiveScenario(scenKey)} className={`surgery-scenario-chip ${activeScenario === scenKey ? "active" : ""}`} data-testid={`scenario-chip-${scenKey}`}>
								<span className="text-xs font-bold leading-tight w-full">{sc.titleRu}</span>
								<span className="text-[10px] text-[var(--muted)] leading-tight w-full">{sc.serviceCode}</span>
							</button>
						);
					})}
				</nav>

				<nav className="surgery-hub-tabs-nav" role="tablist">
					<button type="button" role="tab" aria-selected={activeTab === "protocol"} onClick={() => setActiveTab("protocol")} className={`surgery-hub-tab-btn ${activeTab === "protocol" ? "active" : ""}`} data-testid="tab-surgery-protocol">
						<Stethoscope size={14} className="shrink-0" /><span>1. Протокол &amp; Параметры</span>
					</button>
					<button type="button" role="tab" aria-selected={activeTab === "diary"} onClick={() => setActiveTab("diary")} className={`surgery-hub-tab-btn ${activeTab === "diary" ? "active" : ""}`} data-testid="tab-surgery-diary">
						<FileText size={14} className="shrink-0" /><span>2. Медицинская карта приёма</span>
					</button>
					{activeScenario === "implant" && (
						<button type="button" role="tab" aria-selected={activeTab === "passport"} onClick={() => setActiveTab("passport")} className={`surgery-hub-tab-btn ${activeTab === "passport" ? "active" : ""}`} data-testid="tab-surgery-passport">
							<Award size={14} className="shrink-0" /><span>3. Паспорт имплантата (А5)</span>
						</button>
					)}
					<button type="button" role="tab" aria-selected={activeTab === "memo"} onClick={() => setActiveTab("memo")} className={`surgery-hub-tab-btn ${activeTab === "memo" ? "active" : ""}`} data-testid="tab-surgery-memo">
						<MessageSquare size={14} className="shrink-0" /><span>{activeScenario === "implant" ? "4. Памятка пациенту" : "3. Памятка пациенту"}</span>
					</button>
				</nav>

				<div className="surgery-hub-content">
					{Boolean(inventoryOverdraftActive) && !isOverdraftNoticeDismissed && (
						<div className="p-3 rounded-xl bg-[var(--amber-surface,rgba(245,158,11,0.1))] border border-[var(--amber-soft,rgba(245,158,11,0.3))] text-xs text-[var(--ink)] flex items-center gap-2.5 shrink-0" data-testid="surgery-hub-overdraft-notice">
							<AlertTriangle size={18} className="text-[var(--amber,#f59e0b)] shrink-0" />
							<div className="flex-1 min-w-0">
								<strong className="text-[var(--amber,#f59e0b)]">Мягкий овердрафт склада: </strong><span>Задержка накладной не блокирует операцию. Списание расходников зафиксировано.</span>
							</div>
							<button type="button" onClick={() => setIsOverdraftNoticeDismissed(true)} className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] cursor-pointer shrink-0 hover:bg-[var(--paper-soft)]">Закрыть</button>
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
						<div data-testid="surgery-passport-content"><ImplantPassportCard data={passportData} /></div>
					) : activeTab === "diary" ? (
						<div className="flex flex-col gap-3 min-h-0" data-testid="surgery-diary-content">
							<div className="text-xs font-semibold text-[var(--muted)]">Автоматический протокол SOAP для внесения в медицинскую карту приёма:</div>
							<textarea readOnly value={diaryText} className="w-full h-72 sm:h-80 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono leading-relaxed resize-none focus:outline-none" data-testid="surgery-soap-textarea" />
						</div>
					) : (
						<div className="flex flex-col gap-4 min-h-0" data-testid="surgery-protocol-content">
							<div className="flex items-center justify-between p-3 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.08))] border border-[var(--teal-soft,rgba(13,148,136,0.25))] gap-3">
								<div className="text-xs min-w-0">
									<div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
										<ShieldCheck size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
										<span>Экспресс-протокол: {scenarioConfig.titleRu}</span>
									</div>
									<div className="text-[11px] text-[var(--muted)] leading-tight mt-0.5">{scenarioConfig.subtitleRu}</div>
								</div>
								<button
									type="button"
									onClick={handleApplyPhysiologicalNorm}
									className="min-h-[44px] px-3.5 text-xs font-semibold rounded-xl border border-[var(--teal,#0d9488)] bg-[var(--paper)] text-[var(--teal,#0d9488)] hover:bg-[var(--teal-surface,rgba(13,148,136,0.1))] cursor-pointer shrink-0 flex items-center gap-1.5 transition-colors"
									data-testid="btn-standard-implant-protocol"
									id="btn-apply-physio-norm"
									title="Применить стандартный протокол операции без осложнений в 1 клик"
								>
									<Check size={15} className="text-[var(--teal,#0d9488)] shrink-0" />
									<span className="hidden sm:inline">✓ Стандартная операция без осложнений</span>
									<span className="sm:hidden">✓ Стандартная норма</span>
								</button>
							</div>

							{activeScenario === "implant" && (
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs" data-testid="implant-protocol-phases">
									<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-0.5">
										<span className="text-[10px] font-bold text-[var(--muted)] uppercase">1. Анестезия</span>
										<span className="font-semibold text-[var(--ink)] truncate">Articaini 4% 1:100k</span>
										<span className="text-[10px] text-[var(--muted)]">1.7 мл инфильтр.</span>
									</div>
									<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-0.5">
										<span className="text-[10px] font-bold text-[var(--muted)] uppercase">2. Разрез</span>
										<span className="font-semibold text-[var(--ink)] truncate">По гребню альвеолы</span>
										<span className="text-[10px] text-[var(--muted)]">лоскут отслоен</span>
									</div>
									<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-0.5">
										<span className="text-[10px] font-bold text-[var(--muted)] uppercase">3. Костное ложе</span>
										<span className="font-semibold text-[var(--ink)] truncate">Фрезы NaCl 0.9%</span>
										<span className="text-[10px] text-[var(--muted)]">кость {boneDensity} (Misch)</span>
									</div>
									<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-0.5">
										<span className="text-[10px] font-bold text-[var(--muted)] uppercase">4. Имплантат</span>
										<span className="font-semibold text-[var(--teal,#0d9488)] truncate">{selectedBrand} Ø{diameterMm}×{lengthMm}</span>
										<span className="text-[10px] font-mono text-[var(--muted)]">{catalogArticle}</span>
									</div>
									<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-0.5">
										<span className="text-[10px] font-bold text-[var(--muted)] uppercase">5. Торк &amp; ISQ</span>
										<span className="font-semibold text-[var(--ink)] truncate">{torqueNcm} Н·см · ISQ 72</span>
										<span className="text-[10px] text-[var(--teal,#0d9488)]">зеленая зона</span>
									</div>
									<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-0.5">
										<span className="text-[10px] font-bold text-[var(--muted)] uppercase">6. Ушивание</span>
										<span className="font-semibold text-[var(--ink)] truncate">{capType === "fdm" ? "ФДМ" : "Заглушка"}</span>
										<span className="text-[10px] text-[var(--muted)] truncate">{selectedSuture}</span>
									</div>
								</div>
							)}

							<div className="flex flex-col gap-1.5">
								<div className="text-xs font-bold text-[var(--ink)] flex items-center justify-between">
									<span>Зуб по формуле FDI:</span>
									{selectedTeeth.length > 1 && (
										<span className="text-[11px] font-semibold text-[var(--teal,#0d9488)]">
											{`Выбрано: ${selectedTeeth.join(", ")}`}
										</span>
									)}
								</div>
								<div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
									{FREQUENT_SURGERY_TEETH.map((t) => {
										const isSelected = selectedTeeth.includes(t) || toothFdi === t;
										return (
											<button
												key={t}
												type="button"
												onClick={() => {
													setToothFdi(t);
													setSelectedTeeth([t]);
												}}
												className={`min-h-[44px] min-w-[44px] px-2 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center ${isSelected ? "bg-[var(--teal-surface,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)] shadow-xs" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"}`}
												data-testid={`tooth-fdi-${t}`}
											>
												{t}
											</button>
										);
									})}
								</div>
							</div>

							{activeScenario === "implant" && (
								<SurgeryImplantParametersSection
									selectedBrand={selectedBrand}
									onSelectBrand={handleSelectBrand}
									diameterMm={diameterMm}
									onSelectDiameter={setDiameterMm}
									lengthMm={lengthMm}
									onSelectLength={setLengthMm}
									torqueNcm={torqueNcm}
									onSelectTorque={setTorqueNcm}
									capType={capType}
									onSelectCapType={setCapType}
									catalogArticle={catalogArticle}
									lotNumber={lotNumber}
									serialNumber={serialNumber}
								/>
							)}

							<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2">
								<div className="text-xs font-bold text-[var(--ink)]">Расходные материалы к списанию (Soft Negative Stock):</div>
								<div className="flex flex-wrap gap-1.5">
									{scenarioConfig.standardMaterials.map((mat) => (
										<span key={mat.id} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]">
											✓ {mat.name} ({mat.quantity} {mat.unit})
										</span>
									))}
								</div>
							</div>
						</div>
					)}
				</div>

				<footer className="surgery-hub-footer">
					<div className="surgery-hub-footer-telemetry text-xs text-[var(--muted)] min-w-0 flex-1 hidden sm:flex items-center gap-2 flex-wrap">
						<span className="font-semibold text-[var(--ink)]">{scenarioConfig.titleRu} #{toothFdi}</span>
						<span>|</span><span>{scenarioConfig.defaultPriceRub.toLocaleString("ru-RU")} ₽</span>
						<span>|</span><span className="text-[var(--teal,#0d9488)] font-semibold">Автономия врача 100%</span>
					</div>
					<div className="surgery-hub-footer-buttons flex items-center gap-2.5 w-full sm:w-auto justify-end">
						<button type="button" onClick={handlePrintDocument} className="secondary-btn min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3.5 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer flex items-center gap-1.5" data-testid="btn-print-surgery-hub-footer">
							<Printer size={15} className="text-[var(--teal,#0d9488)] shrink-0" /><span className="hidden sm:inline">Печать документа</span><span className="sm:hidden">Печать</span>
						</button>
						{/* СТРОГО ЕДИНСТВЕННАЯ PRIMARY CTA КНОПКА #0d9488 */}
						<button type="button" onClick={handleSaveOperationAndCommit} className="surgery-primary-cta" data-testid="btn-save-chairside-surgery">
							<span className="hidden sm:inline">✓ Зафиксировать операцию и внести в карту приёма &gt;</span><span className="sm:hidden">✓ Зафиксировать операцию &gt;</span>
						</button>
					</div>
				</footer>
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
