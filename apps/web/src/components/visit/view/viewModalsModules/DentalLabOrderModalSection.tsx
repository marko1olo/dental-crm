/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Dental Lab Order Modal Section (ЗТЛ)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Оформление наряда в зуботехническую лабораторию, связка со снятием слепка (A02.07.010)
 * и обновлением этапа плана лечения («В работе в ЗТЛ»).
 */

import React from "react";
import { rublesToKopecks, kopecksToRubles, splitKopecks } from "@dental/shared";
import { DentalLabStudioModal } from "../../../lab/DentalLabStudioModal";
import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";
import { useVisitStore } from "../../../../store/visitStore";
import { showToast } from "../../../GlobalToast";
import type {
	VisitModalPatientEntity,
	VisitModalDoctorEntity,
	VisitModalAppointmentEntity,
	VisitModalDashboardEntity,
} from "./visitViewModalsTypes";
import type {
	VisitPatientEntity,
	VisitDoctorEntity,
	VisitAppointmentEntity,
	VisitDashboardEntity,
} from "../VisitViewProps";
import type { Dashboard } from "@dental/shared";

export interface LabSectionPatient {
	readonly id?: string | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly fullName?: string | null | undefined;
	readonly name?: string | null | undefined;
	readonly medCardNumber?: string | null | undefined;
	readonly cardNumber?: string | null | undefined;
	readonly [key: string]: unknown;
}

export interface LabSectionDoctor {
	readonly id?: string | null | undefined;
	readonly userId?: string | null | undefined;
	readonly fullName?: string | null | undefined;
	readonly name?: string | null | undefined;
	readonly [key: string]: unknown;
}

