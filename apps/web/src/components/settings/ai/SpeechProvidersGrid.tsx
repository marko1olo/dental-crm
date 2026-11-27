import React from "react";
import type {
	SpeechProvider,
	SpeechProviderHealth,
	SpeechProviderRuntimeStatus,
} from "@dental/shared";
import { CheckCircle2, ExternalLink, MicOff } from "lucide-react";

export interface SpeechProvidersGridProps {
	providers: SpeechProvider[];
	runtimeById: Map<string, SpeechProviderRuntimeStatus>;
	healthById: Map<string, SpeechProviderHealth>;
	modeLabels: Record<SpeechProvider["mode"], string>;
	healthLabels: Record<string, string>;
}

export const SpeechProvidersGrid: React.FC<SpeechProvidersGridProps> = ({
	providers,
	runtimeById,
	healthById,
	modeLabels,
	healthLabels,
}) => {
	if (providers.length === 0) {
		return (
			<div
				className="py-10 px-4 flex flex-col items-center justify-center text-center gap-2 rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper-soft)]"
				data-testid="speech-providers-empty"
			>
				<MicOff className="w-10 h-10 text-[var(--muted)]" aria-hidden="true" />
				<p className="text-sm font-semibold text-[var(--ink)] m-0">
					Провайдеры распознавания речи не настроены
				</p>
				<p className="text-xs text-[var(--muted)] m-0 max-w-md">
					Добавьте ключ Google Gemini, OpenAI Whisper или локального сервера диктовки в настройках клиники, чтобы включить голосовой ввод у кресла.
				</p>
			</div>
		);
	}

	return (
		<div className="ai-provider-grid">
			{providers.map((provider) => {
				const runtime = runtimeById.get(provider.id);
				const health = healthById.get(provider.id);
				return (
					<article className="premium-provider-card" key={provider.id}>
						<div className="premium-provider-header">
							<div className="premium-provider-title">
								<h4>{provider.title}</h4>
								<p>{modeLabels[provider.mode]}</p>
							</div>
							{health && (
								<span className={`status-pill status-${health.healthLevel === "ready" ? "confirmed" : "cancelled"}`}>
									{healthLabels[health.healthLevel] ?? health.healthLevel}
								</span>
							)}
						</div>
						<div className="premium-provider-tags">
							{provider.recommendedFor.slice(0, 3).map((item) => (
								<span className="premium-provider-tag" key={item}>{item}</span>
							))}
						</div>
						<ul className="premium-provider-strengths">
							{provider.strengths.slice(0, 2).map((s) => <li key={s}>{s}</li>)}
						</ul>
						<div className="premium-provider-footer">
							<span><strong>Лицензия:</strong> {provider.costNote}</span>
							{runtime && (
								<span>
									<strong>Интеграция:</strong>
									<span className={runtime.configured ? "speech-runtime-ready" : "speech-runtime-missing"}>
										{runtime.canTranscribeChunks ? (
											<span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
												<CheckCircle2 size={12} /><span>Готов</span>
											</span>
										) : runtime.configured ? "Настроен" : "Не настроен"}
									</span>
								</span>
							)}
							<a href={provider.sourceUrl} target="_blank" rel="noreferrer noopener" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
								Документация <ExternalLink size={12} />
							</a>
						</div>
					</article>
				);
			})}
		</div>
	);
};
