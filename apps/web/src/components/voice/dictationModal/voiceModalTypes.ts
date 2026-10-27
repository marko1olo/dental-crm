/**
 * voiceModalTypes.ts — Типы данных и свойства диалога диктовки DENTE.
 * Строго <= 120 строк по Мандату 8b.
 */

import type {
	ClinicalVoiceParseResult,
	ParsedClinicalVoiceCommand,
	SoapAggregatedNote,
} from "../voiceClinicalCommands";

export type DictationCommand = ParsedClinicalVoiceCommand;
export type {
	ParsedClinicalVoiceCommand,
	ClinicalVoiceParseResult,
	SoapAggregatedNote,
};

export interface VoiceDictationAssistantModalProps {
	isOpen: boolean;
	onClose: () => void;
	activeToothNumber?: number | null;
	onApplyCommand?: (command: ParsedClinicalVoiceCommand) => void;
	onApplyAllCommands?: (commands: ParsedClinicalVoiceCommand[]) => void;
	onApplySoapNote?: (soap: SoapAggregatedNote) => void;
}
