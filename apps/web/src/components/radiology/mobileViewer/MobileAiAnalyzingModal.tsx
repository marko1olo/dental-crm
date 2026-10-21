import { RefreshCw } from "lucide-react";
import type React from "react";

export const MobileAiAnalyzingModal: React.FC<{ isAnalyzingAI?: boolean }> = ({
	isAnalyzingAI,
}) => {
	if (!isAnalyzingAI) return null;
	return (
		<div
			className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 z-40"
			data-testid="mobile-ai-analyzing-modal"
		>
			<div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 animate-spin mb-3">
				<RefreshCw size={24} />
			</div>
			<div className="text-sm font-bold text-white mb-1">
				Анализ рентгеновского снимка...
			</div>
			<div className="text-xs text-slate-400">
				Выявление кариеса дентина, периапикальных очагов и резорбции
			</div>
		</div>
	);
};
