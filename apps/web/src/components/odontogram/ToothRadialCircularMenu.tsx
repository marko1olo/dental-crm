import React from "react";
import {
	AlertTriangle,
	Coins,
	MoreHorizontal,
	X,
} from "lucide-react";
import {
	EndoFileCanal,
	DentalHandpiece,
} from "../icons/DentalIcons";
import { type ToothState } from "./ToothChart";
import { isPrimaryTooth } from "@dental/shared";
import { SurfaceSelector } from "./chart/SurfaceSelector";
import type { RadialMenuItem } from "./ToothRadialMenu";

export interface ToothRadialCircularMenuProps {
	menuRef: React.RefObject<HTMLDivElement | null>;
	toothNumber: number;
	centerX: number;
	centerY: number;
	radius: number;
	items: RadialMenuItem[];
	currentState: ToothState;
	selectedSurfaces: string[];
	surfaces?: readonly string[] | undefined;
	setSelectedSurfaces: React.Dispatch<React.SetStateAction<string[]>>;
	onSelectSurfaces?: ((surfaces: readonly string[]) => void) | undefined;
	onSelectState: (
		state: ToothState,
		surfaces?: readonly string[],
		subType?: string,
	) => void;
	iropz?: number | undefined;
	onOpenTherapy?: (() => void) | undefined;
	onAddToInvoice?: (() => void) | undefined;
	onOpenEndo?: (() => void) | undefined;
	onClose: () => void;
}

