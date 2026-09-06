/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VISIT THERAPEUTIC PROTOCOL WIDGET (CHAIRSIDE 30-SECOND WORKSPACE)
 * Fast 1-click Form 043/u & Order 804n Caries & Restoration Logging
 * Zero Emojis | Touch Targets >= 44px | Dual-Dispatch SOAP Sync (Mandates 8d, 8e, 8k, 8n)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	Activity,
	Check,
	ChevronDown,
	ChevronUp,
	Coins,
	FileText,
	Layers,
	Paintbrush,
	ShieldCheck,
	Sparkles,
	Wrench,
	Zap,
} from "lucide-react";
import {
	type TherapyPresetId,
	type TherapyProtocolPreset,
	type CompositeMaterialBrand,
	type AdhesiveSystemBrand,
	type BlackCavityClass,
	THERAPY_CARIES_PRESET,
	THERAPY_FAILED_FILLING_PRESET,
	THERAPY_WEDGE_EROSION_PRESET,
	THERAPY_FRONTAL_AESTHETIC_PRESET,
	THERAPY_PROTOCOL_PRESETS,
	COMPOSITE_MATERIALS_CATALOG,
	ADHESIVE_SYSTEMS_CATALOG,
	BLACK_CAVITY_CLASS_LABELS,
	RESTORATION_SURFACE_PRESETS,
	detectBlackClass,
	calculateRestorationWarrantyMonths,
	resolve804nServicesForRestoration,
	generateTherapySoap043,
} from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";

export interface VisitTherapyProtocolWidgetProps {
	/** Активный номер зуба по FDI (по умолчанию 16) */
	readonly activeTooth?: number | null;
	/** Выбранные поверхности зуба */
	readonly activeSurfaces?: readonly string[] | undefined;
	/** Обработчик смены поверхностей */
	readonly onSelectSurfaces?: (surfaces: readonly string[]) => void;
	/** Обработчик прямой вставки текста протокола в дневник визита */
	readonly onApplyProtocolText?: (text: string) => void;
	/** Обработчик добавления услуг в смету/наряд */
	readonly onAddToInvoice?: (services: readonly { code: string; nameRu: string }[]) => void;
	/** Дополнительный CSS-класс контейнера */
	readonly className?: string;
}

