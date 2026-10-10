import type React from "react";
import { BookingCategoriesSection } from "../BookingCategoriesSection";
import { BookingDoctorsSection } from "../BookingDoctorsSection";
import type { BookingSpecialistStepProps } from "./types";

export const BookingSpecialistStep: React.FC<BookingSpecialistStepProps> = ({
	selectedCategoryId,
	onSelectCategory,
	isSoloDoctor,
	selectedDoctor,
	activeDoctors,
	selectedDoctorId,
	onSelectDoctorId,
}) => {
	return (
		<>
			{/* Step 1: Service Category Selection */}
			<div id="dbw-step-categories" className="dbw-step-card">
				<BookingCategoriesSection
					selectedCategoryId={selectedCategoryId}
					onSelectCategory={onSelectCategory}
				/>
			</div>

			{/* Step 2: Doctor Header: Solo Doctor or Doctor Choice */}
			<div id="dbw-step-doctor" className="dbw-step-card">
				<BookingDoctorsSection
					isSoloDoctor={isSoloDoctor}
					selectedDoctor={selectedDoctor}
					activeDoctors={activeDoctors}
					selectedDoctorId={selectedDoctorId}
					onSelectDoctorId={onSelectDoctorId}
				/>
			</div>
		</>
	);
};
