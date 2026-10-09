import React, { memo } from "react";
import {
	TelegramInteractiveToothPicker,
	type ToothComplaint,
} from "../TelegramInteractiveToothPicker";

export interface CabinetTeethTabProps {
	readonly toothComplaints: readonly ToothComplaint[];
	readonly onSaveToothComplaint: (complaint: ToothComplaint) => void;
	readonly onRemoveToothComplaint: (toothNumber: number) => void;
	readonly onProceedToBooking: () => void;
}

export const CabinetTeethTab: React.FC<CabinetTeethTabProps> = memo(({
	toothComplaints,
	onSaveToothComplaint,
	onRemoveToothComplaint,
	onProceedToBooking,
}) => {
	return (
		<main className="tg-tab-content">
			<div className="tg-section-header">
				<div>
					<h2 className="tg-section-title">Зубная формула и жалобы</h2>
					<p className="tg-section-desc">
						Нажмите на зуб для фиксации симптомов перед приёмом врача
					</p>
				</div>
			</div>

			<TelegramInteractiveToothPicker
				selectedComplaints={toothComplaints as ToothComplaint[]}
				onSaveComplaint={onSaveToothComplaint}
				onRemoveComplaint={onRemoveToothComplaint}
				onProceedToBooking={onProceedToBooking}
			/>
		</main>
	);
});

CabinetTeethTab.displayName = "CabinetTeethTab";
