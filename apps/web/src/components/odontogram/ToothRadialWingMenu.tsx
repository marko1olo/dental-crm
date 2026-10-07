import React from "react";
import { Coins, X } from "lucide-react";
import { DentalHandpiece, EndoFileCanal } from "../icons/DentalIcons";
import { type ToothState } from "./ToothChart";
import { SurfaceSelector } from "./chart/SurfaceSelector";
import type { RadialMenuItem } from "./ToothRadialMenu";

export interface ToothRadialWingMenuProps {
	menuRef: React.RefObject<HTMLDivElement | null>;
	toothNumber: number;
	layoutMode: "left-wing" | "right-wing";
	subAnchorX: number;
	hubX: number;
	hubY: number;
	vh: number;
	currentState: ToothState;
	wingCol1Items: RadialMenuItem[];
	wingCol2Items: RadialMenuItem[];
	selectedSurfaces: string[];
	surfaces?: readonly string[] | undefined;
	setSelectedSurfaces: React.Dispatch<React.SetStateAction<string[]>>;
	onSelectSurfaces?: ((surfaces: readonly string[]) => void) | undefined;
	onSelectState: (
		state: ToothState,
		surfaces?: readonly string[],
		subType?: string,
	) => void;
	onOpenTherapy?: (() => void) | undefined;
	onAddToInvoice?: (() => void) | undefined;
	onOpenEndo?: (() => void) | undefined;
	onClose: () => void;
}

