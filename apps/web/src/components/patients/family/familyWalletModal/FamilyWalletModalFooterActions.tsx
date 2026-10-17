/**
 * apps/web/src/components/patient/familyWalletModal/FamilyWalletModalFooterActions.tsx
 *
 * Layer 4: Footer bar and action controls for Family Wallet Modal.
 * Touch targets >= 44x44px on mobile, dense desktop styling.
 */

import React from "react";
import { Check, Plus, X } from "lucide-react";
import type { FamilyWalletTab } from "./types";

export interface FamilyWalletModalFooterActionsProps {
	readonly activeTab: FamilyWalletTab;
	readonly onNavigateTab: (tab: FamilyWalletTab) => void;
	readonly onSavePermissions: () => void;
	readonly onClose: () => void;
}

export const FamilyWalletModalFooterActions: React.FC<FamilyWalletModalFooterActionsProps> =
	React.memo(function FamilyWalletModalFooterActions({
		activeTab,
		onNavigateTab,
		onSavePermissions,
		onClose,
	}) {
		return (
			<div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-[var(--glass-border)] bg-[var(--paper-strong)] gap-3 shrink-0">
				<span className="text-[11px] text-[var(--muted)] text-center sm:text-left">
					Семейная группа • Точный финансовый учет без копеечного дрифта
				</span>

				<div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 whitespace-nowrap">
					{activeTab === "overview" && (
						<>
							<button
								type="button"
								onClick={onSavePermissions}
								style={{ padding: "0 12px" }}
								className="min-h-[44px] sm:min-h-[32px] h-8 px-3 border border-[var(--glass-border)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
							>
								<Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span>Сохранить права</span>
							</button>

							<button
								type="button"
								onClick={() => onNavigateTab("topup")}
								style={{
									backgroundColor: "#0d9488",
									color: "#ffffff",
									borderColor: "#0d9488",
									padding: "0 14px",
								}}
								className="min-h-[44px] sm:min-h-[32px] h-8 text-xs font-semibold rounded-lg cursor-pointer hover:opacity-95 transition-opacity inline-flex items-center gap-1.5 shadow-xs whitespace-nowrap"
							>
								<Plus className="w-3.5 h-3.5 shrink-0" />
								<span>Пополнить семейный счет</span>
							</button>
						</>
					)}

					<button
						type="button"
						onClick={onClose}
						style={{ padding: "0 12px" }}
						className="min-h-[44px] sm:min-h-[32px] h-8 px-3.5 border border-[var(--glass-border)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
					>
						<X className="w-3.5 h-3.5 shrink-0" />
						<span>Закрыть</span>
					</button>
				</div>
			</div>
		);
	});
