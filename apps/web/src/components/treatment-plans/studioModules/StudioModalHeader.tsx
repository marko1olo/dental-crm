/**
 * StudioModalHeader.tsx — Шапка студии планов лечения (SSOT).
 * Мандаты 8am, 8e, Apple HIG: сенсорные зоны >= 44x44px, свобода скидок врача до 100%,
 * Segmented switcher глубины (Экспресс / Эксперт).
 */

import React from "react";
import { Stethoscope, Percent, Printer, X, Zap, ShieldCheck } from "lucide-react";
import type { StudioDepthMode } from "./useStudioPlanLifecycle";

const DISCOUNT_PRESETS = [0, 5, 10, 15, 20, 50, 100] as const;

export interface StudioModalHeaderProps {
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly depthMode: StudioDepthMode;
	readonly setDepthMode: (mode: StudioDepthMode) => void;
	readonly doctorDiscountPercent: number;
	readonly setDoctorDiscountPercent: (pct: number) => void;
	readonly isDiscountBarOpen: boolean;
	readonly setIsDiscountBarOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly handleExportPdf: () => void;
	readonly onClose: () => void;
}

export const StudioModalHeader: React.FC<StudioModalHeaderProps> = ({
	patientName,
	doctorFullName,
	depthMode,
	setDepthMode,
	doctorDiscountPercent,
	setDoctorDiscountPercent,
	isDiscountBarOpen,
	setIsDiscountBarOpen,
	handleExportPdf,
	onClose,
}) => {
	return (
		<>
			<header className="tp-studio-header flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 min-h-[52px]">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-9 h-9 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
						<Stethoscope className="w-5 h-5" />
					</div>
					<div className="flex flex-col min-w-0">
						<h2 id="treatment-studio-title" className="text-sm sm:text-base font-bold text-[var(--ink)] truncate m-0">
							<span className="sm:hidden">План лечения</span>
							<span className="hidden sm:inline">Комплексный план лечения</span>
						</h2>
						<div className="flex items-center gap-1.5 sm:gap-2 text-xs text-[var(--muted)] truncate">
							<span className="font-semibold text-[var(--ink)] truncate">
								{patientName || "Пациент не выбран"}
							</span>
							{doctorFullName && (
								<>
									<span className="hidden sm:inline">·</span>
									<span className="hidden sm:inline truncate">{doctorFullName}</span>
								</>
							)}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{/* Переключатель глубины на десктопе: Экспресс vs Эксперт (Apple Segmented Control) */}
					<div className="tp-depth-switch hidden sm:flex items-center p-0.5 bg-[var(--paper-soft)] border border-[var(--line-subtle)] rounded-xl" role="tablist">
						<button
							type="button"
							role="tab"
							aria-selected={depthMode === "express"}
							onClick={() => setDepthMode("express")}
							className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
								depthMode === "express"
									? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border-[var(--line)] font-bold"
									: "bg-transparent border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="depth-mode-express-btn"
							title="Режим «Экспресс»: чистый 1-экранный интерфейс сметы"
						>
							<Zap className="w-3.5 h-3.5 shrink-0" />
							<span>Экспресс</span>
						</button>

						<button
							type="button"
							role="tab"
							aria-selected={depthMode === "expert"}
							onClick={() => setDepthMode("expert")}
							className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
								depthMode === "expert"
									? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border-[var(--line)] font-bold"
									: "bg-transparent border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="depth-mode-expert-btn"
							title="Режим «Клинический эксперт»: этапы, гарантийный паспорт, фотопротокол"
						>
							<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
							<span>Эксперт</span>
						</button>
					</div>

					{/* Скидка врача до 100% */}
					<button
						type="button"
						onClick={() => setIsDiscountBarOpen((prev) => !prev)}
						className={`tp-studio-header-btn inline-flex min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:h-9 px-2.5 py-1.5 sm:py-1 rounded-xl border text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer ${
							doctorDiscountPercent > 0 ? "bg-[var(--teal-soft,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--line-subtle)]"
						}`}
						title="Скидка врача до 100%"
						data-testid="toggle-discount-btn"
					>
						<Percent className="w-4 h-4 shrink-0" />
						<span className="hidden sm:inline">{doctorDiscountPercent > 0 ? `Скидка ${doctorDiscountPercent}%` : "Скидка врача"}</span>
					</button>

					{/* Печать плана (Мандат 8e: ровно одна лаконичная кнопка в шапке) */}
					<button
						type="button"
						onClick={handleExportPdf}
						className="dente-btn dente-btn-secondary !hidden sm:!inline-flex sm:min-h-[36px] sm:h-9 px-3.5 py-1.5 sm:py-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer"
						title="Печать плана и договора"
						data-testid="print-plan-btn"
						id="print-plan-btn"
					>
						<Printer className="w-4 h-4 text-current shrink-0" />
						<span>Печать плана</span>
					</button>

					{/* Закрытие модалки */}
					<button
						type="button"
						onClick={onClose}
						className="tp-studio-header-btn inline-flex min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:h-9 sm:w-9 sm:min-w-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] items-center justify-center transition-colors cursor-pointer"
						aria-label="Закрыть студию планов лечения"
						data-testid="close-studio-btn"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
			</header>

			{/* Мобильный компактный переключатель глубины (только на <640px) */}
			<div className="sm:hidden flex items-center justify-between px-4 py-2 bg-[var(--paper-soft)] border-b border-[var(--line-subtle)] shrink-0">
				<span className="text-xs font-medium text-[var(--muted)]">Режим сметы:</span>
				<div className="flex items-center p-0.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={depthMode === "express"}
						onClick={() => setDepthMode("express")}
						className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
							depthMode === "express"
								? "bg-[var(--teal-soft)] text-[var(--teal,#0d9488)] font-bold shadow-2xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="depth-mode-express-btn-mobile"
					>
						<Zap className="w-3.5 h-3.5 shrink-0" />
						<span>Экспресс</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={depthMode === "expert"}
						onClick={() => setDepthMode("expert")}
						className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
							depthMode === "expert"
								? "bg-[var(--teal-soft)] text-[var(--teal,#0d9488)] font-bold shadow-2xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="depth-mode-expert-btn-mobile"
					>
						<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
						<span>Эксперт</span>
					</button>
				</div>
			</div>

			{/* Панель скидки врача: свобода скидки до 100% без паролей */}
			{isDiscountBarOpen && (
				<div className="px-4 sm:px-6 py-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center gap-3 flex-wrap text-xs" data-testid="doctor-discount-bar">
					<span className="font-bold text-[var(--ink)]">Скидка врача:</span>
					<div className="flex items-center gap-1.5 flex-wrap">
						{DISCOUNT_PRESETS.map((pct) => (
							<button
								key={pct}
								type="button"
								onClick={() => setDoctorDiscountPercent(pct)}
								className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
									doctorDiscountPercent === pct ? "bg-[var(--teal-soft)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)] shadow-2xs font-bold" : "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--line-subtle)]"
								}`}
							>
								{pct === 100 ? "100% (Гарантия)" : `${pct}%`}
							</button>
						))}
					</div>
					{doctorDiscountPercent > 0 && <span className="text-[var(--teal,#0d9488)] font-semibold ml-auto">Применена скидка {doctorDiscountPercent}% на все варианты</span>}
				</div>
			)}
		</>
	);
};
