import { PSR_SEXTANTS, type PsrSextantResult } from "@dental/shared";
import {
	AlertTriangle,
	Check,
	ChevronDown,
	ChevronUp,
	Layers,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import React from "react";
import {
	DentalForm043,
	PerioProbe,
	UltrasonicScaler,
} from "../../icons/DentalIcons";
import {
	PSR_CODE_DEFINITIONS,
	type PerioExpressPresetId,
	type PsrCode,
} from "../perioMath";

export interface PerioExpressBannerProps {
	readonly readOnly?: boolean | undefined;
	readonly isProbeKeyboardEnabled: boolean;
	readonly onToggleProbeKeyboard: (enabled: boolean) => void;
	readonly insertStatus: boolean;
	readonly onInsertToProtocol: () => void;
	readonly isTier3ProbingExpanded: boolean;
	readonly onToggleTier3Probing: () => void;
	readonly onApplyExpressPreset: (presetId: PerioExpressPresetId) => void;
	readonly onApplyTherapistPreset: (presetId: string) => void;
	readonly psrSummaryText: string;
	readonly psrSextants: Record<string, PsrSextantResult>;
	readonly onApplySextantCode: (
		sextantName: string,
		code: PsrCode,
		asterisk?: boolean,
	) => void;
}

export const PerioExpressBanner: React.FC<PerioExpressBannerProps> = React.memo(({
	readOnly = false,
	isProbeKeyboardEnabled,
	onToggleProbeKeyboard,
	insertStatus,
	onInsertToProtocol,
	isTier3ProbingExpanded,
	onToggleTier3Probing,
	onApplyExpressPreset,
	onApplyTherapistPreset,
	psrSummaryText,
	psrSextants,
	onApplySextantCode,
}) => {
	return (
		<div className="flex flex-col gap-3.5 p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-[var(--ink)] shadow-xs">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-teal-500/20">
				<div className="flex items-center gap-2 min-w-0">
					<PerioProbe size={18} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<h4 className="text-sm font-black text-teal-900 dark:text-teal-300 truncate">
						Экспресс-скрининг пародонта PSR / CPITN (ВОЗ / СтАР) и 1-клик пресеты
					</h4>
				</div>

				<div className="flex items-center gap-2.5 flex-wrap">
					{/* Hardware Probe / Numpad capture toggle (OFF by default, Mandate 8k) */}
					<label
						className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold px-2.5 min-h-[44px] rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)]/60 transition-colors"
						title="Включить перехват Numpad и клавиш электронного зонда (по умолчанию выключен, чтобы не ломать набор текста)"
					>
						<input
							type="checkbox"
							checked={isProbeKeyboardEnabled}
							onChange={(e) => onToggleProbeKeyboard(e.target.checked)}
							className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-500"
							data-testid="perio-probe-keyboard-toggle"
						/>
						<span className="text-[11px]">
							Режим электронного зонда / Numpad
						</span>
					</label>

					{!readOnly && (
						<button
							type="button"
							onClick={onInsertToProtocol}
							className="min-h-[44px] px-3 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
							title="Внести текущее заключение пародонтограммы в дневник приёма"
							data-testid="perio-express-insert-043-btn"
						>
							{insertStatus ? <Check size={14} /> : <DentalForm043 size={14} />}
							<span>
								{insertStatus ? "Внесено в медкарту!" : "Внести в дневник"}
							</span>
						</button>
					)}

					<button
						type="button"
						onClick={onToggleTier3Probing}
						className="text-xs text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer transition-colors min-h-[44px] px-2.5 rounded-lg hover:bg-teal-500/15"
						data-testid="perio-tier3-toggle-header-btn"
					>
						<span>
							{isTier3ProbingExpanded
								? "Скрыть детальные точки (Tier 3)"
								: "6 точек на зуб (Tier 3, по требованию)"}
						</span>
						{isTier3ProbingExpanded ? (
							<ChevronUp size={14} />
						) : (
							<ChevronDown size={14} />
						)}
					</button>
				</div>
			</div>

			{/* 6 Dominant 1-Click Express Presets (Mandates 8e, 8k, Touch >= 44x44px, Zero Emojis) */}
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
				{/* Preset 1: Норма пародонта */}
				<button
					type="button"
					disabled={readOnly}
					onClick={() => onApplyExpressPreset("perio_norm_express")}
					className="min-h-[50px] p-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-900 dark:text-emerald-200 border border-emerald-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-xs flex flex-col justify-center min-w-0"
					title={
						readOnly
							? "Режим только для чтения (закрытый визит / архив)"
							: "Норма пародонта: PSR 0 во всех секстантах, глубина <= 2 мм, BOP 0, десна плотная бледно-розовая, подвижность 0"
					}
					data-testid="perio-preset-norm-card"
				>
					<div className="flex items-center justify-between gap-1.5 font-black text-xs min-w-0">
						<span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 min-w-0 truncate">
							<ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span className="truncate">Норма (PSR 0)</span>
						</span>
						<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
							Z01.2
						</span>
					</div>
					<span className="text-[11px] text-emerald-900/80 dark:text-emerald-200/80 leading-tight mt-1 line-clamp-2">
						PSR 0, глубина &le; 2 мм, BOP 0, десна плотная
					</span>
				</button>

				{/* Preset 2: Профгигиена полости рта */}
				<button
					type="button"
					disabled={readOnly}
					onClick={() => onApplyExpressPreset("pro_hygiene_express")}
					className="min-h-[50px] p-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-900 dark:text-cyan-200 border border-cyan-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-xs flex flex-col justify-center min-w-0"
					title={
						readOnly
							? "Режим только для чтения (закрытый визит / архив)"
							: "Профгигиена: УЗ-скейлинг + Air-Flow глицин + полировка Detartrine + глубокое фторирование Bifluorid 12"
					}
					data-testid="perio-preset-prophy-card"
				>
					<div className="flex items-center justify-between gap-1.5 font-black text-xs min-w-0">
						<span className="flex items-center gap-1.5 text-cyan-800 dark:text-cyan-300 min-w-0 truncate">
							<UltrasonicScaler size={16} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
							<span className="truncate">Профгигиена</span>
						</span>
						<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 shrink-0">
							A16.07.051
						</span>
					</div>
					<span className="text-[11px] text-cyan-900/80 dark:text-cyan-200/80 leading-tight mt-1 line-clamp-2">
						УЗ + Air-Flow глицин + полировка + фторирование
					</span>
				</button>

				{/* Preset 3: Гингивит */}
				<button
					type="button"
					disabled={readOnly}
					onClick={() => onApplyExpressPreset("gingivitis_express")}
					className="min-h-[50px] p-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-xs flex flex-col justify-center min-w-0"
					title={
						readOnly
							? "Режим только для чтения (закрытый визит / архив)"
							: "Гингивит: PSR 1-2, карманы < 3.5 мм, диффузная кровоточивость при зондировании, наддесневой камень"
					}
					data-testid="perio-preset-gingivitis-card"
				>
					<div className="flex items-center justify-between gap-1.5 font-black text-xs min-w-0">
						<span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 min-w-0 truncate">
							<PerioProbe size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
							<span className="truncate">Гингивит (PSR 1-2)</span>
						</span>
						<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 shrink-0">
							K05.1
						</span>
					</div>
					<span className="text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-tight mt-1 line-clamp-2">
						карманы &lt; 3.5 мм, BOP+, отек сосочков
					</span>
				</button>

				{/* Preset 4: Пародонтит лёгкой степени */}
				<button
					type="button"
					disabled={readOnly}
					onClick={() => onApplyExpressPreset("periodontitis_mild_express")}
					className="min-h-[50px] p-3 rounded-xl bg-rose-600/15 hover:bg-rose-600/30 text-rose-900 dark:text-rose-200 border border-rose-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-xs flex flex-col justify-center min-w-0"
					title={
						readOnly
							? "Режим только для чтения (закрытый визит / архив)"
							: "Пародонтит лёгкой степени: PSR 2-3, карманы 3.5-4 мм, BOP+, над/поддесневой камень, подвижность 0"
					}
					data-testid="perio-preset-mild-periodontitis-card"
				>
					<div className="flex items-center justify-between gap-1.5 font-black text-xs min-w-0">
						<span className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 min-w-0 truncate">
							<AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
							<span className="truncate">Пародонтит легкий</span>
						</span>
						<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30 shrink-0">
							K05.30
						</span>
					</div>
					<span className="text-[11px] text-rose-900/80 dark:text-rose-200/80 leading-tight mt-1 line-clamp-2">
						карманы 3.5–4 мм, BOP+, зубной камень
					</span>
				</button>

				{/* Preset 5: Пародонтит средней степени */}
				<button
					type="button"
					disabled={readOnly}
					onClick={() => onApplyExpressPreset("periodontitis_moderate_express")}
					className="min-h-[50px] p-3 rounded-xl bg-orange-600/20 hover:bg-orange-600/35 text-orange-900 dark:text-orange-200 border border-orange-500/45 transition-all cursor-pointer text-left active:scale-[0.98] shadow-xs flex flex-col justify-center min-w-0"
					title={
						readOnly
							? "Режим только для чтения (закрытый визит / архив)"
							: "Пародонтит средней степени: PSR 3, карманы 3.5 - 5.5 мм, рецессия 1-2 мм, зубной камень, подвижность I ст."
					}
					data-testid="perio-preset-periodontitis-card"
				>
					<div className="flex items-center justify-between gap-1.5 font-black text-xs min-w-0">
						<span className="flex items-center gap-1.5 text-orange-800 dark:text-orange-300 min-w-0 truncate">
							<ShieldAlert size={16} className="text-orange-600 dark:text-orange-400 shrink-0" />
							<span className="truncate">Пародонтит средний</span>
						</span>
						<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-800 dark:text-orange-300 border border-orange-500/30 shrink-0">
							K05.31
						</span>
					</div>
					<span className="text-[11px] text-orange-900/80 dark:text-orange-200/80 leading-tight mt-1 line-clamp-2">
						карманы 4–5 мм, рецессия 1–2 мм, подвижность I
					</span>
				</button>

				{/* Preset 6: Пародонтит тяжёлой степени */}
				<button
					type="button"
					disabled={readOnly}
					onClick={() => onApplyExpressPreset("periodontitis_severe_express")}
					className="min-h-[50px] p-3 rounded-xl bg-red-700/20 hover:bg-red-700/35 text-red-900 dark:text-red-200 border border-red-600/45 transition-all cursor-pointer text-left active:scale-[0.98] shadow-xs flex flex-col justify-center min-w-0"
					title={
						readOnly
							? "Режим только для чтения (закрытый визит / архив)"
							: "Пародонтит тяжёлой степени: PSR 4*, карманы >= 6 мм, гноетечение, рецессия, подвижность II-III ст."
					}
					data-testid="perio-preset-severe-periodontitis-card"
					data-preset-action="perio-preset-severe-btn"
				>
					<div className="flex items-center justify-between gap-1.5 font-black text-xs min-w-0">
						<span className="flex items-center gap-1.5 text-red-800 dark:text-red-300 min-w-0 truncate">
							<ShieldAlert size={16} className="text-red-600 dark:text-red-400 shrink-0" />
							<span className="truncate">Пародонтит тяжелый</span>
						</span>
						<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-800 dark:text-red-300 border border-red-500/30 shrink-0">
							K05.32
						</span>
					</div>
					<span className="text-[11px] text-red-900/80 dark:text-red-200/80 leading-tight mt-1 line-clamp-2">
						карманы &ge;6 мм, гноетечение, подвижность II-III
					</span>
				</button>
			</div>

			{/* 6-Sextants Rapid Interactive PSR Grid */}
			<div className="flex flex-col gap-2 pt-2 border-t border-teal-500/20">
				<div className="flex items-center justify-between flex-wrap gap-1.5">
					<span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
						<Layers size={14} className="text-teal-600 dark:text-teal-400" />
						Секстанты PSR (по 6 участкам зубного ряда):
					</span>
					<span className="font-mono text-xs font-bold text-teal-900 dark:text-teal-300 bg-[var(--paper)] px-2 py-0.5 rounded border border-teal-500/30">
						{psrSummaryText}
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
					{PSR_SEXTANTS.map((sextant) => {
						const res = psrSextants[sextant.name];
						const currentCode = res?.code ?? 0;
						const hasAsterisk = res?.asterisk ?? false;

						return (
							<div
								key={sextant.name}
								className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2 shadow-2xs min-w-0"
								data-testid={`psr-sextant-card-${sextant.name}`}
							>
								<div className="flex items-center justify-between min-w-0 gap-1">
									<span className="font-bold text-xs text-[var(--ink)] truncate">
										{sextant.name} ({sextant.teeth[0]}-
										{sextant.teeth[sextant.teeth.length - 1]})
									</span>
									<span
										className={`font-mono font-black text-xs px-1.5 py-0.5 rounded border shrink-0 ${
											currentCode === 0
												? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
												: currentCode === 1
													? "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30"
													: currentCode === 2
														? "bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/30"
														: currentCode === 3
															? "bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/30"
															: "bg-rose-500/25 text-rose-800 dark:text-rose-300 border-rose-500/40"
										}`}
									>
										Код {currentCode}
										{hasAsterisk ? "*" : ""}
									</span>
								</div>

								{/* 1-Tap PSR Code Selector (Touch-friendly >= 44px hit envelope, 32px visual) */}
								<div className="grid grid-cols-6 gap-1">
									{([0, 1, 2, 3, 4] as const).map((codeVal) => {
										const isSelected = currentCode === codeVal;
										const def = PSR_CODE_DEFINITIONS[codeVal];
										return (
											<button
												key={codeVal}
												type="button"
												disabled={readOnly}
												onClick={() =>
													onApplySextantCode(
														sextant.name,
														codeVal,
														hasAsterisk,
													)
												}
												className={`min-h-[44px] min-w-[32px] sm:min-w-[36px] rounded-lg font-black text-xs flex items-center justify-center transition-all cursor-pointer touch-manipulation border ${
													isSelected
														? def.badgeClass +
															" ring-1 ring-white/50 scale-105"
														: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] dark:hover:text-white border-[var(--line)]"
												}`}
												title={
													readOnly
														? "Режим только для чтения (закрытый визит / архив)"
														: `${def.labelRu}: ${def.descriptionRu}`
												}
												data-testid={`psr-${sextant.name}-code-${codeVal}`}
											>
												{codeVal}
											</button>
										);
									})}

									{/* Asterisk (*) toggle */}
									<button
										type="button"
										disabled={readOnly}
										onClick={() =>
											onApplySextantCode(
												sextant.name,
												currentCode,
												!hasAsterisk,
											)
										}
										className={`min-h-[44px] min-w-[32px] sm:min-w-[36px] rounded-lg font-black text-xs flex items-center justify-center transition-all cursor-pointer touch-manipulation border ${
											hasAsterisk
												? "bg-rose-500 text-white border-rose-400 ring-1 ring-white/50"
												: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-rose-600 dark:hover:text-rose-400 border-[var(--line)]"
										}`}
										title={
											readOnly
												? "Режим только для чтения (закрытый визит / архив)"
												: "Астериск (*): патологическая подвижность >= II ст. или поражение фуркации"
										}
										data-testid={`psr-${sextant.name}-code-asterisk`}
									>
										*
									</button>
								</div>

								<span className="text-[10px] text-[var(--muted)] leading-tight truncate">
									{PSR_CODE_DEFINITIONS[currentCode]?.shortTitleRu ?? ""}
								</span>
							</div>
						);
					})}
				</div>
			</div>

			{/* Secondary Granular Presets Row */}
			<div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[var(--line)]/50">
				<span className="text-[11px] text-[var(--muted)] font-semibold mr-1 shrink-0">
					Дополнительные шаблоны:
				</span>
				<button
					type="button"
					disabled={readOnly}
					onClick={() => onApplyExpressPreset("pro_hygiene_express")}
					className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-[var(--line)] transition-all cursor-pointer touch-manipulation flex items-center gap-1 shrink-0"
					title={
						readOnly
							? "Режим только для чтения (закрытый визит / архив)"
							: "Профгигиена полости рта: УЗ-скейлинг над- и поддесневых отложений + Air-Flow порошком на основе глицина + полировка абразивной пастой Detartrine + глубокое фторирование эмали Bifluorid 12"
					}
					data-testid="perio-preset-pro-hygiene-card"
				>
					<UltrasonicScaler size={12} className="text-cyan-600 dark:text-cyan-400" />
					<span>Профгигиена (полный протокол)</span>
				</button>
				<button
					type="button"
					disabled={readOnly}
					onClick={() => onApplyTherapistPreset("gingivitis_localized")}
					className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-[var(--line)] transition-all cursor-pointer touch-manipulation flex items-center shrink-0"
					title={
						readOnly
							? "Режим только для чтения (закрытый визит / архив)"
							: "Гингивит локализованный: отек и кровоточивость межзубных сосочков во фронтальном отделе (BOP+)"
					}
				>
					Гингивит лок.
				</button>
				<button
					type="button"
					disabled={readOnly}
					onClick={() => onApplyTherapistPreset("gingivitis_generalized")}
					className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-[var(--line)] transition-all cursor-pointer touch-manipulation flex items-center shrink-0"
					title={
						readOnly
							? "Режим только для чтения (закрытый визит / архив)"
							: "Гингивит генерализованный: диффузный отек и кровоточивость десен обеих челюстей (BOP > 30%)"
					}
				>
					Гингивит генер.
				</button>
				<button
					type="button"
					disabled={readOnly}
					onClick={() => onApplyTherapistPreset("periodontitis_mild")}
					className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-orange-500/15 text-orange-800 dark:text-orange-300 border border-[var(--line)] transition-all cursor-pointer touch-manipulation flex items-center shrink-0"
					title={
						readOnly
							? "Режим только для чтения (закрытый визит / архив)"
							: "Хронический пародонтит лёгкой степени: карманы 3.5–4 мм, BOP+, над/поддесневой камень"
					}
				>
					Пародонтит I ст.
				</button>
				<button
					type="button"
					disabled={readOnly}
					onClick={() => onApplyTherapistPreset("periodontitis_severe")}
					className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-[var(--line)] transition-all cursor-pointer touch-manipulation flex items-center shrink-0"
					title={
						readOnly
							? "Режим только для чтения (закрытый визит / архив)"
							: "Хронический пародонтит тяжёлой степени: карманы >6 мм, гноетечение, подвижность II-III"
					}
				>
					Пародонтит III ст.
				</button>
				<button
					type="button"
					disabled={readOnly}
					onClick={() => onApplyTherapistPreset("dental_calculus")}
					className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-[var(--line)] transition-all cursor-pointer touch-manipulation flex items-center shrink-0"
					title={
						readOnly
							? "Режим только для чтения (закрытый визит / архив)"
							: "Зубные отложения: массивный над- и поддесневой зубной камень на резцах и молярах (K03.6)"
					}
				>
					Зубные отложения
				</button>
			</div>
		</div>
	);
});

PerioExpressBanner.displayName = "PerioExpressBanner";
