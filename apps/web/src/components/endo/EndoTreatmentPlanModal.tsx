/**
 * EndoTreatmentPlanModal.tsx — Модальное окно плана эндодонтического лечения и протокола каналов
 *
 * Клинические стандарты:
 * - Форма 043/у: учет рабочей длины, апекслокация, MAF (ISO 3630-1), конусность, силер и обтурация
 * - Мандат 8e (Автономия врача): возможность сохранения на любом этапе (черновик / временная обтурация / постоянная)
 * - Мандат 8b: строго <= 800 строк
 * - 0% эмодзи, отсутствие dev-жаргона
 */

import React from "react";
import {
	EndoCanalLogModal,
	type EndoCanalLogModalProps,
} from "./EndoCanalLogModal";

export type EndoTreatmentPlanModalProps = EndoCanalLogModalProps;

/**
 * Канонический компонент модального окна плана эндодонтического лечения.
 * Обеспечивает ведение протокола корневых каналов по стандартам Формы 043/у.
 */
export const EndoTreatmentPlanModal: React.FC<EndoTreatmentPlanModalProps> = (
	props,
) => {
	return <EndoCanalLogModal {...props} />;
};

export default EndoTreatmentPlanModal;
