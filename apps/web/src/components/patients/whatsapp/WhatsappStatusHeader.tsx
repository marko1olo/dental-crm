import { MessageSquare } from "lucide-react";
import React from "react";

interface WhatsappStatusHeaderProps {
	readonly phoneHint: string;
	readonly nameHint: string;
	readonly error: string | null;
	readonly lastOk: string | null;
}

export function WhatsappStatusHeader({
	phoneHint,
	nameHint,
	error,
	lastOk,
}: WhatsappStatusHeaderProps) {
	return (
		<>
			<div className="mb-3">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-200 tracking-wide flex items-center gap-1.5">
						<MessageSquare size={16} className="text-emerald-500 dark:text-emerald-400" />
						<span>WhatsApp пациенту</span>
					</h3>
					{phoneHint && (
						<span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
							{phoneHint}
						</span>
					)}
				</div>
				<p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
					Прямая отправка через Cloud API или быстрый чат wa.me. Подставляются имя пациента
					{nameHint ? ` (${nameHint})` : ""}, лечащий врач и параметры записи.
				</p>
			</div>

			{error ? (
				<p
					className="mb-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2"
					data-testid="patient-whatsapp-send-error"
					role="alert"
				>
					{error}
				</p>
			) : null}

			{lastOk ? (
				<p
					className="mb-3 text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2"
					data-testid="patient-whatsapp-send-ok"
					role="status"
				>
					{lastOk}
				</p>
			) : null}
		</>
	);
}
