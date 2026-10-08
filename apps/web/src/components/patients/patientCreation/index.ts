/**
 * index.ts — Layer 5: Чистый barrel реэкспорта компонентов декомпозированной модалки создания пациента.
 */

export type * from "./types";
export * from "./constants";

export { PatientPassportAddressStep } from "./PatientPassportAddressStep";
export { PatientContactsRepresentativeStep } from "./PatientContactsRepresentativeStep";
export { PatientMedicalFlagsStep } from "./PatientMedicalFlagsStep";
export { usePatientCreationForm } from "./usePatientCreationForm";

export {
	PatientCreationModalView,
	PatientCreationModal,
	CreatePatientModal,
} from "./PatientCreationModalView";

export { default } from "./PatientCreationModalView";
