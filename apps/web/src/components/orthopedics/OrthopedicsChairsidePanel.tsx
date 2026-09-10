import React, { useState, useCallback, useId } from "react";
import {
	Crown,
	Sparkles,
	CheckCircle2,
	Layers,
	ShieldCheck,
	FileText,
	AlertCircle,
	ArrowRight,
	ExternalLink,
	Check,
	Send,
	Zap,
} from "lucide-react";
import {
	ORTHOPEDIC_CANONICAL_PROTOCOLS,
	VITA_SHADE_GROUPS,
	applyOrthopedicProtocolToVisit,
	createDoctorClinicalOverride,
	type OrthopedicProtocolPreset,
	type FormatOrthopedicProtocolOptions,
	type Order804nServiceItem,
} from "./orthopedicProtocols.js";
import { showToast } from "../GlobalToast.js";

export interface StandardZtlPreset {
	readonly id: string;
	readonly name: string;
	readonly material: string;
	readonly constructionType: string;
	readonly badge: string;
	readonly description: string;
}

export const STANDARD_ZTL_ORDER_PRESETS: readonly StandardZtlPreset[] = [
	{
		id: "zirconia",
		name: "Диоксид циркония",
		material: "ZrO2 Multi-Layer",
		constructionType: "single_crown",
		badge: "ZrO2",
		description: "Монолитный диоксид циркония многослойной градиентной прозрачности",
	},
	{
		id: "emax",
		name: "IPS e.max",
		material: "IPS e.max Press",
		constructionType: "single_crown",
		badge: "e.max Press",
		description: "Прессованная дисиликатная стеклокерамика высокой эстетики",
	},
	{
		id: "metal_ceramic",
		name: "Металлокерамика",
		material: "Металлокерамика Noritake",
		constructionType: "single_crown",
		badge: "МК Noritake",
		description: "Классическая металлокерамика на CoCr каркасе",
	},
	{
		id: "clasp_denture",
		name: "Бюгельный протез",
		material: "Бюгель на кламмерах / замках (CoCr)",
		constructionType: "clasp_denture",
		badge: "Бюгель CoCr",
		description: "Дуговой съемный протез с опорно-удерживающими кламмерами или замками",
	},
] as const;

export const VITA_3D_MASTER_SHADE_GROUPS = [
	{
		group: "0M (Bleach)",
		labelRu: "0M Bleach",
		shades: ["0M1", "0M2", "0M3"] as const,
	},
	{
		group: "1M",
		labelRu: "Группа 1M",
		shades: ["1M1", "1M2"] as const,
	},
	{
		group: "2M / 2L / 2R",
		labelRu: "Группа 2",
		shades: ["2L1.5", "2M1", "2M2", "2M3", "2R1.5"] as const,
	},
	{
		group: "3M / 3L / 3R",
		labelRu: "Группа 3",
		shades: ["3L1.5", "3M1", "3M2", "3M3", "3R1.5"] as const,
	},
	{
		group: "4M / 4L",
		labelRu: "Группа 4",
		shades: ["4L1.5", "4M1", "4M2", "4M3"] as const,
	},
	{
		group: "5M",
		labelRu: "Группа 5",
		shades: ["5M1", "5M2"] as const,
	},
] as const;

export interface OrthopedicsChairsidePanelProps {
	readonly activeToothFdi?: string | number | undefined;
	readonly selectedTeeth?: readonly (string | number)[] | undefined;
	readonly onToothSelect?: ((tooth: number) => void) | undefined;
	readonly onOpenLabOrder?: (() => void) | undefined;
	readonly onAddToInvoice?: ((services: readonly Order804nServiceItem[]) => void) | undefined;
	readonly isLocked?: boolean;
	readonly className?: string;
}

