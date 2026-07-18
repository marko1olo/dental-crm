import type { ProtocolTemplate } from "@dental/shared";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { showToast } from "../GlobalToast";
import "./SettingsProtocolsTab.css";

import { ProtocolEditorForm } from "./protocols/ProtocolEditorForm";
import { ProtocolLibrary } from "./protocols/ProtocolLibrary";

export function SettingsProtocolsTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const { dashboard, specialtyLabels, documentLabels, imagingKindLabels } =
		mergedProps;

	const typedProtocolTemplates = (dashboard?.protocolTemplates ||
		[]) as ProtocolTemplate[];

	const [isEditing, setIsEditing] = useState<boolean>(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<Partial<ProtocolTemplate>>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleCreateNew = () => {
		setEditingId(null);
		setEditForm({
			specialty: "universal",
			title: "Новый шаблон",
			visitReason: "Первичный прием",
			defaultDurationMinutes: 30,
			complaintPrompt: "",
			objectiveTemplate: "",
			treatmentPlanTemplate: "",
			diagnosisHints: [],
			requiredDocuments: [],
			suggestedImaging: [],
			safetyWarnings: [],
		});
		setIsEditing(true);
	};

	const handleEdit = (template: ProtocolTemplate) => {
		setEditingId(template.id);
		setEditForm({ ...template });
		setIsEditing(true);
	};

	const handleCancel = () => {
		setIsEditing(false);
		setEditingId(null);
		setEditForm({});
		setError(null);
	};

	const handleSave = async () => {
		setError(null);
		setLoading(true);
		try {
			const clinicToken = localStorage.getItem("dente_clinic_token");
			const method = editingId ? "PUT" : "POST";
			const url = editingId
				? `/api/settings/protocols/${editingId}`
				: "/api/settings/protocols";

			const res = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
					"x-dente-admin-secret": clinicToken || "",
				},
				body: JSON.stringify(editForm),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || "Ошибка сохранения шаблона");
			}

			window.location.reload();
		} catch (err: any) {
			console.error(err);
			setError(err.message || "Неизвестная ошибка");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Вы уверены, что хотите удалить этот шаблон?")) return;
		setLoading(true);
		try {
			const clinicToken = localStorage.getItem("dente_clinic_token");
			const res = await fetch(`/api/settings/protocols/${id}`, {
				method: "DELETE",
				headers: {
					"x-dente-admin-secret": clinicToken || "",
				},
			});

			if (!res.ok) {
				throw new Error("Ошибка удаления");
			}
			window.location.reload();
		} catch (err: any) {
			showToast(err.message, "error");
			setLoading(false);
		}
	};

	if (isEditing) {
		return (
			<ProtocolEditorForm
				editingId={editingId}
				editForm={editForm}
				setEditForm={setEditForm}
				specialtyLabels={specialtyLabels}
				handleSave={handleSave}
				handleCancel={handleCancel}
				loading={loading}
				error={error}
			/>
		);
	}

	return (
		<ProtocolLibrary
			typedProtocolTemplates={typedProtocolTemplates}
			specialtyLabels={specialtyLabels}
			documentLabels={documentLabels}
			imagingKindLabels={imagingKindLabels}
			handleCreateNew={handleCreateNew}
			handleEdit={handleEdit}
			handleDelete={handleDelete}
			loading={loading}
		/>
	);
}
