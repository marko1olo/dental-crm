import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertTriangle,
	Coins,
	MoreHorizontal,
	Sparkles,
	Trash2,
	Wrench,
	X,
} from "lucide-react";
import {
	ToothMolar,
	ToothCaries,
	ToothPulpitis,
	EndoFileCanal,
	DentalCrown,
	DentalImplant,
	ToothExtractForceps,
	DentalHandpiece,
	ToothDeciduous,
} from "../icons/DentalIcons";
import { getToothStateFromHotkey } from "./ClassicGostOdontogram";
import { type ToothState, TOOTH_STATE_LABELS } from "./ToothChart";
import { getToothFolkAndAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { isPrimaryTooth } from "@dental/shared";
import { triggerHaptic } from "../../native/mobileBridge";
import { SurfaceSelector } from "./chart/SurfaceSelector";

export interface RadialMenuItem {
	id: string;
	label: string;
	shortLabel: string;
	state?: ToothState | undefined;
	icon: React.ReactNode;
	color: string;
	bgGradient: string;
	hotkey: string;
	action?: () => void;
}

export interface ToothRadialMenuProps {
	toothNumber: number;
	anchorRect: { x: number; y: number; width: number; height: number };
	currentState?: ToothState | undefined;
	iropz?: number | undefined;
	surfaces?: readonly string[] | undefined;
	onSelectState: (state: ToothState, surfaces?: readonly string[], subType?: string) => void;
	onSelectSurfaces?: (surfaces: readonly string[]) => void;
	onOpenEndo?: () => void;
	onOpenTherapy?: () => void;
	onAddToInvoice?: () => void;
	onClose: () => void;
}

export const ToothRadialMenu: React.FC<ToothRadialMenuProps> = ({
	toothNumber,
	anchorRect,
	currentState = "Healthy",
	iropz,
	surfaces,
	onSelectState,
	onSelectSurfaces,
	onOpenEndo,
	onOpenTherapy,
	onAddToInvoice,
	onClose,
}) => {
	const [isTouchOrMobile, setIsTouchOrMobile] = useState<boolean>(() => {
		if (typeof window !== "undefined") {
			return (
				window.innerWidth <= 768 ||
				(window.innerWidth <= 1024 &&
					("ontouchstart" in window ||
						(typeof navigator !== "undefined" && Boolean(navigator.maxTouchPoints) && navigator.maxTouchPoints > 0)))
			);
		}
		return false;
	});

	useEffect(() => {
		const handleResize = () => {
			setIsTouchOrMobile(
				window.innerWidth <= 768 ||
				(window.innerWidth <= 1024 &&
					("ontouchstart" in window ||
						(typeof navigator !== "undefined" && Boolean(navigator.maxTouchPoints) && navigator.maxTouchPoints > 0)))
			);
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const menuRef = useRef<HTMLDivElement>(null);
	// Touch swipe-to-dismiss gesture state for bottom sheet drawer
	const [dragOffsetY, setDragOffsetY] = useState(0);
	const [isDraggingSheet, setIsDraggingSheet] = useState(false);
	const touchStartYRef = useRef(0);
	const isAtTopRef = useRef(true);

	const handleSheetTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
		const touch = e.touches[0];
		if (!touch) return;
		touchStartYRef.current = touch.clientY;
		const el = menuRef.current;
		isAtTopRef.current = el ? el.scrollTop <= 0 : true;
	};

	const handleSheetTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
		const touch = e.touches[0];
		if (!touch) return;
		const deltaY = touch.clientY - touchStartYRef.current;
		if (deltaY > 0 && isAtTopRef.current) {
			setDragOffsetY(deltaY);
			setIsDraggingSheet(true);
		}
	};

	const handleSheetTouchEnd = () => {
		if (dragOffsetY > 65) {
			onClose();
		} else {
			setDragOffsetY(0);
			setIsDraggingSheet(false);
		}
	};

	const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>(() =>
		surfaces ? [...surfaces] : [],
	);

	useEffect(() => {
		if (surfaces) {
			setSelectedSurfaces([...surfaces]);
		}
	}, [surfaces]);

	const toggleSurface = (surf: string) => {
		setSelectedSurfaces((prev) => {
			const next = prev.includes(surf)
				? prev.filter((s) => s !== surf)
				: [...prev, surf];
			onSelectSurfaces?.(next);
			return next;
		});
	};

	const handleSelectStateWithHaptic = (
		state: ToothState,
		surfs?: readonly string[],
		subType?: string,
	) => {
		triggerHaptic("success");
		onSelectState(state, surfs, subType);
		onClose();
	};

	const isPrimary = isPrimaryTooth(toothNumber);

	const items: RadialMenuItem[] = isPrimary
		? [
				{
					id: "caries",
					label: "Кариес молочного зуба (C)",
					shortLabel: "Кариес (C)",
					state: "Caries",
					icon: <ToothCaries size={16} className="text-amber-100" />,
					color: "from-orange-500 to-amber-700",
					bgGradient: "linear-gradient(135deg, #f97316 0%, #c2410c 100%)",
					hotkey: "К",
				},
				{
					id: "pulpitis",
					label: "Пульпотомия / Пульпит (P)",
					shortLabel: "Пульпит (P)",
					state: "Pulpitis",
					icon: <ToothPulpitis size={16} className="text-rose-100" />,
					color: "from-rose-500 to-red-700",
					bgGradient: "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)",
					hotkey: "Ф",
				},
				{
					id: "periodontitis",
					label: "Периодонтит (Pt)",
					shortLabel: "Периодонтит (Pt)",
					state: "Periodontitis",
					icon: <EndoFileCanal size={16} className="text-orange-100" />,
					color: "from-amber-600 to-orange-700",
					bgGradient: "linear-gradient(135deg, #ea580c 0%, #9a3412 100%)",
					hotkey: "Е",
				},
				{
					id: "filled",
					label: "Пломба (F)",
					shortLabel: "Пломба (F)",
					state: "Filled",
					icon: <Sparkles size={16} className="text-sky-100" />,
					color: "from-sky-500 to-blue-700",
					bgGradient: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
					hotkey: "П",
				},
				{
					id: "crown",
					label: "Коронка NuSmile / 3M (Cr)",
					shortLabel: "Коронка (Cr)",
					state: "Crown",
					icon: <DentalCrown size={16} className="text-emerald-100" />,
					color: "from-emerald-500 to-teal-700",
					bgGradient: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
					hotkey: "Ц",
				},
				{
					id: "implant",
					label: "Имплант / Герметизация (Imp)",
					shortLabel: "Имплант (Imp)",
					state: "Implant",
					icon: <DentalImplant size={16} className="text-indigo-100" />,
					color: "from-indigo-500 to-indigo-700",
					bgGradient: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
					hotkey: "И",
				},
				{
					id: "missing",
					label: "Отсутствует / Смена (X)",
					shortLabel: "Отсутствует (X)",
					state: "Missing",
					icon: <Trash2 size={16} className="text-rose-300" />,
					color: "from-slate-600 to-slate-800",
					bgGradient: "linear-gradient(135deg, #475569 0%, #334155 100%)",
					hotkey: "0",
				},
				{
					id: "healthy",
					label: "Здоров (0)",
					shortLabel: "Здоров (0)",
					state: "Healthy",
					icon: <ToothDeciduous size={16} className="text-emerald-100" />,
					color: "from-emerald-600 to-teal-800",
					bgGradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
					hotkey: "З",
				},
			]
		: [
				{
					id: "caries",
					label: "Кариес (C)",
					shortLabel: "Кариес (C)",
					state: "Caries",
					icon: <ToothCaries size={16} className="text-amber-100" />,
					color: "from-orange-500 to-amber-700",
					bgGradient: "linear-gradient(135deg, #f97316 0%, #c2410c 100%)",
					hotkey: "К",
				},
				{
					id: "pulpitis",
					label: "Пульпит (P)",
					shortLabel: "Пульпит (P)",
					state: "Pulpitis",
					icon: <ToothPulpitis size={16} className="text-rose-100" />,
					color: "from-rose-500 to-red-700",
					bgGradient: "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)",
					hotkey: "Ф",
				},
				{
					id: "periodontitis",
					label: "Периодонтит (Pt)",
					shortLabel: "Периодонтит (Pt)",
					state: "Periodontitis",
					icon: <EndoFileCanal size={16} className="text-orange-100" />,
					color: "from-amber-600 to-orange-700",
					bgGradient: "linear-gradient(135deg, #ea580c 0%, #9a3412 100%)",
					hotkey: "Е",
				},
				{
					id: "filled",
					label: "Пломба (F)",
					shortLabel: "Пломба (F)",
					state: "Filled",
					icon: <Sparkles size={16} className="text-sky-100" />,
					color: "from-sky-500 to-blue-700",
					bgGradient: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
					hotkey: "П",
				},
				{
					id: "crown",
					label: "Коронка (Cr)",
					shortLabel: "Коронка (Cr)",
					state: "Crown",
					icon: <DentalCrown size={16} className="text-emerald-100" />,
					color: "from-emerald-500 to-teal-700",
					bgGradient: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
					hotkey: "Ц",
				},
				{
					id: "implant",
					label: "Имплант (Imp)",
					shortLabel: "Имплант (Imp)",
					state: "Implant",
					icon: <DentalImplant size={16} className="text-indigo-100" />,
					color: "from-indigo-500 to-indigo-700",
					bgGradient: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
					hotkey: "И",
				},
				{
					id: "missing",
					label: "Отсутствует (X)",
					shortLabel: "Отсутствует (X)",
					state: "Missing",
					icon: <Trash2 size={16} className="text-rose-300" />,
					color: "from-slate-600 to-slate-800",
					bgGradient: "linear-gradient(135deg, #475569 0%, #334155 100%)",
					hotkey: "0",
				},
				{
					id: "retained",
					label: "Ретинированный (Р)",
					shortLabel: "Ретинир. (Р)",
					state: "Retained",
					icon: <AlertTriangle size={16} className="text-purple-100" />,
					color: "from-purple-500 to-purple-800",
					bgGradient: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
					hotkey: "Р",
				},
				{
					id: "root",
					label: "Разрушенный корень (R)",
					shortLabel: "Корень (R)",
					state: "Root",
					icon: <ToothExtractForceps size={16} className="text-rose-100" />,
					color: "from-rose-800 to-rose-950",
					bgGradient: "linear-gradient(135deg, #be123c 0%, #881337 100%)",
					hotkey: "R",
				},
				{
					id: "healthy",
					label: "Здоров (0)",
					shortLabel: "Здоров (0)",
					state: "Healthy",
					icon: <ToothMolar size={16} className="text-emerald-100" />,
					color: "from-emerald-600 to-teal-800",
					bgGradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
					hotkey: "З",
				},
			];

	// Close on Escape or click outside or hotkey press
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
				return;
			}
			const parsedState = getToothStateFromHotkey(e.key);
			if (parsedState) {
				e.preventDefault();
				handleSelectStateWithHaptic(parsedState, surfaces);
				return;
			}
			const keyUpper = e.key.toUpperCase();
			const matched = items.find((it) => it.hotkey === keyUpper);
			if (matched && matched.state) {
				e.preventDefault();
				handleSelectStateWithHaptic(matched.state, surfaces);
			}
		};

		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("mousedown", handleClickOutside);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("mousedown", handleClickOutside);
		};
	}, [onClose, onSelectState, items, surfaces]);

	const rawCenterX = anchorRect.x + anchorRect.width / 2;
	const rawCenterY = anchorRect.y + anchorRect.height / 2;
	const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
	const vh = typeof window !== "undefined" ? window.innerHeight : 800;

	// Smart Edge Clamping & Arc Flipping geometry
	const EDGE_THRESHOLD_X = 380;
	const isNearLeftEdge = rawCenterX < EDGE_THRESHOLD_X;
	const isNearRightEdge = rawCenterX > vw - EDGE_THRESHOLD_X;
	const layoutMode: "circular" | "left-wing" | "right-wing" = isNearRightEdge
		? "left-wing"
		: isNearLeftEdge
			? "right-wing"
			: "circular";

	// Hub pinned directly to tooth center with safety margin against screen borders
	const hubX = Math.max(50, Math.min(vw - 50, rawCenterX));
	const hubY = Math.max(190, Math.min(vh - 210, rawCenterY));
	const subAnchorX = layoutMode === "right-wing"
		? Math.max(225, Math.min(vw - 225, hubX + 215))
		: Math.max(225, Math.min(vw - 225, hubX - 215));

	// Clamp menu center to prevent edge clipping while staying true to the tooth position
	const radius = 185;
	const minMarginX = Math.min(300, vw / 2);
	const minMarginTop = 250;
	const minMarginBottom = 250;
	const centerX = Math.max(minMarginX, Math.min(rawCenterX, vw - minMarginX));
	const centerY = Math.max(minMarginTop, Math.min(rawCenterY, vh - minMarginBottom));

	// Grouping items for wing fan columns (Hot Path in Col 1, Specialized in Col 2)
	const wingCol1Items = useMemo(() => {
		const hotPathStates: string[] = ["Caries", "Pulpitis", "Filled", "Crown", "Healthy"];
		const result: typeof items = [];
		for (const st of hotPathStates) {
			const found = items.find((it) => it.state === st);
			if (found) result.push(found);
		}
		for (const it of items) {
			if (!result.includes(it) && result.length < 5) {
				result.push(it);
			}
		}
		return result;
	}, [items]);

	const wingCol2Items = useMemo(() => {
		const specializedStates: string[] = ["Periodontitis", "Implant", "Missing", "Retained", "Root"];
		const result: typeof items = [];
		for (const st of specializedStates) {
			const found = items.find((it) => it.state === st);
			if (found) result.push(found);
		}
		for (const it of items) {
			if (!wingCol1Items.includes(it) && !result.includes(it)) {
				result.push(it);
			}
		}
		return result;
	}, [items, wingCol1Items]);

	const content = (
		<div
			className={`radial-tooth-menu-overlay fixed inset-0 z-[9999] pointer-events-auto animate-fadeIn ${
				isTouchOrMobile ? "flex flex-col justify-end p-0 sm:p-4" : ""
			}`}
			style={{
				backgroundColor: "rgba(15, 23, 42, 0.55)",
			}}
			data-testid="tooth-radial-menu-overlay"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			{isTouchOrMobile ? (
				/* Mobile / Tablet Glove-Friendly Bottom Sheet Drawer Layout (<= 1024px & touch devices) */
				<div
					ref={menuRef}
					onTouchStart={handleSheetTouchStart}
					onTouchMove={handleSheetTouchMove}
					onTouchEnd={handleSheetTouchEnd}
					style={{
						transform: dragOffsetY > 0 ? `translateY(${dragOffsetY}px)` : undefined,
						transition: isDraggingSheet ? "none" : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
						touchAction: "pan-y",
					}}
					className="radial-mobile-sheet w-full max-w-xl mx-auto bg-[var(--odontogram-paper)] border-t sm:border border-[var(--odontogram-border)] rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto animate-slideUp select-none"
					role="dialog"
					aria-label={`Меню статуса зуба ${toothNumber}`}
					onClick={(e) => e.stopPropagation()}
				>
					{/* Sheet Drag Handle - Enhanced touch grab zone */}
					<div
						className="w-16 h-2 rounded-full bg-[var(--odontogram-border-strong)] mx-auto opacity-70 mb-1 cursor-grab active:cursor-grabbing hover:opacity-100 transition-opacity"
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
									className={`radial-item-btn min-h-[52px] min-w-[48px] px-4 py-3 rounded-2xl font-bold text-white flex items-center justify-between gap-2.5 shadow-sm transition-all active:scale-95 cursor-pointer touch-manipulation border border-white/25 ${
										isCurrent
											? "ring-2 ring-white scale-[1.02] font-black"
											: "opacity-90 hover:opacity-100"
									}`}
									title={item.label}
									data-testid={`radial-btn-${item.id}`}
								>
									<div className="flex items-center gap-2.5 min-w-0">
										<span className="shrink-0">{item.icon}</span>
										<span className="text-sm sm:text-base font-black truncate">{item.shortLabel}</span>
									</div>
									<span className="text-xs px-2 py-0.5 rounded-md bg-black/35 text-white font-mono font-black shrink-0">
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
											Поверхности в 1 клик:
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
			) : (
				/* Desktop Radial Menu: Smart Edge Clamping & Arc Flipping */
				layoutMode === "circular" ? (
					/* Desktop Clamped Circular Radial Menu */
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

					{/* Top Quick Bar: Pediatric Resorption (0-100%) for primary teeth OR 6-Surfaces & Black I-VI for adult teeth */}
					<div
						className="radial-top-bar absolute flex flex-col items-center gap-1.5 pointer-events-auto px-3.5 py-1.5 rounded-2xl z-20"
						style={{
							left: "50%",
							top: `calc(50% - ${radius + 70}px)`,
							transform: "translate(-50%, -100%)",
						}}
					>
						{isPrimaryTooth(toothNumber) ? (
							<div className="flex items-center gap-1.5">
								<span className="text-xs uppercase font-black text-purple-600 dark:text-purple-300 px-1">Резорбция:</span>
								<button
									type="button"
									onClick={() => {
										onSelectState("Healthy", undefined, "resorption_1");
										onClose();
									}}
									className="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 touch-manipulation"
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
									className="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 touch-manipulation"
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
									className="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 touch-manipulation"
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
									className="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500/15 text-rose-800 dark:text-rose-200 hover:bg-rose-500/30 transition-all cursor-pointer border border-rose-500/30 touch-manipulation"
									title="Физиологическая смена / Эксфолиация (100%)"
								>
									[Смена 100%]
								</button>
							</div>
						) : (
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
									{/* Quick Surface Combo Chips (1 tap): [MOD], [MO], [OD], [O], [V], [L/P], [B] */}
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
												data-testid={`radial-desktop-quick-surf-${chip.label.replace("/", "-")}`}
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
										size={85}
									/>
								</div>

								{/* 6-Surface interactive toggle chips */}
								<div className="flex items-center gap-1.5 pt-1 border-t border-[var(--odontogram-border-subtle)] flex-wrap">
									<span className="text-xs uppercase font-black text-teal-700 dark:text-teal-400 px-1">Отдельно:</span>
									{(["O", "V", "L", "M", "D", "C"] as const).map((surf) => {
										const isActive = selectedSurfaces.includes(surf);
										return (
											<button
												key={surf}
												type="button"
												onClick={() => toggleSurface(surf)}
												className={`min-h-[44px] sm:min-h-[32px] min-w-[44px] px-2.5 py-1 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer select-none touch-manipulation flex items-center justify-center ${
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

								{/* Black Classes I-VI quick macros */}
								<div className="flex items-center gap-1.5 pt-1 border-t border-[var(--odontogram-border-subtle)] flex-wrap">
									<span className="text-xs uppercase font-black text-amber-600 dark:text-amber-400 px-1">Блэк:</span>
									<button
										type="button"
										onClick={() => {
											onSelectState("Caries", ["O"]);
											onClose();
										}}
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation flex items-center justify-center"
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
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation flex items-center justify-center"
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
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation flex items-center justify-center"
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
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation flex items-center justify-center"
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
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation flex items-center justify-center"
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
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation flex items-center justify-center"
										title="IV класс: Апроксимальные поверхности резцов/клыков с поражением режущего края"
									>
										[IV: Реж]
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Caries", ["C"]);
											onClose();
										}}
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation flex items-center justify-center"
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
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation flex items-center justify-center"
										title="VI класс: Бугры моляров/премоляров или режущий край"
									>
										[VI: Бугры]
									</button>
								</div>

								{/* Secondary Defects (Кд, Дп, Дк, Г/Фл, В, Гф) */}
								<div className="flex items-center gap-1.5 pt-1 border-t border-[var(--odontogram-border-subtle)] flex-wrap">
									<span className="text-xs uppercase font-black text-indigo-600 dark:text-indigo-400 px-1">Дефекты:</span>
									<button
										type="button"
										onClick={() => {
											onSelectState("Caries", ["C"], "wedge_defect");
											onClose();
										}}
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-500/30 transition-all cursor-pointer border border-indigo-500/30 touch-manipulation flex items-center justify-center"
										title="Кд: Клиновидный дефект пришеечной области (K03.1)"
										data-testid="radial-desktop-defect-wedge-btn"
									>
										[Кд]
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Filled", selectedSurfaces.length > 0 ? selectedSurfaces : surfaces, "defective_filling");
											onClose();
										}}
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation flex items-center justify-center"
										title="Дп: Дефект пломбы (нарушение краевого прилегания, скол, рецидив)"
										data-testid="radial-desktop-defect-filling-btn"
									>
										[Дп]
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Crown", undefined, "defective_crown");
											onClose();
										}}
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500/15 text-rose-800 dark:text-rose-200 hover:bg-rose-500/30 transition-all cursor-pointer border border-rose-500/30 touch-manipulation flex items-center justify-center"
										title="Дк: Дефект коронки (расцементировка, скол керамики, зазор)"
										data-testid="radial-desktop-defect-crown-btn"
									>
										[Дк]
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Caries", selectedSurfaces.length > 0 ? selectedSurfaces : ["V"], "hypoplasia_fluorosis");
											onClose();
										}}
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-sky-500/15 text-sky-800 dark:text-sky-200 hover:bg-sky-500/30 transition-all cursor-pointer border border-sky-500/30 touch-manipulation flex items-center justify-center"
										title="Г / Фл: Гипоплазия эмали (K00.4) или Флюороз (K00.3)"
										data-testid="radial-desktop-defect-hypoplasia-btn"
									>
										[Г/Фл]
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Crown", ["V"], "veneer_inlay");
											onClose();
										}}
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-teal-500/15 text-teal-800 dark:text-teal-200 hover:bg-teal-500/30 transition-all cursor-pointer border border-teal-500/30 touch-manipulation flex items-center justify-center"
										title="В / ВК: Винир или вкладка"
										data-testid="radial-desktop-defect-veneer-btn"
									>
										[В/ВК]
									</button>
									<button
										type="button"
										onClick={() => {
											onSelectState("Filled", ["O"], "fissure_sealant");
											onClose();
										}}
										className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/30 transition-all cursor-pointer border border-emerald-500/30 touch-manipulation flex items-center justify-center"
										title="Гф: Герметизация фиссур"
										data-testid="radial-desktop-defect-sealant-btn"
									>
										[Гф]
									</button>
								</div>
								</div>
							</details>
						)}
					</div>

					{/* IROPZ > 0.6 Smart Orthopedic Warning Banner */}
					{(Boolean(iropz && iropz > 0.6) || currentState === "Pulpitis" || currentState === "Periodontitis") && (
						<div
							className="absolute flex items-center gap-2 pointer-events-auto bg-amber-500/20 text-amber-900 dark:text-amber-200 px-3 py-1 rounded-full border border-amber-500/40 shadow-xl z-20 text-xs font-bold whitespace-nowrap"
							style={{
								left: "50%",
								top: `calc(50% + ${radius + 45}px)`,
								transform: "translate(-50%, 0)",
							}}
						>
							<AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
							<span>ИРОПЗ &gt; 0.6: Рекомендовано ортопедическое восстановление (коронка Z51.8)</span>
						</div>
					)}

					{/* Quick Action Footer Controls */}
					{Boolean(onOpenTherapy || onOpenEndo || onAddToInvoice) && (
						<div
							className="radial-bottom-actions absolute flex items-center gap-2 pointer-events-auto px-3.5 py-1.5 rounded-full z-20"
							style={{
								left: "50%",
								top: `calc(50% + ${radius + ((Boolean(iropz && iropz > 0.6) || currentState === "Pulpitis" || currentState === "Periodontitis") ? 85 : 45)}px)`,
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
			) : (
				/* Edge Wing Fan for Extreme Teeth (18, 28, 38, 48) */
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
			))}
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(content, document.body);
	}
	return content;
};

export { ToothRadialMenu as RadialToothMenu };
