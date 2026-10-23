import React from "react";
import { CheckCircle2, Check, FileText } from "lucide-react";
import type { OrthopedicsChairsideLabOrderBannerProps } from "./orthopedicsBannerTypes.js";

export function OrthopedicsChairsideLabOrderBanner({
	readinessHeadline,
	orderNumber,
	technicianName,
	selectedMaterial,
	selectedShade,
	warrantyPassport,
	fittingConfirmed,
	onConfirmFitting,
	onOpenPassportA4,
}: OrthopedicsChairsideLabOrderBannerProps) {
	return (
		<div
			data-testid="ortho-chairside-linked-lab-order-banner"
			className="mb-2.5 p-2.5 sm:p-3 rounded-xl border border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/20 flex flex-wrap items-center justify-between gap-2.5"
		>
			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex items-center gap-2 flex-wrap">
					<CheckCircle2 size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span data-testid="ortho-chairside-readiness-headline" className="text-xs font-bold text-[var(--ink)]">
						{readinessHeadline}
					</span>
					<span className="px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[10px] font-mono font-bold">
						A16.07.004
					</span>
				</div>
				<div
					data-testid="ortho-chairside-bound-attributes"
					className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-medium text-[var(--muted)]"
				>
					<span>
						Наряд: <strong className="font-mono text-[var(--ink)]">{orderNumber}</strong>
					</span>
					<span>
						Техник: <strong className="text-[var(--ink)]">{technicianName}</strong>
					</span>
					<span>
						Материал: <strong className="text-[var(--ink)]">{selectedMaterial} ({selectedShade})</strong>
					</span>
					<span>
						Гарантийный паспорт: <strong className="font-mono text-[var(--ink)]">{warrantyPassport}</strong>
					</span>
				</div>
			</div>
			<div className="flex items-center gap-1.5 shrink-0 flex-wrap">
				{onOpenPassportA4 && (
					<button
						type="button"
						data-testid="banner-orthopedic-passport-btn"
						onClick={onOpenPassportA4}
						className="secondary-button min-h-[44px] sm:min-h-[34px] px-3 text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
						title="Сформировать Паспорт ортопедической конструкции и Гарантийный талон (А4)"
					>
						<FileText size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Паспорт (А4)</span>
					</button>
				)}
				<button
					type="button"
					data-testid="ortho-chairside-confirm-fitting-btn"
					onClick={onConfirmFitting}
					className={`min-h-[44px] sm:min-h-[34px] px-3.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
						fittingConfirmed
							? "bg-emerald-600 text-white shadow-xs"
							: "bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
					}`}
				>
					<Check size={15} />
					<span>
						{fittingConfirmed ? (
							<>
								<span className="hidden sm:inline">Примерка и фиксация подтверждены (A16.07.004)</span>
								<span className="sm:hidden">Фиксация (A16.07.004)</span>
							</>
						) : (
							<>
								<span className="hidden sm:inline">Подтвердить примерку / фиксацию (A16.07.004)</span>
								<span className="sm:hidden">Фиксация (A16.07.004)</span>
							</>
						)}
					</span>
				</button>
			</div>
		</div>
	);
}
