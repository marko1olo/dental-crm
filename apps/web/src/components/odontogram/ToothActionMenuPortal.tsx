import React from "react";
import { createPortal } from "react-dom";
import {
	Activity,
	FlaskConical,
	History,
	Sparkles,
	Stethoscope,
} from "lucide-react";
import {
	SurfaceSelector,
	type ToothData,
	type ToothState,
} from "./ToothChart";
import { TOOTH_STATE_ACTIONS } from "./odontogramModuleConstants";
import {
	getToothAnatomicalNameRu,
	getToothFolkAndAnatomicalNameRu,
	generateSoapFromOdontogramFinding,
} from "../../lib/clinicalProtocols043";
import { showToast } from "../GlobalToast";

export interface ToothActionMenuConfig {
	toothNumber: number;
	x: number;
	y: number;
	position: "top" | "bottom";
	caretOffset: number;
	surfaces?: string[];
}

export interface ToothActionMenuPortalProps {
	menuConfig: ToothActionMenuConfig | null;
	onClose: () => void;
	selectedTeeth: number[];
	activeSurfaces: string[];
	setActiveSurfaces: React.Dispatch<React.SetStateAction<string[]>>;
	onApplyToothState: (state: ToothState) => void;
	onOpenContextDrawer: (toothNumber: number) => void;
	onOpenHistory: (toothNumber: number) => void;
	onOpenEndo: (toothNumber: number) => void;
	onOneClickLabOrder: (targetTeeth: number[]) => void;
	teethData: ToothData[];
}

