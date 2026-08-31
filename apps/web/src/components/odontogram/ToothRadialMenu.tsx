import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertTriangle,
	Coins,
	Crown,
	Flame,
	Hammer,
	Sparkles,
	Trash2,
	Wrench,
	X,
	Zap,
} from "lucide-react";
import { getToothStateFromHotkey } from "./ClassicGostOdontogram";
import { type ToothState, TOOTH_STATE_LABELS } from "./ToothChart";
import { getToothFolkAndAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { isPrimaryTooth } from "@dental/shared";

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
	onAddToInvoice,
	onClose,
}) => {
	const menuRef = useRef<HTMLDivElement>(null);
	const [isMobile, setIsMobile] = useState<boolean>(() => {
		if (typeof window !== "undefined") {
			return window.innerWidth <= 640;
		}
		return false;
	});

	useEffect(() => {
		const handleResize = () => {
			setIsMobile(window.innerWidth <= 640);
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

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

	const isPrimary = isPrimaryTooth(toothNumber);

	const items: RadialMenuItem[] = isPrimary
		? [
				{
					id: "caries",
					label: "Кариес молочного зуба",
					shortLabel: "Кариес",
					state: "Caries",
					icon: <Zap size={16} className="text-amber-200" />,
					color: "from-amber-600 to-amber-800",
					bgGradient: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
					hotkey: "К",
				},
				{
					id: "pulpitis",
					label: "Пульпотомия (MTA/Biodentine)",
					shortLabel: "Пульпотомия",
					state: "Pulpitis",
					icon: <Flame size={16} className="text-rose-200" />,
					color: "from-red-500 to-rose-700",
					bgGradient: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
					hotkey: "Ф",
				},
				{
					id: "periodontitis",
					label: "Периодонтит молочного зуба",
					shortLabel: "Периодонтит",
					state: "Periodontitis",
					icon: <Flame size={16} className="text-orange-200" />,
					color: "from-orange-500 to-rose-600",
					bgGradient: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
					hotkey: "Е",
				},
				{
					id: "filled",
					label: "Пломба (СИЦ / Композит)",
					shortLabel: "Пломба СИЦ",
					state: "Filled",
					icon: <Wrench size={16} className="text-slate-200" />,
					color: "from-slate-500 to-slate-700",
					bgGradient: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
					hotkey: "П",
				},
				{
					id: "crown",
					label: "Коронка NuSmile / 3M",
					shortLabel: "NuSmile",
					state: "Crown",
					icon: <Crown size={16} className="text-sky-200" />,
					color: "from-sky-500 to-blue-700",
					bgGradient: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
					hotkey: "Ц",
				},
				{
					id: "sealant",
					label: "Герметизация фиссур",
					shortLabel: "Герметизация",
					state: "Filled",
					icon: <Sparkles size={16} className="text-teal-200" />,
					color: "from-teal-500 to-emerald-700",
					bgGradient: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)",
					hotkey: "Г",
				},
				{
					id: "missing",
					label: "Физиологическая смена (Выпал)",
					shortLabel: "Смена",
					state: "Missing",
					icon: <Trash2 size={16} className="text-slate-300" />,
					color: "from-slate-500 to-zinc-700",
					bgGradient: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
					hotkey: "0",
				},
				{
					id: "healthy",
					label: "Здоровый молочный зуб",
					shortLabel: "Здоров",
					state: "Healthy",
					icon: <Sparkles size={16} className="text-emerald-200" />,
					color: "from-emerald-500 to-teal-700",
					bgGradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
					hotkey: "З",
				},
			]
		: [
				{
					id: "caries",
					label: "Кариес",
					shortLabel: "Кариес",
					state: "Caries",
					icon: <Zap size={16} className="text-amber-200" />,
					color: "from-amber-600 to-amber-800",
					bgGradient: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
					hotkey: "К",
				},
				{
					id: "pulpitis",
					label: "Пульпит",
					shortLabel: "Пульпит",
					state: "Pulpitis",
					icon: <Flame size={16} className="text-rose-200" />,
					color: "from-red-500 to-rose-700",
					bgGradient: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
					hotkey: "Ф",
				},
				{
					id: "periodontitis",
					label: "Периодонтит",
					shortLabel: "Периодонтит",
					state: "Periodontitis",
					icon: <Flame size={16} className="text-orange-200" />,
					color: "from-orange-500 to-rose-600",
					bgGradient: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
					hotkey: "Е",
				},
				{
					id: "filled",
					label: "Пломба (Композит)",
					shortLabel: "Пломба",
					state: "Filled",
					icon: <Wrench size={16} className="text-slate-200" />,
					color: "from-slate-500 to-slate-700",
					bgGradient: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
					hotkey: "П",
				},
				{
					id: "crown",
					label: "Коронка",
					shortLabel: "Коронка",
					state: "Crown",
					icon: <Crown size={16} className="text-sky-200" />,
					color: "from-sky-500 to-blue-700",
					bgGradient: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
					hotkey: "Ц",
				},
				{
					id: "implant",
					label: "Имплантат (Титан)",
					shortLabel: "Имплант",
					state: "Implant",
					icon: <Hammer size={16} className="text-slate-200" />,
					color: "from-slate-600 to-slate-800",
					bgGradient: "linear-gradient(135deg, #64748b 0%, #334155 100%)",
					hotkey: "И",
				},
				{
					id: "missing",
					label: "Зуб отсутствует / Удален",
					shortLabel: "Удален",
					state: "Missing",
					icon: <Trash2 size={16} className="text-rose-200" />,
					color: "from-rose-600 to-red-800",
					bgGradient: "linear-gradient(135deg, #e11d48 0%, #991b1b 100%)",
					hotkey: "0",
				},
				{
					id: "healthy",
					label: "Здоров",
					shortLabel: "Здоров",
					state: "Healthy",
					icon: <Sparkles size={16} className="text-emerald-200" />,
					color: "from-emerald-500 to-teal-700",
					bgGradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
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
				onSelectState(parsedState, surfaces);
				onClose();
				return;
			}
			const keyUpper = e.key.toUpperCase();
			const matched = items.find((it) => it.hotkey === keyUpper);
			if (matched && matched.state) {
				e.preventDefault();
				onSelectState(matched.state, surfaces);
				onClose();
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

	// Clamp menu center to prevent edge clipping while staying true to the tooth position
	const radius = Math.min(170, Math.max(120, Math.floor((vw - 90) / 2)));
	const minMarginX = Math.min(240, vw / 2);
	const minMarginTop = 240;
	const minMarginBottom = 250;
	const centerX = Math.max(minMarginX, Math.min(rawCenterX, vw - minMarginX));
	const centerY = Math.max(minMarginTop, Math.min(rawCenterY, vh - minMarginBottom));

	const content = (
		<div
			className={`radial-tooth-menu-overlay fixed inset-0 z-[9999] pointer-events-auto bg-black/60 backdrop-blur-[4px] animate-fadeIn ${
				isMobile ? "flex flex-col justify-end p-0 sm:p-4" : ""
			}`}
			data-testid="tooth-radial-menu-overlay"
		>
			{isMobile ? (
				/* Mobile Bottom Sheet Drawer Layout (<= 640px / 390px) */
				<div
					ref={menuRef}
					className="radial-mobile-sheet w-full max-w-lg mx-auto bg-[var(--odontogram-paper)] border-t sm:border border-[var(--odontogram-border)] rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 flex flex-col gap-3 max-h-[88vh] overflow-y-auto animate-slideUp select-none"
					role="dialog"
					aria-label={`Меню статуса зуба ${toothNumber}`}
					onClick={(e) => e.stopPropagation()}
				>
					{/* Sheet Drag Handle */}
					<div className="w-12 h-1.5 rounded-full bg-[var(--odontogram-border-strong)] mx-auto opacity-60 mb-0.5" />

					{/* Header with Tooth Number and Folk Name */}
					<div className="flex items-center justify-between border-b border-[var(--odontogram-border-subtle)] pb-2.5">
						<div className="flex items-center gap-2.5 min-w-0">
							<span className="w-11 h-11 rounded-xl bg-teal-500/15 border border-teal-500/30 text-[var(--teal)] font-black text-xl flex items-center justify-center font-mono shrink-0 shadow-2xs">
								{toothNumber}
							</span>
							<div className="flex flex-col min-w-0">
								<span className="text-sm font-extrabold text-[var(--odontogram-ink)] leading-tight truncate">
									{getToothFolkAndAnatomicalNameRu(toothNumber)}
								</span>
								<span className="text-xs text-[var(--odontogram-ink-muted)] truncate">
									Текущий: <strong className="text-[var(--odontogram-ink)]">{TOOTH_STATE_LABELS[currentState ?? "Healthy"]}</strong>
								</span>
							</div>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="min-w-[48px] min-h-[48px] w-12 h-12 rounded-full bg-[var(--odontogram-surface-hover)] hover:bg-rose-500 hover:text-white text-[var(--odontogram-ink-muted)] flex items-center justify-center transition-all cursor-pointer shrink-0"
							title="Закрыть (Esc)"
							aria-label="Закрыть меню"
						>
							<X size={20} />
						</button>
					</div>

					{/* 8 Status Buttons in 2-Column Touch Grid */}
					<div className="grid grid-cols-2 gap-2 w-full">
						{items.map((item) => {
							const isCurrent = currentState === item.state;
							return (
								<button
									key={item.id}
									type="button"
									onClick={() => {
										if (item.state) onSelectState(item.state, selectedSurfaces.length > 0 ? selectedSurfaces : surfaces);
										onClose();
									}}
									style={{ background: item.bgGradient }}
									className={`radial-item-btn min-h-[48px] min-w-[48px] px-3.5 py-2.5 rounded-xl font-bold text-white flex items-center justify-between gap-2 shadow-sm transition-all active:scale-95 cursor-pointer touch-manipulation border border-white/25 ${
										isCurrent
											? "ring-2 ring-white scale-[1.02] font-black"
											: "opacity-90 hover:opacity-100"
									}`}
									title={item.label}
									data-testid={`radial-btn-${item.id}`}
								>
									<div className="flex items-center gap-2 min-w-0">
										<span className="shrink-0">{item.icon}</span>
										<span className="text-sm font-black truncate">{item.shortLabel}</span>
									</div>
									<span className="text-[11px] px-1.5 py-0.5 rounded-md bg-black/30 text-white font-mono font-black shrink-0">
										{item.hotkey}
									</span>
								</button>
							);
						})}
					</div>

					{/* Quick Macro Bar (Black Classes I-VI / 6-Surface Shading / Resorption) */}
					<div className="flex flex-col gap-2 p-2.5 rounded-2xl bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)]">
						{isPrimaryTooth(toothNumber) ? (
							<>
								<div className="flex items-center justify-between">
									<span className="text-xs uppercase font-black text-purple-600 dark:text-purple-400 px-1 shrink-0">Резорбция корней:</span>
									<span className="text-[11px] text-[var(--odontogram-ink-muted)]">0–100%</span>
								</div>
								<div className="grid grid-cols-4 gap-1.5 w-full">
									<button
										type="button"
										onClick={() => {
											onSelectState("Healthy", undefined, "resorption_1");
											onClose();
										}}
										className="min-h-[44px] px-2 py-2 rounded-xl text-xs font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 touch-manipulation text-center"
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
										className="min-h-[44px] px-2 py-2 rounded-xl text-xs font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 touch-manipulation text-center"
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
										className="min-h-[44px] px-2 py-2 rounded-xl text-xs font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 touch-manipulation text-center"
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
										className="min-h-[44px] px-2 py-2 rounded-xl text-xs font-black bg-rose-500/15 text-rose-800 dark:text-rose-200 hover:bg-rose-500/30 transition-all cursor-pointer border border-rose-500/30 touch-manipulation text-center"
										title="Физиологическая смена / Эксфолиация (100%)"
									>
										[Смена 100%]
									</button>
								</div>
							</>
						) : (
							<>
								{/* 6-Surface Toggles */}
								<div className="flex items-center justify-between gap-1">
									<span className="text-xs uppercase font-black text-teal-700 dark:text-teal-400 px-1 shrink-0">6 Поверхностей:</span>
									<div className="flex items-center gap-1">
										{(["O", "V", "L", "M", "D", "C"] as const).map((surf) => {
											const isActive = selectedSurfaces.includes(surf);
											return (
												<button
													key={surf}
													type="button"
													onClick={() => toggleSurface(surf)}
													className={`min-h-[38px] min-w-[38px] px-2 py-1 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer select-none ${
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

								{/* Black Classes I - VI */}
								<div className="flex items-center justify-between pt-1 border-t border-[var(--odontogram-border-subtle)]">
									<span className="text-xs uppercase font-black text-amber-600 dark:text-amber-400 px-1 shrink-0">Классы по Блэку:</span>
								</div>
								<div className="grid grid-cols-4 gap-1 w-full">
									<button
										type="button"
										onClick={() => {
											onSelectState("Caries", ["O"]);
											onClose();
										}}
										className="min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
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
										className="min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
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
										className="min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
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
										className="min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
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
										className="min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
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
										className="min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
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
										className="min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
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
										className="min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation text-center"
										title="VI класс: Бугры моляров/премоляров или режущий край"
									>
										[VI: Бугры]
									</button>
								</div>
							</>
						)}
					</div>

					{/* IROPZ warning */}
					{(Boolean(iropz && iropz > 0.6) || currentState === "Pulpitis" || currentState === "Periodontitis") && (
						<div className="flex items-center gap-2 bg-amber-500/15 text-amber-900 dark:text-amber-200 p-2.5 rounded-xl border border-amber-500/30 text-xs font-bold">
							<AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
							<span>ИРОПЗ &gt; 0.6: Рекомендовано ортопедическое восстановление (коронка Z51.8)</span>
						</div>
					)}

					{/* Quick Actions (Endo / Invoice) */}
					{Boolean(onOpenEndo || onAddToInvoice) && (
						<div className="flex items-center gap-2 pt-1 border-t border-[var(--odontogram-border-subtle)]">
							{onOpenEndo && (
								<button
									type="button"
									onClick={() => {
										onOpenEndo();
										onClose();
									}}
									className="flex-1 min-h-[48px] min-w-[48px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black text-rose-600 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 flex items-center justify-center gap-2 transition-colors cursor-pointer"
								>
									<Wrench size={16} />
									<span>Журнал каналов</span>
								</button>
							)}
							{onAddToInvoice && (
								<button
									type="button"
									onClick={() => {
										onAddToInvoice();
										onClose();
									}}
									className="flex-1 min-h-[48px] min-w-[48px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black text-[var(--teal)] bg-[var(--teal-soft,rgba(13,148,136,0.1))] hover:bg-[var(--teal-soft,rgba(13,148,136,0.2))] border border-[var(--teal)]/30 flex items-center justify-center gap-2 transition-colors cursor-pointer"
								>
									<Coins size={16} />
									<span>В смету</span>
								</button>
							)}
						</div>
					)}
				</div>
			) : (
				/* Desktop Clamped Circular Radial Menu */
				<div
					ref={menuRef}
					className="radial-tooth-menu-container absolute select-none flex items-center justify-center pointer-events-none"
					style={{
						left: `${centerX}px`,
						top: `${centerY}px`,
						width: "480px",
						height: "480px",
						transform: "translate(-50%, -50%)",
					}}
					role="dialog"
					aria-label={`Радиальное меню зуба ${toothNumber}`}
				>
					{/* Background Glass Disc - centered at container origin */}
					<div
						className="absolute rounded-full bg-[var(--odontogram-paper)]/92 backdrop-blur-2xl border border-[var(--odontogram-border)] shadow-2xl pointer-events-none"
						style={{
							width: `${(radius + 45) * 2}px`,
							height: `${(radius + 45) * 2}px`,
							left: "50%",
							top: "50%",
							transform: "translate(-50%, -50%)",
						}}
					/>

					{/* Center Tooth Hub - centered at container origin */}
					<div
						className="absolute flex flex-col items-center justify-center w-24 h-24 rounded-full bg-[var(--odontogram-surface)] border-2 border-[var(--teal,#0d9488)] shadow-2xl text-[var(--odontogram-ink)] z-20 pointer-events-auto"
						style={{
							left: "50%",
							top: "50%",
							transform: "translate(-50%, -50%)",
						}}
					>
						<span className="text-xs uppercase font-black text-[var(--teal,#0d9488)] tracking-wider">Зуб</span>
						<span className="text-3xl font-black leading-none text-[var(--odontogram-ink)]">{toothNumber}</span>
						<button
							type="button"
							onClick={onClose}
							className="absolute -top-3 -right-3 min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center p-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-rose-400 pointer-events-auto"
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
										left: "50%",
										top: "50%",
										transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
										background: item.bgGradient,
										minWidth: "max-content",
										width: "max-content",
										whiteSpace: "nowrap",
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "8px",
										padding: "10px 18px",
										borderRadius: "9999px",
										border: "1.5px solid rgba(255, 255, 255, 0.35)",
										boxShadow: isCurrent
											? "0 0 0 3px #ffffff, 0 14px 32px -4px rgba(0, 0, 0, 0.65)"
											: "0 8px 22px -3px rgba(0, 0, 0, 0.45)",
									}}
									className={`radial-item-btn pointer-events-auto min-h-[36px] min-w-[36px] text-xs font-bold text-white cursor-pointer transition-all duration-200 hover:scale-108 active:scale-95 focus:outline-none ${
										isCurrent
											? "scale-105 font-black ring-2 ring-white"
											: "opacity-95 hover:opacity-100"
									}`}
									title={item.label}
									data-testid={`radial-btn-${item.id}`}
								>
									<span className="shrink-0 flex items-center justify-center">{item.icon}</span>
									<span className="whitespace-nowrap font-black text-[13px] sm:text-[14px] tracking-tight">{item.shortLabel}</span>
								</button>
							);
						})}
					</div>

					{/* Top Quick Bar: Pediatric Resorption (0-100%) for primary teeth OR 6-Surfaces & Black I-VI for adult teeth */}
					<div
						className="absolute flex flex-col items-center gap-1.5 pointer-events-auto bg-[var(--odontogram-paper)]/95 backdrop-blur-xl px-3.5 py-1.5 rounded-2xl border border-[var(--odontogram-border)] shadow-xl z-20"
						style={{
							left: "50%",
							top: `calc(50% - ${radius + 64}px)`,
							transform: "translate(-50%, 0)",
						}}
					>
						{isPrimaryTooth(toothNumber) ? (
							<div className="flex items-center gap-1.5">
								<span className="text-[11px] uppercase font-black text-purple-600 dark:text-purple-400 px-1">Резорбция:</span>
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
							<div className="flex flex-col items-center gap-1.5">
								{/* 6-Surface interactive toggle chips */}
								<div className="flex items-center gap-1">
									<span className="text-[11px] uppercase font-black text-teal-700 dark:text-teal-400 px-1">6 Поверхностей:</span>
									{(["O", "V", "L", "M", "D", "C"] as const).map((surf) => {
										const isActive = selectedSurfaces.includes(surf);
										return (
											<button
												key={surf}
												type="button"
												onClick={() => toggleSurface(surf)}
												className={`min-h-[28px] min-w-[28px] px-2 py-0.5 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer select-none ${
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
								<div className="flex items-center gap-1 pt-0.5 border-t border-[var(--odontogram-border-subtle)]">
									<span className="text-[11px] uppercase font-black text-amber-600 dark:text-amber-400 px-1">Блэк:</span>
									<button
										type="button"
										onClick={() => {
											onSelectState("Caries", ["O"]);
											onClose();
										}}
										className="min-h-[28px] px-2 py-0.5 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation"
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
										className="min-h-[28px] px-2 py-0.5 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation"
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
										className="min-h-[28px] px-2 py-0.5 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation"
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
										className="min-h-[28px] px-2 py-0.5 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation"
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
										className="min-h-[28px] px-2 py-0.5 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation"
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
										className="min-h-[28px] px-2 py-0.5 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation"
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
										className="min-h-[28px] px-2 py-0.5 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation"
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
										className="min-h-[28px] px-2 py-0.5 rounded-lg text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation"
										title="VI класс: Бугры моляров/премоляров или режущий край"
									>
										[VI: Бугры]
									</button>
								</div>
							</div>
						)}
					</div>

					{/* IROPZ > 0.6 Smart Orthopedic Warning Banner */}
					{(Boolean(iropz && iropz > 0.6) || currentState === "Pulpitis" || currentState === "Periodontitis") && (
						<div
							className="absolute flex items-center gap-2 pointer-events-auto bg-amber-500/20 text-amber-900 dark:text-amber-200 px-3 py-1 rounded-full border border-amber-500/40 shadow-xl z-20 text-xs font-bold whitespace-nowrap"
							style={{
								left: "50%",
								top: `calc(50% + ${radius + 10}px)`,
								transform: "translate(-50%, 0)",
							}}
						>
							<AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
							<span>ИРОПЗ &gt; 0.6: Рекомендовано ортопедическое восстановление (коронка Z51.8)</span>
						</div>
					)}

					{/* Quick Action Footer Controls */}
					{Boolean(onOpenEndo || onAddToInvoice) && (
						<div
							className="absolute flex items-center gap-2 pointer-events-auto bg-[var(--odontogram-paper)] backdrop-blur-xl px-3 py-1.5 rounded-full border border-[var(--odontogram-border)] shadow-2xl z-20"
							style={{
								left: "50%",
								top: `calc(50% + ${radius + 48}px)`,
								transform: "translate(-50%, 0)",
							}}
						>
							{onOpenEndo && (
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
									className="min-h-[32px] text-xs font-black text-rose-600 dark:text-rose-300 hover:bg-rose-500/15 px-3 py-1 rounded-lg transition-colors cursor-pointer border-0"
								>
									<Wrench size={14} />
									<span>Журнал каналов</span>
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
									className="min-h-[32px] text-xs font-black text-[var(--teal,#0d9488)] hover:bg-[var(--teal-soft,rgba(13,148,136,0.15))] px-3 py-1 rounded-lg transition-colors cursor-pointer border-0"
								>
									<Coins size={14} />
									<span>В смету</span>
								</button>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(content, document.body);
	}
	return content;
};

export { ToothRadialMenu as RadialToothMenu };
