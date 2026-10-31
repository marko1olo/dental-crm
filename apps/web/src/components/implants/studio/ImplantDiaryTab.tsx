/**
 * ImplantDiaryTab.tsx — Протокол операции имплантации по схеме SOAP (DENTE CRM).
 * Формирует клинический дневник для медицинской карты приёма без канцелярита
 * с возможностью копирования в 1 клик (Мандаты 8e, 8x, 8ap).
 */

import React, { useState } from "react";
import { Check, Copy, FileText } from "lucide-react";

export interface ImplantDiaryTabProps {
	readonly soapDiary: string;
	readonly toothFdi: number;
}

export const ImplantDiaryTab: React.FC<ImplantDiaryTabProps> = ({
	soapDiary,
	toothFdi,
}) => {
	const [isCopied, setIsCopied] = useState<boolean>(false);

	const handleCopy = async () => {
		try {
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				await navigator.clipboard.writeText(soapDiary);
				setIsCopied(true);
				setTimeout(() => setIsCopied(false), 2000);
			}
		} catch {
			// Fallback silently if clipboard is not allowed
		}
	};

	return (
		<div className="space-y-2.5" data-testid="tab-content-diary">
			<div className="flex items-center justify-between">
				<div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<FileText size={15} className="text-[var(--teal,#0d9488)]" />
					<span>Протокол операции (SOAP) для медицинской карты приёма:</span>
				</div>
				<button
					type="button"
					onClick={handleCopy}
					className={`min-h-[44px] sm:min-h-[32px] px-2.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
						isCopied
							? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
							: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
					}`}
					data-testid="btn-copy-diary"
				>
					{isCopied ? <Check size={13} /> : <Copy size={13} />}
					<span>{isCopied ? "✓ Скопировано" : "Скопировать дневник"}</span>
				</button>
			</div>
			<textarea
				readOnly
				value={soapDiary}
				rows={10}
				className="w-full p-3 font-mono text-xs rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] leading-relaxed resize-none focus:outline-none"
				data-testid="textarea-soap-diary"
				aria-label={`Протокол SOAP для зуба ${toothFdi}`}
			/>
		</div>
	);
};

export default ImplantDiaryTab;
