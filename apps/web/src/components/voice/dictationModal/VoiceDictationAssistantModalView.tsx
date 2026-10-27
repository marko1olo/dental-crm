/**
 * VoiceDictationAssistantModalView.tsx — Контейнер диалога диктовки с поддержкой мобильной шторки Bottom Sheet.
 * Строго <= 120 строк по Мандату 8b.
 */

import { AlertCircle } from "lucide-react";
import { useVoiceDictation } from "./useVoiceDictation";
import { VoiceModalCommandList } from "./VoiceModalCommandList";
import { VoiceModalFooter } from "./VoiceModalFooter";
import { VoiceModalHeader } from "./VoiceModalHeader";
import { VoiceModalPresets } from "./VoiceModalPresets";
import { VoiceModalSoapCard } from "./VoiceModalSoapCard";
import { VoiceModalStage } from "./VoiceModalStage";
import { VoiceModalTranscript } from "./VoiceModalTranscript";
import type { VoiceDictationAssistantModalProps } from "./voiceModalTypes";
import "../voiceAssistant.css";

export function VoiceDictationAssistantModal(props: VoiceDictationAssistantModalProps) {
	const { isOpen, onClose, activeToothNumber } = props;
	const {
		isListening, isProcessing, transcript, interimText, finalText, manualInput, setManualInput,
		audioVolume, errorMessage, parseResult, appliedCommandIds, handleToggleListening,
		handleApplyManualText, handleApplySingleCommand, handleDeleteCommand, handleClearTranscript, handleApplyAll,
	} = useVoiceDictation(props);

	if (!isOpen) return null;

	return (
		<div
			className="dnt-voice-modal-backdrop"
			onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="voice-assistant-title"
		>
			<div className="dnt-voice-modal-dialog">
				<div className="dnt-voice-drag-handle" aria-hidden="true" />
				<VoiceModalHeader onClose={onClose} activeToothNumber={activeToothNumber} />

				<div className="dnt-voice-modal-body">
					{errorMessage && (
						<div
							style={{
								padding: "12px 16px",
								borderRadius: "10px",
								background: "var(--bad-bg)",
								border: "1px solid var(--bad-fg)",
								color: "var(--bad-fg)",
								display: "flex",
								alignItems: "center",
								gap: "10px",
								fontSize: "14px",
							}}
							role="alert"
						>
							<AlertCircle size={20} style={{ flexShrink: 0 }} />
							<span>{errorMessage}</span>
						</div>
					)}

					<VoiceModalStage
						isListening={isListening}
						isProcessing={isProcessing}
						audioVolume={audioVolume}
						onToggleListening={handleToggleListening}
					/>

					<VoiceModalTranscript
						transcript={transcript}
						interimText={interimText}
						finalText={finalText}
						onClear={handleClearTranscript}
					/>

					<VoiceModalCommandList
						parseResult={parseResult}
						appliedCommandIds={appliedCommandIds}
						onApplyCommand={handleApplySingleCommand}
						onDeleteCommand={handleDeleteCommand}
					/>

					<VoiceModalSoapCard soapNote={parseResult?.soapNote} />

					<VoiceModalPresets
						manualInput={manualInput}
						onManualInputChange={setManualInput}
						onApplyText={handleApplyManualText}
					/>
				</div>

				<VoiceModalFooter
					onClose={onClose}
					onApplyAll={handleApplyAll}
					commandCount={parseResult?.commands.length || 0}
				/>
			</div>
		</div>
	);
}
