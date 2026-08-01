import {
	Activity,
	Bot,
	CheckCircle2,
	Cpu,
	ExternalLink,
	Server,
	ShieldAlert,
	Sparkles,
	UploadCloud,
} from "lucide-react";
import "./SettingsAiTab.css";
import type {
	AiJobKind,
	AiRecognitionJob,
	AiRecognitionTarget,
	SpeechGatewayHealthReport,
	SpeechGatewayStatus,
	SpeechProvider,
	SpeechProviderHealth,
	SpeechProviderRuntimeStatus,
} from "@dental/shared";
import type { ChangeEvent } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import type { RecognitionPreset } from "../../settingsStaticData";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { AiRecognitionJobsPanel } from "./AiRecognitionJobsPanel";
/* Форматтер предупреждений — константа модуля, а не пропс. */
import { aiRecognitionWarningText } from "./SettingsViewHelpers";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;

/*
 * Контракт вкладки: перечислены ТОЛЬКО те пропсы, которые вкладка реально читает.
 * Аннотация обязательна: useAppLogic объявлен как `(): any`, поэтому и
 * useAppLogicContext(), и useSettingsDerivations() (её return спредит ...appLogic)
 * имеют тип any. Без этой аннотации компилятор пропускает чтение любого имени —
 * и `as any` тут был не причиной потери типов, а лишь маскировкой.
 * Типы взяты из существующих деклараций (@dental/shared, settingsStaticData),
 * второй источник правды не заводится.
 */
type SettingsAiTabProps = {
	recognitionPresets: RecognitionPreset[] | undefined;
	speechProviders: SpeechProvider[] | undefined;
	recognitionJob: AiRecognitionJob | null;
	speechProviderRuntimeById: Map<string, SpeechProviderRuntimeStatus>;
	speechProviderHealthById: Map<string, SpeechProviderHealth>;
	speechProviderModeLabels: Record<SpeechProvider["mode"], string>;
	speechProviderHealthLabels: Record<string, string>;
	recognitionKind: AiJobKind;
	recognitionTarget: AiRecognitionTarget;
	chooseRecognitionPreset: (preset: RecognitionPreset) => void;
	recognitionText: string;
	setRecognitionText: (value: string) => void;
	setRecognitionJob: (value: AiRecognitionJob | null) => void;
	recognitionTargetLabels: Record<AiRecognitionTarget, string>;
	runRecognitionJob: () => void | Promise<void>;
	isRecognitionLoading: boolean;
	recognitionInputReady: boolean;
	sendRecognitionResultToImport: () => void;
	speechGatewayHealthReport: SpeechGatewayHealthReport | null;
	refreshSpeechRuntime: (options: { silent?: boolean }) => void | Promise<void>;
	speechGatewayCanUpload: (status: SpeechGatewayStatus | null) => boolean;
	speechGatewayStatus: SpeechGatewayStatus | null;
};

