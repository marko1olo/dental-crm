import React from "react";
import { CheckCircle2, Loader2, Receipt } from "lucide-react";

interface TaxationCardHeaderProps {
	ffdVersion: string;
	kkmModel: string;
	saveStatus: string;
	isLoading: boolean;
	isSaving: boolean;
	onSave: () => Promise<void> | void;
}

export const TaxationCardHeader: React.FC<TaxationCardHeaderProps> = ({
	ffdVersion,
	kkmModel,
	saveStatus,
	isLoading,
	isSaving,
	onSave,
}) => {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3.5">
			<div className="flex items-center gap-3 min-w-0">
				<div className="w-9 h-9 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--primary)] flex items-center justify-center shrink-0">
					<Receipt size={18} />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h3 className="font-bold text-base text-[var(--ink)] m-0">
							Налогообложение (СНО) и касса клиники
						</h3>
						<span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]">
							Кассовый чек ({ffdVersion}) · {kkmModel}
						</span>
						{saveStatus === "saved" && !isLoading && (
							<span
								className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--ok-bg)] text-[var(--ok-fg)] border border-[var(--line)]"
								data-testid="fiscal-save-status-badge"
							>
								Синхронизировано с БД
							</span>
						)}
					</div>
					<p className="text-xs text-[var(--ink-muted)] m-0 mt-0.5">
						Режим налогообложения клиники, привязка фискального регистратора
						ККТ и передача чеков в ОФД
					</p>
				</div>
			</div>

			<button
				type="button"
				onClick={() => void onSave()}
				disabled={isSaving}
				data-testid="btn-save-fiscal-settings"
				className="h-9 min-h-[36px] px-3.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs text-[13px] inline-flex items-center gap-1.5 font-semibold shrink-0 self-start sm:self-auto cursor-pointer transition-all"
			>
				{isSaving ? (
					<Loader2 size={16} className="w-4 h-4 animate-spin shrink-0" />
				) : (
					<CheckCircle2 size={16} className="w-4 h-4 shrink-0" />
				)}
				<span>{isSaving ? "Сохранение..." : "Применить СНО и ККТ"}</span>
			</button>
		</div>
	);
};
