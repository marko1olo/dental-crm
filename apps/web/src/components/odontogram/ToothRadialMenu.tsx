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
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getToothFolkAndAnatomicalNameRu } from "../../lib/clinicalProtocols";
import { isDemoPatientId, isDemoShowcaseMode } from "../../lib/demoMode";
import { triggerHaptic } from "../../native/mobileBridge";
import { usePatientStore } from "../../store/patientStore";
import { useVisitStore } from "../../store/visitStore";
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
import { getToothStateFromHotkey } from "./ClassicGostOdontogram";
import { SurfaceSelector } from "./chart/SurfaceSelector";
import { TOOTH_STATE_LABELS, type ToothState } from "./ToothChart";
import { ToothRadialMobileSheet } from "./ToothRadialMobileSheet";

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
	onSelectState: (
		state: ToothState,
		surfaces?: readonly string[],
		subType?: string,
	) => void;
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
						(typeof navigator !== "undefined" &&
							Boolean(navigator.maxTouchPoints) &&
							navigator.maxTouchPoints > 0)))
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
							(typeof navigator !== "undefined" &&
								Boolean(navigator.maxTouchPoints) &&
								navigator.maxTouchPoints > 0))),
			);
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const [toothScanThumbnail, setToothScanThumbnail] = useState<{
		id: string;
		url: string;
		title: string;
	} | null>(null);
	const [isMoreStatusesOpen, setIsMoreStatusesOpen] = useState(false);

	useEffect(() => {
		let active = true;
		const toothStr = String(toothNumber);

		if (isDemoShowcaseMode() || isDemoPatientId(selectedPatientId)) {
			setToothScanThumbnail({
				id: `demo-scan-${toothNumber}`,
				url: `/demo/rvg/tooth_${toothNumber}.jpg`,
				title: `Снимок RVG (Зуб #${toothNumber})`,
			});
			return;
		}

		if (!selectedPatientId) {
			setToothScanThumbnail(null);
			return;
		}

		fetch(`/api/xray/scans?patientId=${encodeURIComponent(selectedPatientId)}`)
			.then(async (res) => {
				if (!res.ok) return [];
				const data = await res.json();
				return Array.isArray(data) ? data : [];
			})
			.then((scans) => {
				if (!active) return;
				const matched = scans.find(
					(s: any) => String(s.toothCode ?? "").trim() === toothStr,
				);
				if (matched) {
					setToothScanThumbnail({
						id: matched.id,
						url:
							matched.imageDataUri ||
							matched.fileUrl ||
							`/api/xray/scans/${matched.id}/file`,
						title: matched.originalFilename || `RVG Зуб #${toothNumber}`,
					});
				} else {
					setToothScanThumbnail(null);
				}
			})
			.catch(() => {
				if (active) setToothScanThumbnail(null);
			});

		return () => {
			active = false;
		};
	}, [toothNumber, selectedPatientId]);

	const handleOpenRvg = () => {
		if (typeof window !== "undefined") {
			try {
				useVisitStore.getState().setActiveToothNumber(toothNumber);
			} catch {
				// outside visit store context
			}
			const detail = {
				toothFdiCode: String(toothNumber),
				toothNumber,
				tooth: String(toothNumber),
				patientId: selectedPatientId,
				scanId: toothScanThumbnail?.id,
			};
			window.dispatchEvent(
				new CustomEvent("dente-open-rvg-capture", { detail }),
			);
			window.dispatchEvent(
				new CustomEvent("dente-open-rvg-capture-modal", { detail }),
			);
			window.dispatchEvent(
				new CustomEvent("dente:open-direct-rvg", { detail }),
			);
		}
		onClose();
	};

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

	const surfacesKey = (surfaces ?? []).join(",");
	useEffect(() => {
		setSelectedSurfaces(surfaces ? [...surfaces] : []);
	}, [surfacesKey]);

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

	// The Core 6 Clinical Actions in 1-Click (Mandate 8e, Apple HIG)
	const primaryItems: RadialMenuItem[] = useMemo(() => {
		return [
			{
				id: "healthy",
				label: "Здоров / Интактный (0)",
				shortLabel: "Здоров",
				state: "Healthy",
				icon: isPrimary ? (
					<ToothDeciduous size={18} className="text-emerald-500 shrink-0" />
				) : (
					<ToothMolar size={18} className="text-emerald-500 shrink-0" />
				),
				color: "text-emerald-600 dark:text-emerald-400",
				bgGradient: "",
				hotkey: "0",
			},
			{
				id: "caries",
				label: "Кариес (C)",
				shortLabel: "Кариес",
				state: "Caries",
				icon: <ToothCaries size={18} className="text-amber-500 shrink-0" />,
				color: "text-amber-600 dark:text-amber-400",
				bgGradient: "",
				hotkey: "К",
			},
			{
				id: "filled",
				label: "Пломба / Реставрация (F)",
				shortLabel: "Пломба",
				state: "Filled",
				icon: <Sparkles size={18} className="text-sky-500 shrink-0" />,
				color: "text-sky-600 dark:text-sky-400",
				bgGradient: "",
				hotkey: "П",
			},
			{
				id: "pulpitis",
				label: "Пульпит / Эндодонтия (P)",
				shortLabel: "Пульпит",
				state: "Pulpitis",
				icon: <ToothPulpitis size={18} className="text-rose-500 shrink-0" />,
				color: "text-rose-600 dark:text-rose-400",
				bgGradient: "",
				hotkey: "Ф",
			},
			{
				id: "crown",
				label: "Коронка / Протезирование (Cr)",
				shortLabel: "Коронка",
				state: "Crown",
				icon: <DentalCrown size={18} className="text-teal-500 shrink-0" />,
				color: "text-teal-600 dark:text-teal-400",
				bgGradient: "",
				hotkey: "Ц",
			},
			{
				id: "missing",
				label: "Удален / Отсутствует (X)",
				shortLabel: "Удален",
				state: "Missing",
				icon: <Trash2 size={18} className="text-slate-400 shrink-0" />,
				color: "text-slate-600 dark:text-slate-300",
				bgGradient: "",
				hotkey: "X",
			},
		];
	}, [isPrimary]);

	// Secondary statuses for complete parity (Periodontitis, Implant, Root, Retained)
	const secondaryItems: RadialMenuItem[] = useMemo(() => {
		return [
			{
				id: "periodontitis",
				label: "Периодонтит (Pt)",
				shortLabel: "Периодонтит",
				state: "Periodontitis",
				icon: <EndoFileCanal size={16} className="text-orange-500 shrink-0" />,
				color: "text-orange-600 dark:text-orange-400",
				bgGradient: "",
				hotkey: "Е",
			},
			{
				id: "implant",
				label: "Имплант (Imp)",
				shortLabel: "Имплант",
				state: "Implant",
				icon: <DentalImplant size={16} className="text-indigo-500 shrink-0" />,
				color: "text-indigo-600 dark:text-indigo-400",
				bgGradient: "",
				hotkey: "И",
			},
			{
				id: "root",
				label: "Разрушенный корень (R)",
				shortLabel: "Корень",
				state: "Root",
				icon: (
					<ToothExtractForceps size={16} className="text-rose-600 shrink-0" />
				),
				color: "text-rose-700 dark:text-rose-300",
				bgGradient: "",
				hotkey: "R",
			},
			{
				id: "retained",
				label: "Ретинированный зуб (Р)",
				shortLabel: "Ретинирован",
				state: "Retained",
				icon: <AlertTriangle size={16} className="text-purple-500 shrink-0" />,
				color: "text-purple-600 dark:text-purple-400",
				bgGradient: "",
				hotkey: "Р",
			},
		];
	}, []);

	// Combined list for keyboard hotkeys and mobile compatibility
	const allItems: RadialMenuItem[] = useMemo(() => {
		return [...primaryItems, ...secondaryItems];
	}, [primaryItems, secondaryItems]);

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
				handleSelectStateWithHaptic(
					parsedState,
					selectedSurfaces.length > 0 ? selectedSurfaces : surfaces,
				);
				return;
			}
			const keyUpper = e.key.toUpperCase();
			const matched = allItems.find((it) => it.hotkey === keyUpper);
			if (matched && matched.state) {
				e.preventDefault();
				handleSelectStateWithHaptic(
					matched.state,
					selectedSurfaces.length > 0 ? selectedSurfaces : surfaces,
				);
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
	}, [onClose, onSelectState, allItems, surfaces, selectedSurfaces]);

	const rawCenterX = anchorRect.x + anchorRect.width / 2;
	const rawCenterY = anchorRect.y + anchorRect.height / 2;
	const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
	const vh = typeof window !== "undefined" ? window.innerHeight : 900;

	// Smart Edge Clamping Desktop Popover Dimensions (Apple Studio HIG compact 400px)
	const POPUP_WIDTH = 400;
	const POPUP_HEIGHT = 440;
	const clampedCenterX = Math.max(
		POPUP_WIDTH / 2 + 16,
		Math.min(vw - POPUP_WIDTH / 2 - 16, rawCenterX),
	);
	const clampedCenterY = Math.max(
		POPUP_HEIGHT / 2 + 16,
		Math.min(vh - POPUP_HEIGHT / 2 - 16, rawCenterY),
	);

	const content = (
		<div
			className={`radial-tooth-menu-overlay fixed inset-0 z-[9999] pointer-events-auto animate-fadeIn ${
				isTouchOrMobile ? "flex flex-col justify-end p-0 sm:p-4" : ""
			}`}
			style={{
				backgroundColor: "rgba(15, 23, 42, 0.45)",
				backdropFilter: "blur(3px)",
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
					items={allItems}
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
					toothScanThumbnail={toothScanThumbnail}
					onOpenRvg={handleOpenRvg}
					onClose={onClose}
				/>
			) : (
				/* Apple Studio HIG Desktop Tooth Clinical Popover (6-Action 1-Click Core Loop) */
				<div
					ref={menuRef}
					className="tooth-desktop-popover absolute select-none flex flex-col rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl p-3.5 gap-2.5 text-[var(--ink)]"
					style={{
						left: `${clampedCenterX}px`,
						top: `${clampedCenterY}px`,
						width: `${POPUP_WIDTH}px`,
						maxHeight: `${POPUP_HEIGHT}px`,
						transform: "translate(-50%, -50%)",
						boxShadow:
							"0 24px 48px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px var(--line)",
					}}
					role="dialog"
					aria-label={`Клиническое меню зуба ${toothNumber}`}
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header: FDI Badge, Clinical Name, Current Status, Close */}
					<div className="flex items-center justify-between border-b border-[var(--line-subtle)] pb-2">
						<div className="flex items-center gap-2.5 min-w-0">
							<span className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 text-[var(--teal)] font-black text-lg flex items-center justify-center font-mono shrink-0 shadow-2xs">
								{toothNumber}
							</span>
							<div className="flex flex-col min-w-0">
								<span className="text-xs font-black text-[var(--ink)] leading-snug">
									{getToothFolkAndAnatomicalNameRu(toothNumber)}
								</span>
								<span className="text-[11px] text-[var(--muted)] flex items-center gap-1">
									<span>Статус:</span>
									<span className="font-extrabold text-[var(--ink)]">
										{TOOTH_STATE_LABELS[currentState ?? "Healthy"]}
									</span>
								</span>
							</div>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="w-7 h-7 rounded-lg bg-[var(--paper-soft)] hover:bg-rose-500 hover:text-white text-[var(--muted)] flex items-center justify-center transition-all cursor-pointer shrink-0 border border-[var(--line)]"
							title="Закрыть (Esc)"
							aria-label="Закрыть меню"
						>
							<X size={15} />
						</button>
					</div>

					{/* Fast Surface Selector Bar: [O] [M] [D] [V] [L] + Combos [MOD] [MO] [OD] */}
					{!isPrimary && (
						<div className="flex flex-col gap-1 px-2 py-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
							<div className="flex items-center justify-between">
								<span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
									Поверхности:
								</span>
								<span className="text-[10px] font-mono font-bold text-[var(--teal)]">
									{selectedSurfaces.length > 0
										? selectedSurfaces.join("")
										: "вся коронка"}
								</span>
							</div>
							<div className="flex items-center gap-1 flex-wrap">
								{[
									{
										label: "O",
										surfs: ["O"],
										title: "Окклюзионная (O/Жевательная)",
									},
									{ label: "M", surfs: ["M"], title: "Медиальная (M)" },
									{ label: "D", surfs: ["D"], title: "Дистальная (D)" },
									{ label: "V", surfs: ["V"], title: "Вестибулярная (V)" },
									{ label: "L", surfs: ["L"], title: "Язычная / Нёбная (L)" },
									{
										label: "MOD",
										surfs: ["M", "O", "D"],
										title: "Медиально-окклюзионно-дистальная (MOD)",
									},
									{
										label: "MO",
										surfs: ["M", "O"],
										title: "Медиально-окклюзионная (MO)",
									},
									{
										label: "OD",
										surfs: ["O", "D"],
										title: "Окклюзионно-дистальная (OD)",
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
											className={`min-h-[26px] px-2 py-0.5 rounded-md text-[11px] font-mono font-black border transition-all cursor-pointer select-none flex items-center justify-center ${
												isMatch
													? "bg-teal-600 text-white border-teal-600 shadow-2xs scale-105"
													: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-hover)]"
											}`}
											title={chip.title}
											data-testid={`radial-desktop-quick-surf-${chip.label.replace("/", "-")}`}
										>
											[{chip.label}]
										</button>
									);
								})}
							</div>
						</div>
					)}

					{/* THE CORE 6 CLINICAL ACTIONS (2 Columns x 3 Rows, 1-Click Mandate 8e) */}
					<div className="grid grid-cols-2 gap-1.5 w-full">
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
												selectedSurfaces.length > 0
													? selectedSurfaces
													: surfaces,
											);
										}
									}}
									className={`min-h-[38px] px-2.5 py-1.5 rounded-xl font-bold flex items-center justify-between gap-1.5 transition-all active:scale-[0.98] cursor-pointer border ${
										isCurrent
											? "bg-[var(--paper-soft)] border-teal-500 ring-2 ring-teal-500/30 text-[var(--ink)] font-black shadow-xs"
											: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/50 hover:bg-[var(--paper-soft)] text-[var(--ink)]"
									}`}
									title={item.label}
									data-testid={`radial-btn-${item.id}`}
								>
									<div className="flex items-center gap-2 min-w-0">
										<span className="shrink-0 flex items-center justify-center">
											{item.icon}
										</span>
										<span className="text-xs font-extrabold truncate">
											{item.shortLabel}
										</span>
									</div>
									<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] font-mono font-bold shrink-0 border border-[var(--line-subtle)]">
										{item.hotkey}
									</span>
								</button>
							);
						})}
					</div>

					{/* Secondary Clinical Statuses Accordion: Periodontitis, Implant, Root, Retained */}
					<div className="flex flex-col gap-1">
						<button
							type="button"
							onClick={() => setIsMoreStatusesOpen((prev) => !prev)}
							className="flex items-center justify-between px-2 py-1 rounded-lg text-[11px] font-bold text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer select-none border-0 bg-transparent"
						>
							<span className="flex items-center gap-1">
								<span>Другие клинические статусы</span>
								<span className="text-[10px] text-[var(--muted)] font-normal">
									(Периодонтит, Имплант, Корень)
								</span>
							</span>
							{isMoreStatusesOpen ? (
								<ChevronUp size={14} />
							) : (
								<ChevronDown size={14} />
							)}
						</button>

						{isMoreStatusesOpen && (
							<div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
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
											className={`min-h-[32px] px-2 py-1 rounded-lg text-xs font-bold flex items-center justify-between gap-1.5 transition-all cursor-pointer border ${
												isCurrent
													? "bg-[var(--paper)] border-teal-500 font-black ring-1 ring-teal-500/30 text-[var(--ink)]"
													: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/40 text-[var(--ink)]"
											}`}
											title={item.label}
											data-testid={`radial-btn-${item.id}`}
										>
											<div className="flex items-center gap-1.5 min-w-0">
												<span className="shrink-0">{item.icon}</span>
												<span className="text-[11px] truncate font-bold">
													{item.shortLabel}
												</span>
											</div>
											<span className="text-[9px] px-1 py-0.2 rounded bg-[var(--paper-soft)] text-[var(--muted)] font-mono font-bold">
												{item.hotkey}
											</span>
										</button>
									);
								})}
							</div>
						)}
					</div>

					{/* Resorption / Exfoliation Scale for Primary Teeth */}
					{isPrimary && (
						<div className="flex flex-col gap-1 p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
							<div className="flex items-center justify-between">
								<span className="text-[10px] uppercase font-black text-purple-600 dark:text-purple-400">
									Резорбция корней:
								</span>
								<span className="text-[10px] text-[var(--muted)]">0–100%</span>
							</div>
							<div className="grid grid-cols-4 gap-1 w-full">
								<button
									type="button"
									onClick={() => {
										onSelectState("Healthy", undefined, "resorption_1");
										onClose();
									}}
									className="min-h-[28px] px-1.5 py-0.5 rounded-lg text-[10px] font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 text-center"
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
									className="min-h-[28px] px-1.5 py-0.5 rounded-lg text-[10px] font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 text-center"
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
									className="min-h-[28px] px-1.5 py-0.5 rounded-lg text-[10px] font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 text-center"
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
									className="min-h-[28px] px-1.5 py-0.5 rounded-lg text-[10px] font-black bg-rose-500/15 text-rose-800 dark:text-rose-200 hover:bg-rose-500/30 transition-all cursor-pointer border border-rose-500/30 text-center"
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
						<div className="flex items-center gap-1.5 bg-amber-500/15 text-amber-900 dark:text-amber-200 px-2 py-1 rounded-xl border border-amber-500/30 text-[10px] font-bold">
							<AlertTriangle
								size={13}
								className="text-amber-600 dark:text-amber-400 shrink-0"
							/>
							<span>ИРОПЗ &gt; 0.6: Рекомендована коронка (Z51.8)</span>
						</div>
					)}

					{/* Quick Actions Footer (RVG, Therapy/Drawer, Invoice) */}
					<div className="flex items-center gap-1.5 pt-1 border-t border-[var(--line-subtle)]">
						<button
							type="button"
							onClick={() => {
								handleOpenRvg();
								onClose();
							}}
							className="flex-1 min-h-[32px] px-2 py-1 rounded-xl text-xs font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
									<Camera size={13} className="shrink-0" />
									<span>Снимок RVG</span>
								</span>
							)}
						</button>
						{onOpenTherapy && (
							<button
								type="button"
								onClick={() => {
									onOpenTherapy();
									onClose();
								}}
								className="flex-1 min-h-[32px] px-2 py-1 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
							>
								<DentalHandpiece size={13} />
								<span>Терапия</span>
							</button>
						)}
						{onAddToInvoice && (
							<button
								type="button"
								onClick={() => {
									onAddToInvoice();
									onClose();
								}}
								className="flex-1 min-h-[32px] px-2 py-1 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
							>
								<Coins size={13} />
								<span>В смету</span>
							</button>
						)}
						{onOpenEndo && !onAddToInvoice && (
							<button
								type="button"
								onClick={() => {
									onOpenEndo();
									onClose();
								}}
								className="flex-1 min-h-[32px] px-2 py-1 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
							>
								<EndoFileCanal size={13} />
								<span>Каналы</span>
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(content, document.body);
	}
	return content;
};

export {
	ToothRadialMenu as RadialToothMenu,
	ToothRadialMenu as ToothClinicalPopover,
};
