import React from "react";
import { ShieldCheck } from "lucide-react";

interface ClinicEgiszAutonomousRowProps {
	isAutonomousMode: boolean;
	updateClinicProfileDraft: (field: string, value: any) => void;
}

export const ClinicEgiszAutonomousRow: React.FC<ClinicEgiszAutonomousRowProps> = ({
	isAutonomousMode,
	updateClinicProfileDraft,
}) => {
	return (
		<>
			<div
				className="flex items-center justify-between pt-3 border-t border-[var(--line)]"
				data-testid="egisz-autonomous-mode-row"
			>
				<div className="space-y-0.5 pr-4">
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold text-[var(--ink)] block">
							Автономный режим (без принудительной выгрузки в ЕГИСЗ)
						</span>
						<span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
							Мандат 8n
						</span>
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0 leading-relaxed">
						Для соло-врачей и небольших клиник: все интеграционные проверки носят исключительно информационный характер. Сохранение приёма, печать протоколов и касса никогда не блокируются.
					</p>
				</div>
				<label className="relative inline-flex items-center cursor-pointer shrink-0">
					<input
						type="checkbox"
						data-testid="toggle-egisz-autonomous-mode"
						checked={isAutonomousMode}
						onChange={(e) =>
							updateClinicProfileDraft("egiszAutonomousMode", e.target.checked)
						}
						className="sr-only peer"
					/>
					<div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
				</label>
			</div>

			{isAutonomousMode && (
				<div
					className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-2.5"
					data-testid="egisz-autonomous-banner"
				>
					<ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
					<div className="space-y-0.5">
						<strong className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 block">
							Автономный режим активен: полная автономия врача (Мандаты 8e и 8n)
						</strong>
						<p className="text-xs text-[var(--ink)] m-0 leading-relaxed">
							Приём пациентов, сохранение дневника, печать протоколов и касса работают без блокировок шлюза. Документы подписываются локально и ставятся в очередь отправки в РЭМД без задержек у кресла.
						</p>
					</div>
				</div>
			)}
		</>
	);
};
