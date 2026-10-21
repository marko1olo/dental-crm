import { FileText, Mic } from "lucide-react";
import type React from "react";

export interface ClinicalDiaryAndVoiceButtonsProps {
	readonly onSyncAllToDiary?: (() => void) | undefined;
	readonly onOpenVoiceDictation?: (() => void) | undefined;
	readonly toggleVoiceEngine: () => void;
	readonly isVoiceListening: boolean;
	readonly onCloseMenu: () => void;
}

export const ClinicalDiaryAndVoiceButtons: React.FC<
	ClinicalDiaryAndVoiceButtonsProps
> = ({
	onSyncAllToDiary,
	onOpenVoiceDictation,
	toggleVoiceEngine,
	isVoiceListening,
	onCloseMenu,
}) => {
	const itemCls =
		"min-h-[44px] sm:min-h-[38px] flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer select-none text-left bg-[var(--paper-soft,#f8fafc)] dark:bg-zinc-800/60 border-[var(--line,#e2e8f0)] dark:border-zinc-700/60 hover:bg-[var(--paper,#ffffff)] dark:hover:bg-zinc-800 hover:border-teal-500/40";

	return (
		<>
			{onSyncAllToDiary && (
				<button
					type="button"
					onClick={() => {
						onSyncAllToDiary();
						onCloseMenu();
					}}
					className={itemCls}
					title="Перенести статус формулы в дневник приёма"
					data-testid="btn-hotpath-sync-all-to-diary"
				>
					<FileText
						size={16}
						className="text-teal-600 dark:text-teal-400 shrink-0"
					/>
					<div className="flex flex-col min-w-0">
						<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
							В дневник приёма
						</span>
						<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">
							Синхронизация формулы с дневником
						</span>
					</div>
				</button>
			)}
			<button
				type="button"
				onClick={() => {
					if (onOpenVoiceDictation) onOpenVoiceDictation();
					else toggleVoiceEngine();
					onCloseMenu();
				}}
				className={`${itemCls} ${isVoiceListening ? "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300" : ""}`}
				title="Голосовая диктовка формулы"
				data-testid="odontogram-voice-dictation-btn"
			>
				<Mic
					size={16}
					className={
						isVoiceListening
							? "text-rose-600 dark:text-rose-400 shrink-0"
							: "text-teal-600 dark:text-teal-400 shrink-0"
					}
				/>
				<div className="flex flex-col min-w-0">
					<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
						{isVoiceListening ? "Остановить диктовку" : "Голосовая диктовка"}
					</span>
					<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">
						Ввод патологий голосом
					</span>
				</div>
			</button>
		</>
	);
};
