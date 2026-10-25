import React from "react";
import { Network, ShieldCheck } from "lucide-react";

interface ClinicEgiszHeaderProps {
	isEgiszEnabled: boolean;
	isAutonomousMode: boolean;
	updateClinicProfileDraft: (field: string, value: any) => void;
}

export const ClinicEgiszHeader: React.FC<ClinicEgiszHeaderProps> = ({
	isEgiszEnabled,
	isAutonomousMode,
	updateClinicProfileDraft,
}) => {
	return (
		<>
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] flex items-center justify-center shrink-0">
						<Network size={18} aria-hidden="true" />
					</div>
					<div>
						<h4 className="text-sm font-bold text-[var(--ink)] m-0">
							Интеграция с ЕГИСЗ (ФРМО / РЭМД Минздрава РФ)
						</h4>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							Передача электронных медицинских документов (ЭМД) в федеральный реестр
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{isAutonomousMode && (
						<span
							className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5"
							data-testid="badge-egisz-autonomous"
						>
							<ShieldCheck size={13} />
							<span>Автономия врача</span>
						</span>
					)}
					<span
						className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
							isEgiszEnabled
								? "bg-teal-500/10 text-[var(--teal)] border border-teal-500/30"
								: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]"
						}`}
						data-testid="badge-egisz-status"
					>
						{isEgiszEnabled ? (
							<>
								<ShieldCheck size={13} />
								<span>Адаптер активен</span>
							</>
						) : (
							<span>Отключен (по умолчанию)</span>
						)}
					</span>
				</div>
			</div>

			<div className="flex items-center justify-between pt-3 border-t border-[var(--line)]">
				<div className="space-y-0.5">
					<span className="text-xs font-bold text-[var(--ink)] block">
						Включить передачу протоколов в ЕГИСЗ
					</span>
					<p className="text-[11px] text-[var(--muted)] m-0">
						Требуется для частных клиник по Постановлению Правительства № 140
					</p>
				</div>
				<label className="relative inline-flex items-center cursor-pointer">
					<input
						type="checkbox"
						data-testid="toggle-egisz-enabled"
						checked={isEgiszEnabled}
						onChange={(e) => updateClinicProfileDraft("egiszEnabled", e.target.checked)}
						className="sr-only peer"
					/>
					<div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600" />
				</label>
			</div>
		</>
	);
};
