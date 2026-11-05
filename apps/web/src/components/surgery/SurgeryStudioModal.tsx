/**
 * SurgeryStudioModal.tsx — Канонический фасад студии хирургии и дентальной имплантации DENTE CRM.
 * Объединяет ChairsideSurgeryHubModal и ImplantPassportModal в единый непроницаемый интерфейс.
 * Мандаты 8e (Автономия врача), 8n (Соло-хирург), 8x (Чистый клинический язык), 8al (Apple HIG).
 */

import React from "react";
import {
	ChairsideSurgeryHubModal,
	type ChairsideSurgeryHubModalProps,
	type SurgeryHubTab,
} from "./ChairsideSurgeryHubModal";

export type SurgeryStudioModalProps = ChairsideSurgeryHubModalProps;
export { ChairsideSurgeryHubModal };
export type { SurgeryHubTab };

export const SurgeryStudioModal: React.FC<SurgeryStudioModalProps> = (props) => {
	return <ChairsideSurgeryHubModal {...props} />;
};

export default SurgeryStudioModal;
