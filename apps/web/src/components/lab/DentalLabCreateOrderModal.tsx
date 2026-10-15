/**
 * DentalLabCreateOrderModal.tsx — Канонический фасад модального окна создания наряд-заказа в лабораторию.
 * Делегирует выполнение единому SSOT-драверу DentalLabOrderDrawer.
 */

import React from "react";
import type { DentalLabCreateOrderModalProps } from "./orderCreateModules/labOrderCreateTypes";
import { DentalLabOrderDrawer } from "./DentalLabOrderDrawer";
import type { DentalLabOrderRecord } from "./dentalLabOrderEngine";

export type { DentalLabCreateOrderModalProps };

export const DentalLabCreateOrderModal: React.FC<DentalLabCreateOrderModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		onCreateOrder,
		currentDoctorName,
		currentPatientName,
		currentPatientId,
		currentToothNumber,
		treatmentPlanId,
		stageNumber,
		stageTitle,
		initialTeeth,
	} = props;

	const handleSave = (order: DentalLabOrderRecord) => {
		const teeth = order.teethFdi && order.teethFdi.length > 0 ? order.teethFdi : [16];
		onCreateOrder({
			id: order.id,
			orderNumber: order.orderNumber,
			clinicName: "Клиника ДЕНТЕ",
			labName: order.labName || "CAD/CAM Центр Дентал-Мастер",
			patientId: order.patientId || currentPatientId || "patient-1",
			patientName: order.patientName || currentPatientName || "Пациент",
			doctorId: order.doctorId || "doctor-1",
			doctorName: order.doctorName || currentDoctorName || "Врач-ортопед",
			workTypeId: order.constructionType as any,
			materialName: order.materialRu || "Диоксид циркония Katana ML",
			selectedTeeth: teeth,
			shadeSystem: "classical",
			shadeCode: order.vitaShade || "A2",
			translucency: (order.translucency as any) || "MT",
			surfaceTexture: "microtexture",
			currentStage: "sent_to_lab",
			stageHistory: [],
			orderDateIso: order.sentDate || new Date().toISOString().slice(0, 10),
			expectedLabDateIso: order.deadlineDate || new Date().toISOString().slice(0, 10),
			financials: {
				unitsCount: teeth.length,
				pricePerUnitKopecks: order.patientPriceKopecks,
				costPerUnitKopecks: order.ztlCostKopecks,
				patientPriceTotalKopecks: order.patientPriceKopecks,
				labCostKopecks: order.ztlCostKopecks,
				labCostTotalKopecks: order.ztlCostKopecks,
				clinicGrossMarginKopecks: order.patientPriceKopecks - order.ztlCostKopecks,
				grossMarginPercent: 66,
				doctorPercent: order.doctorSharePercent || 20,
				doctorWageBaseKopecks: order.patientPriceKopecks - order.ztlCostKopecks,
				doctorWageKopecks: Math.round((order.patientPriceKopecks - order.ztlCostKopecks) * ((order.doctorSharePercent || 20) / 100)),
				clinicNetProfitKopecks: Math.round((order.patientPriceKopecks - order.ztlCostKopecks) * (1 - (order.doctorSharePercent || 20) / 100)),
				patientPriceTotalRub: Math.round(order.patientPriceKopecks / 100),
				labCostTotalRub: Math.round(order.ztlCostKopecks / 100),
				clinicGrossMarginRub: Math.round((order.patientPriceKopecks - order.ztlCostKopecks) / 100),
				doctorWageRub: Math.round(((order.patientPriceKopecks - order.ztlCostKopecks) * ((order.doctorSharePercent || 20) / 100)) / 100),
				clinicNetProfitRub: Math.round(((order.patientPriceKopecks - order.ztlCostKopecks) * (1 - (order.doctorSharePercent || 20) / 100)) / 100),
				isBalanced: true,
			},
			delayAlert: {
				hasAlert: false,
				isDelayedAlert: false,
				severity: "OK",
				badgeTextRu: "В графике",
				messageRu: "В графике",
				actionRu: "Действий не требуется",
				daysUntilDeadline: 5,
			},
			isDelayedAlert: false,
			createdAtIso: new Date().toISOString(),
			updatedAtIso: new Date().toISOString(),
		});
		onClose();
	};

	return (
		<DentalLabOrderDrawer
			isOpen={isOpen}
			onClose={onClose}
			currentDoctorName={currentDoctorName}
			currentPatientName={currentPatientName}
			currentPatientId={currentPatientId}
			currentToothNumber={currentToothNumber}
			initialToothFdi={initialTeeth && initialTeeth.length > 0 ? initialTeeth[0] : undefined}
			treatmentPlanId={treatmentPlanId}
			stageNumber={stageNumber}
			stageTitle={stageTitle}
			onSaveOrder={handleSave}
		/>
	);
};