export interface LabSectionAppointment {
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly startTime?: string | null | undefined;
	readonly startAt?: string | null | undefined;
	readonly date?: string | null | undefined;
	readonly [key: string]: unknown;
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
		readonly patientId?: string | null | undefined;
		readonly [key: string]: unknown;
	} | null | undefined;
	readonly services?: readonly LabSectionCatalogService[] | undefined;
	readonly pricelist?: readonly LabSectionCatalogService[] | undefined;
	readonly catalogServices?: readonly LabSectionCatalogService[] | undefined;
	readonly [key: string]: unknown;
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
	activePatient: VisitPatientEntity | null | undefined;
	activeDoctor: VisitDoctorEntity | null | undefined;
	activeAppointment: VisitAppointmentEntity | null | undefined;
	dashboard: VisitDashboardEntity | undefined;
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
			key={activePatient?.id || activeAppointment?.patientId || "dental_lab_order"}
			isOpen={isOpen}
			onClose={() => {
				onClose();
				setLabOrderModalToothNumber(null);
				useUiSurfaceStore.getState().closePrimaryModal("lab_order");
			}}
			patientId={
				(typeof activePatient?.id === "string" ? activePatient.id : undefined) ||
				(typeof activeAppointment?.patientId === "string" ? activeAppointment.patientId : undefined) ||
				(((dashboard as Record<string, unknown> | null | undefined)?.activeVisit as { patientId?: string } | undefined)?.patientId) ||
				undefined
			}
			patientName={
				(typeof activePatient?.fullName === "string" ? activePatient.fullName : undefined) ||
				(typeof activePatient?.name === "string" ? activePatient.name : undefined) ||
				(typeof activeAppointment?.patientName === "string" ? activeAppointment.patientName : undefined) ||
				"Пациент"
			}
			doctorId={
				(typeof activeDoctor?.id === "string" ? activeDoctor.id : undefined) ||
				(typeof activeDoctor?.userId === "string" ? activeDoctor.userId : undefined) ||
				(typeof (activeAppointment as Record<string, unknown> | null | undefined)?.doctorId === "string"
					? ((activeAppointment as Record<string, unknown>).doctorId as string)
					: undefined) ||
				undefined
			}
			doctorName={
				(typeof activeDoctor?.fullName === "string" ? activeDoctor.fullName : undefined) ||
				(typeof activeDoctor?.name === "string" ? activeDoctor.name : undefined) ||
				(typeof activeAppointment?.doctorName === "string" ? activeAppointment.doctorName : undefined) ||
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
				(typeof activeAppointment?.date === "string" ? activeAppointment.date : undefined) ||
				undefined
			}
			patientChartNumber={
				(typeof activePatient?.cardNumber === "string" ? activePatient.cardNumber : undefined) ||
				((activePatient as Record<string, unknown> | null | undefined)?.medCardNumber as string | undefined) ||
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

				const totalPatientPriceKopecks =
					order.patientPriceKopecks != null
						? Math.round(Number(order.patientPriceKopecks))
						: order.priceRub != null
							? rublesToKopecks(order.priceRub)
							: 0;

				const rawLabCost =
					order.labCostKopecks != null
						? Math.round(Number(order.labCostKopecks))
						: order.doctorDeductionRub != null
							? rublesToKopecks(order.doctorDeductionRub)
							: 0;
				const totalLabCostKopecks = rawLabCost;

				const targetTeethCount = targetTeeth.length > 0 ? targetTeeth.length : 1;
				const priceSplitsKopecks = splitKopecks(totalPatientPriceKopecks, targetTeethCount);
				const labCostSplitsKopecks = splitKopecks(totalLabCostKopecks, targetTeethCount);

				for (let i = 0; i < targetTeeth.length; i++) {
					const tooth = targetTeeth[i]!;
					const toothStr = String(tooth);
					const toothPriceKopecks = priceSplitsKopecks[i] ?? 0;
					const toothLabCostKopecks = labCostSplitsKopecks[i] ?? 0;
					const unitPriceRub = kopecksToRubles(toothPriceKopecks);
					const unitLabCost = toothLabCostKopecks > 0 ? kopecksToRubles(toothLabCostKopecks) : undefined;
					const unitLabCostRub = unitLabCost;

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
						priceRub: unitPriceRub,
						priceKopecks: toothPriceKopecks,
						quantity: 1,
						category: "Ортопедия",
						labOrderId: order.id,
						...(unitLabCost ? { labCostRub: unitLabCost, labCostKopecks: toothLabCostKopecks } : {}),
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
										unitPriceRub,
										priceKopecks: toothPriceKopecks,
										discountRub: 0,
										labCostRub: unitLabCost,
										labCostKopecks: toothLabCostKopecks,
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
					const catalogImpressionPriceKopecks = (() => {
						if (typeof order.impressionPriceKopecks === "number" && order.impressionPriceKopecks > 0) {
							return order.impressionPriceKopecks;
						}
						if (typeof order.impressionPriceRub === "number" && order.impressionPriceRub > 0) {
							return rublesToKopecks(order.impressionPriceRub);
						}
						const rawDashboard = dashboard as Record<string, unknown> | null | undefined;
						const servicesList = rawDashboard?.services || rawDashboard?.pricelist || rawDashboard?.catalogServices;
						if (Array.isArray(servicesList)) {
							const found = servicesList.find((s: LabSectionCatalogService) => s.code804n === "A02.07.010" || s.order804nCode === "A02.07.010" || s.code === "A02.07.010");
							if (found && typeof found.priceRub === "number" && found.priceRub > 0) {
								return rublesToKopecks(found.priceRub);
							}
							if (found && typeof found.price === "number" && found.price > 0) {
								return rublesToKopecks(found.price);
							}
						}
						return 250000;
					})();
					impressionPriceRub = kopecksToRubles(catalogImpressionPriceKopecks);

					useVisitStore.getState().addCompletedService({
						serviceId: `lab-order-impression-${order.id || Date.now()}`,
						code804n: "A02.07.010",
						toothNumber: primaryTooth,
						toothCode: primaryToothStr,
						name: impressionTitle,
						priceRub: impressionPriceRub,
						priceKopecks: catalogImpressionPriceKopecks,
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
