import type { GranularStaffRole } from "@dental/shared";
import { ShieldCheck, X } from "lucide-react";
import type React from "react";
import { GranularRoleMatrixView } from "./GranularRoleMatrixView";

export interface AccessMatrixModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialRole?: GranularStaffRole;
	readonly initialModuleFilter?: string;
	readonly props?: Record<string, unknown>;
}

export const AccessMatrixModal: React.FC<AccessMatrixModalProps> = ({
	isOpen,
	onClose,
	initialRole = "doctor",
	initialModuleFilter = "all",
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			data-testid="settings-access-modal-container"
		>
			<div className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl shadow-2xl p-3 sm:p-5 overflow-hidden max-h-[94vh] flex flex-col min-w-0">
				{/* Compact Modal Header (38px height) */}
				<div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 mb-2 shrink-0 gap-3 min-w-0">
					<div className="flex items-center gap-2 min-w-0 flex-1">
						<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shrink-0">
							<ShieldCheck className="w-4 h-4" />
						</div>
						<div className="min-w-0 flex-1 flex items-center gap-2.5 flex-wrap">
							<h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white m-0 break-words leading-none">
								Ролевая матрица доступа (RBAC 152-ФЗ)
							</h3>
							<span className="text-[11px] px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-mono">
								8 ролей · 22 права
							</span>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center shrink-0 cursor-pointer touch-manipulation"
						data-testid="close-settings-access-modal-btn"
						aria-label="Закрыть матрицу доступа"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Monolithic Role Matrix Area (Occupies >= 80% modal viewport) */}
				<div className="flex-1 overflow-y-auto min-w-0 pr-0.5">
					<GranularRoleMatrixView
						initialRole={initialRole}
						initialModuleFilter={initialModuleFilter}
					/>
				</div>
			</div>
		</div>
	);
};

export default AccessMatrixModal;
