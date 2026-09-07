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

	// Клинический оверрайд врача (Мандат 8e п. 7, 8n)
	const [overrideActive, setOverrideActive] = useState<boolean>(false);
	const [overrideReason, setOverrideReason] = useState<string>(
		"Срочное изготовление по клиническим показаниям (аванс < 50%)",
	);

	const handleApplyProtocol = useCallback(
		(protocol: OrthopedicProtocolPreset) => {
			if (isLocked && !overrideActive) {
				showToast("Карта визита заблокирована для редактирования (активируйте клинический оверрайд врача)", "warning");
				return;
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

			{/* 1-КЛИК СЕЛЕКТОР ШКАЛЫ VITA CLASSICAL & BLEACH (Мандат 8e, 8n: эргономика у кресла, тач-таргеты >= 48px) */}
			<div className="mb-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-2.5">
				<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
					<div className="flex items-center gap-1.5">
						<Sparkles size={16} className="text-amber-500 dark:text-amber-400 shrink-0" />
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200">
							Шкала VITA Classical & Bleach (выбор в 1 клик):
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Выбранный оттенок:</span>
						<span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-teal-600 text-white shadow-xs">
							{selectedShade}
						</span>
					</div>
				</div>

				{/* 1-клик сетка групп VITA */}
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
										{proto.treatment.slice(0, 120)}...
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
									disabled={isLocked && !overrideActive}
									className={`min-h-[48px] px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
										isApplied
											? "bg-emerald-600 text-white"
											: "bg-teal-600 hover:bg-teal-700 text-white"
									} disabled:opacity-50 disabled:cursor-not-allowed`}
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
							placeholder="Причина клинического оверрайда..."
							aria-label="Причина клинического оверрайда"
							className="min-h-[48px] flex-1 px-3 text-xs rounded-lg border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100 focus:outline-hidden"
						/>
					)}
				</div>

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
	);
}
