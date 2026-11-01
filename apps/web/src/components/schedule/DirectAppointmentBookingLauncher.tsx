/**
 * DirectAppointmentBookingLauncher.tsx — Канонический алиас-фасад над DirectAppointmentLauncher (SSOT).
 * Мандат 8b/8zi (Sweet Spot <= 30 строк, ликвидация микро-шредера и дублей).
 */

export { DirectAppointmentLauncher, default } from "./DirectAppointmentLauncher";
export { DirectAppointmentLauncher as DirectAppointmentBookingLauncher } from "./DirectAppointmentLauncher";
