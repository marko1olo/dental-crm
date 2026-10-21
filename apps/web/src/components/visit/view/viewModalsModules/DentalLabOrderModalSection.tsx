/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Dental Lab Order Modal Section (ЗТЛ)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Оформление наряда в зуботехническую лабораторию, связка со снятием слепка (A02.07.010)
 * и обновлением этапа плана лечения («В работе в ЗТЛ»).
 */

import React from "react";
import { DentalLabOrderDrawer } from "../../../lab/DentalLabOrderDrawer";
import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";
import { useVisitStore } from "../../../../store/visitStore";
import { showToast } from "../../../GlobalToast";

export interface DentalLabOrderModalSectionProps {
	isOpen: boolean;
	onClose: () => void;
	activePatient: any;
	activeDoctor: any;
	activeAppointment: any;
	dashboard: any;
	effectiveTreatmentPlanId?: string | undefined;
	effectiveStageId?: string | undefined;
	effectiveStageNumber?: number | undefined;
	effectiveStageTitle?: string | undefined;
	labOrderModalToothNumber: string | number | null;
	setLabOrderModalToothNumber: (v: string | number | null) => void;
	setToothState: (code: string, state: any) => void;
	appendToEMKField: (field: string, text: string) => void;
}

export const DentalLabOrderModalSection: React.FC<DentalLabOrderModalSectionProps> = ({
	isOpen,
	onClose,
	activePatient,
	activeDoctor,
	activeAppointment,
	dashboard,
	effectiveTreatmentPlanId,
	effectiveStageId,
	effectiveStageNumber,
	effectiveStageTitle,
	labOrderModalToothNumber,
	setLabOrderModalToothNumber,
	setToothState,
	appendToEMKField,
}) => {
	if (!isOpen) return null;

	return (
		<DentalLabOrderDrawer
			isOpen={isOpen}
			onClose={() => {
				onClose();
				setLabOrderModalToothNumber(null);
				useUiSurfaceStore.getState().closePrimaryModal("lab_order");
			}}
			patientId={
				activePatient?.id ||
				activePatient?.patientId ||
				activeAppointment?.patientId ||
				(typeof dashboard?.activeVisit?.patientId === "string"
					? dashboard.activeVisit.patientId
					: undefined)
			}
			patientName={
				activePatient?.fullName ||
				activePatient?.name ||
				activeAppointment?.patientName ||
				"Пациент"
			}
			doctorId={
				activeDoctor?.id ||
				activeDoctor?.userId ||
				activeAppointment?.doctorId ||
				undefined
			}
			doctorName={
				activeDoctor?.fullName ||
				activeDoctor?.name ||
				activeAppointment?.doctorName ||
				"Лечащий врач"
			}
			treatmentPlanId={effectiveTreatmentPlanId}
			stageId={effectiveStageId}
			stageNumber={effectiveStageNumber}
			stageTitle={effectiveStageTitle}
			initialToothFdi={labOrderModalToothNumber ?? undefined}
			initialTeeth={
				typeof labOrderModalToothNumber === "string" &&
				(labOrderModalToothNumber.includes(",") ||
					labOrderModalToothNumber.includes(" ") ||
					labOrderModalToothNumber.includes(";"))
					? labOrderModalToothNumber
							.split(/[\s,;-]+/)
							.map((t) => Number.parseInt(t, 10))
							.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 85)
					: labOrderModalToothNumber
						? [Number(labOrderModalToothNumber)]
						: undefined
			}
			scheduledVisitDate={
				activeAppointment?.startTime ||
				activeAppointment?.startAt ||
				activeAppointment?.date ||
				undefined
			}
			patientChartNumber={
				activePatient?.medCardNumber ||
				activePatient?.cardNumber ||
				undefined
			}
			onOrderSaved={(order) => {
				if (!order) return;
				const targetTeeth =
					Array.isArray(order.selectedTeeth) && order.selectedTeeth.length > 0
						? order.selectedTeeth
						: order.toothFdi
							? String(order.toothFdi)
									.split(/[\s,;-]+/)
									.map((t) => Number.parseInt(t, 10))
									.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 85)
							: [];

				if (targetTeeth.length > 0 && order.material) {
					const teethLabel = targetTeeth.join(", ");
					appendToEMKField(
						"treatmentPlan",
						`Оформлен наряд ЗТЛ на ${targetTeeth.length > 1 ? `зубы ${teethLabel}` : `зуб ${teethLabel}`} (${order.material}, цвет ${order.colorVita || "A2"}).`,
					);
				}

				const unitPrice =
					order.priceRub && targetTeeth.length > 0
						? Math.round(order.priceRub / targetTeeth.length)
						: order.priceRub || 18000;

				const rawLabCost = order.doctorDeductionRub ?? order.priceRub ?? 0;
				const unitLabCost =
					rawLabCost > 0 && targetTeeth.length > 0
						? Math.round(rawLabCost / targetTeeth.length)
						: rawLabCost > 0 ? rawLabCost : undefined;

				for (const tooth of targetTeeth) {
					if (!tooth) continue;
					const toothStr = String(tooth);
					setToothState(toothStr, "Planned_Crown");
					useVisitStore.getState().setToothState(toothStr, "Planned_Crown");

					if (typeof window !== "undefined") {
						window.dispatchEvent(
							new CustomEvent("dente-quick-tooth-apply", {
								detail: {
									toothNumber: tooth,
									state: "Planned_Crown",
									patientId: activePatient?.id || undefined,
								},
							}),
						);
					}

					const serviceTitle = `Восстановление зуба коронкой (${order.constructionType || "ортопедия"}, ${order.material || "ZrO2"}, зуб ${toothStr})`;
					useVisitStore.getState().addCompletedService({
						serviceId: `lab-order-${order.id || Date.now()}-${tooth}`,
						code804n: "A16.07.004",
						toothNumber: tooth,
						toothCode: toothStr,
						name: serviceTitle,
						priceRub: unitPrice,
						quantity: 1,
						category: "Ортопедия",
						...(unitLabCost ? { labCostRub: unitLabCost, labCostKopecks: unitLabCost * 100 } : {}),
					});

					if (typeof window !== "undefined") {
						window.dispatchEvent(
							new CustomEvent("dente-add-billing-item", {
								detail: {
									item: {
										code804n: "A16.07.004",
										title: serviceTitle,
										toothCode: toothStr,
										quantity: 1,
										unitPriceRub: unitPrice,
										discountRub: 0,
										labCostRub: unitLabCost,
										labOrderId: order.id,
									},
								},
							}),
						);
					}
				}

				// Снятие оттиска (слепка) в счёт приёма
				if (order.includeImpressionBilling !== false) {
					const primaryTooth = targetTeeth[0];
					const primaryToothStr = primaryTooth ? String(primaryTooth) : undefined;
					const impressionKind =
						order.impressionType === "digital_scan_stl_ply"
							? "цифровой оптический оттиск"
							: order.impressionType === "polyether"
								? "полиэфирный оттиск"
								: "прецизионный силиконовый оттиск";
					const impressionTitle = `Снятие оттиска с челюсти (${impressionKind})`;
					const impressionPriceRub = 2500;

					useVisitStore.getState().addCompletedService({
						serviceId: `lab-order-impression-${order.id || Date.now()}`,
						code804n: "A02.07.010",
						toothNumber: primaryTooth,
						toothCode: primaryToothStr,
						name: impressionTitle,
						priceRub: impressionPriceRub,
						quantity: 1,
						category: "Ортопедия",
					});

					if (typeof window !== "undefined") {
						window.dispatchEvent(
							new CustomEvent("dente-add-billing-item", {
								detail: {
									item: {
										code804n: "A02.07.010",
										title: impressionTitle,
										toothCode: primaryToothStr,
										quantity: 1,
										unitPriceRub: impressionPriceRub,
										discountRub: 0,
									},
								},
							}),
						);
					}

					appendToEMKField(
						"treatmentPlan",
						`Выполнено клиническое снятие оттиска${primaryToothStr ? ` в области зуба ${primaryToothStr}` : ""}.`,
					);
				}

				// Обновление статуса этапа плана лечения («В работе в ЗТЛ»)
				const targetPlanId = order.treatmentPlanId || effectiveTreatmentPlanId;
				const targetStageNum = order.stageNumber ?? effectiveStageNumber;
				const targetStageName = order.stageTitle || effectiveStageTitle;
				const targetStageIdentifier = order.stageId || effectiveStageId;

				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-treatment-plan-stage-status", {
							detail: {
								treatmentPlanId: targetPlanId,
								planId: targetPlanId,
								stageNumber: targetStageNum,
								stageId: targetStageIdentifier,
								stageTitle: targetStageName,
								status: "in_lab",
								statusRu: "В работе в ЗТЛ",
								orderId: order.id,
								orderNumber: order.orderNumber,
								timestamp: new Date().toISOString(),
							},
						}),
					);

					if (targetPlanId) {
						window.dispatchEvent(
							new CustomEvent("dente-treatment-plans-reload", {
								detail: {
									patientId: activePatient?.id,
									planId: targetPlanId,
									status: "in_lab",
								},
							}),
						);
					}
				}

				showToast(
					order.includeImpressionBilling !== false
						? "Наряд ЗТЛ сохранен. Снятие слепка (2 500 ₽) включено в счёт визита"
						: "Наряд ЗТЛ сохранен",
					"success",
				);
			}}
		/>
	);
};
