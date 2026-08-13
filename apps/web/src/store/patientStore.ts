import { create } from "zustand";
import type {
	PatientAdministrativeProfileDraft,
	PatientAdministrativeProfileSaveState,
	PatientCoreDraft,
	PatientCoreSaveState,
} from "../AppConstants";
import {
	emptyPatientAdministrativeProfileDraft,
	emptyPatientCoreDraft,
} from "../utils/draftDefaults";
import {
	defaultUiPreferences,
	loadUiPreferences,
} from "../utils/preferencesUtils";

const initialUiPreferences = loadUiPreferences() ?? defaultUiPreferences;

/*
 * Здесь жили odontogramState и setToothStatus — второе, локальное хранилище
 * состояний зубов. УДАЛЕНЫ вместе с последним читателем и последним писателем.
 *
 * ЧЕМ ЭТО БЫЛО ОПАСНО ДЛЯ КЛИНИКИ. Стор был один на всё приложение, без привязки
 * к пациенту, и на сервер не сохранялся: формула одного пациента показывалась бы
 * у всех остальных, а отмеченный кариес исчезал бы при перезагрузке. Читал его
 * ровно один файл — несмонтированный components/Odontogram.tsx (удалён этим же
 * коммитом), а писал смонтированный разбор снимка VisiographAnalyzer, который
 * печатал врачу «Внесено в зубную формулу», не записав ничего (починено в
 * 9e7c96eab: находки уходят на /api/patients/:id/tooth-states/batch).
 *
 * Единственное настоящее хранилище состояний зубов — таблица tooth_states на
 * сервере; на экране её показывает components/odontogram/OdontogramModule.tsx.
 * Тип состояния зуба тоже один и живёт рядом с формулой
 * (components/odontogram/ToothChart.tsx, ToothState): здешний ToothStatus
 * расходился с сервером — в нём было значение «Filling», которого в перечислении
 * сервера нет вовсе (там «Filled»).
 */
export interface PatientStore {
	selectedPatientId: string | null;
	setSelectedPatientId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;

	patientCoreDraft: PatientCoreDraft;
	setPatientCoreDraft: (
		val: PatientCoreDraft | ((prev: PatientCoreDraft) => PatientCoreDraft),
	) => void;

	patientCoreSaveState: PatientCoreSaveState;
	setPatientCoreSaveState: (
		val:
			| PatientCoreSaveState
			| ((prev: PatientCoreSaveState) => PatientCoreSaveState),
	) => void;

	patientCoreDirty: boolean;
	setPatientCoreDirty: (val: boolean | ((prev: boolean) => boolean)) => void;

	patientAdministrativeProfileDraft: PatientAdministrativeProfileDraft;
	setPatientAdministrativeProfileDraft: (
		val:
			| PatientAdministrativeProfileDraft
			| ((
					prev: PatientAdministrativeProfileDraft,
			  ) => PatientAdministrativeProfileDraft),
	) => void;

	patientAdministrativeProfileSaveState: PatientAdministrativeProfileSaveState;
	setPatientAdministrativeProfileSaveState: (
		val:
			| PatientAdministrativeProfileSaveState
			| ((
					prev: PatientAdministrativeProfileSaveState,
			  ) => PatientAdministrativeProfileSaveState),
	) => void;

	patientAdministrativeProfileDirty: boolean;
	setPatientAdministrativeProfileDirty: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;

	newPatientName: string;
	setNewPatientName: (val: string | ((prev: string) => string)) => void;

	newPatientPhone: string;
	setNewPatientPhone: (val: string | ((prev: string) => string)) => void;

	newPatientBirthDate: string;
	setNewPatientBirthDate: (val: string | ((prev: string) => string)) => void;

	isPatientCreating: boolean;
	setIsPatientCreating: (val: boolean | ((prev: boolean) => boolean)) => void;

