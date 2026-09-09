import type React from "react";
import {
	AppointmentModal,
	type AppointmentModalProps,
} from "./AppointmentModal";
import {
	QuickBookingDrawer,
	type QuickBookingSlotInfo,
} from "./QuickBookingDrawer";

export type AppointmentCreationModalProps = AppointmentModalProps;
export {
	AppointmentModal,
	type AppointmentModalProps,
	QuickBookingDrawer,
	type QuickBookingSlotInfo,
};

/**
 * AppointmentCreationModal — Friction-Free Appointment Creation Modal (Mandates 8e, 8n, 8c).
 * - Mandate 8e п. 8: Регистратура без палок в колёса. Выбор ассистента СТРОГО опционален!
 * - Mandate 8n: Соло-врач и небольшая клиника 1-3 кресла. Запись создается за 5 секунд (Пациент + Время + Телефон) без зависаний.
 * - Mandate 8c / Apple HIG: Тач-таргеты >= 44x44px, кнопка «Записать» никогда не заблокирована серым disabled.
 * - Ноль мультяшных эмодзи (строго векторные иконки Lucide).
 */
export const AppointmentCreationModal: React.FC<
	AppointmentCreationModalProps
> = (props) => {
	return <AppointmentModal {...props} />;
};

export default AppointmentCreationModal;
