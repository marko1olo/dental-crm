import React from "react";
import {
	DentalLabOrderModal,
	type DentalLabOrderModalProps,
	type DentalLabOrderData,
	formatJawScopeLabel,
	formatLabOrderTeethOrJaw,
} from "../lab/DentalLabOrderModal";

export type DentalLabWorkOrderModalProps = DentalLabOrderModalProps;

/**
 * Каноническое модальное окно наряд-заказа в зуботехническую лабораторию (ЗТЛ).
 * Поддерживает полный клинический спектр ортопедических конструкций:
 * - Коронки (диоксид циркония ZrO2 Katana ML, цельная керамика IPS e.max Press, металлокерамика Co-Cr Noritake)
 * - Керамические виниры (на огнеупоре, полевошпатные, e.max)
 * - Бюгельные протезы (на кламмерах, на замках Bredent / MK-1)
 * - Ортодонтические элайнеры и ретенционные / миорелаксирующие каппы
 * - Полные и частично съемные протезы (Acry-Free, термопласты)
 * - Навигационные хирургические шаблоны под имплантаты
 *
 * Соответствует Мандату 8e:
 * Истечение 30 дней плана лечения НЕ БЛОКИРУЕТ создание нарядов ЗТЛ и оплату.
 */
export function DentalLabWorkOrderModal(props: DentalLabWorkOrderModalProps) {
	return <DentalLabOrderModal {...props} />;
}

export type { DentalLabOrderData };
export { formatJawScopeLabel, formatLabOrderTeethOrJaw };
