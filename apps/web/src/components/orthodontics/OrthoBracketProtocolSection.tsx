import React from "react";
import { Calendar, Plus, RotateCcw, Send, Zap } from "lucide-react";
import { AlignerTray } from "../icons/DentalIcons";

export type BracketSlot = "0.018" | "0.022";

export interface BracketSystemOption {
	readonly id: string;
	readonly label: string;
	readonly desc: string;
}

export const BRACKET_SYSTEMS: readonly BracketSystemOption[] = [
	{ id: "damon_q2", label: "Damon Q2", desc: "Металл · Пассивное самолигирование" },
	{ id: "damon_clear", label: "Damon Clear", desc: "Сапфир / керамика · Эстетические" },
	{ id: "empower", label: "Empower", desc: "Интерактивное самолигирование" },
	{ id: "mini_diamond", label: "Mini Diamond", desc: "Лигатурные классические" },
	{ id: "pitts21", label: "Pitts 21", desc: "Квадратный паз .021" },
	{ id: "aligners", label: "Элайнеры", desc: "Прозрачные каппы с аттачментами" },
	{ id: "removable_plate", label: "Пластинка с винтом", desc: "Съемный пластиночный аппарат с расширяющим винтом" },
];

export interface AlignerAttachmentPreset {
	readonly id: string;
	readonly label: string;
	readonly shortLabel: string;
	readonly teeth: readonly number[];
	readonly description: string;
}

export const ALIGNER_ATTACHMENT_PRESETS: readonly AlignerAttachmentPreset[] = [
	{
		id: "standard",
		label: "Стандартные аттачменты: клыки и премоляры (15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45)",
		shortLabel: "Стандартные (клыки и премоляры)",
		teeth: [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45],
		description:
			"Фиксация композитных аттачментов по переносному шаблону на зубы 15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45. Подготовка эмали: механическая очистка пастой без фтора, протравливание 37% гелем ортофосфорной кислоты 30 сек, смывание, высушивание. Внесение адгезивной системы, фотополимеризация. Заполнение шаблона микрогибридным композитом, позиционирование на зубной ряд, фотополимеризация каждого зуба по 20 сек. Шаблон снят, удаление излишков композита твердосплавными финирами, финишная полировка. Припасован сет элайнеров №1: адаптация плотная, ретенция надежная.",
	},
	{
		id: "intact",
		label: "Аттачменты интактны, сколов нет",
		shortLabel: "Аттачменты интактны, сколов нет",
		teeth: [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45],
		description:
			"Контрольный осмотр элайнеров. Композитные аттачменты на верхней и нижней челюстях визуально и инструментально интактны: сколов, дефектов фиксации и отклеек не выявлено. Элайнеры прилегают плотно по всему периметру, ретенция оптимальная, щелей между краем каппы и режущими краями зубов нет. Трекинг перемещения зубов полностью соответствует утвержденному виртуальному 3D-сетапу.",
	},
	{
		id: "refixation",
		label: "Повторная фиксация аттачмента (замена)",
		shortLabel: "Повторная фиксация аттачмента (замена)",
		teeth: [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45],
		description:
			"Обнаружен скол / отклейка композитного аттачмента. Проведено механическое удаление остатков старого композита, очистка поверхности эмали. Протравливание 37% ортофосфорной кислотой, адгезивный протокол, повторная фиксация аттачмента по шаблону из композитного материала, фотополимеризация. Проверка посадки элайнера: фиксация и ретенция восстановлены.",
	},
	{
		id: "debonding",
		label: "Снятие аттачментов и полировка (финиш)",
		shortLabel: "Снятие аттачментов и полировка (финиш)",
		teeth: [15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45],
		description:
			"Завершение элайнер-терапии. Атравматичное сошлифовывание композитных аттачментов специальными твердосплавными финирами на пониженных оборотах с водяным охлаждением без повреждения эмали. Финишная полировка пастами и дисками до зеркального блеска, глубокое фторирование эмали. Выданы ретенционные каппы / сняты оттиски для ретейнеров.",
	},
];

