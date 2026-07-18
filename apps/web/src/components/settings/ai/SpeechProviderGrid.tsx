import { ExternalLink } from "lucide-react";

export function SpeechProviderGrid({
	typedSpeechProviders,
	speechProviderRuntimeById,
	speechProviderHealthById,
	speechProviderModeLabels,
	speechProviderHealthLabels,
}: {
	typedSpeechProviders: any[];
	speechProviderRuntimeById: Map<string, any>;
	speechProviderHealthById: Map<string, any>;
	speechProviderModeLabels: any;
	speechProviderHealthLabels: any;
}) {
	return (
		<>
			<h4 style={{ margin: "12px 0 4px", fontSize: "15px" }}>
				Доступные провайдеры
			</h4>
			<div className="ai-provider-grid">
				{typedSpeechProviders.map((provider) => {
					const runtime = speechProviderRuntimeById.get(provider.id);
					const health = speechProviderHealthById.get(provider.id);
					return (
						<article className="premium-provider-card" key={provider.id}>
							<div className="premium-provider-header">
								<div className="premium-provider-title">
									<h4>{provider.title}</h4>
									<p>{speechProviderModeLabels[provider.mode]}</p>
								</div>
								{health && (
									<span
										className={`status-pill status-${health.healthLevel === "healthy" ? "confirmed" : "cancelled"}`}
									>
										{speechProviderHealthLabels[health.healthLevel] ??
											health.healthLevel}
									</span>
								)}
							</div>

							<div className="premium-provider-tags">
								{provider.recommendedFor.slice(0, 3).map((item: string) => (
									<span className="premium-provider-tag" key={item}>
										{item}
									</span>
								))}
							</div>

							<ul className="premium-provider-strengths">
								{provider.strengths.slice(0, 2).map((strength: string) => (
									<li key={strength}>{strength}</li>
								))}
							</ul>

							<div className="premium-provider-footer">
								<span>
									<strong>Лицензия:</strong> {provider.costNote}
								</span>
								{runtime && (
									<span>
										<strong>Интеграция:</strong>
										<span
											className={
												runtime.configured
													? "speech-runtime-ready"
													: "speech-runtime-missing"
											}
										>
											{runtime.canTranscribeChunks
												? "✅ Готов"
												: runtime.configured
													? "Настроен"
													: "Не настроен"}
										</span>
									</span>
								)}
								<a
									href={provider.sourceUrl}
									target="_blank"
									rel="noreferrer noopener"
									style={{
										fontSize: "12px",
										display: "flex",
										alignItems: "center",
										gap: "4px",
										marginTop: "4px",
									}}
								>
									Документация <ExternalLink size={12} />
								</a>
							</div>
						</article>
					);
				})}
			</div>
		</>
	);
}
