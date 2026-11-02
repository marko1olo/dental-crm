/**
 * BookingBoardingPass.tsx — Deprecated Compatibility Re-export
 * Канонический SSOT переименован в BookingElectronicTicket.tsx (Мандаты 8x, 8ap: искоренение дев-сленга)
 */

import { BookingElectronicTicket, type BookingElectronicTicketProps } from "./BookingElectronicTicket";

export type BookingBoardingPassProps = BookingElectronicTicketProps;
export const BookingBoardingPass = BookingElectronicTicket;
export default BookingElectronicTicket;
