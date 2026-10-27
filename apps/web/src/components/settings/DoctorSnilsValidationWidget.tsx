import type React from "react";
import { DoctorSnilsValidationCard } from "./snils/DoctorSnilsValidationCard";
import type { DoctorSnilsValidationWidgetProps } from "./snils/doctorSnilsTypes";

export type { DoctorSnilsValidationWidgetProps };

export const DoctorSnilsValidationWidget: React.FC<DoctorSnilsValidationWidgetProps> = (props) => (
	<DoctorSnilsValidationCard {...props} />
);

export default DoctorSnilsValidationWidget;