export function OrthopedicsChairsidePanel({
	activeToothFdi,
	selectedTeeth = [],
	onToothSelect,
	onOpenLabOrder,
	onAddToInvoice,
	isLocked = false,
	className = "",
}: OrthopedicsChairsidePanelProps) {
	const selectId = useId();
	const [activeTeethInput, setActiveTeethInput] = useState<string>(
		selectedTeeth.length > 0
			? selectedTeeth.join(", ")
			: activeToothFdi
				? String(activeToothFdi)
				: "16",
	);

	const [jawScope, setJawScope] = useState<"upper" | "lower" | "both" | "none">("none");
	const [selectedMaterial, setSelectedMaterial] = useState<string>("ZrO2 Multi-Layer");
	const [selectedShade, setSelectedShade] = useState<string>("A2");
	const [appliedProtocolId, setAppliedProtocolId] = useState<string | null>(null);

	// Стандартные наряды ЗТЛ и шкала VITA (Мандат 8i, 8k)
	const [shadeSystem, setShadeSystem] = useState<"classical" | "3d_master">("classical");
	const [activeZtlPresetId, setActiveZtlPresetId] = useState<string>("zirconia");
	const [isLabOrderSending, setIsLabOrderSending] = useState<boolean>(false);
	const [labOrderSentNumber, setLabOrderSentNumber] = useState<string | null>(null);

	// Клинический оверрайд врача (Мандат 8e п. 7, 8n)
	const [overrideActive, setOverrideActive] = useState<boolean>(false);
	const [overrideReason, setOverrideReason] = useState<string>(
		"Срочное изготовление по клиническим показаниям (аванс < 50%)",
	);

	const handleSelectZtlPreset = useCallback((preset: StandardZtlPreset) => {
		setActiveZtlPresetId(preset.id);
		setSelectedMaterial(preset.material);
		showToast(`Выбран стандарт ЗТЛ: ${preset.name} (${preset.badge})`, "info", 2000);
	}, []);

	const handleImmediateSendToLab = useCallback(() => {
		if (isLocked && !overrideActive) {
			const auditReason =
				"Исправленному верить: срочный наряд ЗТЛ при закрытом визите";
			setOverrideActive(true);
			setOverrideReason(auditReason);
			const override = createDoctorClinicalOverride({
				reason: auditReason,
			});
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-doctor-clinical-override", {
						detail: override,
					}),
				);
			}
			showToast(
				"Исправленному верить: клинический оверрайд врача активирован (Мандат 8e)",
				"info",
				3000,
			);
		}

		const teethParts = activeTeethInput
			.split(/[\s,;-]+/)
			.map((p) => p.trim())
			.filter(Boolean);

		const preset =
			STANDARD_ZTL_ORDER_PRESETS.find((p) => p.id === activeZtlPresetId) ??
			STANDARD_ZTL_ORDER_PRESETS[0];
		if (!preset) return;
		const orderNumber = `ЗТЛ-${Date.now().toString().slice(-6)}`;

		setIsLabOrderSending(true);

		const labOrderPayload = {
			orderNumber,
			createdAt: new Date().toISOString(),
			teeth: teethParts.length > 0 ? teethParts : ["16"],
			jawScope: jawScope !== "none" ? jawScope : "upper",
			constructionType: preset.constructionType,
			material: selectedMaterial,
			colorVita: selectedShade,
			doctorNotes: `Срочный 1-клик наряд ЗТЛ из кресла врача. Пресет: ${preset.name}. Оттенок: ${selectedShade}.`,
			overrideActive: true,
			overrideReason: overrideActive
				? overrideReason
				: "Исправленному верить: срочный наряд ЗТЛ при закрытом визите",
		};

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-created", {
					detail: labOrderPayload,
				}),
			);
		}

		setTimeout(() => {
			setIsLabOrderSending(false);
			setLabOrderSentNumber(orderNumber);
			showToast(
				`Наряд ${orderNumber} в ЗТЛ успешно отправлен (${preset.name}, оттенок ${selectedShade})!`,
				"success",
				4000,
			);
		}, 300);
	}, [
		activeTeethInput,
		activeZtlPresetId,
		isLocked,
		jawScope,
		overrideActive,
		overrideReason,
		selectedMaterial,
		selectedShade,
	]);

	const handleApplyProtocol = useCallback(
		(protocol: OrthopedicProtocolPreset) => {
			if (isLocked && !overrideActive) {
				const auditReason =
					"Исправленному верить: дополнение ортопедического протокола";
				setOverrideActive(true);
				setOverrideReason(auditReason);
				const override = createDoctorClinicalOverride({
					reason: auditReason,
				});
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-doctor-clinical-override", {
							detail: override,
						}),
					);
				}
				showToast(
					"Исправленному верить: клинический оверрайд врача активирован (Мандат 8e)",
					"info",
					3000,
				);
			}

			const teethParts = activeTeethInput
				.split(/[\s,;-]+/)
				.map((p) => p.trim())
				.filter(Boolean);

			const options: FormatOrthopedicProtocolOptions = {
				teethFdi: teethParts.length > 0 ? teethParts : undefined,
				toothFdi: teethParts.length === 1 ? teethParts[0] : undefined,
				jawScope: jawScope !== "none" ? jawScope : undefined,
				material: selectedMaterial,
				colorVita: selectedShade,
			};

			const result = applyOrthopedicProtocolToVisit({
				protocol,
				options,
				copyToClipboard: true,
				showNotification: true,
				onAddToInvoice,
			});

			setAppliedProtocolId(protocol.id);
			setTimeout(() => {
				setAppliedProtocolId(null);
			}, 3000);

			const firstTooth = result.teethNumbers[0];
			if (typeof firstTooth === "number" && onToothSelect) {
				onToothSelect(firstTooth);
			}
		},
		[
			activeTeethInput,
			isLocked,
			overrideActive,
			jawScope,
			selectedMaterial,
			selectedShade,
			onToothSelect,
			onAddToInvoice,
		],
	);

	const handleToggleOverride = useCallback(() => {
		if (overrideActive) {
			setOverrideActive(false);
			showToast("Клинический оверрайд отменен", "info");
			return;
		}

		const override = createDoctorClinicalOverride({
			reason: overrideReason,
		});

		setOverrideActive(true);
		showToast(override.notice, "success", 4000);

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-doctor-clinical-override", {
					detail: override,
				}),
			);
		}
	}, [overrideActive, overrideReason]);

	const getProtocolIcon = (category: OrthopedicProtocolPreset["category"]) => {
		switch (category) {
			case "prep_crown":
				return <Crown size={18} className="text-teal-600 dark:text-teal-400 shrink-0" />;
			case "try_in":
				return <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />;
			case "permanent_cementation":
				return <Sparkles size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
			case "removable_prosthetics":
				return <Layers size={18} className="text-purple-600 dark:text-purple-400 shrink-0" />;
			case "consultation_norm":
				return <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
		}
	};

	return (
		<div
			className={`orthopedics-chairside-panel p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs ${className}`}
			data-testid="orthopedics-chairside-panel"
		>
			{/* Верхняя строка: Заголовок, область зубов, параметры материала */}
			<div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
				<div className="flex items-center gap-2">
					<Crown size={20} className="text-teal-600 dark:text-teal-400" />
					<div className="leading-tight">
						<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
							Ортопедия у кресла (043/у · Этап 3 · ЗТЛ)
						</h3>
						<p className="text-xs text-slate-600 dark:text-slate-300">
							1-клик протоколы · Приказ 804н · Автономия врача (Мандат 8e)
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{/* Ввод зубов */}
					<div className="flex items-center gap-1.5">
						<label
							htmlFor={`${selectId}-teeth`}
							className="text-xs font-semibold text-slate-700 dark:text-slate-200"
						>
							Зуб(ы):
						</label>
						<input
							id={`${selectId}-teeth`}
							type="text"
							value={activeTeethInput}
							onChange={(e) => setActiveTeethInput(e.target.value)}
							placeholder="16, 21"
							aria-label="Номера зубов FDI"
							className="min-h-[48px] w-24 px-3 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
							data-testid="ortho-teeth-input"
						/>
					</div>

					{/* Челюсть */}
					<div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden text-xs">
						<button
							type="button"
							onClick={() => setJawScope(jawScope === "upper" ? "none" : "upper")}
							className={`min-h-[48px] px-3 font-bold cursor-pointer transition-colors ${
								jawScope === "upper"
									? "bg-teal-600 text-white"
									: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
							title="Верхняя челюсть"
						>
							ВЧ
						</button>
						<button
							type="button"
							onClick={() => setJawScope(jawScope === "lower" ? "none" : "lower")}
							className={`min-h-[48px] px-3 font-bold cursor-pointer transition-colors border-l border-slate-300 dark:border-slate-700 ${
								jawScope === "lower"
									? "bg-teal-600 text-white"
									: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
							title="Нижняя челюсть"
						>
							НЧ
						</button>
						<button
							type="button"
							onClick={() => setJawScope(jawScope === "both" ? "none" : "both")}
							className={`min-h-[48px] px-3 font-bold cursor-pointer transition-colors border-l border-slate-300 dark:border-slate-700 ${
								jawScope === "both"
									? "bg-teal-600 text-white"
									: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
							title="Обе челюсти"
						>
							Обе
						</button>
					</div>

					{/* Материал */}
					<select
						value={selectedMaterial}
						onChange={(e) => setSelectedMaterial(e.target.value)}
						aria-label="Материал конструкции"
						className="min-h-[48px] px-3 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
					>
						<option value="ZrO2 Multi-Layer">ZrO2 Multi-Layer</option>
						<option value="IPS e.max Press">IPS e.max Press</option>
						<option value="Металлокерамика Noritake">Металлокерамика Noritake</option>
						<option value="Acry-Free / Квадротти">Acry-Free / Квадротти</option>
						<option value="Временная Protemp 4">Временная Protemp 4</option>
					</select>
				</div>
			</div>

			{/* 1-КЛИК ПРЕСЕТЫ СТАНДАРТНЫХ НАРАДОВ ЗТЛ (Мандат 8i, 8k: без процедурных симуляторов, практичный выбор) */}
			<div className="mb-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
				<div className="flex items-center justify-between gap-2 mb-2">
					<div className="flex items-center gap-1.5">
						<Zap size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200">
							Стандарты ЗТЛ (1 клик):
						</span>
					</div>
					<span className="text-[11px] text-slate-500 dark:text-slate-400">
						Готовые спецификации для зуботехнической лаборатории
					</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
					{STANDARD_ZTL_ORDER_PRESETS.map((preset) => {
						const isSelected = activeZtlPresetId === preset.id;
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => handleSelectZtlPreset(preset)}
								className={`min-h-[48px] px-3 py-2 rounded-lg text-xs font-bold text-left transition-all cursor-pointer border flex flex-col justify-between ${
									isSelected
										? "bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-950 dark:text-teal-100 ring-1 ring-teal-500 shadow-xs"
										: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
								}`}
								data-testid={`ztl-preset-${preset.id}`}
								title={preset.description}
							>
								<div className="flex items-center justify-between gap-1">
									<span className="truncate">{preset.name}</span>
									<span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
										{preset.badge}
									</span>
								</div>
								<span className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
									{preset.material}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* 1-КЛИК СЕЛЕКТОР ШКАЛЫ VITA CLASSICAL & 3D-MASTER (Мандат 8e, 8n: эргономика у кресла, тач-таргеты >= 48px) */}
			<div className="mb-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-2.5">
				<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
					<div className="flex items-center gap-2">
						<Sparkles size={16} className="text-amber-500 dark:text-amber-400 shrink-0" />
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200">
							Шкала VITA:
						</span>
						<div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden text-xs">
							<button
								type="button"
								onClick={() => setShadeSystem("classical")}
								className={`min-h-[48px] px-3 font-bold cursor-pointer transition-colors ${
									shadeSystem === "classical"
										? "bg-teal-600 text-white"
										: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
								}`}
								data-testid="vita-classical-tab"
							>
								VITA Classical
							</button>
							<button
								type="button"
								onClick={() => setShadeSystem("3d_master")}
								className={`min-h-[48px] px-3 font-bold cursor-pointer transition-colors border-l border-slate-300 dark:border-slate-700 ${
									shadeSystem === "3d_master"
										? "bg-teal-600 text-white"
										: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
								}`}
								data-testid="vita-3d-master-tab"
							>
								VITA 3D-Master
							</button>
						</div>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Выбранный оттенок:</span>
						<span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-teal-600 text-white shadow-xs">
							{selectedShade}
						</span>
					</div>
				</div>

				{shadeSystem === "classical" ? (
					/* 1-клик сетка групп VITA Classical */
					<div className="space-y-1.5">
						{VITA_SHADE_GROUPS.map((grp) => (
							<div key={grp.group} className="flex flex-wrap items-center gap-1.5">
								<span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 w-16 shrink-0">
									{grp.group === "Bleach" ? "Bleach" : `Гр. ${grp.group}`}:
								</span>
								<div className="flex flex-wrap items-center gap-1.5 flex-1">
									{grp.shades.map((shade) => {
										const isSelected = selectedShade === shade;
										const isBleach = shade.startsWith("BL");

										return (
											<button
												key={shade}
												type="button"
												onClick={() => setSelectedShade(shade)}
												aria-label={`Оттенок ${shade}`}
												title={`Выбрать оттенок ${shade}`}
												className={`min-h-[48px] min-w-[48px] px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center ${
													isSelected
														? "bg-teal-600 text-white ring-2 ring-teal-500 ring-offset-1 shadow-sm font-extrabold"
														: isBleach
															? "bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50"
															: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
												}`}
												data-testid={`vita-shade-${shade}`}
											>
												{shade}
											</button>
										);
									})}
								</div>
							</div>
						))}
					</div>
				) : (
					/* 1-клик сетка групп VITA 3D-Master */
					<div className="space-y-1.5">
						{VITA_3D_MASTER_SHADE_GROUPS.map((grp) => (
							<div key={grp.group} className="flex flex-wrap items-center gap-1.5">
								<span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 w-24 shrink-0">
									{grp.labelRu}:
								</span>
								<div className="flex flex-wrap items-center gap-1.5 flex-1">
									{grp.shades.map((shade) => {
										const isSelected = selectedShade === shade;
										return (
											<button
												key={shade}
												type="button"
												onClick={() => setSelectedShade(shade)}
												aria-label={`Оттенок 3D-Master ${shade}`}
												title={`Выбрать оттенок VITA 3D-Master ${shade}`}
												className={`min-h-[48px] min-w-[48px] px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center ${
													isSelected
														? "bg-teal-600 text-white ring-2 ring-teal-500 ring-offset-1 shadow-sm font-extrabold"
														: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
												}`}
												data-testid={`vita-3d-shade-${shade}`}
											>
												{shade}
											</button>
										);
									})}
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Сетка 4 канонических протоколов (1 клик -> 043/у + Смета + Этап 3) */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3">
				{ORTHOPEDIC_CANONICAL_PROTOCOLS.map((proto) => {
					const isApplied = appliedProtocolId === proto.id;

					return (
						<div
							key={proto.id}
							className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-colors flex flex-col justify-between gap-2"
						>
							<div className="flex items-start gap-2">
								{getProtocolIcon(proto.category)}
								<div className="min-w-0 flex-1">
									<div className="flex items-center justify-between gap-1">
										<h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
											{proto.shortLabel}
										</h4>
										<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
											{proto.defaultIcd10}
										</span>
									</div>
									<p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
										{proto.treatment}
									</p>
								</div>
							</div>

							<div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
								<div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
									Номенклатура: {proto.order804nServices.map((s) => s.code).join(", ")}
								</div>

								<button
									type="button"
									onClick={() => handleApplyProtocol(proto)}
									className={`min-h-[48px] px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
										isApplied
											? "bg-emerald-600 text-white"
											: "bg-teal-600 hover:bg-teal-700 text-white"
									}`}
									data-testid={`apply-ortho-protocol-${proto.id}`}
									title={`Внести протокол «${proto.shortLabel}» в дневник 043/у, смету визита и Этап 3 (Ортопедия)`}
								>
									{isApplied ? (
										<>
											<Check size={16} />
											<span>Внесено в 043/у и смету</span>
										</>
									) : (
										<>
											<FileText size={16} />
											<span>Внести в 043/у и смету</span>
											<ArrowRight size={14} />
										</>
									)}
								</button>
							</div>
						</div>
					);
				})}
			</div>

			{/* Нижняя панель: Мандат 8e Клинический оверрайд врача + Кнопка наряда ЗТЛ */}
			<div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
				{/* Клинический оверрайд врача (Мандат 8e п. 7, 8n) */}
				<div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
					<button
						type="button"
						onClick={handleToggleOverride}
						className={`min-h-[48px] px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
							overrideActive
								? "bg-emerald-700 text-white shadow-xs"
								: "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
						}`}
						data-testid="doctor-clinical-override-toggle"
						title="Мандат 8e п. 7: Клинический оверрайд врача при авансе < 50% без согласований начмеда"
					>
						<ShieldCheck size={16} />
						<span>
							{overrideActive
								? "Оверрайд врача: АКТИВЕН (Мандат 8e)"
								: "Клинический оверрайд (Аванс < 50%)"}
						</span>
					</button>

					{overrideActive && (
						<input
							type="text"
							value={overrideReason}
							onChange={(e) => setOverrideReason(e.target.value)}
							placeholder="Причина клинического оверрайда"
							aria-label="Причина клинического оверрайда"
							className="min-h-[48px] flex-1 px-3 text-xs rounded-lg border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100 focus:outline-hidden"
						/>
					)}
				</div>

				{/* Действия ЗТЛ: 1-клик отправка + Конструктор */}
				<div className="flex items-center gap-2 flex-wrap">
					{labOrderSentNumber && (
						<span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
							✓ Отправлен {labOrderSentNumber}
						</span>
					)}

					<button
						type="button"
						onClick={handleImmediateSendToLab}
						disabled={isLabOrderSending}
						className="min-h-[48px] px-4 py-2 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500 flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
						data-testid="direct-send-lab-order-btn"
						title="Мандат 8e, 8i: Мгновенно отправить заказ-наряд в лабораторию без бюрократических барьеров"
					>
						<Send size={15} />
						<span>{isLabOrderSending ? "Отправка в ЗТЛ..." : "В ЗТЛ (1 клик)"}</span>
					</button>

					{/* Переход в конструктор наряда ЗТЛ */}
					{onOpenLabOrder && (
						<button
							type="button"
							onClick={onOpenLabOrder}
							className="min-h-[48px] px-4 py-2 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/40 border border-teal-200 dark:border-teal-800 flex items-center gap-2 transition-all cursor-pointer"
							data-testid="open-lab-order-constructor-btn"
							title="Открыть конструктор заказ-нарядов зуботехнической лаборатории"
						>
							<span>Наряд ЗТЛ</span>
							<ExternalLink size={15} />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
