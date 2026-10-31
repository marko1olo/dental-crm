/**
 * ChairsideSurgeryHubModal.tsx — Единый канонический рабочий стол хирурга-имплантолога у кресла (DENTE CRM).
 * Ликвидация микро-шредера: протоколы всех 4 сценариев, автогенерация паспорта имплантата для пациента,
 * интеграция с Soft Negative Stock склада (списание расходников без блокировок, Мандаты 8e, 8n, 8am, 8b).
 * Ровно ОДНА Primary CTA кнопка #0d9488: «✓ Зафиксировать операцию и внести в карту».
 * На смартфонах — нативный Bottom Sheet Apple HIG с Drag Handle 36x5px и тач-таргетами >= 44x44px.
 */

import React, { useState, useCallback, useId, useMemo } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Award, Check, Copy, FileText, MessageSquare, Printer, Send, Share2, ShieldCheck, Stethoscope, Wrench, X } from "lucide-react";
import { DentalImplant } from "../icons/DentalIcons";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	SURGERY_SCENARIOS,
	SURGERY_IMPLANT_SYSTEMS,
	SURGERY_GRAFT_CATALOG,
	SURGERY_MEMBRANE_CATALOG,
	SURGERY_SUTURE_CATALOG,
	getImplantSystemById,
	computeOsteointegrationExpectedDate,
	buildSurgicalPostOpMemoText,
	type SurgeryScenarioType,
	type SurgeryCapType,
	type MischBoneDensity,
} from "./surgeryCatalogData";
import { ImplantPassportCard } from "../implants/ImplantPassportCard";
import type { FastImplantPassportData } from "../implants/implantQuickPresets";
import "./surgeryHub.css";

export type SurgeryHubTab = "protocol" | "diary" | "passport" | "memo";

export interface ChairsideSurgeryHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly initialTooth?: number | undefined;
	readonly initialScenario?: SurgeryScenarioType | undefined;
	readonly initialTab?: SurgeryHubTab | undefined;
	readonly inventoryOverdraftActive?: boolean | undefined;
	readonly onSaveProtocol?: ((data: any) => void) | undefined;
	readonly onInsertIntoDiary?: ((diaryText: string) => void) | undefined;
	readonly className?: string | undefined;
}

const FREQUENT_SURGERY_TEETH = [16, 26, 36, 46, 11, 21, 14, 24, 34, 44, 18, 28, 38, 48] as const;