export const ToothRadialCircularMenu: React.FC<ToothRadialCircularMenuProps> = ({
	menuRef,
	toothNumber,
	centerX,
	centerY,
	radius,
	items,
	currentState,
	selectedSurfaces,
	surfaces,
	setSelectedSurfaces,
	onSelectSurfaces,
	onSelectState,
	iropz,
	onOpenTherapy,
	onAddToInvoice,
	onOpenEndo,
	onClose,
}) => {
	return (
		<div
			ref={menuRef}
			className="radial-tooth-menu-container absolute select-none flex items-center justify-center pointer-events-none"
			style={{
				left: `${centerX}px`,
				top: `${centerY}px`,
				width: "500px",
				height: "500px",
				transform: "translate(-50%, -50%)",
			}}
			role="dialog"
			aria-label={`Радиальное меню зуба ${toothNumber}`}
		>
			{/* Background Glass Disc - centered at container origin */}
			<div
				className="radial-glass-disc absolute rounded-full pointer-events-none transition-all duration-200"
				style={{
					width: `${(radius + 40) * 2}px`,
					height: `${(radius + 40) * 2}px`,
					left: "50%",
					top: "50%",
					transform: "translate(-50%, -50%)",
				}}
			/>

			{/* Center Tooth Hub - centered at container origin */}
			<div
				className="radial-tooth-hub absolute flex flex-col items-center justify-center w-24 h-24 rounded-full z-40 pointer-events-auto"
				style={{
					left: "50%",
					top: "50%",
					transform: "translate(-50%, -50%)",
				}}
			>
				<span className="text-xs uppercase font-black tracking-wider radial-tooth-hub-label">Зуб</span>
				<span className="text-3xl font-black leading-none radial-tooth-hub-num drop-shadow-sm">{toothNumber}</span>
				<button
					type="button"
					onClick={onClose}
					className="radial-close-btn absolute -top-2.5 -right-2.5 min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center p-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none pointer-events-auto z-50 border-2 border-white/60"
					title="Закрыть (Esc)"
					aria-label="Закрыть меню"
				>
					<X size={18} />
				</button>
			</div>

			{/* Radial Circle Slices - anchored to container origin (50%, 50%) */}
			<div className="radial-slices-wrapper absolute inset-0 pointer-events-none">
				{items.map((item, index) => {
					const angle = (index * 2 * Math.PI) / items.length - Math.PI / 2;
					const x = Math.cos(angle) * radius;
					const y = Math.sin(angle) * radius;
					const isCurrent = currentState === item.state;
					const roundX = Math.round(x);
					const roundY = Math.round(y);

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
								left: `calc(50% ${roundX >= 0 ? `+ ${roundX}px` : `- ${Math.abs(roundX)}px`})`,
								top: `calc(50% ${roundY >= 0 ? `+ ${roundY}px` : `- ${Math.abs(roundY)}px`})`,
								transform: "translate(-50%, -50%)",
								background: item.bgGradient,
								minWidth: "max-content",
								width: "max-content",
								whiteSpace: "nowrap",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "6px",
								padding: "6px 11px",
								borderRadius: "9999px",
								border: "1.5px solid rgba(255, 255, 255, 0.45)",
								boxShadow: isCurrent
									? "0 0 0 3px #ffffff, 0 14px 32px -4px rgba(0, 0, 0, 0.75)"
									: "0 8px 22px -3px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
							}}
							className={`radial-item-btn pointer-events-auto min-h-[38px] text-xs font-bold text-white cursor-pointer transition-all duration-200 hover:scale-108 active:scale-95 focus:outline-none touch-manipulation ${
								isCurrent
									? "scale-105 font-black ring-2 ring-white"
									: "opacity-95 hover:opacity-100"
							}`}
							title={item.label}
							data-testid={`radial-btn-${item.id}`}
						>
							<span className="shrink-0 flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{item.icon}</span>
							<span className="whitespace-nowrap font-black text-[11.5px] tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{item.shortLabel}</span>
						</button>
					);
				})}
			</div>

			{/* Top Bar: Surfaces Accordion for Permanent Teeth OR Resorption Presets for Deciduous Teeth */}
			<div
				className="radial-top-bar absolute flex flex-col items-center gap-1.5 pointer-events-auto px-3.5 py-1.5 rounded-2xl z-20"
				style={{
					left: "50%",
					top: `${Math.round(250 - radius - 52)}px`,
					transform: "translate(-50%, -50%)",
				}}
			>
				{isPrimaryTooth(toothNumber) ? (
					/* Resorption Scale for Milk Teeth */
					<div className="flex flex-col items-center gap-1 bg-[var(--odontogram-paper)] dark:bg-slate-900/90 border border-[var(--odontogram-border-subtle)] dark:border-slate-700/80 px-2.5 py-1 rounded-xl shadow-md">
						<div className="flex items-center gap-1 text-[11px] font-black uppercase text-purple-600 dark:text-purple-400">
							<span>Резорбция:</span>
						</div>
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => {
									onSelectState("Healthy", undefined, "resorption_1");
									onClose();
								}}
								className="min-h-[28px] px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30"
								title="Резорбция I степени (25%)"
							>
								I (25%)
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Healthy", undefined, "resorption_2");
									onClose();
								}}
								className="min-h-[28px] px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30"
								title="Резорбция II степени (50%)"
							>
								II (50%)
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Healthy", undefined, "resorption_3");
									onClose();
								}}
								className="min-h-[28px] px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30"
								title="Резорбция III степени (75%)"
							>
								III (75%)
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Missing", undefined, "exfoliation");
									onClose();
								}}
								className="min-h-[28px] px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-800 dark:text-rose-200 hover:bg-rose-500/30 transition-all cursor-pointer border border-rose-500/30"
								title="Эксфолиация / Смена (100%)"
							>
								Смена
							</button>
						</div>
					</div>
				) : (
					/* Desktop Permanent Teeth: Surfaces Accordion */
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
							{/* Quick Surface Combo Chips: [MOD], [MO], [OD], [O], [V], [L/P], [B] */}
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
											data-testid={`radial-quick-surf-${chip.label.replace("/", "-")}`}
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

							{/* Black Classes I - VI */}
							<div className="flex items-center gap-1 border-t border-[var(--odontogram-border-subtle)] dark:border-slate-700/80 pt-1">
								<span className="text-xs uppercase font-black text-amber-600 dark:text-amber-400 px-1">Блэк:</span>
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={() => {
											onSelectState("Caries", ["O"]);
											onClose();
										}}
										className="min-h-[28px] px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30"
										title="I класс: Окклюзионные фиссуры и ямки (O)"
									>
										I (O)
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Caries", ["M", "O", "D"]);
											onClose();
										}}
										className="min-h-[28px] px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30"
										title="II класс: Медиально-окклюзионно-дистальная полость (MOD)"
									>
										II (MOD)
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Caries", ["M", "O"]);
											onClose();
										}}
										className="min-h-[28px] px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30"
										title="II класс: Медиально-окклюзионная полость (MO)"
									>
										II (MO)
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Caries", ["O", "D"]);
											onClose();
										}}
										className="min-h-[28px] px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30"
										title="II класс: Окклюзионно-дистальная полость (OD)"
									>
										II (OD)
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Caries", ["M", "D"]);
											onClose();
										}}
										className="min-h-[28px] px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30"
										title="III класс: Апроксимальные поверхности резцов/клыков без угла (M/D)"
									>
										III
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Caries", ["M", "O", "D"]);
											onClose();
										}}
										className="min-h-[28px] px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30"
										title="IV класс: Апроксимальные поверхности резцов/клыков с поражением угла"
									>
										IV
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Caries", ["C"]);
											onClose();
										}}
										className="min-h-[28px] px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30"
										title="V класс: Пришеечная полость (C/Cervical)"
									>
										V
									</button>
								</div>
							</div>

							{/* Non-carious & Defect chips: Wedge, Defective Filling, Defective Crown */}
							<div className="flex items-center gap-1 border-t border-[var(--odontogram-border-subtle)] dark:border-slate-700/80 pt-1">
								<span className="text-xs uppercase font-black text-indigo-600 dark:text-indigo-400 px-1">Дефекты:</span>
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={() => {
											onSelectState("Caries", ["C"], "wedge_defect");
											onClose();
										}}
										className="min-h-[28px] px-1.5 py-0.5 rounded text-[11px] font-bold bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-500/30 transition-all cursor-pointer border border-indigo-500/30"
										title="Кд: Клиновидный дефект пришеечной области (K03.1)"
										data-testid="radial-desktop-defect-wedge-btn"
									>
										Кд (Клин)
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Filled", selectedSurfaces.length > 0 ? selectedSurfaces : surfaces, "defective_filling");
											onClose();
										}}
										className="min-h-[28px] px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30"
										title="Дп: Дефект пломбы (нарушение краевого прилегания, вторичный кариес)"
										data-testid="radial-desktop-defect-filling-btn"
									>
										Дп (Пломба)
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Crown", undefined, "defective_crown");
											onClose();
										}}
										className="min-h-[28px] px-1.5 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-800 dark:text-rose-200 hover:bg-rose-500/30 transition-all cursor-pointer border border-rose-500/30"
										title="Дк: Дефект коронки (расцементировка, скол керамики)"
										data-testid="radial-desktop-defect-crown-btn"
									>
										Дк (Коронка)
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Caries", selectedSurfaces.length > 0 ? selectedSurfaces : ["V"], "hypoplasia_fluorosis");
											onClose();
										}}
										className="min-h-[28px] px-1.5 py-0.5 rounded text-[11px] font-bold bg-sky-500/15 text-sky-800 dark:text-sky-200 hover:bg-sky-500/30 transition-all cursor-pointer border border-sky-500/30"
										title="Г / Фл: Гипоплазия эмали (K00.4) или Флюороз (K00.3)"
										data-testid="radial-desktop-defect-hypoplasia-btn"
									>
										Г/Фл
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Crown", ["V"], "veneer_inlay");
											onClose();
										}}
										className="min-h-[28px] px-1.5 py-0.5 rounded text-[11px] font-bold bg-teal-500/15 text-teal-800 dark:text-teal-200 hover:bg-teal-500/30 transition-all cursor-pointer border border-teal-500/30"
										title="В / ВК: Винир или вкладка"
										data-testid="radial-desktop-defect-veneer-btn"
									>
										В (Винир)
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Filled", ["O"], "fissure_sealant");
											onClose();
										}}
										className="min-h-[28px] px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/30 transition-all cursor-pointer border border-emerald-500/30"
										title="Гф: Герметизация фиссур / Запечатывание"
										data-testid="radial-desktop-defect-sealant-btn"
									>
										Гф
									</button>
								</div>
							</div>
						</div>
					</details>
				)}
			</div>

			{/* IROPZ Warning Banner if > 0.6 */}
			{(Boolean(iropz && iropz > 0.6) || currentState === "Pulpitis" || currentState === "Periodontitis") && (
				<div
					className="radial-iropz-banner absolute flex items-center gap-2 pointer-events-auto bg-amber-500/15 text-amber-900 dark:text-amber-200 px-3 py-1 rounded-full border border-amber-500/30 text-xs font-bold shadow-md z-20"
					style={{
						left: "50%",
						top: `${Math.round(250 + radius + 15)}px`,
						transform: "translate(-50%, -50%)",
					}}
				>
					<AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<span>ИРОПЗ &gt; 0.6: Рекомендована коронка (Z51.8)</span>
				</div>
			)}

			{/* Bottom Action Bar: Quick Shortcuts (Therapy, Endo, Invoice) */}
			{Boolean(onOpenTherapy || onOpenEndo || onAddToInvoice) && (
				<div
					className="radial-bottom-actions absolute flex items-center gap-2 pointer-events-auto px-3.5 py-1.5 rounded-full z-20"
					style={{
						left: "50%",
						top: `${Math.round(250 + radius + (Boolean(iropz && iropz > 0.6) || currentState === "Pulpitis" || currentState === "Periodontitis" ? 48 : 20))}px`,
						transform: "translate(-50%, -50%)",
					}}
				>
					{onOpenTherapy && (
						<button
							type="button"
							onClick={() => {
								onOpenTherapy();
								onClose();
							}}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								background: "transparent",
							}}
							className="min-h-[36px] text-xs font-black text-teal-700 dark:text-teal-300 hover:bg-teal-500/15 dark:hover:bg-teal-500/25 px-3 py-1 rounded-lg transition-colors cursor-pointer border-0"
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
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								background: "transparent",
							}}
							className="min-h-[36px] text-xs font-black text-teal-700 dark:text-teal-300 hover:bg-teal-500/15 dark:hover:bg-teal-500/25 px-3 py-1 rounded-lg transition-colors cursor-pointer border-0"
						>
							<Coins size={14} />
							<span className="font-extrabold tracking-wide">В смету</span>
						</button>
					)}
					{onOpenEndo && !onAddToInvoice && (
						<button
							type="button"
							onClick={() => {
								onOpenEndo();
								onClose();
							}}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								background: "transparent",
							}}
							className="min-h-[36px] text-xs font-black text-rose-600 dark:text-rose-300 hover:bg-rose-500/15 dark:hover:bg-rose-500/25 px-3 py-1 rounded-lg transition-colors cursor-pointer border-0"
						>
							<EndoFileCanal size={14} />
							<span className="font-extrabold tracking-wide">Журнал каналов</span>
						</button>
					)}
					{onOpenEndo && onAddToInvoice && onOpenTherapy && (
						<details className="relative">
							<summary
								className="list-none min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] transition-colors cursor-pointer select-none"
								title="Дополнительные действия"
							>
								<MoreHorizontal size={16} />
							</summary>
							<div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-48 p-1.5 rounded-xl bg-[var(--odontogram-paper)] border border-[var(--odontogram-border)] shadow-xl z-30 flex flex-col gap-1">
								<button
									type="button"
									onClick={() => {
										onOpenEndo();
										onClose();
									}}
									className="w-full min-h-[32px] px-2.5 py-1 rounded-lg hover:bg-rose-500/15 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer text-left border-0 bg-transparent"
								>
									<EndoFileCanal size={14} className="shrink-0" />
									<span>Журнал каналов</span>
								</button>
							</div>
						</details>
					)}
				</div>
			)}
		</div>
	);
};
