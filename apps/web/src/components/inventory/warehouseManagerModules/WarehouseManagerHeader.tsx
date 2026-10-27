import { ArrowLeft, ClipboardCheck, FileText, Package, X } from "lucide-react";
import React from "react";

export interface WarehouseManagerHeaderProps {
	readonly activeView: "inventory" | "act_preview";
	readonly onBackToInventory: () => void;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onSwitchToAct: () => void;
	readonly onClose: () => void;
	readonly writeoffCount: number;
	readonly cabinetName: string;
	readonly nurseName: string;
	readonly doctorName: string;
}

export const WarehouseManagerHeader: React.FC<WarehouseManagerHeaderProps> = ({
	activeView,
	onBackToInventory,
	onOpenInventoryAudit,
	onSwitchToAct,
	onClose,
	writeoffCount,
	cabinetName,
	nurseName,
	doctorName,
}) => {
	return (
		<header className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border,#e2e8f0)] bg-[var(--paper-strong,#f8fafc)] shrink-0">
			<div className="flex items-center gap-3">
				<div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
					<Package size={20} />
				</div>
				<div className="min-w-0">
					<h2 className="text-base font-bold leading-tight truncate">
						{activeView === "inventory" ? "Складской учет и списание расходников" : "Акт списания материалов (Единолично)"}
					</h2>
					<p className="text-xs text-[var(--muted,#64748b)] truncate">
						{cabinetName} • {nurseName} • {doctorName}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				{activeView === "act_preview" ? (
					<button
						type="button"
						className="h-9 px-3 text-xs font-semibold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)] flex items-center gap-1.5 transition-colors cursor-pointer"
						onClick={onBackToInventory}
						data-testid="back-to-inventory-btn"
					>
						<ArrowLeft size={14} />
						К списку склада
					</button>
				) : (
					<>
						{onOpenInventoryAudit && (
							<button
								type="button"
								className="h-9 px-3 text-xs font-semibold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)] flex items-center gap-1.5 transition-colors cursor-pointer"
								onClick={onOpenInventoryAudit}
								data-testid="switch-to-inventory-audit-btn"
								title="Перейти к инвентаризации остатков"
							>
								<ClipboardCheck size={14} />
								Инвентаризация остатков
							</button>
						)}
						<button
							type="button"
							className="h-9 px-3 text-xs font-semibold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] flex items-center gap-1.5 transition-colors cursor-pointer"
							onClick={onSwitchToAct}
							data-testid="switch-to-act-btn"
							title="Оформить акт списания единолично"
						>
							<FileText size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
							Акт списания ({writeoffCount})
						</button>
					</>
				)}
				<button
					type="button"
					className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)] transition-colors cursor-pointer"
					onClick={onClose}
					aria-label="Закрыть окно склада"
				>
					<X size={18} />
				</button>
			</div>
		</header>
	);
};