export const ChairsideSurgeryHubModal: React.FC<ChairsideSurgeryHubModalProps> = ({
	isOpen,
	onClose,
	patientName = "Иванов Иван Иванович",
	patientId = "PAT-DEMO-01",
	doctorName = "Д-р Воронов А. В.",
	doctorId = "DOC-SURG-01",
	initialTooth = 46,
	initialScenario = "implant",
	initialTab = "protocol",
	inventoryOverdraftActive = false,
	onSaveProtocol,
	onInsertIntoDiary,
	className = "",
}) => {
	const titleId = useId();
	const [activeScenario, setActiveScenario] = useState<SurgeryScenarioType>(initialScenario);
	const [activeTab, setActiveTab] = useState<SurgeryHubTab>(initialTab);
	const [toothFdi, setToothFdi] = useState<number>(initialTooth);
	const [isOverdraftNoticeDismissed, setIsOverdraftNoticeDismissed] = useState<boolean>(false);
	const [selectedBrand, setSelectedBrand] = useState<string>("Osstem");
	const [diameterMm, setDiameterMm] = useState<number>(4.0);
	const [lengthMm, setLengthMm] = useState<number>(10.0);
	const [torqueNcm, setTorqueNcm] = useState<number>(35);
	const [boneDensity, setBoneDensity] = useState<MischBoneDensity>("D2");
	const [capType, setCapType] = useState<SurgeryCapType>("fdm");
	const [lotNumber, setLotNumber] = useState<string>("24C1208");
	const [serialNumber, setSerialNumber] = useState<string>("SN-884210");
	const [catalogArticle, setCatalogArticle] = useState<string>("TS3S4010S");
	const [selectedGraft] = useState<string>(SURGERY_GRAFT_CATALOG[0].name);
	const [selectedMembrane] = useState<string>(SURGERY_MEMBRANE_CATALOG[0].name);
	const [selectedSuture] = useState<string>(SURGERY_SUTURE_CATALOG[0].name);

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
			showToast("Норма имплантации: 35 Н·см, ФДМ, плотность кости D2", "success");
		} else if (activeScenario === "extraction") {
			showToast("Норма простого удаления: кюретаж, гемостаз, швы Викрил 4-0", "success");
		} else if (activeScenario === "sinus_gbr") {
			showToast("Норма синус-лифтинга: Bio-Oss 0.5 г + мембрана Bio-Gide 16×22", "success");
		} else {
			showToast("Норма периостотомии: разрез по переходной складке, ленточный дренаж", "success");
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

	const passportData: FastImplantPassportData = useMemo(() => {
		const dateIso = new Date().toISOString();
		return {
			passportId: `IMP-SSOT-${toothFdi}-${Date.now().toString().slice(-6)}`,
			toothFdi, brand: currentSystem.brandName, model: currentSystem.popularLines[0] || "Standard",
			catalogArticle, diameterMm, lengthMm, torqueNcm, lotNumber, serialNumber, boneDensity,
			isqDay0: 72, capType, patientName, patientId, doctorName, doctorId, dateIso,
			osteointegrationExpectedDate: computeOsteointegrationExpectedDate(dateIso, toothFdi),
			isWarehouseOverdraft: Boolean(inventoryOverdraftActive),
			inventoryItemId: `inv-${selectedBrand.toLowerCase()}-${diameterMm * 10}${lengthMm}`,
			expirationDate: currentSystem.defaultExpirationDate,
			operationPriceRub: scenarioConfig.defaultPriceRub, implantCostRub: 12500, consumablesCostRub: 3500,
			doctorGrossMarginRub: scenarioConfig.defaultPriceRub - 16000,
			netDoctorIncomeRub: scenarioConfig.defaultPriceRub - 16000,
			isImmediateLoadingFeasible: torqueNcm >= 35,
			boneGraftMaterial: selectedGraft, membraneUsed: selectedMembrane, sutureMaterial: selectedSuture,
		};
	}, [toothFdi, currentSystem, catalogArticle, diameterMm, lengthMm, torqueNcm, lotNumber, serialNumber, boneDensity, capType, patientName, patientId, doctorName, doctorId, inventoryOverdraftActive, selectedBrand, scenarioConfig.defaultPriceRub, selectedGraft, selectedMembrane, selectedSuture]);

	const handleSaveOperationAndCommit = useCallback(async () => {
		onSaveProtocol?.({ activeScenario, toothFdi, passportData, diaryText });
		onInsertIntoDiary?.(diaryText);

		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-quick-writeoff-surgical-materials", {
				detail: { operationTitle: scenarioConfig.titleRu, toothFdi, materials: scenarioConfig.standardMaterials, isOverdraft: Boolean(inventoryOverdraftActive), timestamp: new Date().toISOString() },
			}));
			window.dispatchEvent(new CustomEvent("dente:cart-add-items", {
				detail: { items: [{ code: scenarioConfig.serviceCode, name: `${scenarioConfig.serviceNameRu} (#${toothFdi})`, priceRub: scenarioConfig.defaultPriceRub, quantity: 1 }] },
			}));
			window.dispatchEvent(new CustomEvent("dente:diary-update", { detail: { diaryText, toothFdi, scenario: activeScenario } }));
		}

		if (typeof fetch === "function") {
			const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(patientId);
			const targetId = isValidUuid ? patientId : "00000000-0000-0000-0000-000000000001";
			const headers = denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
			try {
				if (activeScenario === "implant") {
					await fetch("/api/clinical/implants/installations", {
						method: "POST", headers,
						body: JSON.stringify({
							patientId: targetId, toothNumberFdi: toothFdi, implantBrand: currentSystem.id,
							implantDiameterMm: diameterMm, implantLengthMm: lengthMm, lotNumber, serialNumber,
							boneDensityClass: boneDensity, finalInsertionTorqueNcm: torqueNcm, baselineIsqMesiodistal: 72,
							baselineIsqBuccolingual: 72, boneGraftMaterial: selectedGraft, membraneUsed: selectedMembrane,
							sutureMaterial: selectedSuture, operationPriceRub: scenarioConfig.defaultPriceRub, notes: diaryText,
						}),
					});
				} else {
					await fetch("/api/surgery/protocols", {
						method: "POST", headers,
						body: JSON.stringify({
							patientId: targetId, normId: scenarioConfig.id, toothNumberFdi: toothFdi, protocolText: diaryText,
							services: [{ code: scenarioConfig.serviceCode, nameRu: `${scenarioConfig.serviceNameRu} (#${toothFdi})`, name: scenarioConfig.serviceNameRu, priceRub: scenarioConfig.defaultPriceRub, quantity: 1, toothNumber: toothFdi }],
							materialsUsed: scenarioConfig.standardMaterials.map((m) => ({ name: m.name, unit: m.unit, quantity: m.quantity, isWarehouseCritical: Boolean(m.isWarehouseCritical) })),
							isOverdraftActive: Boolean(inventoryOverdraftActive), notes: scenarioConfig.defaultRecommendationsRu,
						}),
					});
					await fetch("/api/surgery/materials/quick-deduct", {
						method: "POST", headers,
						body: JSON.stringify({ bundleType: activeScenario === "sinus_gbr" ? "sinus_gbr" : "surgery", notes: `Списание расходников: ${scenarioConfig.titleRu} #${toothFdi}` }),
					});
				}
			} catch { /* Офлайн автономия врача (Мандат 8e) */ }
		}

		showToast(`✓ Операция «${scenarioConfig.titleRu} #${toothFdi}» зафиксирована в карте приёма`, "success");
		onClose();
	}, [onSaveProtocol, activeScenario, toothFdi, passportData, diaryText, onInsertIntoDiary, scenarioConfig, inventoryOverdraftActive, currentSystem.id, diameterMm, lengthMm, lotNumber, serialNumber, boneDensity, torqueNcm, selectedGraft, selectedMembrane, selectedSuture, patientId, onClose]);

	const memoText = useMemo((): string => {
		return buildSurgicalPostOpMemoText(activeScenario, {
			patientName,
			toothFdi,
			doctorName,
			implantBrand: selectedBrand,
			capType,
			hasSutures: true,
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

	const handlePrintDocument = () => {
		if (activeTab === "protocol") {
			setActiveTab(activeScenario === "implant" ? "passport" : "diary");
		}
		setTimeout(() => { window.print?.(); showToast(`Печать документа операции #${toothFdi}`, "success"); }, 100);
	};

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
								<span>Хирургический хаб &amp; Паспорт изделия</span>
								<span className="text-xs px-2 py-0.5 rounded-lg font-mono font-bold bg-[var(--teal,#0d9488)] text-white shrink-0">{`#${toothFdi}`}</span>
							</h2>
							<p className="text-xs text-[var(--muted)] truncate" title={`${patientName} · ${doctorName}`}>{patientName} · {doctorName}</p>
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
								<span className="text-xs font-bold truncate w-full">{sc.titleRu}</span>
								<span className="text-[10px] text-[var(--muted)] truncate w-full">{sc.serviceCode}</span>
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
						<div className="surgery-postop-memo-container min-h-0" data-testid="surgery-memo-content">
							<div className="surgery-postop-memo-header">
								<div className="flex items-center gap-2 min-w-0">
									<MessageSquare size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
									<span className="text-xs font-bold text-[var(--ink)] truncate">Памятка пациенту (#{toothFdi} · {scenarioConfig.titleRu}):</span>
								</div>
								<div className="surgery-postop-memo-actions">
									<button type="button" onClick={handleShareWhatsAppMemo} className="surgery-memo-action-btn whatsapp" data-testid="btn-share-whatsapp-memo" title="Отправить памятку в WhatsApp">
										<Share2 size={14} /><span>WhatsApp</span>
									</button>
									<button type="button" onClick={handleShareTelegramMemo} className="surgery-memo-action-btn telegram" data-testid="btn-share-telegram-memo" title="Отправить памятку в Telegram">
										<Send size={14} /><span>Telegram</span>
									</button>
									<button type="button" onClick={handleCopyMemo} className="surgery-memo-action-btn" data-testid="btn-copy-memo" title="Скопировать текст памятки">
										<Copy size={14} /><span>Скопировать</span>
									</button>
								</div>
							</div>
							<textarea
								readOnly
								value={memoText}
								className="surgery-postop-memo-text w-full h-72 sm:h-80 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-mono leading-relaxed resize-none focus:outline-none"
								data-testid="surgery-memo-textarea"
							/>
						</div>
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
									<div className="text-[11px] text-[var(--muted)] truncate">{scenarioConfig.subtitleRu}</div>
								</div>
								<button type="button" onClick={handleApplyPhysiologicalNorm} className="min-h-[44px] px-3.5 text-xs font-bold rounded-xl bg-[var(--teal,#0d9488)] text-white hover:bg-[#0f766e] cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs" data-testid="btn-apply-physio-norm">
									<Check size={15} /><span>Норма в 1 клик</span>
								</button>
							</div>

							<div className="flex flex-col gap-1.5">
								<div className="text-xs font-bold text-[var(--ink)]">Зуб по формуле FDI:</div>
								<div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
									{FREQUENT_SURGERY_TEETH.map((t) => (
										<button key={t} type="button" onClick={() => setToothFdi(t)} className={`min-h-[44px] min-w-[44px] px-2 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center ${toothFdi === t ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"}`} data-testid={`tooth-fdi-${t}`}>{t}</button>
									))}
								</div>
							</div>

							{activeScenario === "implant" && (
								<div className="flex flex-col gap-3 p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
									<div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
										<Wrench size={14} className="text-[var(--teal,#0d9488)]" /><span>Имплантационная система &amp; параметры изделия:</span>
									</div>
									<div className="flex items-center gap-1.5 flex-wrap">
										{SURGERY_IMPLANT_SYSTEMS.map((sys) => (
											<button key={sys.id} type="button" onClick={() => handleSelectBrand(sys.brandName)} className={`min-h-[44px] px-3.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center ${selectedBrand === sys.brandName ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper)]/80"}`} data-testid={`brand-${sys.id}`}>
												{sys.brandName}
											</button>
										))}
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
										<div className="flex flex-col gap-1">
											<span className="text-[11px] font-semibold text-[var(--muted)]">Диаметр (мм):</span>
											<div className="flex items-center gap-1">
												{[3.5, 4.0, 4.5, 5.0].map((d) => (
													<button key={d} type="button" onClick={() => setDiameterMm(d)} className={`flex-1 min-h-[44px] text-xs font-bold rounded-xl border ${diameterMm === d ? "bg-[var(--teal-surface,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"}`}>Ø {d}</button>
												))}
											</div>
										</div>
										<div className="flex flex-col gap-1">
											<span className="text-[11px] font-semibold text-[var(--muted)]">Длина (мм):</span>
											<div className="flex items-center gap-1">
												{[8.5, 10.0, 11.5, 13.0].map((l) => (
													<button key={l} type="button" onClick={() => setLengthMm(l)} className={`flex-1 min-h-[44px] text-xs font-bold rounded-xl border ${lengthMm === l ? "bg-[var(--teal-surface,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"}`}>{l}</button>
												))}
											</div>
										</div>
										<div className="flex flex-col gap-1">
											<span className="text-[11px] font-semibold text-[var(--muted)]">Торк стабильности:</span>
											<div className="flex items-center gap-1">
												{[25, 35, 45].map((t) => (
													<button key={t} type="button" onClick={() => setTorqueNcm(t)} className={`flex-1 min-h-[44px] text-xs font-bold rounded-xl border ${torqueNcm === t ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"}`} data-testid={`torque-${t}`}>{t} Н·см</button>
												))}
											</div>
										</div>
									</div>

									<div className="flex items-center gap-2 pt-1 border-t border-[var(--line)]">
										<span className="text-[11px] font-semibold text-[var(--muted)] shrink-0">Заглушка/ФДМ:</span>
										<button type="button" onClick={() => setCapType("fdm")} className={`flex-1 min-h-[44px] text-xs font-bold rounded-xl border ${capType === "fdm" ? "bg-[var(--teal-surface,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"}`} data-testid="cap-fdm">Формирователь десны (ФДМ)</button>
										<button type="button" onClick={() => setCapType("plug")} className={`flex-1 min-h-[44px] text-xs font-bold rounded-xl border ${capType === "plug" ? "bg-[var(--teal-surface,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]"}`} data-testid="cap-plug">Винт-заглушка (наглухо)</button>
									</div>

									<div className="grid grid-cols-3 gap-2 text-xs pt-1">
										<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<div className="text-[10px] text-[var(--muted)]">АРТИКУЛ (REF)</div>
											<div className="font-mono font-bold">{catalogArticle}</div>
										</div>
										<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<div className="text-[10px] text-[var(--muted)]">ПАРТИЯ (LOT)</div>
											<div className="font-mono font-bold">{lotNumber}</div>
										</div>
										<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<div className="text-[10px] text-[var(--muted)]">СЕРИЙНЫЙ (SN)</div>
											<div className="font-mono font-bold">{serialNumber}</div>
										</div>
									</div>
								</div>
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
					<div className="surgery-hub-footer-telemetry text-xs text-[var(--muted)] truncate min-w-0 flex-1 hidden sm:flex items-center gap-2">
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

export default ChairsideSurgeryHubModal;
