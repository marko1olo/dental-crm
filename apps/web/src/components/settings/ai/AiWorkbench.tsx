import { CheckCircle2, ShieldAlert, Sparkles, UploadCloud } from "lucide-react";
import type { ChangeEvent } from "react";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export function AiWorkbench({
	typedRecognitionPresets,
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
	typedRecognitionJob,
	aiRecognitionWarningText,
	sendRecognitionResultToImport,
}: {
	typedRecognitionPresets: any[];
	recognitionKind: string;
	recognitionTarget: string;
	chooseRecognitionPreset: (preset: any) => void;
	recognitionText: string;
	setRecognitionText: (text: string) => void;
	setRecognitionJob: (job: any) => void;
	recognitionTargetLabels: any;
	runRecognitionJob: () => void;
	isRecognitionLoading: boolean;
	recognitionInputReady: boolean;
	typedRecognitionJob: any;
	aiRecognitionWarningText: (warning: string) => string;
	sendRecognitionResultToImport: () => void;
}) {
	return (
		<>
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
		</>
	);
}