export const VisitTherapyProtocolWidget: React.FC<VisitTherapyProtocolWidgetProps> = ({
	activeTooth = 16,
	activeSurfaces,
	onSelectSurfaces,
	onApplyProtocolText,
	onAddToInvoice,
	className = "",
}) => {
	const effectiveTooth = activeTooth && activeTooth >= 11 && activeTooth <= 85 ? activeTooth : 16;
	const isAnterior = (effectiveTooth % 10) >= 1 && (effectiveTooth % 10) <= 3;

	// Состояние активного пресета
	const [activePresetId, setActivePresetId] = useState<TherapyPresetId>(() =>
		isAnterior ? "frontal_aesthetic_restoration" : "caries_composite",
	);

	// Выбранные поверхности
	const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>(() => {
		if (activeSurfaces && activeSurfaces.length > 0) return [...activeSurfaces];
		return isAnterior ? ["M", "I", "D"] : ["O"];
	});

	// Материалы и адгезив
	const [selectedComposite, setSelectedComposite] = useState<CompositeMaterialBrand>("filtek_ultimate");
	const [selectedAdhesive, setSelectedAdhesive] = useState<AdhesiveSystemBrand>("optibond_fl");
	const [shadeDentin, setShadeDentin] = useState<string>("A3B");
	const [shadeEnamel, setShadeEnamel] = useState<string>("A2E");
	const [isBruxismRisk, setIsBruxismRisk] = useState<boolean>(false);
	const [includeFluoridation, setIncludeFluoridation] = useState<boolean>(false);
	const [showDetailsAccordion, setShowDetailsAccordion] = useState<boolean>(false);

	// При смене активного зуба синхронизируем пресет и поверхности по умолчанию
	useEffect(() => {
		if (activeSurfaces && activeSurfaces.length > 0) {
			setSelectedSurfaces([...activeSurfaces]);
		} else {
			const anterior = (effectiveTooth % 10) >= 1 && (effectiveTooth % 10) <= 3;
			if (anterior) {
				setSelectedSurfaces(["M", "I", "D"]);
				setActivePresetId("frontal_aesthetic_restoration");
				setSelectedComposite("estelite_asteria");
			} else {
				setSelectedSurfaces(["O"]);
				setActivePresetId("caries_composite");
				setSelectedComposite("filtek_ultimate");
			}
		}
	}, [effectiveTooth, activeSurfaces]);

	// Переключение поверхности в 1 клик
	const toggleSurface = useCallback(
		(surf: string) => {
			setSelectedSurfaces((prev) => {
				const next = prev.includes(surf) ? prev.filter((s) => s !== surf) : [...prev, surf];
				const sanitized = next.length > 0 ? next : ["O"];
				onSelectSurfaces?.(sanitized);
				return sanitized;
			});
		},
		[onSelectSurfaces],
	);

	// Применение готовой комбинации поверхностей (MOD, MO, OD, O, V, L/P, C)
	const handleApplySurfacePreset = useCallback(
		(surfs: readonly string[]) => {
			const next = [...surfs];
			setSelectedSurfaces(next);
			onSelectSurfaces?.(next);
		},
		[onSelectSurfaces],
	);

	// Выбор клинического пресета
	const handleSelectPreset = useCallback((preset: TherapyProtocolPreset) => {
		setActivePresetId(preset.id);
		setSelectedComposite(preset.compositeDefault);
		setSelectedAdhesive(preset.adhesiveDefault);
		if (preset.defaultSurfaces.length > 0) {
			setSelectedSurfaces([...preset.defaultSurfaces]);
			onSelectSurfaces?.([...preset.defaultSurfaces]);
		}
		if (preset.id === "wedge_defect_erosion") {
			setIncludeFluoridation(true);
		}
		showToast(`Выбран 1-клик протокол: «${preset.shortLabelRu}»`, "info", 2000);
	}, [onSelectSurfaces]);

	// Определение класса по Блэку
	const blackClass = useMemo<BlackCavityClass>(() => {
		return detectBlackClass(effectiveTooth, selectedSurfaces);
	}, [effectiveTooth, selectedSurfaces]);

	// Расчет гарантии СтАР
	const warranty = useMemo(() => {
		return calculateRestorationWarrantyMonths({
			toothNumber: effectiveTooth,
			surfacesCount: selectedSurfaces.length,
			compositeBrand: selectedComposite,
			isBruxismRisk,
		});
	}, [effectiveTooth, selectedSurfaces.length, selectedComposite, isBruxismRisk]);

	// Подбор услуг по Номенклатуре 804н
	const services804n = useMemo(() => {
		return resolve804nServicesForRestoration({
			toothNumber: effectiveTooth,
			surfaces: selectedSurfaces,
			isAestheticFrontal: activePresetId === "frontal_aesthetic_restoration" || isAnterior,
			hasOldRestorationRemoval: activePresetId === "failed_filling_replacement",
			includeFluoridation,
		});
	}, [effectiveTooth, selectedSurfaces, activePresetId, isAnterior, includeFluoridation]);

	// Формирование полного структурированного результата SOAP
	const soapResult = useMemo(() => {
		return generateTherapySoap043({
			toothNumber: effectiveTooth,
			surfaces: selectedSurfaces,
			presetId: activePresetId,
			compositeBrand: selectedComposite,
			adhesiveBrand: selectedAdhesive,
			shadeDentin: activePresetId === "frontal_aesthetic_restoration" ? shadeDentin : undefined,
			shadeEnamel: activePresetId === "frontal_aesthetic_restoration" ? shadeEnamel : undefined,
			isBruxismRisk,
			includeFluoridation,
		});
	}, [
		effectiveTooth,
		selectedSurfaces,
		activePresetId,
		selectedComposite,
		selectedAdhesive,
		shadeDentin,
		shadeEnamel,
		isBruxismRisk,
		includeFluoridation,
	]);

	// 1-КЛИК ВНЕСЕНИЕ В КАРТУ 043/у (ДВОЙНОЙ ДИСПАТЧ: useVisitStore + CustomEvent dente-apply-soap-protocol)
	const handleInsertToForm043 = useCallback(() => {
		const textToApply = soapResult.fullProtocolText043;

		// 1. Прямой коллбек родителя, если передан
		onApplyProtocolText?.(textToApply);

		// 2. Обновление хранилища активного визита useVisitStore
		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existing = prev.objectiveStatus?.trim() || "";
				return {
					...prev,
					objectiveStatus: existing ? `${existing}\n\n${textToApply}` : textToApply,
				};
			});
		} catch (err) {
			console.warn("useVisitStore update fallback:", err);
		}

		// 3. Глобальный диспатч CustomEvent для слушателей дневника визита (useVisitDiaryLogic)
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							diagnosisIcd10: soapResult.diagnosisIcd10,
							treatmentDescription: soapResult.treatmentDescription,
							statusLocalis: soapResult.statusLocalis,
							anamnesis: soapResult.anamnesisMorbi,
							complaints: soapResult.subjectiveComplaints,
							recommendations: soapResult.recommendations,
						},
						finding: {
							toothNumber: effectiveTooth,
							state: "Filled",
							surfaces: [...selectedSurfaces],
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
		} catch (err) {
			console.warn("dente-apply-soap-protocol dispatch fallback:", err);
		}

		showToast(`Протокол лечения зуба ${effectiveTooth} внесен в Форму 043/у`, "success", 3000);
	}, [soapResult, effectiveTooth, selectedSurfaces, onApplyProtocolText]);

	// 1-КЛИК ДОБАВЛЕНИЕ В СМЕТУ / НАЧИСЛЕНИЕ УСЛУГ 804н
	const handleAddServicesToInvoice = useCallback(() => {
		onAddToInvoice?.(services804n);

		try {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						toothNumber: effectiveTooth,
						services: services804n,
					},
				}),
			);
		} catch (err) {
			console.warn("Invoice dispatch fallback:", err);
		}

		const codesList = services804n.map((s) => s.code).join(", ");
		showToast(`Услуги (${codesList}) добавлены в смету зуба ${effectiveTooth}`, "success", 3500);
	}, [services804n, effectiveTooth, onAddToInvoice]);

	return (
		<section
			aria-label="Терапевтический протокол лечения зуба"
			className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 ${className}`}
		>
			{/* ВЕРХНИЙ ТУЛБАР В 1 СТРОКУ (Мандат 8d: 32-36px, Хик) */}
			<div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
				<div className="flex items-center gap-2">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400 shrink-0">
						<Zap className="h-5 w-5" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
								Терапевтический протокол: Зуб {effectiveTooth}
							</h3>
							<span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-mono font-bold text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
								{selectedSurfaces.join("") || "O"}
							</span>
							<span className="hidden sm:inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
								{blackClass === "class_I" ? "I класс" : blackClass === "class_II" ? "II класс (MOD)" : blackClass === "class_III" ? "III класс" : blackClass === "class_IV" ? "IV класс (Угол)" : blackClass === "class_V" ? "V класс (Шейка)" : "VI класс"}
							</span>
						</div>
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Фиксация кариеса и реставраций за &le; 30 секунд (Мандаты 8e, 8k, 8n)
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{/* Индикатор гарантии СтАР */}
					<div
						className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/60 px-2.5 py-1 text-xs font-medium text-teal-800 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-300"
						title={warranty.rationaleRu}
					>
						<ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Гарантия {warranty.warrantyMonths} мес.</span>
					</div>

					{/* Кнопка спойлера расширенных параметров */}
					<button
						type="button"
						onClick={() => setShowDetailsAccordion((prev) => !prev)}
						className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
						title="Показать / скрыть подробности протокола"
					>
						<span>Параметры</span>
						{showDetailsAccordion ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
					</button>
				</div>
			</div>

			{/* 1-КЛИК КЛИНИЧЕСКИЕ ПРОТОКОЛЫ (МАНДАТ 8e, 8k: ТАЧ-ТАРГЕТЫ >= 48px) */}
			<div className="mb-4">
				<div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
					1-Клик протоколы у кресла:
				</div>
				<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
					{THERAPY_PROTOCOL_PRESETS.map((preset) => {
						const isCurrent = activePresetId === preset.id;
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => handleSelectPreset(preset)}
								className={`flex min-h-[52px] flex-col justify-center rounded-xl border p-2.5 text-left transition active:scale-[0.98] cursor-pointer touch-manipulation ${
									isCurrent
										? "border-teal-600 bg-teal-50/90 text-teal-950 shadow-sm ring-1 ring-teal-500 dark:border-teal-400 dark:bg-teal-950/60 dark:text-teal-100"
										: "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
								}`}
								data-testid={`therapy-preset-btn-${preset.id}`}
							>
								<div className="flex items-center gap-1.5 font-bold text-xs">
									<Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
									<span className="truncate">{preset.shortLabelRu}</span>
								</div>
								<div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
									{preset.id === "caries_composite"
										? "OptiBond FL + Filtek"
										: preset.id === "failed_filling_replacement"
											? "Снятие + Harmonize"
											: preset.id === "wedge_defect_erosion"
												? "Clearfil SE + SDR"
												: "Ключ + Мамелоны"}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* 1-КЛИК ПОВЕРХНОСТИ ЗУБА (ТАЧ-ТАРГЕТЫ >= 44-48px) */}
			<div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
				<div className="mb-2 flex items-center justify-between">
					<span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
						Поверхности в 1 клик:
					</span>
					<span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400">
						[{selectedSurfaces.join(", ") || "O"}]
					</span>
				</div>

				{/* Быстрые комбинации */}
				<div className="mb-2.5 flex flex-wrap gap-1.5">
					{RESTORATION_SURFACE_PRESETS.map((preset) => {
						const isMatch =
							preset.surfaces.length === selectedSurfaces.length &&
							preset.surfaces.every((s) => selectedSurfaces.includes(s));
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => handleApplySurfacePreset(preset.surfaces)}
								className={`min-h-[44px] px-3 rounded-lg text-xs font-mono font-bold border transition cursor-pointer select-none touch-manipulation flex items-center justify-center ${
									isMatch
										? "bg-teal-600 text-white border-teal-600 shadow-xs scale-105"
										: "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
								}`}
								title={preset.descriptionRu}
								data-testid={`therapy-surf-preset-${preset.id}`}
							>
								[{preset.labelRu}]
							</button>
						);
					})}
				</div>

				{/* Отдельные поверхности */}
				<div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
					<span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1">По отдельности:</span>
					{(["O", "V", "L", "M", "D", "C"] as const).map((surf) => {
						const isActive = selectedSurfaces.includes(surf);
						return (
							<button
								key={surf}
								type="button"
								onClick={() => toggleSurface(surf)}
								className={`min-h-[44px] min-w-[44px] px-2.5 rounded-lg text-xs font-mono font-bold border transition cursor-pointer select-none touch-manipulation flex items-center justify-center ${
									isActive
										? "bg-teal-600 text-white border-teal-600 shadow-xs scale-105"
										: "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
								}`}
								title={`Поверхность ${surf}`}
							>
								{surf}
							</button>
						);
					})}
				</div>
			</div>

			{/* СПОЙЛЕР ДЕТАЛЕЙ (МАТЕРИАЛЫ, ОТТЕНКИ, БОНД) */}
			{showDetailsAccordion && (
				<div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50 animate-fadeIn">
					{/* Выбор композита */}
					<div>
						<label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
							Композитный материал:
						</label>
						<div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
							{(
								[
									"filtek_ultimate",
									"estelite_asteria",
									"harmonize",
									"sdr_plus_flow",
									"beautifil_flow",
								] as const
							).map((matId) => {
								const info = COMPOSITE_MATERIALS_CATALOG[matId];
								const isSelected = selectedComposite === matId;
								return (
									<button
										key={matId}
										type="button"
										onClick={() => setSelectedComposite(matId)}
										className={`min-h-[44px] px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition truncate cursor-pointer ${
											isSelected
												? "border-teal-600 bg-teal-50 font-bold text-teal-900 dark:border-teal-400 dark:bg-teal-950/50 dark:text-teal-200"
												: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
										}`}
										title={info.indicationRu}
									>
										{info.tradeNameRu}
									</button>
								);
							})}
						</div>
					</div>

					{/* Выбор адгезива */}
					<div>
						<label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
							Адгезивная система:
						</label>
						<div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
							{(["optibond_fl", "single_bond_2", "clearfil_se_bond", "optibond_universal"] as const).map(
								(adhId) => {
									const info = ADHESIVE_SYSTEMS_CATALOG[adhId];
									const isSelected = selectedAdhesive === adhId;
									return (
										<button
											key={adhId}
											type="button"
											onClick={() => setSelectedAdhesive(adhId)}
											className={`min-h-[44px] px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition truncate cursor-pointer ${
												isSelected
													? "border-teal-600 bg-teal-50 font-bold text-teal-900 dark:border-teal-400 dark:bg-teal-950/50 dark:text-teal-200"
													: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
											}`}
											title={info.protocolSummaryRu}
										>
											{info.tradeNameRu}
										</button>
									);
								},
							)}
						</div>
					</div>

					{/* Опции для фронтальных зубов: Оттенки */}
					{isAnterior && (
						<div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
							<div>
								<label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-400">
									Оттенок дентина:
								</label>
								<select
									value={shadeDentin}
									onChange={(e) => setShadeDentin(e.target.value)}
									className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
								>
									<option value="A1B">A1 Body</option>
									<option value="A2B">A2 Body</option>
									<option value="A3B">A3 Body</option>
									<option value="A3.5B">A3.5 Body</option>
									<option value="OA2">OA2 Opaque</option>
									<option value="OA3">OA3 Opaque</option>
								</select>
							</div>
							<div>
								<label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-400">
									Оттенок эмали:
								</label>
								<select
									value={shadeEnamel}
									onChange={(e) => setShadeEnamel(e.target.value)}
									className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
								>
									<option value="A1E">A1 Enamel</option>
									<option value="A2E">A2 Enamel</option>
									<option value="A3E">A3 Enamel</option>
									<option value="NE">NE (Natural Enamel)</option>
									<option value="WE">WE (White Enamel)</option>
								</select>
							</div>
						</div>
					)}
				</div>
			)}

			{/* НИЖНИЙ ПЛАНШЕТ ДЕЙСТВИЙ: 1-КЛИК ВНЕСЕНИЕ В 043/у И В СМЕТУ (МАНДАТ 8e: КНОПКИ ВСЕГДА АКТИВНЫ) */}
			<div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
				<div className="flex items-center gap-2">
					{/* Кнопка 1-клик в 043/у */}
					<button
						type="button"
						onClick={handleInsertToForm043}
						className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 active:scale-95 cursor-pointer touch-manipulation"
						data-testid="therapy-btn-apply-043"
					>
						<FileText className="h-4 w-4 shrink-0" />
						<span>Внести в 043/у</span>
					</button>

					{/* Кнопка 1-клик в смету */}
					<button
						type="button"
						onClick={handleAddServicesToInvoice}
						className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50/80 px-3.5 py-2.5 text-sm font-bold text-teal-800 transition hover:bg-teal-100 active:scale-95 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/60 cursor-pointer touch-manipulation"
						data-testid="therapy-btn-add-invoice"
					>
						<Coins className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
						<span>В смету ({services804n.length})</span>
					</button>
				</div>

				<div className="text-right">
					<div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
						{soapResult.diagnosisIcd10}
					</div>
					<div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
						{BLACK_CAVITY_CLASS_LABELS[blackClass]}
					</div>
				</div>
			</div>
		</section>
	);
};

export default VisitTherapyProtocolWidget;
