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
					<button type="button" onClick={() => void logic.loadCertificates()} className="secondary-button h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5">
						<RefreshCw size={13} />
						<span>Проверить снова</span>
					</button>
				</div>
			) : logic.certificates.length === 0 ? (
				<div className="text-xs p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded mb-3 text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-950/50" role="status">
					<strong className="block mb-1 font-semibold text-[var(--ink,#0f172a)]">Личных сертификатов в хранилище не найдено.</strong>
					<p className="mb-2 text-slate-500">{CERTIFICATE_STORE_ADVICE}</p>
					<button type="button" onClick={() => void logic.loadCertificates()} className="secondary-button h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5">
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
				<p className="text-xs p-2.5 border border-red-200 dark:border-red-900/30 rounded mb-3 text-red-800 dark:text-red-300 bg-red-50/50 dark:bg-red-950/20 leading-relaxed" role="status">
					{logic.signFailure}
				</p>
			)}

			<button
				type="button"
				onClick={logic.handleSign}
				disabled={logic.isSigning}
				className="primary-button min-h-[44px] sm:min-h-8 sm:h-8 w-full px-3 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-1.5"
			>
				{logic.isSigning ? (
					<>
						<Loader2 className="dente-icon-spin" size={15} />
						<span>Идет подписание... Введите PIN на токене</span>
					</>
				) : (
					<>
						<FileSignature size={15} />
						<span>Подписать УКЭП (КриптоПро)</span>
					</>
				)}
			</button>
		</div>
	);
}
