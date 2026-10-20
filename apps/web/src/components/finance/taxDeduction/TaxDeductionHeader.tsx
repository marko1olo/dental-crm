import React from "react";
import {
	ClipboardList,
	FileText,
	X,
	FileCode,
	ListOrdered,
	Users,
} from "lucide-react";
import type { TaxDeductionHeaderProps, TaxDeductionTab } from "./types";

const TABS: readonly { id: TaxDeductionTab; label: string; icon: React.FC<{ size?: number }> }[] = [
	{ id: "form", label: "Реквизиты и Справка А4", icon: FileText },
	{ id: "checks", label: "Чеки и оказанные услуги", icon: ListOrdered },
	{ id: "family", label: "Пакетная выгрузка (Семья)", icon: Users },
	{ id: "xml", label: "Реестр XML 5.01 (ТКС)", icon: FileCode },
	{ id: "registry", label: "Реестр справок ФНС", icon: ClipboardList },
];

export const TaxDeductionHeader: React.FC<TaxDeductionHeaderProps> = ({
	activeTab,
	onTabChange,
	onClose,
	yearPaymentsCount,
}) => {
	const isSigned = yearPaymentsCount > 0;

	return (
		<div className="shrink-0 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
			{/* Top Bar */}
			<div className="px-5 py-3.5 flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div
						className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
						style={{
							background: "rgba(13, 148, 136, 0.14)",
							color: "#0d9488",
							border: "1px solid rgba(13, 148, 136, 0.3)",
						}}
					>
						<FileText className="w-5 h-5" />
					</div>
					<div>
						<div className="flex items-center gap-2 flex-wrap">
							<h2 className="text-base sm:text-lg font-bold m-0 text-[var(--ink,#0f172a)]">
								Справка для налогового вычета (13% НДФЛ)
							</h2>
							<span
								className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold"
								style={{
									background: "rgba(13, 148, 136, 0.12)",
									color: "#0d9488",
									border: "1px solid rgba(13, 148, 136, 0.28)",
								}}
							>
								Справка для налоговой (ФНС) • Вычет 13%
							</span>
							<span
								data-testid="tax-certificate-stamp-badge"
								className="px-2 py-0.5 rounded-md text-[11px] font-bold border uppercase tracking-wider"
								style={{
									background: isSigned ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.15)",
									color: isSigned ? "#059669" : "#64748b",
									borderColor: isSigned ? "rgba(16, 185, 129, 0.4)" : "rgba(100, 116, 139, 0.3)",
								}}
							>
								{isSigned ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК"}
							</span>
						</div>
						<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
							Справка об оплате медицинских услуг • Вычет 13% • Разделение сумм по Коду 1 и Коду 2 • QR-код для налоговой
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer shrink-0"
					aria-label="Закрыть модальное окно справки"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			{/* Navigation Tabs Bar — Single-row horizontally scrollable on mobile (Apple HIG) */}
			<div
				className="px-3 sm:px-5 pt-1 flex gap-1 sm:gap-2 overflow-x-auto flex-nowrap border-t border-[var(--line,#e2e8f0)]"
				style={{ scrollbarWidth: "none" }}
			>
				{TABS.map((t) => {
					const Icon = t.icon;
					const isActive = activeTab === t.id;
					const labelText = t.id === "checks" ? `${t.label} (${yearPaymentsCount})` : t.label;
					return (
						<button
							key={t.id}
							type="button"
							data-testid={`tax-tab-${t.id}`}
							onClick={() => onTabChange(t.id)}
							className="min-h-[44px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer rounded-t-xl shrink-0 whitespace-nowrap"
							style={{
								borderBottom: isActive ? "2px solid #0d9488" : "2px solid transparent",
								background: isActive ? "var(--paper, #ffffff)" : "transparent",
								color: isActive ? "#0d9488" : "var(--muted, #64748b)",
							}}
						>
							<Icon size={16} />
							<span>{labelText}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
