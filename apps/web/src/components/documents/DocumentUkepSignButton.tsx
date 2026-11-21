import React from "react";
import { FileSignature, Loader2, RefreshCw } from "lucide-react";
import type { DocumentUkepSignButtonProps } from "./ukepSignButton/types";
import { CERTIFICATE_STORE_ADVICE } from "./ukepSignButton/types";
import { useUkepSignLogic } from "./ukepSignButton/useUkepSignLogic";
import { UkepPluginFallbackBanner } from "./ukepSignButton/UkepPluginFallbackBanner";
import { UkepCertificateSelector } from "./ukepSignButton/UkepCertificateSelector";

export type { DocumentUkepSignButtonProps } from "./ukepSignButton/types";

export function DocumentUkepSignButton({
	documentId,
	onSuccess,
	onFallbackPepSign,
	onPrintPaperFallback,
}: DocumentUkepSignButtonProps) {
	const logic = useUkepSignLogic(documentId, onSuccess);

	if (logic.hasPlugin === null) {
		return (
			<div className="flex items-center justify-center p-3 text-sm text-[var(--muted,#64748b)] bg-[var(--paper-subtle,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] rounded-lg border border-[var(--glass-border,#e2e8f0)]">
				<Loader2 className="dente-icon-spin mr-2" size={16} />
				<span>Проверка плагина КриптоПро...</span>
			</div>
		);
	}

	if (!logic.hasPlugin) {
		return (
			<UkepPluginFallbackBanner
				onDetectAgain={() => {
					logic.detectPlugin();
				}}
				onFallbackPepSign={onFallbackPepSign}
				onPrintPaperFallback={onPrintPaperFallback}
			/>
		);
	}

	return (
		<div className="p-3.5 border border-[var(--line,#e2e8f0)] rounded-lg bg-[var(--paper-soft,#f8fafc)]">
			<label htmlFor="ukep-cert-select" className="block text-xs font-semibold text-[var(--ink,#0f172a)] mb-1.5">
				Сертификат электронной подписи врача (63-ФЗ):
			</label>

			{logic.certificatesState === "loading" ? (
				<div className="flex items-center text-xs text-[var(--muted,#64748b)] p-3">
					<Loader2 className="dente-icon-spin mr-2" size={14} />
					Чтение личного хранилища сертификатов КриптоПро...
				</div>
			) : logic.certificatesState === "failed" ? (
				<div className="text-xs p-3 border border-amber-200 dark:border-amber-900/30 rounded mb-3 text-amber-800 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20" role="status">
					<strong className="block mb-1 font-semibold">Хранилище сертификатов не прочитано:</strong>
					{logic.certificatesFailureDetail && <p className="mb-1 leading-relaxed">{logic.certificatesFailureDetail}</p>}
					<p className="mb-2 text-slate-600 dark:text-slate-400">{CERTIFICATE_STORE_ADVICE}</p>
					<button type="button" onClick={() => void logic.loadCertificates()} className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer">
						<RefreshCw size={13} />
						<span>Проверить снова</span>
					</button>
				</div>
			) : logic.certificates.length === 0 ? (
				<div className="text-xs p-3 border border-dashed border-[var(--line)] rounded mb-3 text-[var(--ink-muted)] bg-[var(--paper-soft)]" role="status">
					<strong className="block mb-1 font-semibold text-[var(--ink)]">Личных сертификатов в хранилище не найдено.</strong>
					<p className="mb-2 text-[var(--ink-muted)]">{CERTIFICATE_STORE_ADVICE}</p>
					<button type="button" onClick={() => void logic.loadCertificates()} className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-md border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer">
						<RefreshCw size={13} />
						<span>Проверить снова</span>
					</button>
				</div>
			) : (
				<UkepCertificateSelector
					certificates={logic.certificates}
					selectedThumbprint={logic.selectedThumbprint}
					onSelectThumbprint={logic.setSelectedThumbprint}
					isSigning={logic.isSigning}
					selectedCert={logic.selectedCert}
					isSelectedCertExpired={logic.isSelectedCertExpired}
					isSelectedCertNonGost={logic.isSelectedCertNonGost}
				/>
			)}

			{logic.signFailure && (
				<p className="text-xs p-2.5 border border-[var(--danger)]/30 rounded mb-3 text-[var(--danger)] bg-[var(--danger-soft)] leading-relaxed" role="status">
					{logic.signFailure}
				</p>
			)}

			<button
				type="button"
				onClick={() => {
					if (logic.isSigning) return;
					logic.handleSign();
				}}
				aria-busy={logic.isSigning || undefined}
				className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 w-full px-4 text-sm font-medium rounded-lg bg-[var(--primary)] text-white shadow-xs hover:bg-[var(--primary-hover)] transition-colors cursor-pointer border-none"
			>
				{logic.isSigning ? (
					<>
						<Loader2 className="dente-icon-spin w-4 h-4 shrink-0" />
						<span>Идет подписание... Введите PIN на токене</span>
					</>
				) : (
					<>
						<FileSignature className="w-4 h-4 shrink-0" />
						<span>Подписать УКЭП (КриптоПро)</span>
					</>
				)}
			</button>
		</div>
	);
}
