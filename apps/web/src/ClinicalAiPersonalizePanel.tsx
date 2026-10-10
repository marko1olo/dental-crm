/**
 * Тонкий фасад панели ИИ-персонализации плана лечения и памятки после приёма.
 * Декомпозирован в соответствии с Мандатом 8b и навыком decomposer.
 */

import React from "react";
import {
	AiPersonalizeFooter,
	AiPersonalizePreview,
	AiProtocolPromptEditor,
	DoctorVoiceStyleCard,
	type ClinicalAiPersonalizePanelProps,
	useClinicalAiPersonalize,
} from "./components/clinicalAiPersonalize";

export type { ClinicalAiPersonalizePanelProps };

export const ClinicalAiPersonalizePanel: React.FC<ClinicalAiPersonalizePanelProps> = (props) => {
	const { patientId = null, context = "visit" } = props;
	const ctrl = useClinicalAiPersonalize(props);

	if (!patientId) {
		return (
			<section className="panel ops-panel" data-testid="clinical-ai-personalize-panel">
				<div className="panel-heading">
					<h2>Пациенту простым языком</h2>
				</div>
				<p className="ops-hint">
					Выберите пациента — тогда можно объяснить план лечения и собрать памятку после приёма.
				</p>
			</section>
		);
	}

	const contextHint = context === "finance"
		? "В кассе удобно показать пациенту объяснение сметы и выдать памятку при оплате."
		: "На приёме — объяснить план до согласия и выдать памятку перед уходом.";

	return (
		<section className="panel ops-panel" data-testid="clinical-ai-personalize-panel">
			<div className="panel-heading">
				<h2>Пациенту простым языком</h2>
				<span className="status-pill status-planned">{ctrl.planCount} усл.</span>
			</div>

			<p className="ops-hint">
				{contextHint} Текст собирается из плана пациента
				{ctrl.planCount > 0 ? ` (${ctrl.planCount} поз.)` : ""} и клинических протоколов приёма.
			</p>

			<DoctorVoiceStyleCard
				settings={ctrl.settings.doctorVoice}
				onChange={(next) => ctrl.setSettings((s) => ({ ...s, doctorVoice: next }))}
				disabled={ctrl.planLoading || ctrl.postLoading}
			/>

			<AiProtocolPromptEditor
				promptSettings={ctrl.settings.promptSettings}
				onChange={(next) => ctrl.setSettings((s) => ({ ...s, promptSettings: next }))}
				disabled={ctrl.planLoading || ctrl.postLoading}
			/>

			<AiPersonalizePreview
				doctorVoice={ctrl.settings.doctorVoice}
				planResult={ctrl.planResult}
				postResult={ctrl.postResult}
				copied={ctrl.copied}
				onCopy={(label, text) => void ctrl.copyText(label, text)}
			/>

			{ctrl.planError ? (
				<div className="ops-notice ops-notice--error" role="alert" style={{ marginTop: "0.75rem" }}>
					<p>{ctrl.planError}</p>
				</div>
			) : null}

			{ctrl.postError ? (
				<div className="ops-notice ops-notice--error" role="alert" style={{ marginTop: "0.75rem" }}>
					<p>{ctrl.postError}</p>
				</div>
			) : null}

			<AiPersonalizeFooter
				planLoading={ctrl.planLoading}
				postLoading={ctrl.postLoading}
				onRunPlan={() => void ctrl.runPlanPersonalize()}
				onRunPost={() => void ctrl.runPostVisitPersonalize()}
				onSaveSettings={ctrl.handleSaveSettings}
				onResetSettings={ctrl.handleResetSettings}
			/>
		</section>
	);
};

export default ClinicalAiPersonalizePanel;
