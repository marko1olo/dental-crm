/**
 * IntakePackageFooter.tsx
 *
 * Подвал модального окна пакета документов.
 *
 * Инварианты Apple HIG & Мандата 8am, 8e:
 * - Natural Thumb Zone (нижняя треть экрана, липкая нижняя плашка на мобильных).
 * - Учет safe-area-inset-bottom.
 * - Ровно ОДНА Primary CTA кнопка (#0d9488 Teal) на видимый экран.
 * - Все остальные кнопки — второстепенные outline/neutral.
 * - Кнопка печати НИКОГДА не блокируется (disabled = false).
 */

import { Printer } from "lucide-react";
import React from "react";
import type { ClinicalPackageTab } from "./types";

export interface IntakePackageFooterProps {
	readonly activeTab: ClinicalPackageTab;
	readonly onClose: () => void;
	readonly onPrintBlank: () => void;
	readonly onPrintPrimaryPackage: () => void;
	readonly onPrintClinicalPackage: () => void;
	readonly onPrintTaxCertificate: () => void;
}

export function IntakePackageFooter({
	activeTab,
	onClose,
	onPrintBlank,
	onPrintPrimaryPackage,
	onPrintClinicalPackage,
	onPrintTaxCertificate,
}: IntakePackageFooterProps): React.JSX.Element {
	return (
		<div
			className="p-3 sm:p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0"
			style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
			data-testid="intake-package-footer"
		>
			<div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 w-full sm:w-auto">
				<button
					type="button"
					onClick={onClose}
					className="secondary-button w-full sm:w-auto min-h-[44px] px-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)]/30 transition cursor-pointer"
					data-testid="btn-close-package-footer"
				>
					Закрыть
				</button>

				{activeTab === "primary" ? (
					<button
						type="button"
						onClick={onPrintBlank}
						className="secondary-button w-full sm:w-auto min-h-[44px] px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] transition cursor-pointer text-center"
						title="Распечатать чистый бланк пакета с линиями для ручного заполнения шариковой ручкой (Мандат 8e)"
						data-testid="btn-print-blank-intake-package"
					>
						<Printer size={16} className="mr-1.5 shrink-0 inline" />
						<span>Бланк (_____)</span>
					</button>
				) : (
					<div className="sm:hidden" />
				)}
			</div>

			{/* THE ONE PRIMARY CTA BUTTON (Mandate 8am & 8e) */}
			<div className="w-full sm:w-auto">
				{activeTab === "primary" && (
					<button
						type="button"
						onClick={onPrintPrimaryPackage}
						className="primary-button w-full sm:w-auto min-h-[44px] px-6 rounded-xl bg-[var(--teal,#0d9488)] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-[0.99] transition cursor-pointer"
						data-testid="btn-print-primary-package-cta"
					>
						<Printer size={16} />
						<span>Распечатать пакет первичного приёма</span>
					</button>
				)}

				{activeTab === "clinical" && (
					<button
						type="button"
						onClick={onPrintClinicalPackage}
						className="primary-button w-full sm:w-auto min-h-[44px] px-6 rounded-xl bg-[var(--teal,#0d9488)] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-[0.99] transition cursor-pointer"
						data-testid="btn-print-clinical-package-cta"
					>
						<Printer size={16} />
						<span>Распечатать клинический пакет</span>
					</button>
				)}

				{activeTab === "tax" && (
					<button
						type="button"
						onClick={onPrintTaxCertificate}
						className="primary-button w-full sm:w-auto min-h-[44px] px-6 rounded-xl bg-[var(--teal,#0d9488)] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-[0.99] transition cursor-pointer"
						data-testid="btn-print-tax-certificate-cta"
					>
						<Printer size={16} />
						<span>Сформировать справку НДФЛ</span>
					</button>
				)}
			</div>
		</div>
	);
}
