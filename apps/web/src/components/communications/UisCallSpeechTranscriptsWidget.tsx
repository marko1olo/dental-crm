import React, { useEffect, useState } from "react";

interface TranscriptItem {
	id: string;
	organizationId: string;
	callSessionId: string;
	patientName: string;
	transcriptText: string;
	keyTimestampsJson: string;
	sentimentScore: string;
	createdAt: string;
}

export const UisCallSpeechTranscriptsWidget: React.FC = () => {
	const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/communications/uis-call-speech-transcripts", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setTranscripts(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[UisCallSpeechTranscriptsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="uis-call-speech-transcripts-widget"
			className="p-4 bg-slate-900 border border-emerald-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🎙️</span>
					<h3 className="font-semibold text-emerald-400">
						Речевая Аналитика и Расшифровка Звонков (UIS С Таймкодами)
					</h3>
				</div>
				<span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
					UIS Speech AI
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка расшифровок звонков...</div>
			) : (
				<div className="space-y-3">
					{transcripts.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col gap-2"
						>
							<div className="flex items-center justify-between">
								<div className="text-sm font-bold text-slate-200">
									Звонок {item.callSessionId} — <span className="text-emerald-300 font-semibold">{item.patientName}</span>
								</div>
								<span className="text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-mono">
									{item.sentimentScore}
								</span>
							</div>
							<div className="text-xs text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-700/60 font-mono">
								"{item.transcriptText}"
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
