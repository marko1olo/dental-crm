/**
 * IntakePackageHeader.tsx
 *
 * Шапка модального окна пакета документов первичного приёма.
 *
 * Инварианты Apple HIG & Мандата 8am:
 * - Мобильный тактильный Drag Handle 36x5px по центру шторки.
 * - Сенсорный минимум (Touch Target) >= 44x44px для всех кнопок и табов.
 * - Ноль паразитного дрифта (0px horizontal overflow).
 */

import type { Patient } from "@dental/shared";
import { ShieldCheck, Stethoscope, X, Zap } from "lucide-react";
import React from "react";
import type { ClinicalPackageTab } from "./types";

export interface IntakePackageHeaderProps {
	readonly patient: Patient | null;
	readonly activeTab: ClinicalPackageTab;
	readonly onSelectTab: (tab: ClinicalPackageTab) => void;
	readonly onClose: () => void;
}

export function IntakePackageHeader({
	patient,
	activeTab,
	onSelectTab,
	onClose,
}: IntakePackageHeaderProps): React.JSX.Element {
	return (
		<div className="shrink-0 flex flex-col bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)]">
			{/* Apple HIG Tactile Drag Handle (Mobile only, 36x5px) */}
			<div
				className="sm:hidden flex justify-center items-center py-2.5 cursor-grab bg-[var(--paper-soft,#f8fafc)] touch-manipulation min-h-[24px]"
				onClick={onClose}
				aria-label="Закрыть свайпом"
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") onClose();
				}}
			>
				<div className="w-9 h-[5px] rounded-full bg-[var(--line-strong,#94a3b8)]" />
			</div>

			{/* Main Title Bar */}
			<div className="flex items-center justify-between px-4 sm:px-6 py-3">
				<div className="flex items-center gap-3 min-w-0">
					<div className="w-9 h-9 rounded-xl bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
						<Stethoscope size={18} aria-hidden="true" />
					</div>
					<div className="min-w-0">
						<h3
							className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] truncate leading-tight"
							id="clinical-package-modal-title"
						>
							Пакет первичной документации
						</h3>
						<p className="text-[11px] sm:text-xs text-[var(--muted,#64748b)] truncate mt-0.5">
							{patient?.fullName || "Пациент не выбран"}
							{patient?.cardNumber ? ` · Карта № ${patient.cardNumber}` : ""}
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="secondary-button min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)]/50 transition cursor-pointer"
					aria-label="Закрыть окно"
					data-testid="btn-close-package-modal"
				>
					<X size={18} aria-hidden="true" />
				</button>
			</div>

			{/* Category Switcher Tabs (Touch Target >= 44px) */}
			<div className="flex items-center px-4 sm:px-6 pb-2.5 gap-2 bg-[var(--paper,#ffffff)] border-t border-[var(--line,#e2e8f0)] overflow-x-auto no-scrollbar">
				<button
					type="button"
					onClick={() => onSelectTab("primary")}
					className={`secondary-button min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
						activeTab === "primary"
							? "bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30"
							: "border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
					data-testid="tab-package-primary"
				>
					<ShieldCheck size={16} aria-hidden="true" />
					<span>Первичный визит (4 бланка)</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTab("clinical")}
					className={`secondary-button min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
						activeTab === "clinical"
							? "bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30"
							: "border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
					data-testid="tab-package-clinical"
				>
					<Stethoscope size={16} aria-hidden="true" />
					<span>Клинический пакет (5 бланков)</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTab("tax")}
					className={`secondary-button min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
						activeTab === "tax"
							? "bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30"
							: "border border-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
					}`}
					data-testid="tab-package-tax"
				>
					<Zap size={16} aria-hidden="true" />
					<span>Справка 13% НДФЛ</span>
				</button>
			</div>
		</div>
	);
}
