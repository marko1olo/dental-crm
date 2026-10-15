import React, { lazy, Suspense } from "react";
import type { Lead } from "../../../store/leadsStore";
import type { BookableChair, BookableDoctor } from "../leadsKanbanTypes";
import {
	LeadConvertModal,
	type LeadConvertSubmitOptions,
} from "../LeadConvertModal";
import { LeadFormModal } from "../LeadFormModal";
import {
	resolveLeadBookingChairs,
	resolveLeadBookingStaff,
} from "../leadsKanbanTypes";

const LeadsFunnelAnalyticsModal = lazy(() =>
	import("../LeadsFunnelAnalyticsModal").then((module) => ({
		default: module.LeadsFunnelAnalyticsModal,
	})),
);

const CrmLeakDetectorModal = lazy(() =>
	import("../../crm/CrmLeakDetectorModal").then((module) => ({
		default: module.CrmLeakDetectorModal,
	})),
);

export interface LeadsKanbanSharedModalsProps {
	isConvertOpen: boolean;
	onCloseConvert: () => void;
	onConvertSubmit: (
		e: React.FormEvent,
		options?: LeadConvertSubmitOptions,
	) => Promise<void> | void;
	staff: BookableDoctor[];
	chairs: BookableChair[];
	selectedDoctorId: string;
	setSelectedDoctorId: React.Dispatch<React.SetStateAction<string>>;
	selectedChairId: string;
	setSelectedChairId: React.Dispatch<React.SetStateAction<string>>;
	appointmentDate: string;
	setAppointmentDate: (date: string) => void;
	appointmentTime: string;
	setAppointmentTime: (time: string) => void;
	isBooking: boolean;
	convertingLead: Lead | null;
	isEditOpen: boolean;
	onCloseEdit: () => void;
	editingLeadId: string | null;
	editForm: Partial<Lead>;
	setEditForm: React.Dispatch<React.SetStateAction<Partial<Lead>>>;
	onEditSubmit: (e: React.FormEvent) => Promise<void> | void;
	isDeleting: boolean;
	onDeleteLead: () => Promise<void> | void;
	creatingPatientLeadId: string | null;
	onCreatePatient: (lead: Lead) => Promise<void> | void;
	leads: Lead[];
	isAnalyticsOpen: boolean;
	onCloseAnalytics: () => void;
	isLeakDetectorOpen: boolean;
	onCloseLeakDetector: () => void;
	onOpenLeakDetector: () => void;
	cardBg?: string;
	colBg?: string;
	borderColor?: string;
}

export const LeadsKanbanSharedModals: React.FC<LeadsKanbanSharedModalsProps> = ({
	isConvertOpen,
	onCloseConvert,
	onConvertSubmit,
	staff,
	chairs,
	selectedDoctorId,
	setSelectedDoctorId,
	selectedChairId,
	setSelectedChairId,
	appointmentDate,
	setAppointmentDate,
	appointmentTime,
	setAppointmentTime,
	isBooking,
	convertingLead,
	isEditOpen,
	onCloseEdit,
	editingLeadId,
	editForm,
	setEditForm,
	onEditSubmit,
	isDeleting,
	onDeleteLead,
	creatingPatientLeadId,
	onCreatePatient,
	leads,
	isAnalyticsOpen,
	onCloseAnalytics,
	isLeakDetectorOpen,
	onCloseLeakDetector,
	onOpenLeakDetector,
	cardBg = "var(--paper)",
	colBg = "var(--paper-soft)",
	borderColor = "var(--line)",
}) => {
	return (
		<>
			{/* CONVERT MODAL */}
			<LeadConvertModal
				isOpen={isConvertOpen}
				onClose={onCloseConvert}
				onSubmit={onConvertSubmit}
				staff={staff}
				chairs={chairs}
				effectiveStaff={resolveLeadBookingStaff(staff)}
				effectiveChairs={resolveLeadBookingChairs(chairs)}
				selectedDoctorId={selectedDoctorId}
				setSelectedDoctorId={setSelectedDoctorId}
				selectedChairId={selectedChairId}
				setSelectedChairId={setSelectedChairId}
				appointmentDate={appointmentDate}
				setAppointmentDate={setAppointmentDate}
				appointmentTime={appointmentTime}
				setAppointmentTime={setAppointmentTime}
				isBooking={isBooking}
				lead={convertingLead}
				cardBg={cardBg}
				colBg={colBg}
				borderColor={borderColor}
			/>

			{/* EDIT / ADD MODAL */}
			<LeadFormModal
				isOpen={isEditOpen}
				onClose={onCloseEdit}
				editingLeadId={editingLeadId}
				editForm={editForm}
				setEditForm={setEditForm}
				onSubmit={onEditSubmit}
				isDeleting={isDeleting}
				onDelete={onDeleteLead}
				creatingPatientLeadId={creatingPatientLeadId}
				onCreatePatient={onCreatePatient}
				leads={leads}
				cardBg={cardBg}
				colBg={colBg}
				borderColor={borderColor}
			/>

			{/* ANALYTICS FUNNEL MODAL */}
			{isAnalyticsOpen && (
				<Suspense fallback={null}>
					<LeadsFunnelAnalyticsModal
						isOpen={isAnalyticsOpen}
						onClose={onCloseAnalytics}
						leads={leads}
						onOpenLeakDetector={onOpenLeakDetector}
					/>
				</Suspense>
			)}

			{/* CRM LEAK DETECTOR MODAL (210 DAYS) */}
			{isLeakDetectorOpen && (
				<Suspense fallback={null}>
					<CrmLeakDetectorModal
						isOpen={isLeakDetectorOpen}
						onClose={onCloseLeakDetector}
					/>
				</Suspense>
			)}
		</>
	);
};
