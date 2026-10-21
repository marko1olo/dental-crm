import { generateAnonymousPatientCode } from "@dental/shared";
import { useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { executePatientCreate } from "./executePatientCreate";
import {
	handleQuickCreateKeyDownHelper,
	printBlankContractHelper,
} from "./patientCreationActionHelpers";
import { executePatientCreateAndBook, executePatientCreateAndVisit } from "./patientCreationExecution";

export interface UsePatientCreationActionsParams {
	readonly isPatientCreating: boolean;
	readonly newPatientName: string;
	readonly newPatientPhone: string;
	readonly newPatientBirthDate: string;
	readonly advertisingSource: string;
	readonly isEmergencyOrPrimary: boolean;
	readonly isSomaticNorm: boolean;
	readonly isChild: boolean;
	readonly parentRole: string;
	readonly parentName: string;
	readonly parentPhone: string;
	readonly createPatient: (options?: { allowDuplicate?: boolean }) => Promise<any>;
	readonly onClose: () => void;
	readonly setDuplicateConflict: (conflict: any) => void;
	readonly validationResult: any;
	readonly appLogic: any;
	readonly setNewPatientName: (name: string) => void;
	readonly setNewPatientPhone: (phone: string) => void;
	readonly setNewPatientBirthDate: (date: string) => void;
	readonly patientAdministrativeProfileDraft: any;
	readonly setPatientAdministrativeProfileDraft: (draft: any) => void;
}

export function usePatientCreationActions(params: UsePatientCreationActionsParams) {
	const {
		newPatientName,
		newPatientPhone,
		newPatientBirthDate,
		isSomaticNorm,
		appLogic,
		patientAdministrativeProfileDraft,
		setPatientAdministrativeProfileDraft,
	} = params;

	// Synchronous inFlight lock against double clicks and rapid taps (Apple HIG / Mandate 8e)
	const inFlightRef = useRef(false);

	const handlePrintBlankContract = () => {
		printBlankContractHelper(
			appLogic,
			newPatientName,
			newPatientPhone,
			newPatientBirthDate,
			patientAdministrativeProfileDraft,
			isSomaticNorm,
		);
	};

	const handleCreate = async (options?: { allowDuplicate?: boolean }) => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		try {
			await executePatientCreate(params, options);
		} finally {
			inFlightRef.current = false;
		}
	};

	const handleCreateAsNewDuplicate = async () => {
		await handleCreate({ allowDuplicate: true });
	};

	const handleCreateAndBook = async (options?: { allowDuplicate?: boolean }) => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		try {
			await executePatientCreateAndBook(params, options);
		} finally {
			inFlightRef.current = false;
		}
	};

	const handleCreateAndOpenVisit = async (options?: { allowDuplicate?: boolean }) => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		try {
			await executePatientCreateAndVisit(params, options);
		} finally {
			inFlightRef.current = false;
		}
	};

	const handleQuickCreateKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
		handleQuickCreateKeyDownHelper(e, handleCreate);
	};

	const handleToggleAnonymous = () => {
		const nextVal = !patientAdministrativeProfileDraft.isAnonymous;
		setPatientAdministrativeProfileDraft((prev: any) => ({
			...prev,
			isAnonymous: nextVal,
			anonymousCode: nextVal ? generateAnonymousPatientCode() : null,
		}));
	};

	return {
		handlePrintBlankContract,
		handleCreate,
		handleCreateAsNewDuplicate,
		handleCreateAndBook,
		handleCreateAndOpenVisit,
		handleQuickCreateKeyDown,
		handleToggleAnonymous,
	};
}
