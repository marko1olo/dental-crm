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
import { type ToothState, TOOTH_STATE_LABELS } from "./ToothChart";
import { getToothFolkAndAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { isPrimaryTooth } from "@dental/shared";
import type { RadialMenuItem } from "./ToothRadialMenu";

export interface ToothRadialMobileSheetProps {
	menuRef: React.RefObject<HTMLDivElement | null>;
	dragOffsetY: number;
	isDraggingSheet: boolean;
	handleSheetTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
	handleSheetTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
	handleSheetTouchEnd: () => void;
	toothNumber: number;
	currentState: ToothState;
	items: RadialMenuItem[];
	selectedSurfaces: string[];
	surfaces?: readonly string[] | undefined;
	setSelectedSurfaces: React.Dispatch<React.SetStateAction<string[]>>;
	onSelectSurfaces?: ((surfaces: readonly string[]) => void) | undefined;
	toggleSurface: (surf: string) => void;
	handleSelectStateWithHaptic: (
		state: ToothState,
		surfs?: readonly string[],
		subType?: string,
	) => void;
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

export const ToothRadialMobileSheet: React.FC<ToothRadialMobileSheetProps> = ({
	menuRef,
	dragOffsetY,
	isDraggingSheet,
	handleSheetTouchStart,
	handleSheetTouchMove,
	handleSheetTouchEnd,
	toothNumber,
	currentState,
	items,
	selectedSurfaces,
	surfaces,
	setSelectedSurfaces,
	onSelectSurfaces,
	toggleSurface,
	handleSelectStateWithHaptic,
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
			onTouchStart={handleSheetTouchStart}
			onTouchMove={handleSheetTouchMove}
			onTouchEnd={handleSheetTouchEnd}
			style={{
				transform: dragOffsetY > 0 ? `translateY(${dragOffsetY}px)` : undefined,
				transition: isDraggingSheet ? "none" : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
				touchAction: "pan-y",
				paddingBottom: "max(1.25rem, calc(1rem + env(safe-area-inset-bottom, 0px)))",
			}}
			className="radial-mobile-sheet w-full max-w-xl mx-auto bg-[var(--odontogram-paper)] border-t sm:border border-[var(--odontogram-border)] rounded-t-[28px] sm:rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col gap-3.5 max-h-[88vh] overflow-y-auto animate-slideUp select-none"
			role="dialog"
			aria-label={`Меню статуса зуба ${toothNumber}`}
			onClick={(e) => e.stopPropagation()}
		>
			{/* Sheet Drag Handle - Apple HIG 36x5px grab handle */}
			<div
				className="w-9 h-[5px] rounded-full bg-[var(--odontogram-border-strong)] mx-auto opacity-70 mb-1 cursor-grab active:cursor-grabbing hover:opacity-100 transition-opacity"
				title="Потяните вниз для закрытия"
			/>

			{/* Header with Tooth Number and Folk Name */}
			<div className="flex items-center justify-between border-b border-[var(--odontogram-border-subtle)] pb-3">
				<div className="flex items-center gap-3 min-w-0">
					<span className="w-12 h-12 rounded-xl bg-teal-500/15 border border-teal-500/30 text-[var(--teal)] font-black text-2xl flex items-center justify-center font-mono shrink-0 shadow-2xs">
						{toothNumber}
					</span>
					<div className="flex flex-col min-w-0">
						<span className="text-sm sm:text-base font-extrabold text-[var(--odontogram-ink)] leading-snug break-words">
							{getToothFolkAndAnatomicalNameRu(toothNumber)}
						</span>
						<span className="text-xs text-[var(--odontogram-ink-muted)]">
							Текущий: <strong className="text-[var(--odontogram-ink)]">{TOOTH_STATE_LABELS[currentState ?? "Healthy"]}</strong>
						</span>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-full bg-[var(--odontogram-surface-hover)] hover:bg-rose-500 hover:text-white text-[var(--odontogram-ink-muted)] flex items-center justify-center transition-all cursor-pointer shrink-0"
					title="Закрыть (Esc или свайп вниз)"
					aria-label="Закрыть меню"
				>
					<X size={22} />
				</button>
			</div>

			{/* 8 Primary Diagnostic Buttons in 2-Column Touch Grid (>= 52px Touch Targets) */}
			<div className="grid grid-cols-2 gap-2.5 w-full">
				{items.map((item) => {
					const isCurrent = currentState === item.state;
					return (
						<button
							key={item.id}
							type="button"
							onClick={() => {
								if (item.state) {
									handleSelectStateWithHaptic(
										item.state,
										selectedSurfaces.length > 0 ? selectedSurfaces : surfaces,
									);
								}
							}}
							style={{ background: item.bgGradient }}
							className={`radial-item-btn min-h-[50px] min-w-[48px] px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl font-bold text-white flex items-center justify-between gap-2 shadow-sm transition-all active:scale-95 cursor-pointer touch-manipulation border border-white/25 ${
								isCurrent
									? "ring-2 ring-white scale-[1.02] font-black"
									: "opacity-90 hover:opacity-100"
							}`}
							title={item.label}
							data-testid={`radial-btn-${item.id}`}
						>
							<div className="flex items-center gap-2 min-w-0">
								<span className="shrink-0">{item.icon}</span>
								<span className="text-xs sm:text-sm font-black truncate">{item.shortLabel}</span>
							</div>
							<span className="text-xs px-1.5 py-0.5 rounded-md bg-black/35 text-white font-mono font-black shrink-0">
								{item.hotkey}
							</span>
						</button>
					);
				})}
			</div>

			{/* Quick Macro Bar (Black Classes I-VI / 6-Surface Shading / Resorption) */}
			{isPrimaryTooth(toothNumber) ? (
				<div className="flex flex-col gap-2 p-3 rounded-2xl bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)]">
					<div className="flex items-center justify-between">
						<span className="text-xs uppercase font-black text-purple-600 dark:text-purple-400 px-1 shrink-0">Резорбция корней:</span>
						<span className="text-xs text-[var(--odontogram-ink-muted)]">0–100%</span>
					</div>
					<div className="grid grid-cols-4 gap-2 w-full">
						<button
							type="button"
							onClick={() => {
								onSelectState("Healthy", undefined, "resorption_1");
								onClose();
							}}
							className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 touch-manipulation text-center"
							title="Физиологическая резорбция I степени (25%)"
						>
							[Рез I 25%]
						</button>
						<button
							type="button"
							onClick={() => {
								onSelectState("Healthy", undefined, "resorption_2");
								onClose();
							}}
							className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 touch-manipulation text-center"
							title="Физиологическая резорбция II степени (50%)"
						>
							[Рез II 50%]
						</button>
						<button
							type="button"
							onClick={() => {
								onSelectState("Healthy", undefined, "resorption_3");
								onClose();
							}}
							className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 touch-manipulation text-center"
							title="Физиологическая резорбция III степени (75%)"
						>
							[Рез III 75%]
						</button>
						<button
							type="button"
							onClick={() => {
								onSelectState("Missing", undefined, "exfoliation");
								onClose();
							}}
							className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-rose-500/15 text-rose-800 dark:text-rose-200 hover:bg-rose-500/30 transition-all cursor-pointer border border-rose-500/30 touch-manipulation text-center"
							title="Физиологическая смена / Эксфолиация (100%)"
						>
							[Смена 100%]
						</button>
					</div>
				</div>
			) : (
				<details className="odontogram-mobile-surfaces-accordion group rounded-2xl bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)] p-3 transition-all">
					<summary className="flex items-center justify-between cursor-pointer select-none text-xs font-black text-teal-700 dark:text-teal-400">
						<span className="flex items-center gap-1.5">
							<span>Указать поверхности (опционально)</span>
							<span className="text-[10px] text-[var(--odontogram-ink-muted)] font-normal group-open:hidden">▾ раскрыть</span>
							<span className="text-[10px] text-[var(--odontogram-ink-muted)] font-normal hidden group-open:inline">▴ свернуть</span>
						</span>
						<span className="text-xs font-mono font-bold text-[var(--odontogram-ink-muted)]">
							{selectedSurfaces.length > 0 ? selectedSurfaces.join(", ") : "Вся коронка"}
						</span>
					</summary>
					<div className="flex flex-col gap-2.5 mt-2.5 pt-2.5 border-t border-[var(--odontogram-border-subtle)]">
						{/* Quick Surface Combo Chips (1 tap): [MOD], [MO], [OD], [O], [V], [L/P], [B] */}
						<div className="flex flex-col gap-1.5 pb-2 border-b border-[var(--odontogram-border-subtle)]">
							<div className="flex items-center justify-between">
								<span className="text-xs uppercase font-black text-teal-700 dark:text-teal-400 px-1 shrink-0">
									Быстрый выбор поверхностей:
								</span>
								<span className="text-xs text-[var(--odontogram-ink-muted)]">
									{selectedSurfaces.length > 0 ? selectedSurfaces.join(", ") : "Вся коронка"}
								</span>
							</div>
							<div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1.5 w-full">
								{[
									{ label: "MOD", surfs: ["M", "O", "D"], title: "Медиально-окклюзионно-дистальная (MOD)" },
									{ label: "MO", surfs: ["M", "O"], title: "Медиально-окклюзионная (MO)" },
									{ label: "OD", surfs: ["O", "D"], title: "Окклюзионно-дистальная (OD)" },
									{ label: "O", surfs: ["O"], title: "Окклюзионная (O/Жевательная)" },
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
											className={`min-h-[48px] px-2 py-2 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer select-none flex items-center justify-center touch-manipulation text-center ${
												isMatch
													? "bg-teal-600 text-white border-teal-600 shadow-xs scale-105"
													: "bg-[var(--odontogram-paper)] text-[var(--odontogram-ink)] border-[var(--odontogram-border-subtle)] hover:bg-[var(--odontogram-surface-hover)]"
											}`}
											title={chip.title}
											data-testid={`radial-mobile-quick-surf-${chip.label.replace("/", "-")}`}
										>
											[{chip.label}]
										</button>
									);
								})}
							</div>
						</div>

						{/* 6-Surface Toggles (>= 48x48px Touch Targets) */}
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
							<span className="text-xs uppercase font-black text-teal-700 dark:text-teal-400 px-1 shrink-0">По отдельности:</span>
							<div className="grid grid-cols-6 gap-1.5 sm:flex sm:items-center">
								{(["O", "V", "L", "M", "D", "C"] as const).map((surf) => {
									const isActive = selectedSurfaces.includes(surf);
									return (
										<button
											key={surf}
											type="button"
											onClick={() => toggleSurface(surf)}
											className={`min-h-[48px] min-w-[48px] px-2.5 py-1.5 rounded-xl text-sm font-mono font-black border transition-all cursor-pointer select-none flex items-center justify-center ${
												isActive
													? "bg-teal-600 text-white border-teal-600 shadow-xs scale-105"
													: "bg-[var(--odontogram-paper)] text-[var(--odontogram-ink)] border-[var(--odontogram-border-subtle)] hover:bg-[var(--odontogram-surface-hover)]"
											}`}
											title={`Поверхность ${surf}`}
										>
											{surf}
										</button>
									);
								})}
							</div>
						</div>

						{/* Black Classes I - VI (>= 48px Touch Targets) */}
						<div className="flex items-center justify-between pt-2 border-t border-[var(--odontogram-border-subtle)]">
							<span className="text-xs uppercase font-black text-amber-600 dark:text-amber-400 px-1 shrink-0">Классы по Блэку:</span>
						</div>
						<div className="grid grid-cols-4 gap-1.5 w-full">
							<button
								type="button"
								onClick={() => {
									onSelectState("Caries", ["O"]);
									onClose();
								}}
								className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
								title="I класс: Окклюзионные фиссуры и ямки (O)"
							>
								[I: O]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Caries", ["M", "O", "D"]);
									onClose();
								}}
								className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
								title="II класс: Медиально-окклюзионно-дистальная полость (MOD)"
							>
								[II: MOD]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Caries", ["M", "O"]);
									onClose();
								}}
								className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
								title="II класс: Медиально-окклюзионная полость (MO)"
							>
								[II: MO]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Caries", ["O", "D"]);
									onClose();
								}}
								className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
								title="II класс: Окклюзионно-дистальная полость (OD)"
							>
								[II: OD]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Caries", ["M", "D"]);
									onClose();
								}}
								className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
								title="III класс: Апроксимальные поверхности резцов/клыков без режущего края (M/D)"
							>
								[III: M/D]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Caries", ["M", "O", "D"]);
									onClose();
								}}
								className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
								title="IV класс: Апроксимальные поверхности резцов/клыков с поражением режущего края (MOD)"
							>
								[IV: Реж]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Caries", ["C"]);
									onClose();
								}}
								className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
								title="V класс: Пришеечная полость у шейки зуба (C/Cervical)"
							>
								[V: Приш]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Caries", ["O"]);
									onClose();
								}}
								className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
								title="VI класс: Бугры моляров/премоляров или режущий край"
							>
								[VI: Бугры]
							</button>
						</div>

						{/* Некариозные поражения и дефекты коронок/пломб (StomX 91 дефект) */}
						<div className="flex items-center justify-between pt-2 border-t border-[var(--odontogram-border-subtle)]">
							<span className="text-xs uppercase font-black text-indigo-600 dark:text-indigo-400 px-1 shrink-0">
								Дефекты и некариозные (Кд, Дп, Дк):
							</span>
						</div>
						<div className="grid grid-cols-3 gap-1.5 w-full">
							<button
								type="button"
								onClick={() => {
									onSelectState("Caries", ["C"], "wedge_defect");
									onClose();
								}}
								className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-500/30 transition-all cursor-pointer border border-indigo-500/30 touch-manipulation text-center"
								title="Кд: Клиновидный дефект пришеечной области (K03.1)"
								data-testid="radial-defect-wedge-btn"
							>
								[Кд: Клин. дефект]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Filled", selectedSurfaces.length > 0 ? selectedSurfaces : surfaces, "defective_filling");
									onClose();
								}}
								className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
								title="Дп: Дефект пломбы (нарушение краевого прилегания, скол, вторичный кариес)"
								data-testid="radial-defect-filling-btn"
							>
								[Дп: Дефект пломбы]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Crown", undefined, "defective_crown");
									onClose();
								}}
								className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-rose-500/15 text-rose-800 dark:text-rose-200 hover:bg-rose-500/30 transition-all cursor-pointer border border-rose-500/30 touch-manipulation text-center"
								title="Дк: Дефект коронки (расцементировка, скол керамики, промывной зазор)"
								data-testid="radial-defect-crown-btn"
							>
								[Дк: Дефект коронки]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Caries", selectedSurfaces.length > 0 ? selectedSurfaces : ["V"], "hypoplasia_fluorosis");
									onClose();
								}}
								className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-sky-500/15 text-sky-800 dark:text-sky-200 hover:bg-sky-500/30 transition-all cursor-pointer border border-sky-500/30 touch-manipulation text-center"
								title="Г / Фл: Гипоплазия эмали (K00.4) или Флюороз (K00.3)"
								data-testid="radial-defect-hypoplasia-btn"
							>
								[Г/Фл: Гипоплазия]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Crown", ["V"], "veneer_inlay");
									onClose();
								}}
								className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-teal-500/15 text-teal-800 dark:text-teal-200 hover:bg-teal-500/30 transition-all cursor-pointer border border-teal-500/30 touch-manipulation text-center"
								title="В / ВК: Винир или культевая/керамическая вкладка (Inlay/Onlay)"
								data-testid="radial-defect-veneer-btn"
							>
								[В: Винир/Вкладка]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Filled", ["O"], "fissure_sealant");
									onClose();
								}}
								className="min-h-[48px] px-2 py-2 rounded-xl text-xs font-black bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/30 transition-all cursor-pointer border border-emerald-500/30 touch-manipulation text-center"
								title="Гф: Герметизация фиссур / Профилактическое запечатывание"
								data-testid="radial-defect-sealant-btn"
							>
								[Гф: Герметизация]
							</button>
						</div>
					</div>
				</details>
			)}

			{/* IROPZ warning */}
			{(Boolean(iropz && iropz > 0.6) || currentState === "Pulpitis" || currentState === "Periodontitis") && (
				<div className="flex items-center gap-2 bg-amber-500/15 text-amber-900 dark:text-amber-200 p-3 rounded-xl border border-amber-500/30 text-xs font-bold">
					<AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<span>ИРОПЗ &gt; 0.6: Рекомендовано ортопедическое восстановление (коронка Z51.8)</span>
				</div>
			)}

			{/* Quick Actions (Miller's Law: <= 2 direct buttons, secondary in '...') */}
			{Boolean(onOpenTherapy || onOpenEndo || onAddToInvoice) && (
				<div className="flex items-center gap-2 pt-1 border-t border-[var(--odontogram-border-subtle)]">
					{onOpenTherapy && (
						<button
							type="button"
							onClick={() => {
								onOpenTherapy();
								onClose();
							}}
							className="flex-1 min-h-[48px] min-w-[48px] py-3 px-3 rounded-xl text-sm font-black text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 flex items-center justify-center gap-2 transition-colors cursor-pointer"
						>
							<DentalHandpiece size={18} />
							<span className="whitespace-nowrap">Терапия</span>
						</button>
					)}
					{onAddToInvoice && (
						<button
							type="button"
							onClick={() => {
								onAddToInvoice();
								onClose();
							}}
							className="flex-1 min-h-[48px] min-w-[48px] py-3 px-3 rounded-xl text-sm font-black text-[var(--teal)] bg-[var(--teal-soft,rgba(13,148,136,0.1))] hover:bg-[var(--teal-soft,rgba(13,148,136,0.2))] border border-[var(--teal)]/30 flex items-center justify-center gap-2 transition-colors cursor-pointer"
						>
							<Coins size={18} />
							<span className="whitespace-nowrap">В смету</span>
						</button>
					)}
					{onOpenEndo && !onAddToInvoice && (
						<button
							type="button"
							onClick={() => {
								onOpenEndo();
								onClose();
							}}
							className="flex-1 min-h-[48px] min-w-[48px] py-3 px-3 rounded-xl text-sm font-black text-rose-600 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 flex items-center justify-center gap-2 transition-colors cursor-pointer"
						>
							<EndoFileCanal size={18} />
							<span className="whitespace-nowrap">Журнал каналов</span>
						</button>
					)}
					{onOpenEndo && onAddToInvoice && onOpenTherapy && (
						<details className="relative">
							<summary
								className="list-none min-h-[48px] min-w-[48px] w-12 h-12 rounded-xl bg-[var(--odontogram-surface-hover)] hover:bg-[var(--odontogram-border-strong)] text-[var(--odontogram-ink)] flex items-center justify-center transition-colors cursor-pointer select-none border border-[var(--odontogram-border-subtle)]"
								title="Дополнительные действия"
								aria-label="Дополнительные действия"
							>
								<MoreHorizontal size={20} />
							</summary>
							<div className="absolute right-0 bottom-full mb-2 w-56 p-1.5 rounded-xl bg-[var(--odontogram-paper)] border border-[var(--odontogram-border)] shadow-2xl z-30 flex flex-col gap-1">
								<button
									type="button"
									onClick={() => {
										onOpenEndo();
										onClose();
									}}
									className="w-full min-h-[44px] px-3 py-2 rounded-lg hover:bg-rose-500/15 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer text-left"
								>
									<EndoFileCanal size={16} className="shrink-0" />
									<span>Журнал каналов (Эндо)</span>
								</button>
							</div>
						</details>
					)}
				</div>
			)}
		</div>
	);
};
