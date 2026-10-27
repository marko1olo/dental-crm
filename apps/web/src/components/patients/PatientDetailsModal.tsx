/**
 * apps/web/src/components/patients/PatientDetailsModal.tsx
 * Тонкий канонический фасад карточки пациента по Мандату 8b (лимит <= 15-40 строк).
 */

export * from "./detailsModal/patientDetailsTypes";
export {
	PatientDetailsModalView as PatientDetailsModal,
	PatientDetailsModalView as default,
} from "./detailsModal/PatientDetailsModalView";