export const ToothRadialWingMenu: React.FC<ToothRadialWingMenuProps> = ({
	menuRef,
	toothNumber,
	layoutMode,
	subAnchorX,
	hubX,
	hubY,
	vh,
	currentState,
	wingCol1Items,
	wingCol2Items,
	selectedSurfaces,
	surfaces,
	setSelectedSurfaces,
	onSelectSurfaces,
	onSelectState,
	onOpenTherapy,
	onAddToInvoice,
	onOpenEndo,
	onClose,
}) => {
	return (
		<div
			ref={menuRef}
			className="radial-tooth-menu-container absolute inset-0 select-none pointer-events-none"
			role="dialog"
			aria-label={`Радиальное меню зуба ${toothNumber} (${layoutMode})`}
		>
			{/* Frosted Wing Pod Backdrop */}
			<div
				className="radial-wing-pod absolute rounded-3xl pointer-events-none transition-all duration-200"
				style={{
					width: "480px",
					height: "360px",
					left: `${subAnchorX}px`,
					top: `${hubY}px`,
					transform: "translate(-50%, -50%)",
				}}
			/>

			{/* Center Tooth Hub Pinned Over Tooth */}
			<div
				className="radial-tooth-hub absolute flex flex-col items-center justify-center w-22 h-22 rounded-full z-40 pointer-events-auto"
				style={{
					left: `${hubX}px`,
					top: `${hubY}px`,
					transform: "translate(-50%, -50%)",
				}}
			>
				<span className="text-[11px] uppercase font-black tracking-wider radial-tooth-hub-label">Зуб</span>
				<span className="text-2xl font-black leading-none radial-tooth-hub-num drop-shadow-sm">{toothNumber}</span>
				<button
					type="button"
					onClick={onClose}
					className="radial-close-btn absolute -top-2.5 left-1/2 -translate-x-1/2 min-w-[32px] min-h-[32px] w-8 h-8 flex items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl cursor-pointer transition-transform hover:scale-110 active:scale-95 focus:outline-none pointer-events-auto z-50 border-2 border-white/60"
					title="Закрыть (Esc)"
					aria-label="Закрыть меню"
				>
					<X size={16} />
				</button>
			</div>

			{/* Wing Columns: Col 1 (Hot Path) & Col 2 (Specialized) */}
			<div className="radial-wing-columns-wrapper absolute inset-0 pointer-events-none">
				{/* Column 1: Hot Path */}
				{wingCol1Items.map((item, rowIdx) => {
					const colX = layoutMode === "right-wing" ? subAnchorX - 96 : subAnchorX + 96;
					const rowY = hubY + (rowIdx - 2) * 50;
					const isCurrent = currentState === item.state;

					return (
						<button
							key={item.id}
							type="button"
							onClick={() => {
								if (item.state) onSelectState(item.state, selectedSurfaces.length > 0 ? selectedSurfaces : surfaces);
								onClose();
							}}
							style={{
								position: "absolute",
								left: `${colX}px`,
								top: `${rowY}px`,
								transform: "translate(-50%, -50%)",
								background: item.bgGradient,
								width: "176px",
								minHeight: "42px",
								height: "42px",
								padding: "0 8px",
								borderRadius: "14px",
								border: "1.5px solid rgba(255, 255, 255, 0.45)",
								boxShadow: isCurrent
									? "0 0 0 3px #ffffff, 0 8px 24px -2px rgba(0, 0, 0, 0.65)"
									: "0 6px 18px -2px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
							}}
							className={`radial-item-btn pointer-events-auto flex items-center justify-between text-xs font-bold text-white cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none touch-manipulation ${
								isCurrent ? "font-black ring-2 ring-white" : "opacity-95 hover:opacity-100"
							}`}
							title={item.label}
							data-testid={`radial-btn-${item.id}`}
						>
							<span className="shrink-0 flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{item.icon}</span>
							<span className="whitespace-nowrap font-black text-[11px] tracking-tight truncate flex-1 px-1 text-left drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{item.shortLabel}</span>
							{item.hotkey && (
								<span className="shrink-0 w-4 h-4 rounded bg-white/20 text-[10px] font-mono flex items-center justify-center font-black opacity-90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
									{item.hotkey}
								</span>
							)}
						</button>
					);
				})}

				{/* Column 2: Specialized */}
				{wingCol2Items.map((item, rowIdx) => {
					const colX = layoutMode === "right-wing" ? subAnchorX + 96 : subAnchorX - 96;
					const rowY = hubY + (rowIdx - 2) * 50;
					const isCurrent = currentState === item.state;

					return (
						<button
							key={item.id}
							type="button"
							onClick={() => {
								if (item.state) onSelectState(item.state, selectedSurfaces.length > 0 ? selectedSurfaces : surfaces);
								onClose();
							}}
							style={{
								position: "absolute",
								left: `${colX}px`,
								top: `${rowY}px`,
								transform: "translate(-50%, -50%)",
								background: item.bgGradient,
								width: "176px",
								minHeight: "42px",
								height: "42px",
								padding: "0 8px",
								borderRadius: "14px",
								border: "1.5px solid rgba(255, 255, 255, 0.45)",
								boxShadow: isCurrent
									? "0 0 0 3px #ffffff, 0 8px 24px -2px rgba(0, 0, 0, 0.65)"
									: "0 6px 18px -2px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
							}}
							className={`radial-item-btn pointer-events-auto flex items-center justify-between text-xs font-bold text-white cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none touch-manipulation ${
								isCurrent ? "font-black ring-2 ring-white" : "opacity-95 hover:opacity-100"
							}`}
							title={item.label}
							data-testid={`radial-btn-${item.id}`}
						>
							<span className="shrink-0 flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{item.icon}</span>
							<span className="whitespace-nowrap font-black text-[11px] tracking-tight truncate flex-1 px-1 text-left drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{item.shortLabel}</span>
							{item.hotkey && (
								<span className="shrink-0 w-4 h-4 rounded bg-white/20 text-[10px] font-mono flex items-center justify-center font-black opacity-90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
									{item.hotkey}
								</span>
							)}
						</button>
					);
				})}
			</div>

			{/* Top Surfaces Bar in Wing mode */}
			<div
				className="radial-top-bar absolute flex flex-col items-center gap-1.5 pointer-events-auto px-3.5 py-1.5 rounded-2xl z-20"
				style={{
					left: `${subAnchorX}px`,
					top: `${Math.max(16, hubY - 175)}px`,
					transform: "translate(-50%, 0)",
				}}
			>
				<details className="odontogram-desktop-surfaces-accordion group flex flex-col items-center transition-all">
					<summary className="flex items-center gap-2 cursor-pointer select-none px-2 py-0.5 text-xs font-bold text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200">
						<span className="uppercase font-black tracking-wide">Поверхности (опционально)</span>
						<span className="text-[11px] font-mono font-bold text-[var(--odontogram-ink-muted)] dark:text-slate-300">
							{selectedSurfaces.length > 0 ? `[${selectedSurfaces.join("")}]` : "вся коронка"}
						</span>
						<span className="text-[10px] text-[var(--odontogram-ink-muted)] dark:text-slate-400 group-open:hidden">▾</span>
						<span className="text-[10px] text-[var(--odontogram-ink-muted)] dark:text-slate-400 hidden group-open:inline">▴</span>
					</summary>
					<div className="flex flex-col items-center gap-1.5 mt-1.5 pt-1.5 border-t border-[var(--odontogram-border-subtle)] dark:border-slate-700/80">
						<div className="flex items-center gap-1">
							<span className="text-xs uppercase font-black text-teal-700 dark:text-teal-300 px-1">Поверхности:</span>
							{[
								{ label: "MOD", surfs: ["M", "O", "D"], title: "Медиально-окклюзионно-дистальная (MOD)" },
								{ label: "MO", surfs: ["M", "O"], title: "Медиально-окклюзионная (MO)" },
								{ label: "OD", surfs: ["O", "D"], title: "Окклюзионно-дистальная (OD)" },
								{ label: "O", surfs: ["O"], title: "Окклюзионная (O)" },
								{ label: "V", surfs: ["V"], title: "Вестибулярная (V)" },
								{ label: "L/P", surfs: ["L"], title: "Язычная / Нёбная (L/P)" },
								{ label: "B", surfs: ["B"], title: "Буккальная / Щёчная (B)" },
							].map((chip) => {
								const isMatch =
									chip.surfs.length === selectedSurfaces.length &&
									chip.surfs.every((s) => selectedSurfaces.includes(s));
								return (
									<button
										key={chip.label}
										type="button"
										onClick={() => {
											const next = isMatch ? [] : [...chip.surfs];
											setSelectedSurfaces(next);
											onSelectSurfaces?.(next);
										}}
										className={`min-h-[44px] sm:min-h-[32px] sm:h-8 min-w-[44px] px-2.5 py-1.5 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer select-none touch-manipulation flex items-center justify-center ${
											isMatch
												? "bg-teal-600 text-white border-teal-500 shadow-sm scale-105 font-black"
												: "bg-[var(--odontogram-paper)] dark:bg-slate-900/90 text-[var(--odontogram-ink)] dark:text-slate-100 border-[var(--odontogram-border-subtle)] dark:border-slate-700/80 hover:bg-[var(--odontogram-surface-hover)] dark:hover:bg-slate-800"
										}`}
										title={chip.title}
										data-testid={`radial-wing-quick-surf-${chip.label.replace("/", "-")}`}
									>
										[{chip.label}]
									</button>
								);
							})}
						</div>

						{/* 2D Anatomical Surface Selector & Black Cavity Presets */}
						<div className="flex justify-center p-1 my-1">
							<SurfaceSelector
								selected={selectedSurfaces}
								onChange={(next) => {
									setSelectedSurfaces(next);
									onSelectSurfaces?.(next);
								}}
								size={80}
							/>
						</div>
					</div>
				</details>
			</div>

			{/* Bottom Actions Bar in Wing mode */}
			{Boolean(onOpenTherapy || onOpenEndo || onAddToInvoice) && (
				<div
					className="radial-bottom-actions absolute flex items-center gap-2 pointer-events-auto px-3.5 py-1.5 rounded-full z-20"
					style={{
						left: `${subAnchorX}px`,
						top: `${Math.min(vh - 55, hubY + 145)}px`,
						transform: "translate(-50%, 0)",
					}}
				>
					{onOpenTherapy && (
						<button
							type="button"
							onClick={() => {
								onOpenTherapy();
								onClose();
							}}
							className="min-h-[36px] text-xs font-black text-teal-700 dark:text-teal-300 hover:bg-teal-500/15 dark:hover:bg-teal-500/25 px-3 py-1 rounded-lg transition-colors cursor-pointer border-0 inline-flex items-center gap-1.5"
						>
							<DentalHandpiece size={14} />
							<span className="font-extrabold tracking-wide">Терапия</span>
						</button>
					)}
					{onAddToInvoice && (
						<button
							type="button"
							onClick={() => {
								onAddToInvoice();
								onClose();
							}}
							className="min-h-[36px] text-xs font-black text-teal-700 dark:text-teal-300 hover:bg-teal-500/15 dark:hover:bg-teal-500/25 px-3 py-1 rounded-lg transition-colors cursor-pointer border-0 inline-flex items-center gap-1.5"
						>
							<Coins size={14} />
							<span className="font-extrabold tracking-wide">В смету</span>
						</button>
					)}
					{onOpenEndo && (
						<button
							type="button"
							onClick={() => {
								onOpenEndo();
								onClose();
							}}
							className="min-h-[36px] text-xs font-black text-rose-600 dark:text-rose-300 hover:bg-rose-500/15 dark:hover:bg-rose-500/25 px-3 py-1 rounded-lg transition-colors cursor-pointer border-0 inline-flex items-center gap-1.5"
						>
							<EndoFileCanal size={14} />
							<span className="font-extrabold tracking-wide">Журнал каналов</span>
						</button>
					)}
				</div>
			)}
		</div>
	);
};
