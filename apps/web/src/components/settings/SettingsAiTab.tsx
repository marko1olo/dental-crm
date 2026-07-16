import { Bot, Sparkles, UploadCloud, Server, Activity, CheckCircle2, ShieldAlert, Cpu, ExternalLink } from "lucide-react";
import "./SettingsAiTab.css";
import type { ChangeEvent } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;

export function SettingsAiTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const {
		recognitionPresets,
		speechProviders,
		dictationHistory,
		recognitionJob,
		speechProviderRuntimeById,
		speechProviderHealthById,
		speechProviderStatusLabels,
		speechProviderModeLabels,
		speechProviderConnectorLabels,
		speechProviderHealthLabels,
		recognitionKind,
		recognitionTarget,
		chooseRecognitionPreset,
		recognitionText,
		setRecognitionText,
		setRecognitionJob,
		recognitionTargetLabels,
		runRecognitionJob,
		isRecognitionLoading,
		recognitionInputReady,
		aiRecognitionWarningText,
		sendRecognitionResultToImport,
		speechRecoveryStateLabels,
		speechRecordingPathLabels,
		speechRecordingStrategy,
		activeSpeechProviderHealth,
		speechGatewayHealthReport,
		refreshSpeechRuntime,
		speechProviderSelectionLabels,
		speechGatewayCanUpload,
		speechGatewayStatus,
	} = mergedProps;

	const typedRecognitionPresets = (recognitionPresets ?? []) as any[];
	const typedSpeechProviders = (speechProviders ?? []) as any[];
	const typedSpeechRecordingRecovery = mergedProps.speechRecordingRecovery as any;
	const _typedDictationHistory = (dictationHistory ?? []) as any[];
	const typedRecognitionJob = recognitionJob as any;

	return (
		<div className="ai-studio-container animate-fade-in">
			{/* Speech Recognition Gateway */}
			<section className="ai-section-card">
				<div className="ai-section-header">
					<div className="ai-section-icon">
						<Bot size={24} />
					</div>
					<div className="ai-section-title">
						<h3>Распознавание речи (Gateway)</h3>
						<p>Настройки локальных и облачных нейросетей для диктовки протоколов</p>
					</div>
				</div>

				{speechGatewayStatus ? (
					<div className="ai-gateway-status">
						<div className={`ai-gateway-status-pill ${speechGatewayCanUpload(speechGatewayStatus) ? 'success' : 'warning'}`}>
							<span>Статус сервера</span>
							<strong>
								{speechGatewayCanUpload(speechGatewayStatus) ? "Подключено" : "Не активно"}
							</strong>
						</div>
						<div className="ai-gateway-status-pill">
							<span>Провайдер</span>
							<strong>{speechGatewayStatus.providerLabel}</strong>
						</div>
						<div className="ai-gateway-status-pill">
							<span>Отсев дублей</span>
							<strong>{speechGatewayStatus.chunkingPolicy.dedupeWindowChars} симв.</strong>
						</div>
						<div className="ai-gateway-status-pill">
							<span>Стоматологический словарь</span>
							<strong>
								{speechGatewayStatus.promptPolicy.enabled 
									? `Включен (${speechGatewayStatus.promptPolicy.termCount} терм.)` 
									: "Выключен"}
							</strong>
						</div>
						<div className="ai-gateway-status-pill" style={{ borderRight: 'none', marginLeft: 'auto' }}>
							<button className="secondary-button btn--sm" type="button" onClick={() => void refreshSpeechRuntime({ silent: false })}>
								<Activity size={14} style={{ marginRight: '6px' }} /> Проверить шлюз
							</button>
						</div>
					</div>
				) : null}

				{speechGatewayHealthReport ? (
					<div className="ai-gateway-status" style={{ background: 'rgba(13, 148, 136, 0.05)', borderColor: 'rgba(13, 148, 136, 0.2)' }}>
						<div className="ai-gateway-status-pill">
							<span>Пул ключей</span>
							<strong>{speechGatewayHealthReport.totalAvailableKeys} из {speechGatewayHealthReport.totalConfiguredKeys}</strong>
						</div>
						<div className="ai-gateway-status-pill">
							<span>Резервных каналов</span>
							<strong>{speechGatewayHealthReport.fallbackProviderIds.length}</strong>
						</div>
						<div className="ai-gateway-status-pill">
							<span>Таймаут</span>
							<strong>{Math.round(speechGatewayHealthReport.timeoutMs / 1000)} сек.</strong>
						</div>
						{speechGatewayHealthReport.warnings[0] && (
							<div className="ai-gateway-status-pill warning" style={{ flex: 1, border: 'none' }}>
								<span>Внимание</span>
								<strong>{speechGatewayHealthReport.warnings[0]}</strong>
							</div>
						)}
					</div>
				) : null}

				<h4 style={{ margin: '12px 0 4px', fontSize: '15px' }}>Доступные провайдеры</h4>
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
										<span className={`status-pill status-${health.healthLevel === 'healthy' ? 'confirmed' : 'cancelled'}`}>
											{speechProviderHealthLabels[health.healthLevel] ?? health.healthLevel}
										</span>
									)}
								</div>
								
								<div className="premium-provider-tags">
									{provider.recommendedFor.slice(0, 3).map((item: string) => (
										<span className="premium-provider-tag" key={item}>{item}</span>
									))}
								</div>

								<ul className="premium-provider-strengths">
									{provider.strengths.slice(0, 2).map((strength: string) => (
										<li key={strength}>{strength}</li>
									))}
								</ul>

								<div className="premium-provider-footer">
									<span><strong>Лицензия:</strong> {provider.costNote}</span>
									{runtime && (
										<span>
											<strong>Интеграция:</strong>
											<span className={runtime.configured ? "speech-runtime-ready" : "speech-runtime-missing"}>
												{runtime.canTranscribeChunks ? "✅ Готов" : runtime.configured ? "Настроен" : "Не настроен"}
											</span>
										</span>
									)}
									<a href={provider.sourceUrl} target="_blank" rel="noreferrer noopener" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
										Документация <ExternalLink size={12} />
									</a>
								</div>
							</article>
						);
					})}
				</div>
			</section>

			{/* AI Workbench */}
			<section className="ai-section-card">
				<div className="ai-section-header">
					<div className="ai-section-icon">
						<Cpu size={24} />
					</div>
					<div className="ai-section-title">
						<h3>Лаборатория нейросетей</h3>
						<p>Тестирование структурирования текста в медицинские карты и диагнозы</p>
					</div>
				</div>

				<div className="ai-target-row">
					{typedRecognitionPresets.map((preset) => (
						<button
							className={`ai-target-card ${recognitionKind === preset.kind && recognitionTarget === preset.target ? "active" : ""}`}
							key={preset.key}
							type="button"
							onClick={() => chooseRecognitionPreset(preset)}
						>
							<strong>{preset.title}</strong>
							<span>{preset.detail}</span>
						</button>
					))}
				</div>

				<div className="ai-workbench">
					<textarea
						className="ai-workbench-textarea"
						placeholder="Вставьте сырой текст диктовки для проверки ИИ-ассистента..."
						value={recognitionText}
						onChange={(event: TextInputChangeEvent) => {
							setRecognitionText(event.target.value);
							setRecognitionJob(null);
						}}
					/>
					<div className="ai-workbench-action">
						<span style={{ fontSize: '13px', color: 'var(--muted)' }}>
							Цель: <strong>{recognitionTargetLabels[recognitionTarget]}</strong>
						</span>
						<button
							className="primary-button"
							type="button"
							onClick={runRecognitionJob}
							disabled={isRecognitionLoading || !recognitionInputReady}
						>
							<Sparkles size={16} style={{ marginRight: '8px' }} />
							{isRecognitionLoading ? "Генерация ответа..." : "Распознать текст"}
						</button>
					</div>
				</div>

				{typedRecognitionJob && (
					<div className="ai-result-panel">
						<div className="ai-result-panel-head">
							<span className="ai-result-confidence">
								<CheckCircle2 size={16} /> Уверенность: {Math.round(typedRecognitionJob.confidence * 100)}%
							</span>
							<span className="status-pill status-confirmed">{typedRecognitionJob.suggestedNextStep}</span>
						</div>
						
						<p className="ai-result-text">{typedRecognitionJob.resultText}</p>

						{typedRecognitionJob.warnings?.length > 0 && (
							<div className="ai-result-warnings">
								{typedRecognitionJob.warnings.map((warning: string) => (
									<div className="ai-result-warning-item" key={warning}>
										<ShieldAlert size={14} /> {aiRecognitionWarningText(warning)}
									</div>
								))}
							</div>
						)}

						{(typedRecognitionJob.target === "patient_import" || typedRecognitionJob.target === "visit_note") && (
							<button
								className="secondary-button"
								style={{ alignSelf: 'flex-start', marginTop: '8px' }}
								type="button"
								onClick={sendRecognitionResultToImport}
							>
								<UploadCloud size={16} style={{ marginRight: '8px' }} /> Передать в карту
							</button>
						)}
					</div>
				)}
			</section>
		</div>
	);
}
