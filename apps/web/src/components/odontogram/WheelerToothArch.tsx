/**
 * apps/web/src/components/odontogram/WheelerToothArch.tsx
 *
 * Каноническая анатомическая одонтограмма Wheeler 2.5D DENTE CRM.
 * Поддерживает режим исторической панорамы анамнеза (PatientCard) и клинического интерактивного осмотра.
 * Мандаты 8ar, 8as, 8e (Автономия врача), 8b (Sweet spot <= 300 строк).
 */

import React, { useCallback, useMemo, useState } from "react";
import type { ToothData, ToothState } from "./ToothChart";
import { AnatomicalGate0Row } from "./anatomicalDualArch/AnatomicalGate0Row";
import { ToothHistoryChronicle } from "./ToothHistoryChronicle";
import { History, Sparkles } from "lucide-react";

export interface WheelerToothArchProps {
	readonly patientId?: string | undefined;
	readonly teethData?: readonly ToothData[] | undefined;
	readonly teethDataMap?: Map<number, ToothData> | undefined;
	readonly selectedTeeth?: number[] | undefined;
	readonly mode?: "history" | "interactive" | undefined;
	readonly onToothClick?: ((e: React.MouseEvent<HTMLElement> | number, toothNumber?: number) => void) | undefined;
	readonly onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[]) => void) | undefined;
	readonly activeStamp?: ToothState | null | undefined;
	readonly isDark?: boolean | undefined;
	readonly zoom?: number | undefined;
	readonly showWisdomTeeth?: boolean | undefined;
	readonly dentitionMode?: "adult" | "pediatric" | "mixed" | undefined;
	readonly className?: string | undefined;
	readonly showHistoryChronicleOnSelect?: boolean | undefined;
}

const UPPER_Q1 = [18, 17, 16, 15, 14, 13, 12, 11] as const;
const UPPER_Q2 = [21, 22, 23, 24, 25, 26, 27, 28] as const;
const LOWER_Q4 = [48, 47, 46, 45, 44, 43, 42, 41] as const;
const LOWER_Q3 = [31, 32, 33, 34, 35, 36, 37, 38] as const;

export const WheelerToothArch: React.FC<WheelerToothArchProps> = React.memo(({
	patientId,
	teethData = [],
	teethDataMap,
	selectedTeeth = [],
	mode = "history",
	onToothClick,
	onQuickStateChange,
	activeStamp,
	isDark,
	zoom = 0.52,
	showWisdomTeeth = true,
	className,
	showHistoryChronicleOnSelect = true,
}) => {
	const [activeHistoryTooth, setActiveHistoryTooth] = useState<number | null>(null);

	const map = useMemo(() => {
		if (teethDataMap) return teethDataMap;
		const m = new Map<number, ToothData>();
		for (const t of teethData) {
			m.set(t.toothNumber, t);
		}
		return m;
	}, [teethData, teethDataMap]);

	const dark = isDark ?? (typeof document !== "undefined" && document.documentElement.classList.contains("dark"));

	const handleToothClickInternal = useCallback(
		(e: React.MouseEvent<HTMLElement>, num: number) => {
			if (activeStamp && onQuickStateChange) {
				onQuickStateChange([num], activeStamp, []);
				return;
			}
			if (onToothClick) {
				onToothClick(e, num);
			}
			if (showHistoryChronicleOnSelect && patientId) {
				setActiveHistoryTooth(num);
			}
		},
		[activeStamp, onQuickStateChange, onToothClick, showHistoryChronicleOnSelect, patientId],
	);

	const q1 = useMemo(() => showWisdomTeeth ? UPPER_Q1 : UPPER_Q1.filter((n) => n !== 18), [showWisdomTeeth]);
	const q2 = useMemo(() => showWisdomTeeth ? UPPER_Q2 : UPPER_Q2.filter((n) => n !== 28), [showWisdomTeeth]);
	const q4 = useMemo(() => showWisdomTeeth ? LOWER_Q4 : LOWER_Q4.filter((n) => n !== 48), [showWisdomTeeth]);
	const q3 = useMemo(() => showWisdomTeeth ? LOWER_Q3 : LOWER_Q3.filter((n) => n !== 38), [showWisdomTeeth]);

	return (
		<div
			className={`wheeler-tooth-arch-container w-full flex flex-col items-center select-none ${className ?? ""}`}
			data-testid="wheeler-tooth-arch"
			data-mode={mode}
		>
			{mode === "history" && (
				<div className="w-full flex items-center justify-between px-2 py-1 mb-1 border-b border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] text-xs text-[var(--muted,#64748b)]">
					<div className="flex items-center gap-1.5 font-semibold text-[var(--ink,#0f172a)] dark:text-slate-200">
						<History className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<span>Историческая панорама Wheeler 2.5D</span>
					</div>
					<div className="flex items-center gap-3 text-[11px]">
						<span className="flex items-center gap-1">
							<span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 shadow-2xs inline-block" />
							<span>Интактные (эмаль)</span>
						</span>
						<span className="flex items-center gap-1">
							<span className="w-2.5 h-2.5 rounded-full bg-teal-600/70 border border-teal-700 inline-block" />
							<span>Пролеченные (анамнез)</span>
						</span>
						<span className="flex items-center gap-1">
							<span className="w-2.5 h-2.5 rounded-sm border border-dashed border-slate-400 inline-block" />
							<span>Отсутствующие</span>
						</span>
					</div>
				</div>
			)}

			<div className="w-full max-w-[980px] flex flex-col items-center justify-center gap-1 mx-auto py-1 overflow-x-auto">
				<AnatomicalGate0Row
					isUpper={true}
					leftTeeth={q1}
					rightTeeth={q2}
					teethDataMap={map}
					selectedTeeth={selectedTeeth}
					isDark={dark}
					zoom={zoom}
					onToothClick={handleToothClickInternal}
					archTitle="Верхняя челюсть (18–28)"
				/>

				{/* Окклюзионная плоскость смыкания */}
				<div className="w-full max-w-4xl flex items-center justify-center gap-3 my-0.5" title="Окклюзионная плоскость смыкания">
					<div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/60" />
					<span className="text-[10px] uppercase font-bold tracking-widest text-slate-400/90 dark:text-slate-500/90 select-none">
						Линия окклюзии Wheeler 2.5D
					</span>
					<div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-700/60" />
				</div>

				<AnatomicalGate0Row
					isUpper={false}
					leftTeeth={q4}
					rightTeeth={q3}
					teethDataMap={map}
					selectedTeeth={selectedTeeth}
					isDark={dark}
					zoom={zoom}
					onToothClick={handleToothClickInternal}
					archTitle="Нижняя челюсть (48–38)"
				/>
			</div>

			{/* Контекстная шторка истории зуба при клике в режиме панорамы */}
			{activeHistoryTooth !== null && patientId && (
				<ToothHistoryChronicle
					patientId={patientId}
					toothNumber={activeHistoryTooth}
					onClose={() => setActiveHistoryTooth(null)}
				/>
			)}
		</div>
	);
});

WheelerToothArch.displayName = "WheelerToothArch";
export default WheelerToothArch;