export function SettingsAiTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps: SettingsAiTabProps = Object.assign(
		{},
		appLogic,
		derivations,
	);
	const {
		recognitionPresets,
		speechProviders,
		recognitionJob,
		speechProviderRuntimeById,
		speechProviderHealthById,
		speechProviderModeLabels,
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
		sendRecognitionResultToImport,
		speechGatewayHealthReport,
		refreshSpeechRuntime,
		speechGatewayCanUpload,
		speechGatewayStatus,
	} = mergedProps;

	const typedRecognitionPresets = recognitionPresets ?? [];
	const typedSpeechProviders = speechProviders ?? [];
	const typedRecognitionJob = recognitionJob;

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
						<p>
							Настройки локальных и облачных нейросетей для диктовки протоколов
						</p>
					</div>
				</div>

				{speechGatewayStatus ? (
					<div className="ai-gateway-status">
						<div
							className={`ai-gateway-status-pill ${speechGatewayCanUpload(speechGatewayStatus) ? "success" : "warning"}`}
						>
							<span>Статус сервера</span>
							<strong>
								{speechGatewayCanUpload(speechGatewayStatus)
									? "Подключено"
									: "Не активно"}
							</strong>
						</div>
						<div className="ai-gateway-status-pill">
							<span>Провайдер</span>
							<strong>{speechGatewayStatus.providerLabel}</strong>
						</div>
						<div className="ai-gateway-status-pill">
							<span>Отсев дублей</span>
							<strong>
								{speechGatewayStatus.chunkingPolicy.dedupeWindowChars} симв.
							</strong>
						</div>
						<div className="ai-gateway-status-pill">
							<span>Стоматологический словарь</span>
							<strong>
								{speechGatewayStatus.promptPolicy.enabled
									? `Включен (${speechGatewayStatus.promptPolicy.termCount} терм.)`
									: "Выключен"}
							</strong>
						</div>
						<div
							className="ai-gateway-status-pill"
							style={{ borderRight: "none", marginLeft: "auto" }}
						>
							<button
								className="secondary-button btn--sm"
								type="button"
								onClick={() => void refreshSpeechRuntime({ silent: false })}
							>
								<Activity size={14} style={{ marginRight: "6px" }} /> Проверить
								шлюз
							</button>
						</div>
					</div>
				) : null}

				{speechGatewayHealthReport ? (
					<div
						className="ai-gateway-status"
						style={{
							background: "rgba(13, 148, 136, 0.05)",
							borderColor: "rgba(13, 148, 136, 0.2)",
						}}
					>
						<div className="ai-gateway-status-pill">
							<span>Пул ключей</span>
							<strong>
								{speechGatewayHealthReport.totalAvailableKeys} из{" "}
								{speechGatewayHealthReport.totalConfiguredKeys}
							</strong>
						</div>
						<div className="ai-gateway-status-pill">
							<span>Резервных каналов</span>
							<strong>
								{speechGatewayHealthReport.fallbackProviderIds.length}
							</strong>
						</div>
						<div className="ai-gateway-status-pill">
							<span>Таймаут</span>
							<strong>
								{Math.round(speechGatewayHealthReport.timeoutMs / 1000)} сек.
							</strong>
						</div>
						{speechGatewayHealthReport.warnings[0] && (
							<div
								className="ai-gateway-status-pill warning"
								style={{ flex: 1, border: "none" }}
							>
								<span>Внимание</span>
								<strong>{speechGatewayHealthReport.warnings[0]}</strong>
							</div>
						)}
					</div>
				) : null}

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
											className={`status-pill status-${health.healthLevel === "ready" ? "confirmed" : "cancelled"}`}
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
			</section>

			{/* AI Workbench */}
			<section className="ai-section-card">
				<div className="ai-section-header">
					<div className="ai-section-icon">
						<Cpu size={24} />
					</div>
					<div className="ai-section-title">
						<h3>Лаборатория нейросетей</h3>
						<p>
							Тестирование структурирования текста в медицинские карты и
							диагнозы
						</p>
					</div>
				</div>

				{/*
				 * ВЫБРАННЫЙ ПРЕСЕТ ОБЯЗАН БЫТЬ ВЫБРАННЫМ НЕ ТОЛЬКО НА ВИД.
				 *
				 * Здесь стоял один `className` с признаком `active` и больше ничего:
				 * ни `aria-pressed`, ни `role`, ни `aria-current`. То есть выбранный
				 * пресет распознавания существовал ИСКЛЮЧИТЕЛЬНО как цвет рамки.
				 * Замер сценария доступности: связи `recognitionKind === preset.kind`
				 * с любым атрибутом состояния не было ни в одном файле `apps/web/src`.
				 *
				 * Кто из-за этого страдает. Экранный диктор читает подряд пять
				 * одинаковых кнопок и НЕ говорит, какая из них выбрана; человек,
				 * работающий с клавиатуры, не знает, на чём он остановился. Это не
				 * гипотетический пользователь: настройки распознавания правит
				 * администратор клиники, и среди администраторов есть люди со слабым
				 * зрением, которым цвет рамки не сообщает ничего.
				 *
				 * `role="radio"` в `radiogroup`, а не `aria-pressed` на кнопке: выбор
				 * здесь РОВНО ОДИН из пяти и снять его нельзя — это переключатель, а
				 * не набор независимых нажатий. `aria-pressed` описал бы пять
				 * независимо вдавленных кнопок и соврал бы о смысле.
				 *
				 * Долг был ОБЪЯВЛЕН в сценарии `smoke:segmented-controls-accessibility-source`
				 * («доступности нет в продукте; закрыть долг = написать её, а не
				 * расширить набор файлов») — здесь она написана, а не объявлена
				 * закрытой.
				 */}
				<div className="ai-target-row" role="radiogroup" aria-label="Цель распознавания">
					{typedRecognitionPresets.map((preset) => {
						const selected = recognitionKind === preset.kind && recognitionTarget === preset.target;
						return (
							<button
								aria-checked={selected}
								className={`ai-target-card ${selected ? "active" : ""}`}
								key={preset.key}
								role="radio"
								/*
								 * Из пяти кнопок в обходе клавиатурой участвует ВЫБРАННАЯ, а
								 * остальные исключены (`tabIndex={-1}`): так группа
								 * переключателей ведёт себя как один элемент, а не как пять
								 * остановок табуляции. Невыбранные достижимы стрелками —
								 * это штатное поведение `radiogroup` в браузере.
								 */
								tabIndex={selected ? 0 : -1}
								type="button"
								onClick={() => chooseRecognitionPreset(preset)}
							>
								<strong>{preset.title}</strong>
								<span>{preset.detail}</span>
							</button>
						);
					})}
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
						<span style={{ fontSize: "13px", color: "var(--muted)" }}>
							Цель:{" "}
							<strong>{recognitionTargetLabels[recognitionTarget]}</strong>
						</span>
						<button
							className="primary-button"
							type="button"
							onClick={runRecognitionJob}
							disabled={isRecognitionLoading || !recognitionInputReady}
						>
							<Sparkles size={16} style={{ marginRight: "8px" }} />
							{isRecognitionLoading
								? "Генерация ответа..."
								: "Распознать текст"}
						</button>
					</div>
				</div>

				{typedRecognitionJob && (
					<div className="ai-result-panel">
						<div className="ai-result-panel-head">
							<span className="ai-result-confidence">
								<CheckCircle2 size={16} /> Уверенность:{" "}
								{Math.round(typedRecognitionJob.confidence * 100)}%
							</span>
							<span className="status-pill status-confirmed">
								{typedRecognitionJob.suggestedNextStep}
							</span>
						</div>

						<p className="ai-result-text">{typedRecognitionJob.resultText}</p>

						{typedRecognitionJob.warnings?.length > 0 && (
							<div className="ai-result-warnings">
								{typedRecognitionJob.warnings.map((warning: string) => (
									<div className="ai-result-warning-item" key={warning}>
										<ShieldAlert size={14} />{" "}
										{aiRecognitionWarningText(warning)}
									</div>
								))}
							</div>
						)}

						{(typedRecognitionJob.target === "patient_import" ||
							typedRecognitionJob.target === "visit_note") && (
							<button
								className="secondary-button"
								style={{ alignSelf: "flex-start", marginTop: "8px" }}
								type="button"
								onClick={sendRecognitionResultToImport}
							>
								<UploadCloud size={16} style={{ marginRight: "8px" }} />{" "}
								Передать в карту
							</button>
						)}
					</div>
				)}
			</section>

			{/*
			 * История GET /api/ai/recognition-jobs — POST workbench создаёт job,
			 * но без списка прошлые черновики пропадали после смены пресета /
			 * reload. Панель самодостаточна (свой fetch + headers).
			 */}
			<div data-testid="ai-recognition-jobs-mount">
				<AiRecognitionJobsPanel />
			</div>
		</div>
	);
}
