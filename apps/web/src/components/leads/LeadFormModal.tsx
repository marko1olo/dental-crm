/**
 * DENTE Dental CRM — Leads Kanban SSOT Form Modal (Tier 2 Lead Details Drawer)
 * Mandate 8s (SSOT Componentization), Mandate 8b (<= 120 lines), Anti-Matryoshka
 */

import type React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import type { Lead } from "../../store/leadsStore";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { LeadFormHeader } from "./leadForm/LeadFormHeader";
import { LeadFormFields } from "./leadForm/LeadFormFields";
import { LeadFormFooterActions } from "./leadForm/LeadFormFooterActions";

export interface LeadFormModalProps {
	isOpen: boolean;
	onClose: () => void;
	editingLeadId: string | null;
	editForm: Partial<Lead>;
	setEditForm: React.Dispatch<React.SetStateAction<Partial<Lead>>>;
	onSubmit: (e: React.FormEvent) => void;
	isDeleting: boolean;
	onDelete: () => void;
	creatingPatientLeadId: string | null;
	onCreatePatient: (lead: Lead) => void;
	leads: Lead[];
	cardBg?: string;
	colBg?: string;
	borderColor?: string;
}

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
	isOpen,
	onClose,
	editingLeadId,
	editForm,
	setEditForm,
	onSubmit,
	isDeleting,
	onDelete,
	creatingPatientLeadId,
	onCreatePatient,
	leads,
	cardBg = "var(--paper)",
	colBg = "var(--paper-soft)",
	borderColor = "var(--line)",
}) => {
	if (!isOpen) return null;

	const isNew = editingLeadId === "new";
	const currentLead = !isNew && editingLeadId ? leads.find((l) => l.id === editingLeadId) || null : null;

	const handleOpenPatient = (patientId: string) => {
		try {
			usePatientStore.getState().setSelectedPatientId(patientId);
			useAppStore.getState().setCurrentView("patients");
			if (typeof window !== "undefined") window.location.hash = "patients";
			onClose();
		} catch {
			// fallback
		}
	};

	const drawerContent = (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 10050,
				display: "flex",
				justifyContent: "flex-end",
				background: "rgba(0,0,0,0.45)",
				backdropFilter: "blur(4px)",
			}}
			onClick={onClose}
			data-testid="lead-drawer-backdrop"
		>
			<motion.div
				initial={{ x: "100%" }}
				animate={{ x: 0 }}
				exit={{ x: "100%" }}
				transition={{ type: "spring", damping: 28, stiffness: 300 }}
				onClick={(e) => e.stopPropagation()}
				className="lead-details-drawer"
				data-testid="lead-details-drawer"
				style={{
					background: cardBg,
					width: 480,
					maxWidth: "100vw",
					height: "100%",
					borderLeft: `1px solid ${borderColor}`,
					boxShadow: "-8px 0 32px rgba(0,0,0,0.2)",
					display: "flex",
					flexDirection: "column",
					padding: "20px 24px",
					overflowY: "auto",
					boxSizing: "border-box",
				}}
			>
				<LeadFormHeader
					isNew={isNew}
					currentLead={currentLead}
					borderColor={borderColor}
					onClose={onClose}
					onOpenPatient={handleOpenPatient}
				/>
				<form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
					<LeadFormFields editForm={editForm} setEditForm={setEditForm} borderColor={borderColor} colBg={colBg} />
					<LeadFormFooterActions
						isNew={isNew}
						editingLeadId={editingLeadId}
						currentLead={currentLead}
						isDeleting={isDeleting}
						creatingPatientLeadId={creatingPatientLeadId}
						onOpenPatient={handleOpenPatient}
						onCreatePatient={onCreatePatient}
						onDelete={onDelete}
					/>
				</form>
			</motion.div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(drawerContent, document.body) : drawerContent;
};
