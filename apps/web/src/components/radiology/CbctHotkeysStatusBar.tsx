/**
 * DENTE CRM — CBCT 3D MPR Bottom Hotkeys Hint Bar & Help Cheat Sheet
 * Standards: WCAG 2.1 touch targets, pure CSS design tokens, Romexis / Ez3D-i UX
 */

import {
	HelpCircle,
	Keyboard,
	Maximize2,
	MousePointer,
	RotateCw,
	Sliders,
	X,
} from "lucide-react";
import React from "react";
import { CBCT_HOTKEY_DEFINITIONS, type CbctNavViewport } from "./useCbctKeyboardShortcuts";
import { getViewportOrientationLabels } from "./cbctMprMath";

export interface CbctHotkeysStatusBarProps {
	readonly activeViewport: CbctNavViewport;
	readonly onToggleHelp: () => void;
	readonly isHelpOpen?: boolean;
	readonly onToggleMaximize?: () => void;
	readonly isMaximized?: boolean;
	readonly onTogglePanel?: () => void;
	readonly isPanelOpen?: boolean;
	readonly onToggleClearView?: () => void;
	readonly isClearView?: boolean;
}

export const CbctHotkeysStatusBar: React.FC<CbctHotkeysStatusBarProps> = ({
	activeViewport,
	onToggleHelp,
	isHelpOpen = false,
	onToggleMaximize,
	isMaximized = false,
	onTogglePanel,
	isPanelOpen = true,
	onToggleClearView,
	isClearView = false,
}) => {
	const activeMeta = getViewportOrientationLabels(activeViewport);

	return (
		<>
			{/* Bottom compact status bar (True Dark Mandate) */}
			<footer
				data-theme="dark"
				className="h-10 px-3 bg-[#09090b] border-t border-zinc-800 flex items-center justify-between shrink-0 gap-2 overflow-x-auto text-[11px] text-zinc-400 select-none w-full min-w-0 max-w-full"
				style={{ color: "#a1a1aa", backgroundColor: "#09090b" }}
				data-testid="cbct-hotkeys-status-bar"
			>
				{/* Left: Active Viewport Indicator Chip */}
				<div className="flex items-center gap-1.5 shrink-0">
					<div
						className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-zinc-100"
						title={`Активное окно: ${activeMeta.planeNameRu}. Нажмите Tab для смены.`}
					>
						<span
							className="w-2 h-2 rounded-full shrink-0"
							style={{ backgroundColor: activeMeta.planeColor }}
						/>
						<span className="font-bold uppercase tracking-wider">{activeMeta.planeNameEn}</span>
						<span className="text-zinc-400 text-[9px]">(Tab ↹)</span>
					</div>
				</div>

				{/* Center: Interactive Hotkey Badges (Desktop) and Touch Guide (Mobile) */}
				<div className="md:hidden flex items-center text-[10px] text-zinc-400 font-medium truncate px-1">
					<span>1 палец: срезы · 2 пальца: зум</span>
				</div>

				<div className="hidden md:flex items-center gap-1.5 overflow-x-auto shrink-0 py-0.5">
					<span
						className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-zinc-300 whitespace-nowrap"
						title="Прокрутка срезов активного окна (шаг 0.2 мм). Быстро: PgUp/PgDn"
					>
						<strong className="text-cyan-400">↑↓ / W/S</strong>
						<span>Срезы</span>
					</span>

					<span
						className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-zinc-300 whitespace-nowrap"
						title="Перемещение по кросс-секциям или горизонтальной оси"
					>
						<strong className="text-cyan-400">←→ / A/D</strong>
						<span>Кросс-секции</span>
					</span>

					<span
						className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-zinc-300 whitespace-nowrap"
						title="Масштабирование в точку под курсором или клавишами +/-"
					>
						<strong className="text-cyan-400">Колесо / ±</strong>
						<span>Зум</span>
					</span>

					<span
						className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-zinc-300 whitespace-nowrap"
						title="Перемещение холста или регулировка окна W/L"
					>
						<strong className="text-cyan-400">ПКМ / СКМ</strong>
						<span>Панорама / W/L</span>
					</span>

					<span
						className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-zinc-300 whitespace-nowrap"
						title="Вращение осей КЛКТ с зажатым Shift или перетаскиванием маркеров"
					>
						<strong className="text-cyan-400">Shift+ЛКМ</strong>
						<span>Вращение</span>
					</span>

					{onToggleMaximize && (
						<button
							type="button"
							onClick={onToggleMaximize}
							className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 font-mono text-[10px] text-zinc-300 hover:text-cyan-300 flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
							title="Развернуть активное окно на весь экран / свернуть в сетку (Space / F)"
							data-testid="cbct-status-bar-maximize-btn"
						>
							<strong className="text-cyan-400">Пробел</strong>
							<span>{isMaximized ? "⛶ 2x2" : "⛶ 100%"}</span>
						</button>
					)}

					{onToggleClearView && (
						<button
							type="button"
							onClick={onToggleClearView}
							className={`px-2 py-0.5 rounded border font-mono text-[10px] flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer ${
								isClearView
									? "bg-amber-950/60 text-amber-300 border-amber-500/60"
									: "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-300 border-zinc-800"
							}`}
							title="Временное скрытие всех оверлеев и сеток для осмотра тонких трещин кости (KeyH)"
							data-testid="cbct-status-bar-clearview-btn"
						>
							<strong className={isClearView ? "text-amber-400" : "text-cyan-400"}>H</strong>
							<span>{isClearView ? "Clear View (ВКЛ)" : "Clear View"}</span>
						</button>
					)}

					{onTogglePanel && (
						<button
							type="button"
							onClick={onTogglePanel}
							className="hidden lg:inline-flex px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 font-mono text-[10px] text-zinc-300 hover:text-cyan-300 items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
							title="Скрыть или показать правую панель планирования (KeyP)"
							data-testid="cbct-status-bar-panel-btn"
						>
							<strong className="text-cyan-400">P</strong>
							<span>{isPanelOpen ? "Скрыть панель" : "Показать панель"}</span>
						</button>
					)}
				</div>

				{/* Right: Help Cheat Sheet Button */}
				<div className="flex items-center gap-1 shrink-0">
					<button
						type="button"
						onClick={onToggleHelp}
						className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-cyan-500/60 font-mono text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
						title="Показать полную справку горячих клавиш (? / F1)"
						data-testid="cbct-status-bar-help-btn"
					>
						<HelpCircle className="w-3.5 h-3.5" />
						<span>? Подсказки</span>
					</button>
				</div>
			</footer>

			{/* Modal / Overlay with Full Hotkey Cheat Sheet */}
			{isHelpOpen && (
				<div
					role="dialog"
					aria-modal="true"
					aria-label="Справка по горячим клавишам КЛКТ"
					className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
					onClick={onToggleHelp}
				>
					<div
						className="bg-[#09090b] border border-zinc-800 rounded-lg shadow-2xl max-w-2xl w-full p-4 flex flex-col gap-4 text-zinc-100 animate-in fade-in zoom-in-95 duration-150"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between pb-2 border-b border-zinc-800">
							<div className="flex items-center gap-2">
								<Keyboard className="w-5 h-5 text-cyan-400" />
								<h3 className="text-sm font-bold text-zinc-100">
									Горячие клавиши и управление КЛКТ
								</h3>
								<span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono border border-zinc-800">
									DICOM / Romexis 6
								</span>
							</div>
							<button
								type="button"
								onClick={onToggleHelp}
								className="w-8 h-8 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center border border-zinc-800 transition-colors"
								aria-label="Закрыть справку"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto pr-1">
							{/* Section 1: Slices */}
							<div className="p-2.5 rounded bg-[#000000] border border-zinc-800 flex flex-col gap-2">
								<h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
									<Sliders className="w-3.5 h-3.5" />
									<span>Навигация по срезам</span>
								</h4>
								<div className="flex flex-col gap-1 text-[11px]">
									{CBCT_HOTKEY_DEFINITIONS.filter((h) => h.category === "slices").map((h) => (
										<div key={h.keyLabel} className="flex items-center justify-between py-1 border-b border-zinc-800/60">
											<span className="font-mono font-bold text-cyan-300 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
												{h.keyLabel}
											</span>
											<span className="text-zinc-400 text-right">{h.actionLabel}</span>
										</div>
									))}
								</div>
							</div>

							{/* Section 2: Zoom & Pan */}
							<div className="p-2.5 rounded bg-[#000000] border border-zinc-800 flex flex-col gap-2">
								<h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
									<MousePointer className="w-3.5 h-3.5" />
									<span>Масштаб и панорама</span>
								</h4>
								<div className="flex flex-col gap-1 text-[11px]">
									{CBCT_HOTKEY_DEFINITIONS.filter((h) => h.category === "zoom_pan").map((h) => (
										<div key={h.keyLabel} className="flex items-center justify-between py-1 border-b border-zinc-800/60">
											<span className="font-mono font-bold text-cyan-300 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
												{h.keyLabel}
											</span>
											<span className="text-zinc-400 text-right">{h.actionLabel}</span>
										</div>
									))}
								</div>
							</div>

							{/* Section 3: Viewports */}
							<div className="p-2.5 rounded bg-[#000000] border border-zinc-800 flex flex-col gap-2">
								<h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
									<Maximize2 className="w-3.5 h-3.5" />
									<span>Окна и раскладка</span>
								</h4>
								<div className="flex flex-col gap-1 text-[11px]">
									{CBCT_HOTKEY_DEFINITIONS.filter((h) => h.category === "viewports").map((h) => (
										<div key={h.keyLabel} className="flex items-center justify-between py-1 border-b border-zinc-800/60">
											<span className="font-mono font-bold text-cyan-300 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
												{h.keyLabel}
											</span>
											<span className="text-zinc-400 text-right">{h.actionLabel}</span>
										</div>
									))}
								</div>
							</div>

							{/* Section 4: Presets & Modes */}
							<div className="p-2.5 rounded bg-[#000000] border border-zinc-800 flex flex-col gap-2">
								<h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
									<RotateCw className="w-3.5 h-3.5" />
									<span>Пресеты и режимы</span>
								</h4>
								<div className="flex flex-col gap-1 text-[11px]">
									{CBCT_HOTKEY_DEFINITIONS.filter((h) => h.category === "presets_modes").map((h) => (
										<div key={h.keyLabel} className="flex items-center justify-between py-1 border-b border-zinc-800/60">
											<span className="font-mono font-bold text-cyan-300 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
												{h.keyLabel}
											</span>
											<span className="text-zinc-400 text-right">{h.actionLabel}</span>
										</div>
									))}
								</div>
							</div>
						</div>

						<div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
							<span>Нажмите Esc или ? для закрытия окна</span>
							<button
								type="button"
								onClick={onToggleHelp}
								className="px-3.5 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 font-semibold transition-colors"
							>
								Понятно
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};
