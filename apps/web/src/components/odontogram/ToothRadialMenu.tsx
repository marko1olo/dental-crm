import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertTriangle,
	Sparkles,
	Trash2,
} from "lucide-react";
import {
	ToothMolar,
	ToothCaries,
	ToothPulpitis,
	EndoFileCanal,
	DentalCrown,
	DentalImplant,
	ToothExtractForceps,
	ToothDeciduous,
} from "../icons/DentalIcons";
import { getToothStateFromHotkey } from "./ClassicGostOdontogram";
import { type ToothState, TOOTH_STATE_LABELS } from "./ToothChart";
import { getToothFolkAndAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { isPrimaryTooth } from "@dental/shared";
import { triggerHaptic } from "../../native/mobileBridge";
import { ToothRadialMobileSheet } from "./ToothRadialMobileSheet";
import { ToothRadialWingMenu } from "./ToothRadialWingMenu";
import { ToothRadialCircularMenu } from "./ToothRadialCircularMenu";

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
					shortLabel: "Периодонт (Pt)",
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
				<ToothRadialMobileSheet
					menuRef={menuRef}
					dragOffsetY={dragOffsetY}
					isDraggingSheet={isDraggingSheet}
					handleSheetTouchStart={handleSheetTouchStart}
					handleSheetTouchMove={handleSheetTouchMove}
					handleSheetTouchEnd={handleSheetTouchEnd}
					toothNumber={toothNumber}
					currentState={currentState}
					items={items}
					selectedSurfaces={selectedSurfaces}
					surfaces={surfaces}
					setSelectedSurfaces={setSelectedSurfaces}
					onSelectSurfaces={onSelectSurfaces}
					toggleSurface={toggleSurface}
					handleSelectStateWithHaptic={handleSelectStateWithHaptic}
					onSelectState={onSelectState}
					iropz={iropz}
					onOpenTherapy={onOpenTherapy}
					onAddToInvoice={onAddToInvoice}
					onOpenEndo={onOpenEndo}
					onClose={onClose}
				/>
			) : (
				/* Desktop Radial Menu: Smart Edge Clamping & Arc Flipping */
				layoutMode === "circular" ? (
					<ToothRadialCircularMenu
						menuRef={menuRef}
						toothNumber={toothNumber}
						centerX={centerX}
						centerY={centerY}
						radius={radius}
						items={items}
						currentState={currentState}
						selectedSurfaces={selectedSurfaces}
						surfaces={surfaces}
						setSelectedSurfaces={setSelectedSurfaces}
						onSelectSurfaces={onSelectSurfaces}
						onSelectState={onSelectState}
						iropz={iropz}
						onOpenTherapy={onOpenTherapy}
						onAddToInvoice={onAddToInvoice}
						onOpenEndo={onOpenEndo}
						onClose={onClose}
					/>
			) : (
				<ToothRadialWingMenu
					menuRef={menuRef}
					toothNumber={toothNumber}
					layoutMode={layoutMode as "left-wing" | "right-wing"}
					subAnchorX={subAnchorX}
					hubX={hubX}
					hubY={hubY}
					vh={vh}
					currentState={currentState}
					wingCol1Items={wingCol1Items}
					wingCol2Items={wingCol2Items}
					selectedSurfaces={selectedSurfaces}
					surfaces={surfaces}
					setSelectedSurfaces={setSelectedSurfaces}
					onSelectSurfaces={onSelectSurfaces}
					onSelectState={onSelectState}
					onOpenTherapy={onOpenTherapy}
					onAddToInvoice={onAddToInvoice}
					onOpenEndo={onOpenEndo}
					onClose={onClose}
				/>
			))}
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(content, document.body);
	}
	return content;
};

export { ToothRadialMenu as RadialToothMenu };
