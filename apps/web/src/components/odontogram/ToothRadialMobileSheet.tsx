import { isPrimaryTooth } from "@dental/shared";
import {
	AlertTriangle,
	Camera,
	ChevronDown,
	ChevronUp,
	Coins,
	MoreHorizontal,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { getToothFolkAndAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import {
	DentalCrown,
	DentalHandpiece,
	DentalImplant,
	EndoFileCanal,
	ToothCaries,
	ToothDeciduous,
	ToothExtractForceps,
	ToothMolar,
	ToothPulpitis,
} from "../icons/DentalIcons";
import { TOOTH_STATE_LABELS, type ToothState } from "./ToothChart";
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
	toothScanThumbnail?:
		| { id: string; url: string; title: string }
		| null
		| undefined;
	onOpenRvg?: (() => void) | undefined;
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
	toothScanThumbnail,
	onOpenRvg,
	onClose,
}) => {
	const isPrimary = isPrimaryTooth(toothNumber);
	const [isSecondaryOpen, setIsSecondaryOpen] = useState(false);

	// The 6 Core Clinical Statuses for fast 1-click execution in chairside gloved hand
	const core6Ids = [
		"healthy",
		"caries",
		"filled",
		"pulpitis",
		"crown",
		"missing",
	];
	const primaryItems = items.filter((it) => core6Ids.includes(it.id));
	const secondaryItems = items.filter((it) => !core6Ids.includes(it.id));

	return (
		<div
			ref={menuRef}
			onTouchStart={handleSheetTouchStart}
			onTouchMove={handleSheetTouchMove}
			onTouchEnd={handleSheetTouchEnd}
			style={{
				transform: dragOffsetY > 0 ? `translateY(${dragOffsetY}px)` : undefined,
				transition: isDraggingSheet
					? "none"
					: "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
				touchAction: "pan-y",
				paddingBottom:
					"max(1.25rem, calc(1rem + env(safe-area-inset-bottom, 0px)))",
			}}
			className="radial-mobile-sheet w-full max-w-xl mx-auto bg-[var(--paper)] border-t border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col gap-3 max-h-[88vh] overflow-y-auto animate-slideUp select-none text-[var(--ink)]"
			role="dialog"
			aria-label={`Клиническое меню зуба ${toothNumber}`}
			onClick={(e) => e.stopPropagation()}
		>
			{/* Tactile Drag Handle — Apple HIG 36x5px */}
			<div
				className="w-9 h-[5px] rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))] mx-auto mb-1 cursor-grab active:cursor-grabbing hover:opacity-100 transition-opacity"
				title="Потяните вниз для закрытия"
			/>

			{/* Header with FDI Number, Clean Folk Name, Current Status, Close Button */}
			<div className="flex items-center justify-between border-b border-[var(--line-subtle)] pb-2.5">
				<div className="flex items-center gap-3 min-w-0">
					<span className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-teal-500/15 border border-teal-500/30 text-[var(--teal)] font-black text-xl flex items-center justify-center font-mono shrink-0 shadow-2xs">
						{toothNumber}
					</span>
					<div className="flex flex-col min-w-0">
						<span className="text-sm font-extrabold text-[var(--ink)] leading-snug break-words">
							{getToothFolkAndAnatomicalNameRu(toothNumber)}
						</span>
						<span className="text-xs text-[var(--muted)]">
							Текущий:{" "}
							<strong className="text-[var(--ink)]">
								{TOOTH_STATE_LABELS[currentState ?? "Healthy"]}
							</strong>
						</span>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[var(--paper-soft)] hover:bg-rose-500 hover:text-white text-[var(--muted)] flex items-center justify-center transition-all cursor-pointer shrink-0 border border-[var(--line)]"
					title="Закрыть (Esc или свайп вниз)"
					aria-label="Закрыть меню"
				>
					<X size={20} />
				</button>
			</div>

			{/* 1-Tap Fast Surface Selector Chips (Natural Thumb Zone) */}
			{!isPrimary && (
				<div className="flex flex-col gap-1.5 p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<div className="flex items-center justify-between">
						<span className="text-[11px] uppercase font-black tracking-wide text-[var(--muted)]">
							Поверхности (1 тап):
						</span>
						<span className="text-[11px] font-mono font-bold text-[var(--teal)]">
							{selectedSurfaces.length > 0
								? selectedSurfaces.join("")
								: "вся коронка"}
						</span>
					</div>
					<div className="flex items-center gap-1.5 flex-wrap">
						{[
							{ label: "O", surfs: ["O"], title: "Окклюзионная" },
							{ label: "M", surfs: ["M"], title: "Медиальная" },
							{ label: "D", surfs: ["D"], title: "Дистальная" },
							{ label: "V", surfs: ["V"], title: "Вестибулярная" },
							{ label: "L", surfs: ["L"], title: "Язычная" },
							{
								label: "MOD",
								surfs: ["M", "O", "D"],
								title: "Медиально-окклюзионно-дистальная",
							},
							{
								label: "MO",
								surfs: ["M", "O"],
								title: "Медиально-окклюзионная",
							},
							{
								label: "OD",
								surfs: ["O", "D"],
								title: "Окклюзионно-дистальная",
							},
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
									className={`min-h-[36px] min-w-[36px] px-2.5 py-1 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer select-none flex items-center justify-center touch-manipulation ${
										isMatch
											? "bg-teal-600 text-white border-teal-600 shadow-xs scale-105"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-hover)]"
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
			)}

			{/* THE 6 CORE CLINICAL ACTIONS (2 Columns x 3 Rows, >= 50px Touch Targets, Mandate 8e) */}
			<div className="grid grid-cols-2 gap-2 w-full">
				{primaryItems.map((item) => {
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
							className={`radial-item-btn min-h-[50px] min-w-[48px] px-3 py-2.5 rounded-xl font-bold flex items-center justify-between gap-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer touch-manipulation border ${
								isCurrent
									? "bg-[var(--paper-soft)] border-teal-500 ring-2 ring-teal-500/40 text-[var(--ink)] font-black scale-[1.01]"
									: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/40 text-[var(--ink)]"
							}`}
							title={item.label}
							data-testid={`radial-btn-${item.id}`}
						>
							<div className="flex items-center gap-2 min-w-0">
								<span className="shrink-0 flex items-center justify-center">
									{item.icon}
								</span>
								<span className="text-xs sm:text-sm font-extrabold truncate">
									{item.shortLabel}
								</span>
							</div>
							<span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--paper-soft)] text-[var(--muted)] font-mono font-bold shrink-0 border border-[var(--line-subtle)]">
								{item.hotkey}
							</span>
						</button>
					);
				})}
			</div>

			{/* Secondary Clinical Statuses Accordion: Periodontitis, Implant, Root, Retained, Defects */}
			<div className="flex flex-col gap-1.5">
				<button
					type="button"
					onClick={() => setIsSecondaryOpen((prev) => !prev)}
					className="min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer select-none border border-[var(--line-subtle)] bg-[var(--paper-soft)]"
				>
					<span className="flex items-center gap-1.5">
						<span>Другие статусы и классификации</span>
						<span className="text-[10px] text-[var(--muted)] font-normal">
							(Периодонтит, Имплант, Корень, Блэк)
						</span>
					</span>
					{isSecondaryOpen ? (
						<ChevronUp size={16} />
					) : (
						<ChevronDown size={16} />
					)}
				</button>

				{isSecondaryOpen && (
					<div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)]">
						{/* Secondary Statuses Grid */}
						<div className="grid grid-cols-2 gap-2 w-full">
							{secondaryItems.map((item) => {
								const isCurrent = currentState === item.state;
								return (
									<button
										key={item.id}
										type="button"
										onClick={() => {
											if (item.state) {
												handleSelectStateWithHaptic(
													item.state,
													selectedSurfaces.length > 0
														? selectedSurfaces
														: surfaces,
												);
											}
										}}
										className={`radial-item-btn min-h-[46px] min-w-[48px] px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between gap-1.5 transition-all cursor-pointer border ${
											isCurrent
												? "bg-[var(--paper)] border-teal-500 font-black ring-1 ring-teal-500/40 text-[var(--ink)]"
												: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/40 text-[var(--ink)]"
										}`}
										title={item.label}
										data-testid={`radial-btn-${item.id}`}
									>
										<div className="flex items-center gap-1.5 min-w-0">
											<span className="shrink-0">{item.icon}</span>
											<span className="text-xs truncate font-bold">
												{item.shortLabel}
											</span>
										</div>
										<span className="text-[9px] px-1 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] font-mono font-bold">
											{item.hotkey}
										</span>
									</button>
								);
							})}
						</div>

						{/* Black Classes I - VI (>= 44px Touch Targets) */}
						<div className="flex items-center justify-between pt-1 border-t border-[var(--line-subtle)]">
							<span className="text-[11px] uppercase font-black text-amber-700 dark:text-amber-400 px-0.5 shrink-0">
								Классы по Блэку:
							</span>
						</div>
						<div className="grid grid-cols-4 gap-1.5 w-full">
							{[
								{
									label: "I: O",
									surfs: ["O"],
									title: "I класс: Окклюзионные фиссуры (O)",
								},
								{
									label: "II: MOD",
									surfs: ["M", "O", "D"],
									title: "II класс: Медиально-окклюзионно-дистальная (MOD)",
								},
								{
									label: "II: MO",
									surfs: ["M", "O"],
									title: "II класс: Медиально-окклюзионная (MO)",
								},
								{
									label: "II: OD",
									surfs: ["O", "D"],
									title: "II класс: Окклюзионно-дистальная (OD)",
								},
								{
									label: "III: M/D",
									surfs: ["M", "D"],
									title: "III класс: Апроксимальные поверхности резцов (M/D)",
								},
								{
									label: "IV: Реж",
									surfs: ["M", "O", "D"],
									title: "IV класс: Режущий край (MOD)",
								},
								{
									label: "V: Приш",
									surfs: ["C"],
									title: "V класс: Пришеечная полость (C)",
								},
								{
									label: "VI: Бугры",
									surfs: ["O"],
									title: "VI класс: Бугры моляров (O)",
								},
							].map((blk) => (
								<button
									key={blk.label}
									type="button"
									onClick={() => {
										onSelectState("Caries", blk.surfs);
										onClose();
									}}
									className="min-h-[44px] px-1 py-1 rounded-lg text-xs font-black bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 transition-all cursor-pointer border border-amber-500/25 touch-manipulation text-center"
									title={blk.title}
								>
									[{blk.label}]
								</button>
							))}
						</div>

						{/* Non-carious Defects and Restorations */}
						<div className="flex items-center justify-between pt-1 border-t border-[var(--line-subtle)]">
							<span className="text-[11px] uppercase font-black text-indigo-700 dark:text-indigo-400 px-0.5 shrink-0">
								Дефекты и некариозные:
							</span>
						</div>
						<div className="grid grid-cols-3 gap-1.5 w-full">
							<button
								type="button"
								onClick={() => {
									onSelectState("Caries", ["C"], "wedge_defect");
									onClose();
								}}
								className="min-h-[44px] px-2 py-1 rounded-lg text-[11px] font-black bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-500/20 transition-all cursor-pointer border border-indigo-500/25 touch-manipulation text-center"
								title="Кд: Клиновидный дефект (K03.1)"
								data-testid="radial-defect-wedge-btn"
							>
								[Кд: Клин]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState(
										"Filled",
										selectedSurfaces.length > 0 ? selectedSurfaces : surfaces,
										"defective_filling",
									);
									onClose();
								}}
								className="min-h-[44px] px-2 py-1 rounded-lg text-[11px] font-black bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 transition-all cursor-pointer border border-amber-500/25 touch-manipulation text-center"
								title="Дп: Дефект пломбы (нарушение прилегания/скол)"
								data-testid="radial-defect-filling-btn"
							>
								[Дп: Пломба]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Crown", undefined, "defective_crown");
									onClose();
								}}
								className="min-h-[44px] px-2 py-1 rounded-lg text-[11px] font-black bg-rose-500/10 text-rose-900 dark:text-rose-200 hover:bg-rose-500/20 transition-all cursor-pointer border border-rose-500/25 touch-manipulation text-center"
								title="Дк: Дефект коронки (расцементировка/скол)"
								data-testid="radial-defect-crown-btn"
							>
								[Дк: Коронка]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState(
										"Caries",
										selectedSurfaces.length > 0 ? selectedSurfaces : ["V"],
										"hypoplasia_fluorosis",
									);
									onClose();
								}}
								className="min-h-[44px] px-2 py-1 rounded-lg text-[11px] font-black bg-sky-500/10 text-sky-900 dark:text-sky-200 hover:bg-sky-500/20 transition-all cursor-pointer border border-sky-500/25 touch-manipulation text-center"
								title="Г / Фл: Гипоплазия эмали (K00.4) или Флюороз"
								data-testid="radial-defect-hypoplasia-btn"
							>
								[Г/Фл: Гипопл]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Crown", ["V"], "veneer_inlay");
									onClose();
								}}
								className="min-h-[44px] px-2 py-1 rounded-lg text-[11px] font-black bg-teal-500/10 text-teal-900 dark:text-teal-200 hover:bg-teal-500/20 transition-all cursor-pointer border border-teal-500/25 touch-manipulation text-center"
								title="В / ВК: Винир или культевая/керамическая вкладка"
								data-testid="radial-defect-veneer-btn"
							>
								[В: Винир]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Filled", ["O"], "fissure_sealant");
									onClose();
								}}
								className="min-h-[44px] px-2 py-1 rounded-lg text-[11px] font-black bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/20 transition-all cursor-pointer border border-emerald-500/25 touch-manipulation text-center"
								title="Гф: Герметизация фиссур"
								data-testid="radial-defect-sealant-btn"
							>
								[Гф: Герметиз]
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Resorption / Exfoliation Scale for Primary Teeth */}
			{isPrimary && (
				<div className="flex flex-col gap-1.5 p-2.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<div className="flex items-center justify-between">
						<span className="text-[11px] uppercase font-black text-purple-700 dark:text-purple-400 px-1 shrink-0">
							Резорбция корней:
						</span>
						<span className="text-[11px] text-[var(--muted)]">0–100%</span>
					</div>
					<div className="grid grid-cols-4 gap-1.5 w-full">
						<button
							type="button"
							onClick={() => {
								onSelectState("Healthy", undefined, "resorption_1");
								onClose();
							}}
							className="min-h-[44px] px-1 py-1 rounded-xl text-xs font-black bg-purple-500/10 text-purple-900 dark:text-purple-200 hover:bg-purple-500/20 transition-all cursor-pointer border border-purple-500/25 touch-manipulation text-center"
							title="Резорбция I степени (25%)"
						>
							[Рез I]
						</button>
						<button
							type="button"
							onClick={() => {
								onSelectState("Healthy", undefined, "resorption_2");
								onClose();
							}}
							className="min-h-[44px] px-1 py-1 rounded-xl text-xs font-black bg-purple-500/10 text-purple-900 dark:text-purple-200 hover:bg-purple-500/20 transition-all cursor-pointer border border-purple-500/25 touch-manipulation text-center"
							title="Резорбция II степени (50%)"
						>
							[Рез II]
						</button>
						<button
							type="button"
							onClick={() => {
								onSelectState("Healthy", undefined, "resorption_3");
								onClose();
							}}
							className="min-h-[44px] px-1 py-1 rounded-xl text-xs font-black bg-purple-500/10 text-purple-900 dark:text-purple-200 hover:bg-purple-500/20 transition-all cursor-pointer border border-purple-500/25 touch-manipulation text-center"
							title="Резорбция III степени (75%)"
						>
							[Рез III]
						</button>
						<button
							type="button"
							onClick={() => {
								onSelectState("Missing", undefined, "exfoliation");
								onClose();
							}}
							className="min-h-[44px] px-1 py-1 rounded-xl text-xs font-black bg-rose-500/10 text-rose-900 dark:text-rose-200 hover:bg-rose-500/20 transition-all cursor-pointer border border-rose-500/25 touch-manipulation text-center"
							title="Смена зуба / Эксфолиация (100%)"
						>
							[Смена]
						</button>
					</div>
				</div>
			)}

			{/* IROPZ warning */}
			{(Boolean(iropz && iropz > 0.6) ||
				currentState === "Pulpitis" ||
				currentState === "Periodontitis") && (
				<div className="flex items-center gap-2 bg-amber-500/15 text-amber-900 dark:text-amber-200 p-2.5 rounded-xl border border-amber-500/30 text-xs font-bold">
					<AlertTriangle
						size={16}
						className="text-amber-600 dark:text-amber-400 shrink-0"
					/>
					<span>
						ИРОПЗ &gt; 0.6: Рекомендовано ортопедическое восстановление (коронка
						Z51.8)
					</span>
				</div>
			)}

			{/* Fast Chairside Actions Footer (Natural Thumb Zone, >= 48px height) */}
			{Boolean(onOpenTherapy || onOpenEndo || onAddToInvoice || onOpenRvg) && (
				<div className="flex items-center gap-2 pt-1 border-t border-[var(--line-subtle)]">
					{onOpenRvg && (
						<button
							type="button"
							onClick={() => {
								onOpenRvg();
								onClose();
							}}
							className="flex-1 min-h-[48px] min-w-[48px] py-2.5 px-3 rounded-xl text-xs font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
							title={
								toothScanThumbnail
									? "Посмотреть снимок RVG"
									: "Захват снимка визиографа (RVG)"
							}
						>
							{toothScanThumbnail ? (
								<span className="flex items-center gap-1.5 font-bold">
									<span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
									<span>Снимок RVG</span>
								</span>
							) : (
								<span className="flex items-center gap-1.5 font-semibold">
									<Camera size={14} className="shrink-0" />
									<span>Снимок RVG</span>
								</span>
							)}
						</button>
					)}
					{onOpenTherapy && (
						<button
							type="button"
							onClick={() => {
								onOpenTherapy();
								onClose();
							}}
							className="flex-1 min-h-[48px] min-w-[48px] py-2.5 px-3 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
						>
							<DentalHandpiece size={15} />
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
							className="flex-1 min-h-[48px] min-w-[48px] py-2.5 px-3 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
						>
							<Coins size={15} />
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
							className="flex-1 min-h-[48px] min-w-[48px] py-2.5 px-3 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
						>
							<EndoFileCanal size={15} />
							<span className="whitespace-nowrap">Каналы</span>
						</button>
					)}
				</div>
			)}
		</div>
	);
};
