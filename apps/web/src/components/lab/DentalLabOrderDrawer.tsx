import React from "react";
import { createPortal } from "react-dom";
import type { DentalLabOrderRecord } from "./dentalLabOrderEngine";
import { useDentalLabOrderDrawerForm } from "./drawer/useDentalLabOrderDrawerForm";
import { DentalLabDrawerHeader } from "./drawer/DentalLabDrawerHeader";
import { DentalLabDrawerBody } from "./drawer/DentalLabDrawerBody";
import { DentalLabDrawerFooter } from "./drawer/DentalLabDrawerFooter";

if (typeof document !== "undefined") {
	void import("./dentalLab.css");
}

export interface DentalLabOrderDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly editingOrder?: DentalLabOrderRecord | any | null | undefined;
	readonly initialOrder?: DentalLabOrderRecord | any | null | undefined;
	readonly currentPatientId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly currentPatientName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly currentDoctorName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly currentDoctorId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly currentToothNumber?: number | string | undefined;
	readonly initialToothFdi?: number | string | undefined;
	readonly initialTeeth?: readonly (number | string)[] | undefined;
	readonly treatmentPlanId?: string | undefined;
	readonly stageNumber?: number | undefined;
	readonly stageTitle?: string | undefined;
	readonly stageId?: string | undefined;
	readonly scheduledVisitDate?: string | undefined;
	readonly patientChartNumber?: string | undefined;
	readonly initialTab?: string | undefined;
	readonly onSaveOrder?: ((order: any, isEdit: boolean) => void) | undefined;
	readonly onOrderSaved?: ((order?: any) => void) | undefined;
}

/**
 * DentalLabOrderDrawer — Канонический фасад наряд-заказа ЗТЛ (SSOT Consolidated).
 * Единый шлюз ортопедического наряда: на десктопе — удобная правая шторка / модальный бланк,
 * на смартфонах — нативный Bottom Sheet Drawer с Natural Thumb Zone и кнопками >= 44x44px.
 */
export function DentalLabOrderDrawer(props: DentalLabOrderDrawerProps) {
	if (!props.isOpen) return null;

	const form = useDentalLabOrderDrawerForm(props);
	const isEdit = Boolean(form.editingOrder?.id);

	const drawerContent = (
		<div
			className="fixed inset-0 z-[99999] flex justify-end max-sm:items-end bg-black/60 transition-opacity"
			role="dialog"
			aria-modal="true"
			data-testid="dental-lab-work-order-modal"
			onClick={(e) => {
				if (e.target === e.currentTarget) props.onClose();
			}}
		>
			<aside
				className="w-full max-w-2xl max-sm:max-w-full max-h-screen max-sm:max-h-[94vh] h-full max-sm:h-auto bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-l max-sm:border-l-0 max-sm:border-t border-[var(--line,#cbd5e1)] shadow-2xl flex flex-col max-sm:rounded-t-[24px] overflow-hidden animate-in slide-in-from-right max-sm:slide-in-from-bottom duration-200"
				data-testid="dental-lab-order-drawer"
				aria-label="Шторка наряд-заказа зуботехнической лаборатории"
			>
				{/* Apple HIG: Drag handle для смартфонов */}
				<div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-2.5 mb-1 shrink-0" aria-hidden="true" />

				<DentalLabDrawerHeader
					isEditing={isEdit}
					orderNumber={form.editingOrder?.orderNumber ?? form.editingOrder?.id}
					treatmentPlanId={props.treatmentPlanId}
					stageNumber={props.stageNumber}
					stageTitle={props.stageTitle}
					currentStatus={form.status}
					onMarkReadyInClinic={isEdit ? form.handleMarkReadyInClinic : undefined}
					onClose={props.onClose}
				/>

				<DentalLabDrawerBody form={form} />

				<DentalLabDrawerFooter
					onClose={props.onClose}
					onSubmit={form.handleSubmit}
					isEditing={isEdit}
				/>
			</aside>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(drawerContent, document.body);
	}
	return drawerContent;
}
