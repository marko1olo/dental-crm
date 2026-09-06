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
	applyOrthopedicProtocolToVisit,
	createDoctorClinicalOverride,
	type OrthopedicProtocolPreset,
	type FormatOrthopedicProtocolOptions,
} from "./orthopedicProtocols.js";
import { showToast } from "../GlobalToast.js";

export interface OrthopedicsChairsidePanelProps {
	readonly activeToothFdi?: string | number | undefined;
	readonly selectedTeeth?: readonly (string | number)[] | undefined;
	readonly onToothSelect?: ((tooth: number) => void) | undefined;
	readonly onOpenLabOrder?: (() => void) | undefined;
	readonly isLocked?: boolean;
	readonly className?: string;
}

export function OrthopedicsChairsidePanel({
	activeToothFdi,
	selectedTeeth = [],
	onToothSelect,
	onOpenLabOrder,
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
			if (isLocked) {
				showToast("Карта визита заблокирована для редактирования", "warning");
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
			jawScope,
			selectedMaterial,
			selectedShade,
			onToothSelect,
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
			{/* Верхняя строка: Заголовок, область зубов, параметры VITA */}
			<div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
				<div className="flex items-center gap-2">
					<Crown size={20} className="text-teal-600 dark:text-teal-400" />
					<div className="leading-tight">
						<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
							Ортопедия у кресла (043/у · Этап 3 · ЗТЛ)
						</h3>
						<p className="text-[11px] text-slate-500 dark:text-slate-400">
							1-клик протоколы · Приказ 804н · Автономия врача (Мандат 8e)
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{/* Ввод зубов */}
					<div className="flex items-center gap-1">
						<label
							htmlFor={`${selectId}-teeth`}
							className="text-xs font-semibold text-slate-600 dark:text-slate-300"
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
							className="min-h-[36px] w-20 px-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
							data-testid="ortho-teeth-input"
						/>
					</div>

					{/* Челюсть */}
					<div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
						<button
							type="button"
							onClick={() => setJawScope(jawScope === "upper" ? "none" : "upper")}
							className={`min-h-[36px] px-2 font-bold cursor-pointer transition-colors ${
								jawScope === "upper"
									? "bg-teal-600 text-white"
									: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
							}`}
							title="Верхняя челюсть"
						>
							ВЧ
						</button>
						<button
							type="button"
							onClick={() => setJawScope(jawScope === "lower" ? "none" : "lower")}
							className={`min-h-[36px] px-2 font-bold cursor-pointer transition-colors border-l border-slate-200 dark:border-slate-700 ${
								jawScope === "lower"
									? "bg-teal-600 text-white"
									: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
							}`}
							title="Нижняя челюсть"
						>
							НЧ
						</button>
						<button
							type="button"
							onClick={() => setJawScope(jawScope === "both" ? "none" : "both")}
							className={`min-h-[36px] px-2 font-bold cursor-pointer transition-colors border-l border-slate-200 dark:border-slate-700 ${
								jawScope === "both"
									? "bg-teal-600 text-white"
									: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
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
						className="min-h-[36px] px-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
					>
						<option value="ZrO2 Multi-Layer">ZrO2 Multi-Layer</option>
						<option value="IPS e.max Press">IPS e.max Press</option>
						<option value="Металлокерамика Noritake">Металлокерамика Noritake</option>
						<option value="Acry-Free / Квадротти">Acry-Free / Квадротти</option>
						<option value="Временная Protemp 4">Временная Protemp 4</option>
					</select>

					{/* Цвет VITA */}
					<select
						value={selectedShade}
						onChange={(e) => setSelectedShade(e.target.value)}
						aria-label="Цвет по шкале VITA"
						className="min-h-[36px] px-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
					>
						{["A1", "A2", "A3", "A3.5", "B1", "B2", "C1", "C2", "D2", "BL2"].map(
							(shade) => (
								<option key={shade} value={shade}>
									{shade}
								</option>
							),
						)}
					</select>
				</div>
			</div>

			{/* Сетка 4 канонических протоколов (1 клик -> 043/у + Этап 3) */}
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
									<p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
										{proto.treatment.slice(0, 120)}...
									</p>
								</div>
							</div>

							<div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
								<div className="text-[10px] text-slate-500 dark:text-slate-400">
									Номенклатура: {proto.order804nServices.map((s) => s.code).join(", ")}
								</div>

								<button
									type="button"
									onClick={() => handleApplyProtocol(proto)}
									disabled={isLocked}
									className={`min-h-[44px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
										isApplied
											? "bg-emerald-600 text-white"
											: "bg-teal-600 hover:bg-teal-700 text-white"
									} disabled:opacity-50 disabled:cursor-not-allowed`}
									data-testid={`apply-ortho-protocol-${proto.id}`}
									title={`Внести протокол «${proto.shortLabel}» в дневник 043/у и Этап 3 (Ортопедия)`}
								>
									{isApplied ? (
										<>
											<Check size={14} />
											<span>Внесено в 043/у</span>
										</>
									) : (
										<>
											<FileText size={14} />
											<span>Внести в 043/у</span>
											<ArrowRight size={13} />
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
						className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
							overrideActive
								? "bg-emerald-700 text-white shadow-xs"
								: "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
						}`}
						data-testid="doctor-clinical-override-toggle"
						title="Мандат 8e п. 7: Клинический оверрайд врача при авансе < 50% без согласований начмеда"
					>
						<ShieldCheck size={15} />
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
							className="min-h-[44px] flex-1 px-2.5 text-xs rounded-lg border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100 focus:outline-hidden"
						/>
					)}
				</div>

				{/* Переход в конструктор наряда ЗТЛ */}
				{onOpenLabOrder && (
					<button
						type="button"
						onClick={onOpenLabOrder}
						className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/40 border border-teal-200 dark:border-teal-800 flex items-center gap-1.5 transition-all cursor-pointer"
						data-testid="open-lab-order-constructor-btn"
						title="Открыть конструктор заказ-нарядов зуботехнической лаборатории"
					>
						<span>Наряд ЗТЛ</span>
						<ExternalLink size={14} />
					</button>
				)}
			</div>
		</div>
	);
}