export interface OrthoBracketProtocolSectionProps {
	readonly bracketSlot: BracketSlot;
	readonly setBracketSlot: (slot: BracketSlot) => void;
	readonly bracketSystem: string;
	readonly onSelectBracketSystem: (systemId: string) => void;
	readonly plateActivationTurns: number;
	readonly setPlateActivationTurns: (turns: number) => void;
	readonly onAddExpansionScrewAction: () => void;
	readonly activeAttachmentPreset: string | null;
	readonly onSelectAttachmentPreset: (presetId: string) => void;
	readonly isSplitArchAligners: boolean;
	readonly setIsSplitArchAligners: React.Dispatch<React.SetStateAction<boolean>>;
	readonly alignerStep: number;
	readonly setAlignerStep: React.Dispatch<React.SetStateAction<number>>;
	readonly alignerTotal: number;
	readonly setAlignerTotal: React.Dispatch<React.SetStateAction<number>>;
	readonly alignerStepUpper: number;
	readonly setAlignerStepUpper: React.Dispatch<React.SetStateAction<number>>;
	readonly alignerTotalUpper: number;
	readonly setAlignerTotalUpper: React.Dispatch<React.SetStateAction<number>>;
	readonly alignerStepLower: number;
	readonly setAlignerStepLower: React.Dispatch<React.SetStateAction<number>>;
	readonly alignerTotalLower: number;
	readonly setAlignerTotalLower: React.Dispatch<React.SetStateAction<number>>;
	readonly alignerIntervalDays: number;
	readonly setAlignerIntervalDays: React.Dispatch<React.SetStateAction<number>>;
	readonly nextAlignerDateStr: string;
	readonly alignerProgressPercent: number;
	readonly onSendAlignerReminder: () => void;
	readonly onIssueAlignerSet: (count: number, days: number) => void;
	readonly onApplyAttachmentsProtocol: () => void;
	readonly alignerSetIssuedCount?: number | undefined;
}

