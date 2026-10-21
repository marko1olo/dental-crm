import React from "react";
import { QrCode } from "lucide-react";

export interface SignatureQrBlockProps {
	readonly qrSvg: string;
}

export const SignatureQrBlock: React.FC<SignatureQrBlockProps> = ({ qrSvg }) => {
	return (
		<div className="p-4 rounded-2xl bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/20 flex flex-col sm:flex-row items-center gap-4">
			<div
				className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 shrink-0"
				data-testid="qr-code-svg-container"
				dangerouslySetInnerHTML={{ __html: qrSvg }}
			/>
			<div className="space-y-2">
				<div className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--ink)]">
					<QrCode size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
					<span>Сканирование QR-кода пациентом</span>
				</div>
				<p className="text-xs text-[var(--muted)] leading-relaxed m-0">
					Покажите этот экран пациенту. При наведении камеры смартфона откроется защищенный портал клиники для ознакомления и утверждения плана.
				</p>
				<div className="flex items-center gap-2 pt-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
					<span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
					<span>Ожидание подтверждения на смартфоне пациента...</span>
				</div>
			</div>
		</div>
	);
};
