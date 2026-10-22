import React from "react";
import { Check, Copy } from "lucide-react";

interface EndoFooterPrimaryButtonsProps {
	readonly isSaving: boolean;
	readonly onCopyPatientMemo: () => void;
	readonly onInsertToProtocol: () => void;
}

export const EndoFooterPrimaryButtons: React.FC<EndoFooterPrimaryButtonsProps> = ({
	isSaving,
	onCopyPatientMemo,
	onInsertToProtocol,
}) => (
	<div className="flex items-center gap-2 sm:gap-2.5">
		<button
			type="button"
			onClick={onCopyPatientMemo}
			data-testid="endo-copy-patient-memo-btn"
			className="secondary-button flex-1 sm:flex-initial min-h-[50px] sm:min-h-[36px] h-11 sm:h-9 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-98"
			title="Скопировать памятку по уходу после лечения каналов для отправки пациенту в WhatsApp/Telegram"
		>
			<Copy size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
			<span>
				<span className="hidden sm:inline">Скопировать для пациента</span>
				<span className="sm:hidden">Памятка</span>
			</span>
		</button>

		{/* Ровно ОДНА Primary CTA кнопка в едином стиле DENTE (Мандат 8e, Мандат 8am) */}
		<button
			type="button"
			data-testid="insert-endo-protocol-btn"
			onClick={onInsertToProtocol}
			className="primary-button flex-1 sm:flex-initial min-h-[50px] sm:min-h-[36px] h-11 sm:h-9 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-bold bg-[var(--primary,#0d9488)] hover:brightness-110 active:scale-98 text-white flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap"
			title="Зафиксировать параметры каналов и перенести протокол в дневник визита"
		>
			<Check size={18} className="shrink-0" />
			<span>
				{isSaving ? (
					"Фиксация..."
				) : (
					<>
						<span className="hidden sm:inline">Зафиксировать протокол каналов</span>
						<span className="sm:hidden">Зафиксировать</span>
					</>
				)}
			</span>
		</button>
	</div>
);
