import React from "react";
import { Award, Coins, FileText, Printer } from "lucide-react";
import type { PediatricProtocolDefinition } from "./types";

export interface PediatricMobileBottomBarProps {
	readonly currentTooth: number;
	readonly activePreset: PediatricProtocolDefinition;
	readonly diagnosisIcd10: string;
	readonly servicesCount: number;
	readonly onInsertToForm043: () => void;
	readonly onAddServicesToInvoice: () => void;
	readonly onOpenMemoModal: () => void;
	readonly onOpenDiplomaModal: () => void;
}

export const PediatricMobileBottomBar: React.FC<
	PediatricMobileBottomBarProps
> = ({
	currentTooth,
	activePreset,
	diagnosisIcd10,
	servicesCount,
	onInsertToForm043,
	onAddServicesToInvoice,
	onOpenMemoModal,
	onOpenDiplomaModal,
}) => {
	return (
		<div
			className="md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-[var(--paper-strong,#ffffff)]/95 dark:bg-zinc-900/95 border-t border-[var(--line,#e2e8f0)] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_24px_rgba(0,0,0,0.22)] flex flex-col gap-2"
			data-testid="pediatric-mobile-bottom-bar"
		>
			{/* Верхняя строка мобильного бара: сводка диагноза + зуба */}
			<div className="flex items-center justify-between text-[11px] text-[var(--muted,#64748b)] px-0.5">
				<span className="font-bold text-[var(--ink,#0f172a)] truncate">
					Зуб {currentTooth} • {activePreset.shortLabelRu}
				</span>
				<span className="font-mono text-xs font-extrabold text-teal-700 dark:text-teal-400 shrink-0 ml-2">
					{diagnosisIcd10}
				</span>
			</div>

			{/* Главная кнопка действия (Primary CTA): Внести протокол в карту (высота >= 52px) */}
			<button
				type="button"
				onClick={onInsertToForm043}
				className="flex h-[52px] min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-extrabold shadow-md transition active:scale-[0.98] cursor-pointer touch-manipulation select-none"
				style={{
					backgroundColor: "var(--accent, #0d9488)",
					color: "#ffffff",
					boxShadow: "0 4px 14px rgba(13, 148, 136, 0.4)",
				}}
				data-testid="pediatric-mobile-btn-apply"
				title="Внести протокол в медицинскую карту"
				aria-label="Внести в карту"
			>
				<FileText className="h-5 w-5 shrink-0 text-white" />
				<span className="text-white">Внести протокол в карту</span>
			</button>

			{/* Быстрые вторичные действия в зоне большого пальца: плитки >= 44x44px */}
			<div className="grid grid-cols-3 gap-2">
				<button
					type="button"
					onClick={onAddServicesToInvoice}
					className="flex min-h-[44px] h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition active:scale-95 cursor-pointer touch-manipulation select-none"
					style={{
						backgroundColor: "var(--paper, #ffffff)",
						borderColor: "var(--line, #e2e8f0)",
						color: "var(--ink, #0f172a)",
					}}
					data-testid="pediatric-mobile-btn-invoice"
					title="Добавить услуги в смету"
				>
					<Coins className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
					<span className="truncate">В смету ({servicesCount})</span>
				</button>

				<button
					type="button"
					onClick={onOpenMemoModal}
					className="flex min-h-[44px] h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition active:scale-95 cursor-pointer touch-manipulation select-none"
					style={{
						backgroundColor: "var(--paper, #ffffff)",
						borderColor: "var(--line, #e2e8f0)",
						color: "var(--ink, #0f172a)",
					}}
					data-testid="pediatric-mobile-btn-memo"
					title="Печать памятки родителям"
				>
					<Printer className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
					<span className="truncate">Памятка</span>
				</button>

				<button
					type="button"
					onClick={onOpenDiplomaModal}
					className="flex min-h-[44px] h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition active:scale-95 cursor-pointer touch-manipulation select-none"
					style={{
						backgroundColor: "var(--paper, #ffffff)",
						borderColor: "var(--line, #e2e8f0)",
						color: "var(--ink, #0f172a)",
					}}
					data-testid="pediatric-mobile-btn-diploma"
					title="Печать диплома за храбрость"
				>
					<Award className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
					<span className="truncate">Диплом</span>
				</button>
			</div>
		</div>
	);
};
