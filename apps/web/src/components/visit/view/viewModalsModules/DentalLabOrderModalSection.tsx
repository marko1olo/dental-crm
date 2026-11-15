/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Dental Lab Order Modal Section (ЗТЛ)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Оформление наряда в зуботехническую лабораторию, связка со снятием слепка (A02.07.010)
 * и обновлением этапа плана лечения («В работе в ЗТЛ»).
 */

import React from "react";
import { DentalLabStudioModal } from "../../../lab/DentalLabStudioModal";
import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";
import { useVisitStore } from "../../../../store/visitStore";
import { showToast } from "../../../GlobalToast";

export interface LabSectionPatient {
	readonly id?: string | undefined;
	readonly patientId?: string | undefined;
	readonly fullName?: string | undefined;
	readonly name?: string | undefined;
	readonly medCardNumber?: string | undefined;
	readonly cardNumber?: string | undefined;
}

export interface LabSectionDoctor {
	readonly id?: string | undefined;
	readonly userId?: string | undefined;
	readonly fullName?: string | undefined;
	readonly name?: string | undefined;
}

export interface LabSectionAppointment {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly startTime?: string | undefined;
	readonly startAt?: string | undefined;
	readonly date?: string | undefined;
}

export interface LabSectionCatalogService {
	readonly code804n?: string | undefined;
	readonly order804nCode?: string | undefined;
	readonly code?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly price?: number | undefined;
}

export interface LabSectionDashboard {
	readonly activeVisit?: {
		readonly patientId?: string | undefined;
	} | undefined;
	readonly services?: readonly LabSectionCatalogService[] | undefined;
	readonly pricelist?: readonly LabSectionCatalogService[] | undefined;
	readonly catalogServices?: readonly LabSectionCatalogService[] | undefined;
}

export interface SavedLabOrderNotification {
	readonly id?: string | undefined;
	readonly orderNumber?: string | number | undefined;
	readonly selectedTeeth?: readonly number[] | number[] | undefined;
	readonly toothFdi?: string | number | null | undefined;
	readonly teeth?: readonly number[] | undefined;
	readonly material?: string | null | undefined;
	readonly materialId?: string | null | undefined;
	readonly colorVita?: string | null | undefined;
	readonly patientPriceKopecks?: number | undefined;
	readonly priceRub?: number | undefined;
	readonly labCostKopecks?: number | undefined;
	readonly doctorDeductionRub?: number | undefined;
	readonly constructionType?: string | undefined;
	readonly includeImpressionBilling?: boolean | undefined;
	readonly impressionType?: string | null | undefined;
	readonly impressionPriceRub?: number | undefined;
	readonly impressionPriceKopecks?: number | undefined;
	readonly treatmentPlanId?: string | null | undefined;
	readonly stageNumber?: number | null | undefined;
	readonly stageTitle?: string | null | undefined;
	readonly stageId?: string | null | undefined;
}

export interface DentalLabOrderModalSectionProps {
	isOpen: boolean;
	onClose: () => void;
	activePatient: LabSectionPatient | null | undefined;
	activeDoctor: LabSectionDoctor | null | undefined;
	activeAppointment: LabSectionAppointment | null | undefined;
	dashboard: LabSectionDashboard | null | undefined;
	effectiveTreatmentPlanId?: string | undefined;
	effectiveStageId?: string | undefined;
	effectiveStageNumber?: number | undefined;
	effectiveStageTitle?: string | undefined;
	labOrderModalToothNumber: string | number | null;
	setLabOrderModalToothNumber: (v: string | number | null) => void;
	setToothState: (code: string, state: string) => void;
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
		<DentalLabStudioModal
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
			onOrderSaved={(rawOrder) => {
				const order = rawOrder as SavedLabOrderNotification | undefined;
				if (!order) return;
				let impressionPriceRub = 2500;
				const targetTeeth =
					Array.isArray(order.selectedTeeth) && order.selectedTeeth.length > 0
						? (order.selectedTeeth as number[])
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

				const patientPriceRub =
					order.patientPriceKopecks != null
						? Math.round(order.patientPriceKopecks / 100)
						: (order.priceRub || 0);

				const unitPrice =
					patientPriceRub > 0 && targetTeeth.length > 0
						? Math.round(patientPriceRub / targetTeeth.length)
						: patientPriceRub;

				const rawLabCost =
					order.labCostKopecks != null
						? Math.round(order.labCostKopecks / 100)
						: (order.doctorDeductionRub ?? 0);

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
					const catalogImpressionPrice = (() => {
						if (typeof order.impressionPriceRub === "number" && order.impressionPriceRub > 0) {
							return order.impressionPriceRub;
						}
						if (typeof order.impressionPriceKopecks === "number" && order.impressionPriceKopecks > 0) {
							return Math.round(order.impressionPriceKopecks / 100);
						}
						const servicesList = dashboard?.services || dashboard?.pricelist || dashboard?.catalogServices;
						if (Array.isArray(servicesList)) {
							const found = servicesList.find((s: LabSectionCatalogService) => s.code804n === "A02.07.010" || s.order804nCode === "A02.07.010" || s.code === "A02.07.010");
							if (found && typeof found.priceRub === "number" && found.priceRub > 0) {
								return found.priceRub;
							}
							if (found && typeof found.price === "number" && found.price > 0) {
								return found.price;
							}
						}
						return 2500;
					})();
					impressionPriceRub = catalogImpressionPrice;

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
						? `Наряд ЗТЛ сохранен. Снятие слепка (${impressionPriceRub.toLocaleString("ru-RU")} ₽) включено в счёт визита`
						: "Наряд ЗТЛ сохранен",
					"success",
				);
			}}
		/>
	);
};
