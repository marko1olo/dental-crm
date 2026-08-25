import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
	AlertTriangle,
	Coins,
	Crown,
	Flame,
	Hammer,
	Layers,
	Sparkles,
	Trash2,
	Wrench,
	X,
	Zap,
} from "lucide-react";
import { getToothStateFromHotkey } from "./ClassicGostOdontogram";
import type { ToothState } from "./ToothChart";
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

export interface RadialToothMenuProps {
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

export const RadialToothMenu: React.FC<RadialToothMenuProps> = ({
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

	const items: RadialMenuItem[] = [
		{
			id: "caries",
			label: "Кариес",
			shortLabel: "Кариес",
			state: "Caries",
			icon: <Zap size={16} className="text-amber-200" />,
			color: "from-amber-500 to-red-600",
			bgGradient: "linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)",
			hotkey: "К",
		},
		{
			id: "pulpitis",
			label: "Пульпит",
			shortLabel: "Пульпит",
			state: "Pulpitis",
			icon: <Flame size={16} className="text-rose-200" />,
			color: "from-rose-600 to-red-800",
			bgGradient: "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)",
			hotkey: "Ф",
		},
		{
			id: "periodontitis",
			label: "Периодонтит",
			shortLabel: "Периодонтит",
			state: "Periodontitis",
			icon: <Flame size={16} className="text-orange-200" />,
			color: "from-orange-500 to-rose-600",
			bgGradient: "linear-gradient(135deg, #ea580c 0%, #e11d48 100%)",
			hotkey: "Е",
		},
		{
			id: "filled",
			label: "Пломба",
			shortLabel: "Пломба",
			state: "Filled",
			icon: <Wrench size={16} className="text-[var(--teal-soft,#99f6e4)]" />,
			color: "from-teal-500 to-emerald-700",
			bgGradient: "linear-gradient(135deg, var(--teal, #0d9488) 0%, var(--teal-dark, #047857) 100%)",
			hotkey: "П",
		},
		{
			id: "crown",
			label: "Коронка",
			shortLabel: "Коронка",
			state: "Crown",
			icon: <Crown size={16} className="text-[var(--info-fg,#93c5fd)]" />,
			color: "from-blue-600 to-indigo-800",
			bgGradient: "linear-gradient(135deg, var(--brand-500, #2563eb) 0%, var(--brand-600, #3730a3) 100%)",
			hotkey: "Ц",
		},
		{
			id: "implant",
			label: "Имплантат",
			shortLabel: "Имплант",
			state: "Implant",
			icon: <Hammer size={16} className="text-cyan-200" />,
			color: "from-cyan-500 to-blue-600",
			bgGradient: "linear-gradient(135deg, #06b6d4 0%, #1d4ed8 100%)",
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
			icon: <Sparkles size={16} className="text-[var(--ok-fg,#a7f3d0)]" />,
			color: "from-emerald-600 to-teal-700",
			bgGradient: "linear-gradient(135deg, var(--ok-fg, #059669) 0%, var(--teal-dark, #0f766e) 100%)",
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
	const radius = Math.min(170, Math.max(125, Math.floor((vw - 90) / 2)));
	const minMarginX = Math.min(240, vw / 2);
	const minMarginTop = 240;
	const minMarginBottom = 250;
	const centerX = Math.max(minMarginX, Math.min(rawCenterX, vw - minMarginX));
	const centerY = Math.max(minMarginTop, Math.min(rawCenterY, vh - minMarginBottom));

	const content = (
		<div
			className="radial-tooth-menu-overlay fixed inset-0 z-[9999] pointer-events-auto bg-black/55 backdrop-blur-[4px] animate-fadeIn"
			data-testid="radial-tooth-menu-overlay"
		>
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
						className="absolute -top-3 -right-3 min-w-[48px] min-h-[48px] w-12 h-12 flex items-center justify-center p-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-rose-400 pointer-events-auto"
						title="Закрыть (Esc)"
						aria-label="Закрыть меню"
					>
						<X size={20} />
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
									if (item.state) onSelectState(item.state, surfaces);
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
									padding: "12px 20px",
									borderRadius: "9999px",
									border: "1.5px solid rgba(255, 255, 255, 0.35)",
									boxShadow: isCurrent
										? "0 0 0 3px #ffffff, 0 14px 32px -4px rgba(0, 0, 0, 0.65)"
										: "0 8px 22px -3px rgba(0, 0, 0, 0.45)",
								}}
								className={`radial-item-btn pointer-events-auto min-h-[48px] min-w-[48px] text-xs font-bold text-white cursor-pointer transition-all duration-200 hover:scale-108 active:scale-95 focus:outline-none ${
									isCurrent
										? "scale-105 font-black ring-2 ring-white"
										: "opacity-95 hover:opacity-100"
								}`}
								title={item.label}
								data-testid={`radial-btn-${item.id}`}
							>
								<span className="shrink-0 flex items-center justify-center">{item.icon}</span>
								<span className="whitespace-nowrap font-black text-[14px] sm:text-[15px] tracking-tight">{item.shortLabel}</span>
							</button>
						);
					})}
				</div>

				{/* Top Quick Bar: Pediatric Resorption & Exchange macros for deciduous teeth OR Black macros for adult teeth */}
				<div
					className="absolute flex items-center gap-1.5 pointer-events-auto bg-[var(--odontogram-paper)]/95 backdrop-blur-xl px-3.5 py-1.5 rounded-full border border-[var(--odontogram-border)] shadow-xl z-20"
					style={{
						left: "50%",
						top: `calc(50% - ${radius + 52}px)`,
						transform: "translate(-50%, 0)",
					}}
				>
					{isPrimaryTooth(toothNumber) ? (
						<>
							<span className="text-xs uppercase font-black text-purple-600 dark:text-purple-400 px-1">Резорбция:</span>
							<button
								type="button"
								onClick={() => {
									onSelectState("Healthy", undefined, "resorption_1");
									onClose();
								}}
								className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 touch-manipulation"
								title="Физиологическая резорбция I степени (рассасывание верхушки до 1/3 корня)"
							>
								[Рез I]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Healthy", undefined, "resorption_2");
									onClose();
								}}
								className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 touch-manipulation"
								title="Физиологическая резорбция II степени (рассасывание до 1/2 корня)"
							>
								[Рез II]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Healthy", undefined, "resorption_3");
									onClose();
								}}
								className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black bg-purple-500/15 text-purple-800 dark:text-purple-200 hover:bg-purple-500/30 transition-all cursor-pointer border border-purple-500/30 touch-manipulation"
								title="Физиологическая резорбция III степени (полное рассасывание корней / подвижность)"
							>
								[Рез III]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Missing", undefined, "exfoliation");
									onClose();
								}}
								className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black bg-rose-500/15 text-rose-800 dark:text-rose-200 hover:bg-rose-500/30 transition-all cursor-pointer border border-rose-500/30 touch-manipulation"
								title="Физиологическая смена / Удаление молочного зуба"
							>
								[Смена 0]
							</button>
						</>
					) : (
						<>
							<span className="text-xs uppercase font-black text-amber-600 dark:text-amber-400 px-1">Блэк:</span>
							<button
								type="button"
								onClick={() => {
									onSelectState("Caries", ["M", "O", "D"]);
									onClose();
								}}
								className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation"
								title="Медиально-окклюзионно-дистальная полость (II класс)"
							>
								[MOD]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Caries", ["M", "O"]);
									onClose();
								}}
								className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation"
								title="Медиально-окклюзионная полость (II класс)"
							>
								[MO]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Caries", ["O", "D"]);
									onClose();
								}}
								className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation"
								title="Окклюзионно-дистальная полость (II класс)"
							>
								[OD]
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectState("Caries", ["V"]);
									onClose();
								}}
								className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer border border-amber-500/30 touch-manipulation"
								title="Пришеечная полость (V класс)"
							>
								[V класс]
							</button>
						</>
					)}
				</div>

				{/* IROPZ > 0.6 Smart Orthopedic Warning Banner */}
				{(Boolean(iropz && iropz > 0.6) || currentState === "Pulpitis" || currentState === "Periodontitis") && (
					<div
						className="absolute flex items-center gap-2 pointer-events-auto bg-amber-500/20 text-amber-900 dark:text-amber-200 px-3.5 py-1.5 rounded-full border border-amber-500/40 shadow-xl z-20 text-xs font-bold whitespace-nowrap"
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

				{/* Quick Action Footer Controls - centered below the radial disc */}
				{Boolean(onOpenEndo || onAddToInvoice) && (
					<div
						className="absolute flex items-center gap-3 pointer-events-auto bg-[var(--odontogram-paper)] backdrop-blur-xl px-4 py-2 rounded-full border border-[var(--odontogram-border)] shadow-2xl z-20"
						style={{
							left: "50%",
							top: `calc(50% + ${radius + 56}px)`,
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
									gap: "8px",
									background: "transparent",
								}}
								className="min-h-[48px] min-w-[48px] text-[14px] font-black text-rose-600 dark:text-rose-300 hover:bg-rose-500/15 px-4 py-2 rounded-xl transition-colors cursor-pointer border-0"
							>
								<Wrench size={18} />
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
									gap: "8px",
									background: "transparent",
								}}
								className="min-h-[48px] min-w-[48px] text-[14px] font-black text-[var(--teal,#0d9488)] hover:bg-[var(--teal-soft,rgba(13,148,136,0.15))] px-4 py-2 rounded-xl transition-colors cursor-pointer border-0"
							>
								<Coins size={18} />
								<span>В смету</span>
							</button>
						)}
					</div>
				)}
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(content, document.body);
	}
	return content;
};
