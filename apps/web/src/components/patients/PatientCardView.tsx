import React from "react";
import { PatientCardModal, type PatientCardModalProps } from "./PatientCardModal";

export interface PatientCardViewProps extends Omit<PatientCardModalProps, "isOpen" | "onClose"> {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
}

/**
 * PatientCardView — Канонический вид карточки пациента с полной финансовой и клинической витриной.
 * Поддерживает как монтирование в виде панели, так и вызов в модальном слое (Мандат 8e, Мандат 8c).
 */
export const PatientCardView: React.FC<PatientCardViewProps> = React.memo(
	function PatientCardView({ isOpen = true, onClose = () => {}, ...restProps }) {
		return <PatientCardModal isOpen={isOpen} onClose={onClose} {...restProps} />;
	},
);

export default PatientCardView;
