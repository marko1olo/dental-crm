/**
 * CbctHeaderStudioMenu.tsx — Выпадающее меню дополнительных инструментов студии (Мандат 8b).
 */

import React from "react";
import { MoreHorizontal, RotateCcw, Ruler, Spline } from "lucide-react";

export interface CbctHeaderStudioMenuProps {
	readonly isStudioMenuOpen: boolean;
	readonly setIsStudioMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly studioMenuRef: React.RefObject<HTMLDivElement | null>;
	readonly handleResetAll: () => void;
	readonly handleAutoDetectArch: () => void;
	readonly showDentalArch: boolean;
	readonly setShowDentalArch: React.Dispatch<React.SetStateAction<boolean>>;
	readonly showEdgeRulers?: boolean | undefined;
	readonly setShowEdgeRulers?: React.Dispatch<React.SetStateAction<boolean>> | undefined;
}

export const CbctHeaderStudioMenu: React.FC<CbctHeaderStudioMenuProps> = ({
	isStudioMenuOpen,
	setIsStudioMenuOpen,
	studioMenuRef,
	handleResetAll,
	handleAutoDetectArch,
	showDentalArch,
	setShowDentalArch,
	showEdgeRulers,
	setShowEdgeRulers,
}) => {
	return (
		<div className="relative" ref={studioMenuRef}>
			<button
				type="button"
				onClick={() => setIsStudioMenuOpen((prev) => !prev)}
				className="w-8 h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line)]/50 text-[var(--text)] flex items-center justify-center transition-colors"
				title="Дополнительные опции"
			>
				<MoreHorizontal className="w-4 h-4" />
			</button>

			{isStudioMenuOpen && (
				<div className="absolute right-0 top-10 z-50 w-56 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] p-1.5 shadow-xl text-xs flex flex-col gap-1">
					<button
						type="button"
						onClick={() => {
							handleAutoDetectArch();
							setIsStudioMenuOpen(false);
						}}
						className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[var(--text)] hover:bg-[var(--paper)] transition-colors"
					>
						<Spline className="w-4 h-4 text-[var(--primary)]" />
						<span>Автоопределение зубной дуги</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setShowDentalArch((prev) => !prev);
							setIsStudioMenuOpen(false);
						}}
						className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[var(--text)] hover:bg-[var(--paper)] transition-colors"
					>
						<span className="w-4 h-4 text-center font-bold text-[var(--primary)]">∩</span>
						<span>{showDentalArch ? "Скрыть зубную дугу" : "Показать зубную дугу"}</span>
					</button>

					{setShowEdgeRulers && (
						<button
							type="button"
							onClick={() => {
								setShowEdgeRulers((prev) => !prev);
								setIsStudioMenuOpen(false);
							}}
							className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[var(--text)] hover:bg-[var(--paper)] transition-colors"
						>
							<Ruler className="w-4 h-4 text-[var(--warning,orange)]" />
							<span>{showEdgeRulers ? "Скрыть шкалы по краям" : "Показать шкалы по краям"}</span>
						</button>
					)}

					<div className="h-px bg-[var(--line)] my-0.5" />

					<button
						type="button"
						onClick={() => {
							handleResetAll();
							setIsStudioMenuOpen(false);
						}}
						className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
					>
						<RotateCcw className="w-4 h-4" />
						<span>Сбросить все настройки</span>
					</button>
				</div>
			)}
		</div>
	);
};
