import React from "react";
import { FileSignature, Printer, RefreshCw, ShieldCheck } from "lucide-react";

interface UkepPluginFallbackBannerProps {
	onDetectAgain: () => void;
	onFallbackPepSign?: (() => void) | undefined;
	onPrintPaperFallback?: (() => void) | undefined;
}

export function UkepPluginFallbackBanner({
	onDetectAgain,
	onFallbackPepSign,
	onPrintPaperFallback,
}: UkepPluginFallbackBannerProps) {
	return (
		<div
			className="p-3.5 border border-teal-500/30 bg-teal-500/5 dark:bg-teal-950/20 rounded-xl text-sm"
			data-testid="ukep-plugin-fallback-banner"
		>
			<div className="flex items-start text-[var(--ink,#0f172a)] mb-1.5">
				<ShieldCheck className="mr-2 shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" size={17} />
				<span className="font-semibold text-[13px]">
					Штатный режим работы (без СКЗИ КриптоПро)
				</span>
			</div>
			<p className="text-xs text-[var(--muted,#64748b)] mb-3 leading-relaxed">
				ЭЦП-плагин не подключен. В соответствии с регламентом документ заверяется простой электронной подписью (ПЭП) врача либо выводится на печать для живой подписи пациента.
			</p>
			<div className="flex flex-wrap items-center gap-2">
				{onFallbackPepSign && (
					<button
						type="button"
						onClick={onFallbackPepSign}
						className="primary-button h-9 min-h-[36px] px-3.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 bg-[var(--primary,#0d9488)] text-white"
						data-testid="btn-ukep-fallback-pep"
					>
						<FileSignature size={14} />
						<span>Подписать ПЭП в 1 клик</span>
					</button>
				)}
				{onPrintPaperFallback && (
					<button
						type="button"
						onClick={onPrintPaperFallback}
						className="secondary-button h-9 min-h-[36px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
						data-testid="btn-ukep-fallback-print"
					>
						<Printer size={14} />
						<span>Печать на бумагу</span>
					</button>
				)}
				<button
					type="button"
					onClick={onDetectAgain}
					className="secondary-button h-9 min-h-[36px] px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--ink)]"
					title="Проверить подключение Рутокен или КриптоПро"
				>
					<RefreshCw size={13} />
					<span>Проверить токен</span>
				</button>
			</div>
		</div>
	);
}
