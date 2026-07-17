import { Bot, Check, Mic, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { DictationHints } from "../../DictationHints";
import { AiOrchestrator } from "../../lib/aiOrchestrator";
import { SmartParsePreview } from "../../SmartParsePreview";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";

export function VisitDictation() {
	const {
		appendToTranscript,
		buildDraft,
		clearTranscriptWithUndo,
		clearedTranscriptSnapshot,
		dictationQuickPhrases,
		flushPendingSpeechChunks,
		hasVisitTranscriptText,
		isDraftLoading,
		isOnline,
		isServerVoiceRecording,
		isTranscriptPolishing,
		lastLocalSavedAt,
		lastServerDraftSavedAt,
		pendingSpeechChunkCount,
		pendingSpeechFlushActionLabel,
		pendingSpeechFlushActionTitle,
		pendingVisitSaveCount,
		polishTranscript,
		serverDraftSyncState,
		setClearedTranscriptSnapshot,
		setTranscript,
		setToothState,
		speechStatusNote,
		speechTranscriptionBusy,
		transcript,
		undoTranscriptClear,
		visitDraftReadyToBuild,
		visitDraftUserEditedRef,
		formatTime,
		speechGatewayStatus,
		emptyDictationVoiceActionLabel,
		visitDraftBuildMissingSteps,
	} = useAppLogicContext();

	const [showHints, setShowHints] = useState(false);
	const [showSmartPreview, setShowSmartPreview] = useState(false);
	const [smartParsedData, setSmartParsedData] = useState<any>(null);

	const appendToEMKField = (k: string, v: string) => {
		// Mock for now, will fix if needed
	};

	return (
		<div className="dictation-box" style={{ position: "relative" }}>
			{speechTranscriptionBusy && (
				<div className="dictation-overlay-skeleton">
					<div className="skeleton-wave"></div>
					<div className="skeleton-wave"></div>
					<div className="skeleton-wave"></div>
				</div>
			)}
			<div className="dictation-header">
				<Mic
					aria-hidden="true"
					className={isServerVoiceRecording ? "recording-icon-pulse" : ""}
					style={{
						color: isServerVoiceRecording ? "var(--red-500)" : undefined,
					}}
				/>
				<div>
					<h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						Диктовка врача
						{speechTranscriptionBusy && (
							<span className="transcribing-badge-pulse">
								Обработка голоса...
							</span>
						)}
					</h3>
					<p>
						Черновик, требует подтверждения врача.{" "}
						<span style={{ color: "var(--slate-500)", fontSize: "0.9em" }}>
							{serverDraftSyncState === "saving" || pendingVisitSaveCount > 0
								? "Синхронизация..."
								: !isOnline
									? "Офлайн (сохранено локально)"
									: lastServerDraftSavedAt
										? `Сохранено ${formatTime(lastServerDraftSavedAt)}`
										: lastLocalSavedAt
											? `Локально сохранено ${formatTime(lastLocalSavedAt)}`
											: "Автосохранение включено"}
						</span>
						{speechStatusNote ? (
							<span
								style={{
									display: "inline-block",
									marginLeft: "8px",
									color: "var(--rust)",
									fontSize: "0.9em",
								}}
							>
								{speechStatusNote}
							</span>
						) : null}
					</p>
				</div>
			</div>
			<div
				className="dictation-quick-row"
				aria-label="Быстрые фразы для диктовки"
			>
				{dictationQuickPhrases.map((phrase: any) => (
					<button
						type="button"
						key={phrase.label}
						onClick={() => appendToTranscript(phrase.text)}
					>
						{phrase.label}
					</button>
				))}
			</div>
			<div style={{ position: "relative" }}>
				<div style={{ position: "relative", width: "100%" }}>
					<textarea
						aria-label="Текст диктовки"
						value={transcript}
						onFocus={() => setShowHints(true)}
						onBlur={(e) => {
							if (!e.currentTarget.contains(e.relatedTarget)) {
								setShowHints(false);
							}
						}}
						onChange={(event) => {
							visitDraftUserEditedRef.current = true;
							setTranscript(event.target.value);
							if (event.target.value.trim()) setClearedTranscriptSnapshot(null);
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter" && e.ctrlKey && transcript.trim()) {
								e.preventDefault();
								const orchestratorResult =
									AiOrchestrator.processEmkDictation(transcript);
								const parsed =
									orchestratorResult.source === "local_algorithm"
										? orchestratorResult.data
										: {
												isAiTask: true,
												prompt: orchestratorResult.suggestedPrompt,
											};
								setSmartParsedData(parsed);
								setShowSmartPreview(true);
								setShowHints(false);
							}
						}}
						placeholder="Диктуйте... (Нажмите Ctrl+Enter для предпросмотра)"
						style={{
							minHeight: "120px",
							width: "100%",
							resize: "vertical",
						}}
					/>

					<DictationHints
						isVisible={showHints || isServerVoiceRecording}
						type="visit"
					/>
				</div>

				{isServerVoiceRecording && (
					<div
						style={{
							marginTop: "8px",
							padding: "12px",
							background: "var(--paper)",
							color: "#64748b",
							borderRadius: "8px",
							border: "1px dashed #cbd5e1",
							fontStyle: "italic",
							fontSize: "14px",
							display: "flex",
							alignItems: "center",
							gap: "12px",
						}}
					>
						<div
							style={{
								display: "flex",
								gap: "4px",
								height: "16px",
								alignItems: "center",
							}}
						>
							<div
								className="skeleton-wave"
								style={{
									width: "4px",
									height: "10px",
									background: "#ef4444",
									borderRadius: "2px",
									animation: "skeleton-wave 1s ease-in-out infinite",
									animationDelay: "0s",
								}}
							/>
							<div
								className="skeleton-wave"
								style={{
									width: "4px",
									height: "10px",
									background: "#ef4444",
									borderRadius: "2px",
									animation: "skeleton-wave 1s ease-in-out infinite",
									animationDelay: "0.2s",
								}}
							/>
							<div
								className="skeleton-wave"
								style={{
									width: "4px",
									height: "10px",
									background: "#ef4444",
									borderRadius: "2px",
									animation: "skeleton-wave 1s ease-in-out infinite",
									animationDelay: "0.4s",
								}}
							/>
						</div>
						<span>Слушаю вас...</span>
					</div>
				)}
				<SmartParsePreview
					isVisible={showSmartPreview}
					parsedData={smartParsedData}
					rawText={transcript}
					type="visit"
					onApply={(data: any) => {
						if (data) {
							if (data.toothUpdates) {
								data.toothUpdates.forEach((t: any) =>
									setToothState(t.code, t.state),
								);
							}
							if (data.emkUpdates) {
								Object.entries(data.emkUpdates).forEach(([k, v]) => {
									if (v) appendToEMKField(k, v as string);
								});
							}
						}
						setShowSmartPreview(false);
					}}
					onManual={() => setShowSmartPreview(false)}
					onClose={() => setShowSmartPreview(false)}
				/>
			</div>
			<div
				className="dictation-actions"
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: "10px",
					alignItems: "center",
				}}
			>
				<SmartMicrophoneButton
					context="visit"
					onResult={(text) => {
						const current = transcript || "";
						const newText = current ? `${current}\n${text}` : text;
						setTranscript(newText);

						const orchestratorResult =
							AiOrchestrator.processEmkDictation(newText);
						const parsed =
							orchestratorResult.source === "local_algorithm"
								? orchestratorResult.data
								: {
										isAiTask: true,
										prompt: orchestratorResult.suggestedPrompt,
									};
						setSmartParsedData(parsed);
						setShowSmartPreview(true);
						setShowHints(false);
					}}
				/>

				<button
					className="primary-button"
					type="button"
					onClick={() => {
						const orchestratorResult =
							AiOrchestrator.processEmkDictation(transcript);
						const parsed =
							orchestratorResult.source === "local_algorithm"
								? orchestratorResult.data
								: {
										isAiTask: true,
										prompt: orchestratorResult.suggestedPrompt,
									};
						setSmartParsedData(parsed);
						setShowSmartPreview(true);
						setShowHints(false);
					}}
					disabled={!hasVisitTranscriptText}
					aria-describedby={
						!hasVisitTranscriptText ? "dictation-clear-guidance" : undefined
					}
				>
					<Check aria-hidden="true" style={{ width: "18px", height: "18px" }} />{" "}
					Разобрать текст
				</button>

				<button
					className="secondary-button"
					type="button"
					onClick={buildDraft}
					disabled={isDraftLoading || !visitDraftReadyToBuild}
					aria-describedby={
						!visitDraftReadyToBuild ? "visit-draft-missing" : undefined
					}
				>
					<Bot aria-hidden="true" style={{ width: "18px", height: "18px" }} />{" "}
					{isDraftLoading ? "Собираю" : "Собрать нейро-черновик"}
				</button>

				<div style={{ flexGrow: 1 }} />

				<button
					className="secondary-button"
					type="button"
					onClick={clearTranscriptWithUndo}
					disabled={!hasVisitTranscriptText}
					title="Очистить текст"
				>
					Очистить
				</button>
				{clearedTranscriptSnapshot ? (
					<button
						className="secondary-button"
						type="button"
						onClick={undoTranscriptClear}
						title="Вернуть текст"
					>
						Вернуть
					</button>
				) : null}
				<details
					className="advanced-dictation-actions"
					style={{ display: "inline-block" }}
				>
					<summary
						style={{
							cursor: "pointer",
							fontSize: "14px",
							color: "var(--slate-500)",
							padding: "8px",
						}}
					>
						Дополнительно
					</summary>
					<div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
						{pendingSpeechChunkCount ? (
							<button
								className="secondary-button"
								type="button"
								onClick={() => flushPendingSpeechChunks({ silent: false })}
								title={pendingSpeechFlushActionTitle}
							>
								{pendingSpeechFlushActionLabel}
							</button>
						) : null}
						<button
							className="secondary-button"
							type="button"
							onClick={polishTranscript}
							disabled={!hasVisitTranscriptText || isTranscriptPolishing}
							aria-describedby={
								!hasVisitTranscriptText ? "dictation-clear-guidance" : undefined
							}
							title={
								speechGatewayStatus?.polishPolicy?.neuralEnabled
									? `Аккуратная очистка текста: ${speechGatewayStatus.polishPolicy.modelName ?? "модель"}`
									: "Локальная очистка терминов, секций и номеров зубов"
							}
						>
							<Sparkles aria-hidden="true" />{" "}
							{isTranscriptPolishing ? "Чищу" : "Очистить текст"}
						</button>
					</div>
				</details>

				{!hasVisitTranscriptText ? (
					<div
						className="dictation-action-guidance"
						id="dictation-clear-guidance"
						role="status"
						aria-live="polite"
					>
						В диктовке пока нет текста: нажмите «Голос», «
						{emptyDictationVoiceActionLabel}» или впишите текст вручную.
					</div>
				) : null}
				{!visitDraftReadyToBuild ? (
					<div
						className="visit-draft-missing"
						id="visit-draft-missing"
						role="status"
						aria-live="polite"
					>
						<strong>Чтобы собрать черновик, осталось:</strong>
						<ul>
							{visitDraftBuildMissingSteps.map((step) => (
								<li key={step}>{step}</li>
							))}
						</ul>
					</div>
				) : null}
			</div>
		</div>
	);
}