export const ToothActionMenuPortal: React.FC<ToothActionMenuPortalProps> = ({
	menuConfig,
	onClose,
	selectedTeeth,
	activeSurfaces,
	setActiveSurfaces,
	onApplyToothState,
	onOpenContextDrawer,
	onOpenHistory,
	onOpenEndo,
	onOneClickLabOrder,
	teethData,
}) => {
	if (!menuConfig || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<>
			{/* Backdrop */}
			<button
				type="button"
				style={{
					position: "fixed",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					zIndex: 99998,
					background: "transparent",
					border: "none",
					padding: 0,
					margin: 0,
					cursor: "default",
				}}
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onClose();
					}
					if (e.key === "Escape") onClose();
				}}
			/>
			<div
				role="menu"
				className="tooth-radial-menu"
				style={
					{
						position: "fixed",
						left: menuConfig.x,
						top: menuConfig.y,
						zIndex: 99999,
					} as React.CSSProperties
				}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						e.preventDefault();
						onClose();
					}
				}}
			>
				{/* SVG Caret (Tail) */}
				{menuConfig.position === "bottom" ? (
					<svg
						aria-hidden="true"
						className="absolute -top-3 text-[var(--odontogram-border,#cbd5e1)] dark:text-zinc-800/50 drop-shadow-md"
						style={{
							left: `${menuConfig.caretOffset}%`,
							transform: "translateX(-50%)",
						}}
						width="24"
						height="12"
						viewBox="0 0 24 12"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M12 0L24 12H0L12 0Z"
							fill="currentColor"
							fillOpacity="0.8"
						/>
					</svg>
				) : (
					<svg
						aria-hidden="true"
						className="absolute -bottom-3 text-[var(--odontogram-border,#cbd5e1)] dark:text-zinc-800/50 drop-shadow-md"
						style={{
							left: `${menuConfig.caretOffset}%`,
							transform: "translateX(-50%)",
						}}
						width="24"
						height="12"
						viewBox="0 0 24 12"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M12 12L24 0H0L12 12Z"
							fill="currentColor"
							fillOpacity="0.8"
						/>
					</svg>
				)}

				<div className="col-span-2 text-center mb-2">
					<div className="text-sm font-black text-[var(--odontogram-ink,#0f172a)] dark:text-zinc-100">
						{selectedTeeth.length > 1
							? `Выбрано: ${selectedTeeth.length} зубов`
							: `Зуб #${menuConfig.toothNumber}`}
					</div>
					{selectedTeeth.length === 1 && (
						<div className="text-xs font-semibold text-[var(--odontogram-ink-muted,#64748b)]">
							{getToothFolkAndAnatomicalNameRu(menuConfig.toothNumber)}
						</div>
					)}
				</div>

				{/* Quick Surface Chips in 1 Compact Neat Row (Miller Law, CLIN-03) */}
				<div className="col-span-2 flex flex-col gap-1 mb-2 p-2 rounded-xl bg-[var(--odontogram-surface,#f1f5f9)] dark:bg-zinc-800/60 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700/50">
					<div className="flex items-center justify-between px-1">
						<span className="text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)]">
							Поверхности (1 клик):
						</span>
						<span className="text-[11px] font-mono font-bold text-[var(--teal,#0d9488)]">
							{activeSurfaces.length > 0 ? `[${activeSurfaces.join("")}]` : "вся коронка"}
						</span>
					</div>
					<div className="flex items-center justify-between gap-1 flex-nowrap overflow-x-auto py-0.5">
						{[
							{ label: "MOD", surfs: ["M", "O", "D"], title: "Медиально-окклюзионно-дистальная (MOD)" },
							{ label: "MO", surfs: ["M", "O"], title: "Медиально-окклюзионная (MO)" },
							{ label: "OD", surfs: ["O", "D"], title: "Окклюзионно-дистальная (OD)" },
							{ label: "O", surfs: ["O"], title: "Окклюзионная (O/Жевательная)" },
							{ label: "M", surfs: ["M"], title: "Медиальная (M)" },
							{ label: "D", surfs: ["D"], title: "Дистальная (D)" },
							{ label: "V", surfs: ["V"], title: "Вестибулярная (V)" },
							{ label: "L", surfs: ["L"], title: "Язычная / Нёбная (L)" },
							{ label: "К", surfs: ["K"], title: "Контактная / Коронковая (К)" },
							{ label: "А", surfs: ["A"], title: "Апикальная (А)" },
						].map((chip) => {
							const isSelected = chip.surfs.length > 0 && chip.surfs.every((s) => activeSurfaces.includes(s));
							return (
								<button
									key={chip.label}
									type="button"
									onClick={() => {
										setActiveSurfaces((prev) =>
											isSelected
												? prev.filter((s) => !chip.surfs.includes(s))
												: Array.from(new Set([...prev, ...chip.surfs])),
										);
									}}
									className={`flex-1 min-h-[44px] sm:min-h-[32px] min-w-[44px] px-2 py-1 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer select-none touch-manipulation flex items-center justify-center ${
										isSelected
											? "bg-teal-600 text-white border-teal-600 shadow-xs scale-105"
											: "bg-[var(--odontogram-paper,#ffffff)] dark:bg-zinc-900 text-[var(--odontogram-ink,#0f172a)] dark:text-zinc-200 border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700 hover:bg-[var(--odontogram-surface-hover,#e2e8f0)]"
									}`}
									title={chip.title}
									data-testid={`odontogram-module-surf-${chip.label}`}
								>
									{chip.label}
								</button>
							);
						})}
					</div>
					<details className="mt-1">
						<summary className="text-[11px] text-[var(--muted,#64748b)] cursor-pointer hover:underline text-center">
							Анатомическая 2D схема
						</summary>
						<div className="flex justify-center p-1">
							<SurfaceSelector selected={activeSurfaces} onChange={setActiveSurfaces} size={60} />
						</div>
					</details>
				</div>

				{/* 1-Tap Tooth Status Assignment */}
				{TOOTH_STATE_ACTIONS.map((action) => (
					<button
						key={action.state}
						type="button"
						onClick={() => onApplyToothState(action.state)}
						className={`flex items-center justify-center min-h-[48px] sm:min-h-[36px] p-3 sm:p-2 rounded-xl border transition-all duration-200 font-black text-sm sm:text-base cursor-pointer select-none active:scale-95 text-center leading-tight break-words min-w-0 ${action.className}`}
					>
						<span className="min-w-0 break-words text-center leading-tight">{action.label}</span>
					</button>
				))}

				<button
					type="button"
					data-testid="radial-menu-tooth-drawer-btn"
					onClick={() => {
						onOpenContextDrawer(menuConfig.toothNumber);
						onClose();
					}}
					className="col-span-2 flex items-center justify-center min-h-[48px] sm:min-h-[36px] p-3 sm:p-2 rounded-xl border transition-all duration-200 font-bold text-sm bg-teal-500/10 text-teal-800 dark:text-teal-200 border-teal-500/30 hover:bg-teal-500/20 cursor-pointer min-w-0 text-center leading-tight active:scale-95"
				>
					<Stethoscope className="w-4 h-4 inline mr-2 text-teal-600 shrink-0" />
					<span className="min-w-0 break-words">Карточка зуба / Детали (Tier 2)</span>
				</button>
				<button
					type="button"
					onClick={() => {
						onOpenHistory(menuConfig.toothNumber);
						onClose();
					}}
					className="col-span-2 flex items-center justify-center min-h-[48px] sm:min-h-[36px] p-3 sm:p-2 rounded-xl border transition-all duration-200 font-bold text-sm bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25 hover:bg-indigo-500/20 cursor-pointer min-w-0 text-center leading-tight"
				>
					<History className="w-4 h-4 inline mr-2 shrink-0" />
					<span className="min-w-0 break-words">История зуба</span>
				</button>
				<button
					type="button"
					data-testid="radial-menu-endo-log-btn"
					onClick={() => {
						onOpenEndo(menuConfig.toothNumber);
						onClose();
					}}
					className="col-span-2 flex items-center justify-center min-h-[48px] sm:min-h-[36px] p-3 sm:p-2 rounded-xl border transition-all duration-200 font-bold text-sm bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25 hover:bg-rose-500/20 cursor-pointer min-w-0 text-center leading-tight"
				>
					<Activity className="w-4 h-4 inline mr-2 shrink-0" />
					<span className="min-w-0 break-words">Журнал каналов (Эндо)</span>
				</button>
				<button
					type="button"
					data-testid="radial-menu-lab-order-btn"
					onClick={() => {
						const targets =
							selectedTeeth.length > 0 && selectedTeeth.includes(menuConfig.toothNumber)
								? selectedTeeth
								: [menuConfig.toothNumber];
						void onOneClickLabOrder(targets);
						onClose();
					}}
					className="col-span-2 flex items-center justify-center min-h-[48px] sm:min-h-[36px] p-3 sm:p-2 rounded-xl border transition-all duration-200 font-black text-sm bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-500/30 hover:bg-amber-500/25 cursor-pointer min-w-0 text-center leading-tight shadow-2xs active:scale-95"
				>
					<FlaskConical className="w-4 h-4 inline mr-2 text-amber-600 shrink-0" />
					<span className="min-w-0 break-words">Наряд ЗТЛ в 1 клик (Цирконий A2, +7 дн.)</span>
				</button>
				<button
					type="button"
					onClick={() => {
						const num = menuConfig.toothNumber;
						const currentTooth = teethData.find((t) => t.toothNumber === num);
						const st: ToothState = currentTooth?.state || "Healthy";
						const toothSurfaces = (activeSurfaces.length > 0 ? activeSurfaces : undefined);
						const anatomicalName = getToothAnatomicalNameRu(num);
						const findingPayload = toothSurfaces && toothSurfaces.length > 0
							? { toothNumber: num, state: st, surfaces: toothSurfaces }
							: { toothNumber: num, state: st };
						const soap = generateSoapFromOdontogramFinding(findingPayload);
						const clipText = `Зуб ${num} (${anatomicalName}): ${soap.diagnosisIcd10Label}.\n${soap.statusLocalis}\n${soap.treatmentDescription}`;
						try {
							navigator.clipboard?.writeText?.(clipText);
						} catch {
							// ignore clipboard permission
						}
						window.dispatchEvent(
							new CustomEvent("dente-apply-soap-protocol", {
								detail: {
									finding: findingPayload,
									soap,
									mode: "smart_append",
								},
							}),
						);
						showToast(`Протокол для зуба #${num} внесён в дневник приёма`, "success");
						onClose();
					}}
					aria-label="Вставить в дневник 043/у"
					className="col-span-2 flex items-center justify-center min-h-[48px] sm:min-h-[36px] p-3 sm:p-2 rounded-xl border transition-all duration-200 font-bold text-sm bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25 hover:bg-teal-500/20 cursor-pointer min-w-0 text-center leading-tight"
				>
					<Sparkles className="w-4 h-4 inline mr-2 shrink-0" />
					<span className="min-w-0 break-words">Вставить в дневник</span>
				</button>
			</div>
		</>,
		document.body,
	);
};
