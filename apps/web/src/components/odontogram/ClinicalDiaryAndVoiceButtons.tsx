import { FileText, Mic } from "lucide-react";
import React from "react";

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
		"min-h-[36px] max-md:min-h-[44px] flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer select-none text-left bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper,#ffffff)] hover:border-[var(--primary,#0d9488)]/40";

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
						className="text-[var(--primary,#0d9488)] shrink-0"
					/>
					<div className="flex flex-col min-w-0">
						<span className="font-bold text-[12px] leading-tight text-[var(--ink,#0f172a)]">
							В дневник приёма
						</span>
						<span className="text-[10px] font-normal text-[var(--ink-muted,#64748b)] truncate">
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
				className={`${itemCls} ${isVoiceListening ? "bg-[var(--danger-soft,rgba(244,63,94,0.12))] border-[var(--danger,#e11d48)]/40 text-[var(--danger,#e11d48)]" : ""}`}
				title="Голосовая диктовка формулы"
				data-testid="odontogram-voice-dictation-btn"
			>
				<Mic
					size={16}
					className={
						isVoiceListening
							? "text-[var(--danger,#e11d48)] shrink-0"
							: "text-[var(--primary,#0d9488)] shrink-0"
					}
				/>
				<div className="flex flex-col min-w-0">
					<span className="font-bold text-[12px] leading-tight text-[var(--ink,#0f172a)]">
						{isVoiceListening ? "Остановить диктовку" : "Голосовая диктовка"}
					</span>
					<span className="text-[10px] font-normal text-[var(--ink-muted,#64748b)] truncate">
						Ввод патологий голосом
					</span>
				</div>
			</button>
		</>
	);
};