export const OrthoBracketProtocolSection: React.FC<OrthoBracketProtocolSectionProps> = ({
	bracketSlot,
	setBracketSlot,
	bracketSystem,
	onSelectBracketSystem,
	plateActivationTurns,
	setPlateActivationTurns,
	onAddExpansionScrewAction,
	activeAttachmentPreset,
	onSelectAttachmentPreset,
	isSplitArchAligners,
	setIsSplitArchAligners,
	alignerStep,
	setAlignerStep,
	alignerTotal,
	setAlignerTotal,
	alignerStepUpper,
	setAlignerStepUpper,
	alignerTotalUpper,
	setAlignerTotalUpper,
	alignerStepLower,
	setAlignerStepLower,
	alignerTotalLower,
	setAlignerTotalLower,
	alignerIntervalDays,
	setAlignerIntervalDays,
	nextAlignerDateStr,
	alignerProgressPercent,
	onSendAlignerReminder,
	onIssueAlignerSet,
	onApplyAttachmentsProtocol,
	alignerSetIssuedCount,
}) => {
	return (
		<div className="space-y-4" data-testid="ortho-bracket-protocol-section">
			{/* 1. Паз и выбор брекет-системы */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<span className="block text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-1.5">
						Паз брекетов (Slot)
					</span>
					<div className="grid grid-cols-2 gap-2">
						<button
							type="button"
							onClick={() => setBracketSlot("0.018")}
							className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center transition-all cursor-pointer ${
								bracketSlot === "0.018"
									? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-black shadow-xs"
									: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
							}`}
						>
							<span className="text-sm">0.018"</span>
							<span className="text-[10px] text-slate-500">Низкое трение</span>
						</button>
						<button
							type="button"
							onClick={() => setBracketSlot("0.022")}
							className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center transition-all cursor-pointer ${
								bracketSlot === "0.022"
									? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-black shadow-xs"
									: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
							}`}
						>
							<span className="text-sm">0.022"</span>
							<span className="text-[10px] text-slate-500">Стандарт (MBT/Damon)</span>
						</button>
					</div>
				</div>

				<div>
					<span className="block text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-1.5">
						Брекет-система
					</span>
					<select
						aria-label="Выбор брекет-системы"
						value={bracketSystem}
						onChange={(e) => onSelectBracketSystem(e.target.value)}
						className="w-full min-h-[44px] px-3 py-2 bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-amber-500 cursor-pointer"
					>
						{BRACKET_SYSTEMS.map((s) => (
							<option key={s.id} value={s.id}>
								{s.label} ({s.desc})
							</option>
						))}
					</select>
				</div>
			</div>

			{/* 2. Расширяющий винт пластинки */}
			{bracketSystem === "removable_plate" && (
				<div
					data-testid="ortho-screw-activation-controls"
					className="p-3 rounded-xl bg-orange-500/10 dark:bg-orange-950/30 border border-orange-500/30 flex flex-col gap-2"
				>
					<div className="flex items-center justify-between">
						<span className="text-xs font-black uppercase tracking-wider text-orange-800 dark:text-orange-300 flex items-center gap-1.5">
							<RotateCcw size={14} className="text-orange-600 dark:text-orange-400" />
							Расширяющий винт пластинки
						</span>
						<span className="text-[11px] font-bold text-orange-700 dark:text-orange-300">
							{plateActivationTurns}/4 об. ({(plateActivationTurns * 0.25).toFixed(2)} мм)
						</span>
					</div>
					<div className="flex items-center gap-2">
						{[1, 2, 3, 4].map((turns) => (
							<button
								key={turns}
								type="button"
								onClick={() => {
									setPlateActivationTurns(turns);
									onAddExpansionScrewAction();
								}}
								data-testid={`screw-turns-${turns}-btn`}
								className={`min-h-[44px] flex-1 px-2 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
									plateActivationTurns === turns
										? "bg-orange-500 text-white border-orange-600 font-black shadow-xs"
										: "bg-white dark:bg-slate-900 border-orange-200 dark:border-orange-800 text-slate-700 dark:text-slate-300 hover:bg-orange-50"
								}`}
							>
								{turns}/4 об. ({(turns * 0.25).toFixed(2)} мм)
							</button>
						))}
					</div>
				</div>
			)}

			{/* 3. Экспресс-блок: Аттачменты элайнеров и трекер капп */}
			<div
				data-testid="aligner-attachments-express-block"
				className="bg-indigo-50/70 dark:bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/50 flex flex-col gap-2.5"
			>
				<div className="flex items-center justify-between flex-wrap gap-1">
					<span className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
						<AlignerTray size={14} className="text-indigo-600 dark:text-indigo-400" />
						Аттачменты элайнеров
					</span>
					<span className="text-[11px] font-bold text-indigo-700/80 dark:text-indigo-400/80">
						Экспресс-фиксация & контроль
					</span>
				</div>

				{/* 4 пресета аттачментов */}
				<div className="grid grid-cols-1 gap-1.5">
					{ALIGNER_ATTACHMENT_PRESETS.map((preset) => {
						const isSelected = activeAttachmentPreset === preset.id;
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => onSelectAttachmentPreset(preset.id)}
								data-testid={`preset-${preset.id}-attachments`}
								className={`min-h-[44px] p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
									isSelected
										? "bg-indigo-600 text-white border-indigo-700 shadow-sm font-black ring-2 ring-indigo-400"
										: "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900 hover:border-indigo-400 text-slate-800 dark:text-slate-100"
								}`}
							>
								<div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? "bg-white/20 text-white" : "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300"}`}>
									<Zap size={13} />
								</div>
								<div className="min-w-0 flex-1">
									<div className="text-xs font-bold leading-tight">{preset.label}</div>
									<div className={`text-[10px] line-clamp-1 mt-0.5 ${isSelected ? "text-indigo-100" : "text-slate-500 dark:text-slate-400"}`}>
										{preset.description}
									</div>
								</div>
							</button>
						);
					})}
				</div>

				{/* Трекер смены капп */}
				<div
					data-testid="aligner-tray-tracker"
					className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/90 border border-indigo-200 dark:border-indigo-800 flex flex-col gap-2"
				>
					<div className="flex items-center justify-between flex-wrap gap-1.5">
						<span className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
							<Calendar size={14} className="text-indigo-600 dark:text-indigo-400" />
							Трекер смены капп элайнеров {isSplitArchAligners ? `(ВЧ 1..${alignerTotalUpper}, НЧ 1..${alignerTotalLower})` : `(1..${alignerTotal})`}
						</span>
						<div className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={() => setIsSplitArchAligners((prev) => !prev)}
								data-testid="aligner-split-arch-toggle"
								className="px-2 py-0.5 rounded-md text-[10px] font-bold border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 cursor-pointer transition-all"
								title="Переключить между единым сетом и раздельным учетом капп верхней/нижней челюстей"
							>
								{isSplitArchAligners ? "Раздельные челюсти (ВЧ / НЧ)" : "Единый сет"}
							</button>
							<span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-indigo-600 text-white shadow-xs" data-testid="aligner-tray-badge">
								{isSplitArchAligners ? `ВЧ №${alignerStepUpper} / НЧ №${alignerStepLower}` : `Каппа №${alignerStep} из ${alignerTotal}`}
							</span>
							<span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">({alignerProgressPercent}%)</span>
						</div>
					</div>

					{/* Прогресс-бар */}
					<div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
						<div
							data-testid="aligner-tray-progress-bar"
							className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
							style={{ width: `${alignerProgressPercent}%` }}
						/>
					</div>

					{/* Степперы капп */}
					{!isSplitArchAligners ? (
						<div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
							<div className="flex items-center gap-1 flex-wrap">
								<button
									type="button"
									onClick={() => {
										const next = Math.max(1, alignerStep - 1);
										setAlignerStep(next);
										setAlignerStepUpper(next);
										setAlignerStepLower(next);
									}}
									data-testid="aligner-prev-tray-btn"
									className="min-h-[36px] min-w-[36px] px-2 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-black text-xs hover:bg-indigo-50 cursor-pointer flex items-center justify-center transition-all"
									title="Предыдущая каппа (-1)"
								>
									-1
								</button>
								<span className="text-xs font-bold text-slate-700 dark:text-slate-200 px-1 min-w-[56px] text-center">
									№ {alignerStep}
								</span>
								<button
									type="button"
									onClick={() => {
										const next = Math.min(alignerTotal, alignerStep + 1);
										setAlignerStep(next);
										setAlignerStepUpper(next);
										setAlignerStepLower(next);
									}}
									data-testid="aligner-next-tray-btn"
									className="min-h-[36px] min-w-[36px] px-2 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-black text-xs hover:bg-indigo-50 cursor-pointer flex items-center justify-center transition-all"
									title="Следующая каппа (+1)"
								>
									+1
								</button>
								<button
									type="button"
									onClick={() => setAlignerIntervalDays((prev) => (prev === 7 ? 10 : prev === 10 ? 14 : 7))}
									data-testid="aligner-days-toggle-btn"
									className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 ml-1 cursor-pointer underline decoration-dotted transition-colors"
									title="Нажмите для переключения интервала смены: 7, 10 или 14 дней"
								>
									Смена: {nextAlignerDateStr} (+{alignerIntervalDays} дн.)
								</button>
							</div>

							<button
								type="button"
								onClick={onSendAlignerReminder}
								data-testid="aligner-send-reminder-btn"
								className="min-h-[36px] px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
								title="Скопировать напоминание о смене каппы для отправки пациенту в WhatsApp/Telegram"
							>
								<Send size={13} />
								<span>Напомнить о смене</span>
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-2 pt-0.5">
							<div className="flex items-center justify-between gap-2 flex-wrap">
								{/* Верхняя челюсть */}
								<div className="flex items-center gap-1.5 flex-wrap">
									<span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 w-8 shrink-0">ВЧ:</span>
									<button
										type="button"
										onClick={() => setAlignerStepUpper((prev) => Math.max(1, prev - 1))}
										data-testid="aligner-upper-prev-tray-btn"
										className="min-h-[32px] min-w-[32px] px-2 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-black text-xs hover:bg-indigo-50 cursor-pointer flex items-center justify-center transition-all"
										title="Предыдущая каппа ВЧ (-1)"
									>
										-1
									</button>
									<span data-testid="aligner-upper-tray-badge" className="text-xs font-bold text-slate-700 dark:text-slate-200 px-1 min-w-[48px] text-center">
										№ {alignerStepUpper}/{alignerTotalUpper}
									</span>
									<button
										type="button"
										onClick={() => setAlignerStepUpper((prev) => Math.min(alignerTotalUpper, prev + 1))}
										data-testid="aligner-upper-next-tray-btn"
										className="min-h-[32px] min-w-[32px] px-2 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-black text-xs hover:bg-indigo-50 cursor-pointer flex items-center justify-center transition-all"
										title="Следующая каппа ВЧ (+1)"
									>
										+1
									</button>
								</div>

								{/* Нижняя челюсть */}
								<div className="flex items-center gap-1.5 flex-wrap">
									<span className="text-xs font-bold text-teal-900 dark:text-teal-200 w-8 shrink-0">НЧ:</span>
									<button
										type="button"
										onClick={() => setAlignerStepLower((prev) => Math.max(1, prev - 1))}
										data-testid="aligner-lower-prev-tray-btn"
										className="min-h-[32px] min-w-[32px] px-2 rounded-lg bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 text-teal-700 dark:text-teal-300 font-black text-xs hover:bg-teal-50 cursor-pointer flex items-center justify-center transition-all"
										title="Предыдущая каппа НЧ (-1)"
									>
										-1
									</button>
									<span data-testid="aligner-lower-tray-badge" className="text-xs font-bold text-slate-700 dark:text-slate-200 px-1 min-w-[48px] text-center">
										№ {alignerStepLower}/{alignerTotalLower}
									</span>
									<button
										type="button"
										onClick={() => setAlignerStepLower((prev) => Math.min(alignerTotalLower, prev + 1))}
										data-testid="aligner-lower-next-tray-btn"
										className="min-h-[32px] min-w-[32px] px-2 rounded-lg bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 text-teal-700 dark:text-teal-300 font-black text-xs hover:bg-teal-50 cursor-pointer flex items-center justify-center transition-all"
										title="Следующая каппа НЧ (+1)"
									>
										+1
									</button>
								</div>
							</div>

							<div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
								<button
									type="button"
									onClick={() => setAlignerIntervalDays((prev) => (prev === 7 ? 10 : prev === 10 ? 14 : 7))}
									data-testid="aligner-days-toggle-split-btn"
									className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 cursor-pointer underline decoration-dotted transition-colors"
									title="Нажмите для переключения интервала смены: 7, 10 или 14 дней"
								>
									Смена: {nextAlignerDateStr} (+{alignerIntervalDays} дн.)
								</button>
								<button
									type="button"
									onClick={onSendAlignerReminder}
									data-testid="aligner-send-reminder-btn"
									className="min-h-[36px] px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
									title="Скопировать напоминание о смене каппы для отправки пациенту в WhatsApp/Telegram"
								>
									<Send size={13} />
									<span>Напомнить о смене</span>
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Быстрая выдача сетов и внесение в дневник */}
				<div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-indigo-200/50 dark:border-indigo-800/40">
					<div className="flex items-center gap-1.5 flex-wrap">
						<button
							type="button"
							onClick={() => onIssueAlignerSet(2, 14)}
							data-testid="widget-issue-set-2-aligners-btn"
							className={`min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
								alignerSetIssuedCount === 2
									? "bg-teal-600 text-white border-teal-700"
									: "bg-white dark:bg-slate-900 border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50"
							}`}
							title="Выдать следующий сет из 2 капп на 14 дней"
						>
							<Zap size={13} />
							<span>Сет 2 каппы (+14 дн.)</span>
						</button>

						<button
							type="button"
							onClick={() => onIssueAlignerSet(4, 28)}
							data-testid="widget-issue-set-4-aligners-btn"
							className={`min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
								alignerSetIssuedCount === 4
									? "bg-teal-600 text-white border-teal-700"
									: "bg-white dark:bg-slate-900 border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50"
							}`}
							title="Выдать следующий сет из 4 капп на 28 дней"
						>
							<Zap size={13} />
							<span>Сет 4 каппы (+28 дн.)</span>
						</button>
					</div>

					<button
						type="button"
						onClick={onApplyAttachmentsProtocol}
						data-testid="append-attachments-to-soap-btn"
						className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
						title="Добавить протокол в дневник визита без стирания ранее набранного текста"
						aria-label="Внести в дневник приёма"
					>
						<Plus size={15} />
						<span>Внести в дневник</span>
					</button>
				</div>
			</div>
		</div>
	);
};
