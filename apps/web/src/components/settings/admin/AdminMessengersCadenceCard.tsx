import type React from "react";
import { AdminCadenceCard } from "./AdminCadenceCard";

/**
 * Каденция оповещений пациентов через мессенджеры и SMS.
 * Реэкспортирует каноническую карточку AdminCadenceCard.
 */
export const AdminMessengersCadenceCard: React.FC = () => {
	return <AdminCadenceCard />;
};

export default AdminMessengersCadenceCard;
