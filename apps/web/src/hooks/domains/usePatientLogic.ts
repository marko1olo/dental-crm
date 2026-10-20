import { useEffect, useRef } from "react";
import {
	PAYMENT_COMPOSER_PATIENT_UNTRACKED,
	type TrackedComposerPatientId,
	resetPaymentComposerOnPatientChange,
} from "../../components/finance/paymentComposerReset";
import { useDocumentStore } from "../../store/documentStore";
import { usePatientStore } from "../../store/patientStore";
import { useVisitStore } from "../../store/visitStore";
import {
	NIL_VISIT_UUID,
	PATIENT_PHONE_QUERY_MIN_DIGITS,
	patientPhoneDigits,
	type UsePatientLogicProps,
} from "./patientLogicModules/patientLogicTypes";
import { usePatientMutations } from "./patientLogicModules/usePatientMutations";
import { usePatientSearchAndFilter } from "./patientLogicModules/usePatientSearchAndFilter";

export { NIL_VISIT_UUID, PATIENT_PHONE_QUERY_MIN_DIGITS, patientPhoneDigits };
export type * from "./patientLogicModules/patientLogicTypes";

/**
 * Канонический фасад картотеки и логики пациентов (Layer 5 Facade).
 * Декомпозирован строго в соответствии со стандартом /decomposer (<= 250 строк).
 */
// biome-ignore lint/suspicious/noExplicitAny: master facade hook
export function usePatientLogic({
	dashboard,
	query,
	setError,
	auth,
	setDashboard,
	setQuery,
}: UsePatientLogicProps | any) {
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);

	const patientCoreDraft = usePatientStore((s) => s.patientCoreDraft);
	const setPatientCoreDraft = usePatientStore((s) => s.setPatientCoreDraft);
	const patientCoreSaveState = usePatientStore((s) => s.patientCoreSaveState);
	const setPatientCoreSaveState = usePatientStore(
		(s) => s.setPatientCoreSaveState,
	);
	const patientCoreDirty = usePatientStore((s) => s.patientCoreDirty);
	const setPatientCoreDirty = usePatientStore((s) => s.setPatientCoreDirty);

	const patientAdministrativeProfileDraft = usePatientStore(
		(s) => s.patientAdministrativeProfileDraft,
	);
	const setPatientAdministrativeProfileDraft = usePatientStore(
		(s) => s.setPatientAdministrativeProfileDraft,
	);
	const patientAdministrativeProfileSaveState = usePatientStore(
		(s) => s.patientAdministrativeProfileSaveState,
	);
	const setPatientAdministrativeProfileSaveState = usePatientStore(
		(s) => s.setPatientAdministrativeProfileSaveState,
	);
	const patientAdministrativeProfileDirty = usePatientStore(
		(s) => s.patientAdministrativeProfileDirty,
	);
	const setPatientAdministrativeProfileDirty = usePatientStore(
		(s) => s.setPatientAdministrativeProfileDirty,
	);

	const setNewPatientName = usePatientStore((s) => s.setNewPatientName);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const setNewPatientBirthDate = usePatientStore(
		(s) => s.setNewPatientBirthDate,
	);
	const setIsPatientCreating = usePatientStore((s) => s.setIsPatientCreating);
	const setNewRulePatientText = usePatientStore((s) => s.setNewRulePatientText);

	const searchAndFilter = usePatientSearchAndFilter({
		dashboard,
		query,
		selectedPatientId,
	});

	const {
		activePatient,
		activeVisitPatient,
		selectedPatient,
		documentPatient,
		documentPatientMatchesActiveVisit,
		paymentPatientContextReady,
		paymentPatientContextMessage,
		patientInsightById,
		activePatientInsight,
		activePatientCallablePhone,
		activePatientHasCallablePhone,
		filteredPatients,
	} = searchAndFilter;

	const mutations = usePatientMutations({
		dashboard,
		setDashboard,
		setError,
		auth,
		selectedPatient,
		setSelectedPatientId,
		setQuery,
	});

	const {
		patientCoreDraftRef,
		patientAdministrativeProfileDraftRef,
		patientAdministrativeProfileValidationMessage,
		updatePatientCoreDraft,
		updatePatientAdministrativeProfileDraft,
		savePatientCore,
		savePatientAdministrativeProfile,
		createPatient,
	} = mutations;

	useEffect(() => {
		if (!dashboard) return;
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		setSelectedPatientId((current: any) =>
			current &&
			(dashboard?.patients ?? []).some((patient) => patient.id === current)
				? current
				: (activePatient?.id ?? null),
		);
	}, [activePatient?.id, dashboard?.patients, setSelectedPatientId, dashboard]);

	const paymentComposerPatientIdRef = useRef<TrackedComposerPatientId>(
		PAYMENT_COMPOSER_PATIENT_UNTRACKED,
	);
	const visitStorePatientIdRef = useRef<TrackedComposerPatientId>(
		PAYMENT_COMPOSER_PATIENT_UNTRACKED,
	);

	useEffect(() => {
		const didChangePatient = resetPaymentComposerOnPatientChange(
			paymentComposerPatientIdRef,
			documentPatient?.id,
			useDocumentStore.getState(),
		);
		if (didChangePatient) {
			useVisitStore.getState().resetVisitToothState();
			useVisitStore.getState().setCompletedServices([]);
		}
	}, [documentPatient?.id]);

	useEffect(() => {
		const effectivePatientId = selectedPatientId ?? activePatient?.id;
		const previousPatientId = visitStorePatientIdRef.current;
		visitStorePatientIdRef.current = effectivePatientId;
		if (previousPatientId === PAYMENT_COMPOSER_PATIENT_UNTRACKED) return;
		if (previousPatientId === effectivePatientId) return;
		useVisitStore.getState().resetVisitToothState();
		useVisitStore.getState().setCompletedServices([]);
	}, [selectedPatientId, activePatient?.id]);

	return {
		patientCoreDraftRef,
		patientAdministrativeProfileDraftRef,
		selectedPatientId,
		patientCoreDraft,
		patientCoreSaveState,
		patientCoreDirty,
		patientAdministrativeProfileDraft,
		patientAdministrativeProfileSaveState,
		patientAdministrativeProfileDirty,
		get newPatientName() {
			return usePatientStore.getState().newPatientName;
		},
		get newPatientPhone() {
			return usePatientStore.getState().newPatientPhone;
		},
		get newPatientBirthDate() {
			return usePatientStore.getState().newPatientBirthDate;
		},
		get isPatientCreating() {
			return usePatientStore.getState().isPatientCreating;
		},
		get newRulePatientText() {
			return usePatientStore.getState().newRulePatientText;
		},
		setSelectedPatientId,
		setPatientCoreDraft,
		setPatientCoreSaveState,
		setPatientCoreDirty,
		setPatientAdministrativeProfileDraft,
		setPatientAdministrativeProfileSaveState,
		setPatientAdministrativeProfileDirty,
		setNewPatientName,
		setNewPatientPhone,
		setNewPatientBirthDate,
		setIsPatientCreating,
		setNewRulePatientText,
		activePatient,
		activeVisitPatient,
		selectedPatient,
		documentPatient,
		documentPatientMatchesActiveVisit,
		paymentPatientContextReady,
		paymentPatientContextMessage,
		patientAdministrativeProfileValidationMessage,
		patientInsightById,
		activePatientInsight,
		activePatientCallablePhone,
		activePatientHasCallablePhone,
		filteredPatients,
		updatePatientCoreDraft,
		updatePatientAdministrativeProfileDraft,
		savePatientCore,
		savePatientAdministrativeProfile,
		createPatient,
	};
}
