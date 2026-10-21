/**
 * DENTE Dental CRM — Leads Form State Hook
 * Mandate 8b (<= 120 lines)
 */

import { useState } from "react";
import type { Lead } from "../../../store/leadsStore";
import { showToast } from "../../GlobalToast";

interface LeadFormStateOptions {
	addLead: (payload: any) => Promise<any>;
	updateLeadDetails: (id: string, payload: any) => Promise<any>;
	deleteLead: (id: string) => Promise<any>;
}

export function useLeadFormState(opts: LeadFormStateOptions) {
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [editForm, setEditForm] = useState<Partial<Lead>>({
		name: "",
		phone: "",
		source: "",
		expectedRevenue: "",
	});

	const openEditModal = (lead?: Lead) => {
		setEditingLeadId(lead ? lead.id : "new");
		setEditForm({
			name: lead?.name || "",
			phone: lead?.phone || "",
			source: lead?.source || "",
			expectedRevenue: lead?.expectedRevenue || "",
			status: lead?.status || "new",
			notes: lead?.notes || "",
			dropReason: lead?.dropReason || "",
		});
		setIsEditOpen(true);
	};

	const handleEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const payload = {
				name: editForm.name || "Без имени",
				phone: editForm.phone || "",
				source: editForm.source || "",
				expectedRevenue: editForm.expectedRevenue
					? String(editForm.expectedRevenue)
					: "",
				notes: editForm.notes || "",
				dropReason: editForm.dropReason || undefined,
			};

			if (editingLeadId === "new") {
				await opts.addLead(payload);
				showToast("Новый лид добавлен", "success");
			} else if (editingLeadId) {
				await opts.updateLeadDetails(editingLeadId, {
					...payload,
					...(editForm.status ? { status: editForm.status } : {}),
				});
				showToast("Лид обновлен", "success");
			}
			setIsEditOpen(false);
		} catch (e: unknown) {
			const text =
				e instanceof Error && e.message.trim() ? e.message : "Лид не сохранён.";
			showToast(text, "error");
		}
	};

	const handleDeleteLead = async () => {
		if (!editingLeadId || editingLeadId === "new" || isDeleting) return;
		setIsDeleting(true);
		try {
			await opts.deleteLead(editingLeadId);
			showToast("Обращение удалено", "success");
			setIsEditOpen(false);
			setEditingLeadId(null);
		} catch (e: unknown) {
			const text =
				e instanceof Error && e.message.trim()
					? e.message
					: "Обращение не удалено.";
			showToast(text, "error");
		} finally {
			setIsDeleting(false);
		}
	};

	return {
		isEditOpen,
		setIsEditOpen,
		editingLeadId,
		setEditingLeadId,
		isDeleting,
		editForm,
		setEditForm,
		openEditModal,
		handleEditSubmit,
		handleDeleteLead,
	};
}
