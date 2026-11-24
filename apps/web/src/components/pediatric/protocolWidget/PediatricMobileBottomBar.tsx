import React from "react";
import { Award, Coins, FileText, Printer } from "lucide-react";
import type { PediatricProtocolDefinition } from "./types";

export interface PediatricMobileBottomBarProps {
	readonly currentTooth: number;
	readonly activePreset: PediatricProtocolDefinition;
	readonly diagnosisIcd10: string;
	readonly servicesCount: number;
	readonly onInsertToClinicalNote?: () => void;
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
	onInsertToClinicalNote,
	onAddServicesToInvoice,
	onOpenMemoModal,
	onOpenDiplomaModal,
}) => {
	const handleApply = onInsertToClinicalNote || (() => {});

	return (
		<div
			className="md:hidden fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-[60] max-w-[100vw] overflow-x-clip backdrop-blur-xl bg-[var(--paper-strong)]/95 border-t border-[var(--line)] p-2.5 pb-2 shadow-[0_-4px_24px_rgba(0,0,0,0.22)] flex flex-col gap-1.5"
			data-testid="pediatric-mobile-bottom-bar"
		>
			{/* Верхняя строка мобильного бара: сводка диагноза + зуба */}
			<div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)] px-0.5">
				<span className="font-bold text-[var(--ink)] truncate">
					Зуб {currentTooth} • {activePreset.shortLabelRu}
				</span>
				<span className="font-mono text-xs font-extrabold text-[var(--primary)] shrink-0 ml-2">
					{diagnosisIcd10}
				</span>
			</div>

			{/* Главная кнопка действия (Primary CTA): ровно ОДНА Primary CTA кнопка (высота >= 52px, Мандат 8am/8ze) */}
			<button
				type="button"
				onClick={handleApply}
				className="flex h-[52px] min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-extrabold shadow-md transition active:scale-[0.98] cursor-pointer touch-manipulation select-none bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white"
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
					className="flex min-h-[44px] h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 text-xs font-bold transition active:scale-95 cursor-pointer touch-manipulation select-none"
					data-testid="pediatric-mobile-btn-invoice"
					title="Добавить услуги в смету"
				>
					<Coins className="h-4 w-4 shrink-0 text-[var(--primary)]" />
					<span className="truncate">В смету ({servicesCount})</span>
				</button>

				<button
					type="button"
					onClick={onOpenMemoModal}
					className="flex min-h-[44px] h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 text-xs font-bold transition active:scale-95 cursor-pointer touch-manipulation select-none"
					data-testid="pediatric-mobile-btn-memo"
					title="Печать памятки родителям"
				>
					<Printer className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
					<span className="truncate">Памятка</span>
				</button>

				<button
					type="button"
					onClick={onOpenDiplomaModal}
					className="flex min-h-[44px] h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 text-xs font-bold transition active:scale-95 cursor-pointer touch-manipulation select-none"
					data-testid="pediatric-mobile-btn-diploma"
					title="Печать диплома за храбрость"
				>
					<Award className="h-4 w-4 shrink-0 text-[var(--warning)]" />
					<span className="truncate">Диплом</span>
				</button>
			</div>
		</div>
	);
};
