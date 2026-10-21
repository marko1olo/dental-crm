import { Sparkles } from "lucide-react";
import type React from "react";

export interface OdontogramVoiceHudProps {
	readonly isVoiceListening: boolean;
	readonly voiceInterimText: string;
}

export const OdontogramVoiceHud: React.FC<OdontogramVoiceHudProps> = ({
	isVoiceListening,
	voiceInterimText,
}) => {
	if (!isVoiceListening) return null;

	return (
		<div
			className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-600 dark:text-blue-400 font-medium select-none shadow-xs animate-in fade-in duration-150"
			data-testid="odontogram-voice-live-hud"
		>
			<span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping shrink-0" />
			<span className="font-extrabold shrink-0 flex items-center gap-1">
				<Sparkles size={14} className="text-blue-500" />
				Gemini Live VAD:
			</span>
			<span className="italic animate-pulse truncate font-bold text-blue-700 dark:text-blue-300">
				{voiceInterimText
					? `«${voiceInterimText}»`
					: "Диктуйте формулу: «16 кариес», «24 пломба», «36 удалить», «47 пульпит», «тотальная санация»..."}
			</span>
		</div>
	);
};
