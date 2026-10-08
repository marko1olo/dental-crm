/**
 * dentalGrammarParser.ts — Тонкий канонический фасад (Layer 5) специализированного
 * голосового дентального парсера грамматики для врача-стоматолога у кресла DENTE CRM.
 * Полная реализация декомпозирована в src/services/voice/dentalGrammar/ (<800 строк на файл).
 */

export type {
	ClinicalToothStatus,
	ToothUpdateVoiceItem,
	AnesthesiaVoiceItem,
	Procedure804nVoiceItem,
	SoapSectionsVoiceNote,
	EndoCanalVoiceItem,
	PerioSiteVoiceMeasurement,
	PerioToothVoiceItem,
	CephLandmarkVoiceItem,
	DentalVoiceIntent,
	DiagnosisRule,
	AnestheticDrugConfig,
} from "./dentalGrammar";

export {
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
	ALL_VALID_FDI_TEETH,
	DENTAL_ICD10_RULES,
	KNOWN_ANESTHETICS_CONFIG,
	KNOWN_MANIPULATIONS_804N,
	extractFdiTeethNumbers,
	extractToothSurfaces,
	matchDiagnosisRule,
	extractAnesthesiaIntent,
	extractProcedures804n,
	extractSoapNotes,
	extractQuadrantIntent,
	extractEndoCanalMeasurements,
	extractPerioVoiceMeasurements,
	extractCephLandmarksVoiceIntent,
	parseDentalVoiceSpeech,
} from "./dentalGrammar";
