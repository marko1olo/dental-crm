import {
	Activity,
	CheckCircle2,
	Cpu,
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
import { speechGatewayCanUpload as canonicalSpeechGatewayCanUpload } from "../../helpers/speechHelpers";
import { AiRecognitionJobsPanel } from "./AiRecognitionJobsPanel";
import { SpeechGatewayStatusCard } from "./ai/SpeechGatewayStatusCard";
import { SpeechProvidersGrid } from "./ai/SpeechProvidersGrid";
import { showToast } from "../GlobalToast";
/* Форматтер предупреждений — константа модуля, а не пропс. */
import { aiRecognitionWarningText } from "./SettingsViewHelpers";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

/*
 * Контракт вкладки: перечислены ТОЛЬКО те пропсы, которые вкладка реально читает.
 * Аннотация обязательна: useAppLogicContext() и useSettingsDerivations()
 * возвращают динамический контекст. Без этой аннотации компилятор пропускает чтение любого имени —
 * и нестрогие касты тут были не причиной потери типов, а лишь маскировкой.
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
	speechGatewayCanUpload?: (status: SpeechGatewayStatus | null) => boolean;
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

	const canUpload =
		typeof speechGatewayCanUpload === "function"
			? speechGatewayCanUpload
			: canonicalSpeechGatewayCanUpload;

	const typedRecognitionPresets = recognitionPresets ?? [];
	const typedSpeechProviders = speechProviders ?? [];
	const typedRecognitionJob = recognitionJob;

	return (
		<div className="ai-studio-container animate-fade-in">
			{/* Speech Recognition Gateway */}
			<section className="ai-section-card">
				<SpeechGatewayStatusCard
					speechGatewayHealthReport={speechGatewayHealthReport}
					speechGatewayStatus={speechGatewayStatus}
					refreshSpeechRuntime={refreshSpeechRuntime}
					speechGatewayCanUpload={canUpload}
				/>

				{speechGatewayStatus ? (
					<div className="ai-gateway-status">
						<div
							className={`ai-gateway-status-pill ${canUpload(speechGatewayStatus) ? "success" : "warning"}`}
						>
							<span>Статус сервера</span>
							<strong>
								{canUpload(speechGatewayStatus)
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
						<div className="ai-gateway-status-pill" style={{ borderRight: "none" }}>
							<span>Стоматологический словарь</span>
							<strong>
								{speechGatewayStatus.promptPolicy.enabled
									? `Включен (${speechGatewayStatus.promptPolicy.termCount} терм.)`
									: "Выключен"}
							</strong>
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
				<SpeechProvidersGrid
					providers={typedSpeechProviders}
					runtimeById={speechProviderRuntimeById}
					healthById={speechProviderHealthById}
					modeLabels={speechProviderModeLabels}
					healthLabels={speechProviderHealthLabels}
				/>
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
				<div
					role="radiogroup"
					className="ai-target-grid"
					aria-label="Цель распознавания"
					onKeyDown={(e) => {
						if (typedRecognitionPresets.length === 0) return;
						const currentIndex = typedRecognitionPresets.findIndex(
							(p) => recognitionKind === p.kind && recognitionTarget === p.target,
						);
						let nextIndex = -1;
						if (e.key === "ArrowRight" || e.key === "ArrowDown") {
							nextIndex = currentIndex >= 0 ? (currentIndex + 1) % typedRecognitionPresets.length : 0;
						} else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
							nextIndex = currentIndex >= 0 ? (currentIndex - 1 + typedRecognitionPresets.length) % typedRecognitionPresets.length : 0;
						}
						if (nextIndex >= 0) {
							e.preventDefault();
							const nextPreset = typedRecognitionPresets[nextIndex];
							if (nextPreset) {
								chooseRecognitionPreset(nextPreset);
								const radioButtons = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
								radioButtons[nextIndex]?.focus();
							}
						}
					}}
				>
					{typedRecognitionPresets.map((preset) => {
						const selected =
							recognitionKind === preset.kind &&
							recognitionTarget === preset.target;
						return (
							<button
								role="radio"
								aria-checked={selected}
								className={`ai-target-card ${selected ? "active" : ""}`}
								key={preset.key}
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
							aria-busy={isRecognitionLoading}
							onClick={() => {
								if (isRecognitionLoading) return;
								if (!recognitionInputReady) {
									showToast("Введите текст или приложите снимок перед распознаванием.", "info");
									return;
								}
								runRecognitionJob();
							}}
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