	newRulePatientText: string;
	setNewRulePatientText: (val: string | ((prev: string) => string)) => void;

	/*
	 * pendingPlanSuggestions / addPendingPlanSuggestion / clearPendingPlanSuggestions
	 * УДАЛЕНЫ вместе с последним читателем — components/plan/ComparativePlannerDashboard.tsx,
	 * который не рендерился ни из одного достижимого модуля.
	 *
	 * Порядок обязателен и тот же, что при снятии components/Odontogram.tsx: писатель
	 * (OdontogramModule, отметка патологии на зубе) снят в этом же коммите. Иначе в
	 * дереве осталась бы запись в массив, у которого нет ни читателя, ни того, кто его
	 * чистит: очередь росла на каждую отметку зуба до перезагрузки страницы.
	 *
	 * Подбор услуг по зубной формуле стор не проходит и никогда не проходил: он идёт
	 * пропсом currentTeeth в смонтированный TreatmentEstimator.
	 */
}

export const usePatientStore = create<PatientStore>((set) => ({
	selectedPatientId: initialUiPreferences.selectedPatientId ?? null,
	setSelectedPatientId: (val) =>
		set((state) => ({
			selectedPatientId:
				typeof val === "function" ? val(state.selectedPatientId) : val,
		})),

	patientCoreDraft: emptyPatientCoreDraft(),
	setPatientCoreDraft: (val) =>
		set((state) => ({
			patientCoreDraft:
				typeof val === "function" ? val(state.patientCoreDraft) : val,
		})),

	patientCoreSaveState: "idle",
	setPatientCoreSaveState: (val) =>
		set((state) => ({
			patientCoreSaveState:
				typeof val === "function" ? val(state.patientCoreSaveState) : val,
		})),

	patientCoreDirty: false,
	setPatientCoreDirty: (val) =>
		set((state) => ({
			patientCoreDirty:
				typeof val === "function" ? val(state.patientCoreDirty) : val,
		})),

	patientAdministrativeProfileDraft: emptyPatientAdministrativeProfileDraft(),
	setPatientAdministrativeProfileDraft: (val) =>
		set((state) => ({
			patientAdministrativeProfileDraft:
				typeof val === "function"
					? val(state.patientAdministrativeProfileDraft)
					: val,
		})),

	patientAdministrativeProfileSaveState: "idle",
	setPatientAdministrativeProfileSaveState: (val) =>
		set((state) => ({
			patientAdministrativeProfileSaveState:
				typeof val === "function"
					? val(state.patientAdministrativeProfileSaveState)
					: val,
		})),

	patientAdministrativeProfileDirty: false,
	setPatientAdministrativeProfileDirty: (val) =>
		set((state) => ({
			patientAdministrativeProfileDirty:
				typeof val === "function"
					? val(state.patientAdministrativeProfileDirty)
					: val,
		})),

	newPatientName: "",
	setNewPatientName: (val) =>
		set((state) => ({
			newPatientName:
				typeof val === "function" ? val(state.newPatientName) : val,
		})),

	newPatientPhone: "",
	setNewPatientPhone: (val) =>
		set((state) => ({
			newPatientPhone:
				typeof val === "function" ? val(state.newPatientPhone) : val,
		})),

	newPatientBirthDate: "",
	setNewPatientBirthDate: (val) =>
		set((state) => ({
			newPatientBirthDate:
				typeof val === "function" ? val(state.newPatientBirthDate) : val,
		})),

	isPatientCreating: false,
	setIsPatientCreating: (val) =>
		set((state) => ({
			isPatientCreating:
				typeof val === "function" ? val(state.isPatientCreating) : val,
		})),

	newRulePatientText:
		"Это правило снижает риск повторного лечения и объясняет пациенту необходимость этапа.",
	setNewRulePatientText: (val) =>
		set((state) => ({
			newRulePatientText:
				typeof val === "function" ? val(state.newRulePatientText) : val,
		})),
}));
