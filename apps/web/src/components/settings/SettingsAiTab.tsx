import { Bot, Cpu } from "lucide-react";
import "./SettingsAiTab.css";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";

import { SpeechGatewayStatusPanel } from "./ai/SpeechGatewayStatusPanel";
import { SpeechProviderGrid } from "./ai/SpeechProviderGrid";
import { AiWorkbench } from "./ai/AiWorkbench";

export function SettingsAiTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
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
		aiRecognitionWarningText,
		sendRecognitionResultToImport,
		speechGatewayHealthReport,
		refreshSpeechRuntime,
		speechGatewayCanUpload,
		speechGatewayStatus,
	} = mergedProps;

	const typedRecognitionPresets = (recognitionPresets ?? []) as any[];
	const typedSpeechProviders = (speechProviders ?? []) as any[];
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
						<p>
							Настройки локальных и облачных нейросетей для диктовки протоколов
						</p>
					</div>
				</div>

				<SpeechGatewayStatusPanel
					speechGatewayStatus={speechGatewayStatus}
					speechGatewayCanUpload={speechGatewayCanUpload}
					refreshSpeechRuntime={refreshSpeechRuntime}
					speechGatewayHealthReport={speechGatewayHealthReport}
				/>

				<SpeechProviderGrid
					typedSpeechProviders={typedSpeechProviders}
					speechProviderRuntimeById={speechProviderRuntimeById}
					speechProviderHealthById={speechProviderHealthById}
					speechProviderModeLabels={speechProviderModeLabels}
					speechProviderHealthLabels={speechProviderHealthLabels}
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

				<AiWorkbench
					typedRecognitionPresets={typedRecognitionPresets}
					recognitionKind={recognitionKind}
					recognitionTarget={recognitionTarget}
					chooseRecognitionPreset={chooseRecognitionPreset}
					recognitionText={recognitionText}
					setRecognitionText={setRecognitionText}
					setRecognitionJob={setRecognitionJob}
					recognitionTargetLabels={recognitionTargetLabels}
					runRecognitionJob={runRecognitionJob}
					isRecognitionLoading={isRecognitionLoading}
					recognitionInputReady={recognitionInputReady}
					typedRecognitionJob={typedRecognitionJob}
					aiRecognitionWarningText={aiRecognitionWarningText}
					sendRecognitionResultToImport={sendRecognitionResultToImport}
				/>
			</section>
		</div>
	);
}
