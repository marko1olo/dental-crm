import type { ProtocolTemplate } from "@dental/shared";
import { ClipboardCheck, Edit2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { showToast } from "../GlobalToast";
import "./SettingsProtocolsTab.css";

export function SettingsProtocolsTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const {
		dashboard,
		specialtyLabels,
		documentLabels,
		imagingKindLabels,
		applyProtocolTemplate,
	} = mergedProps;

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
					"x-dente-admin-secret": clinicToken || "", // For fallback compatibility
				},
				body: JSON.stringify(editForm),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || "Ошибка сохранения шаблона");
			}

			// Reload page to refresh dashboard state
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
			<section className="protocol-settings animate-fade-in">
				<div className="import-copy">
					<ClipboardCheck aria-hidden="true" />
					<div>
						<h2>{editingId ? "Редактирование шаблона" : "Новый шаблон"}</h2>
						<p>Настройте параметры клинического протокола.</p>
					</div>
				</div>

				{error && (
					<div className="dente-alert dente-alert-danger" role="alert">
						{error}
					</div>
				)}

				<div className="settings-form-grid" style={{ marginTop: "1.5rem" }}>
					<label className="dente-label">
						<span>Название</span>
						<input
							type="text"
							className="dente-input"
							value={editForm.title || ""}
							onChange={(e) =>
								setEditForm((prev) => ({ ...prev, title: e.target.value }))
							}
						/>
					</label>
					<label className="dente-label">
						<span>Специальность</span>
						<select
							className="dente-input"
							value={editForm.specialty || "universal"}
							onChange={(e) =>
								setEditForm((prev) => ({
									...prev,
									specialty: e.target.value as any,
								}))
							}
						>
							{Object.entries(specialtyLabels as Record<string, string>).map(
								([key, label]) => (
									<option key={key} value={key}>
										{label}
									</option>
								),
							)}
						</select>
					</label>
					<label className="dente-label">
						<span>Причина визита (по-умолчанию)</span>
						<input
							type="text"
							className="dente-input"
							value={editForm.visitReason || ""}
							onChange={(e) =>
								setEditForm((prev) => ({
									...prev,
									visitReason: e.target.value,
								}))
							}
						/>
					</label>
					<label className="dente-label">
						<span>Длительность (мин)</span>
						<input
							type="number"
							className="dente-input"
							value={editForm.defaultDurationMinutes || 30}
							onChange={(e) =>
								setEditForm((prev) => ({
									...prev,
									defaultDurationMinutes: parseInt(e.target.value, 10) || 30,
								}))
							}
						/>
					</label>
				</div>

				<div style={{ marginTop: "1rem" }}>
					<label className="dente-label">
						<span>Шаблон жалоб (подсказка)</span>
						<textarea
							className="dente-input"
							rows={3}
							value={editForm.complaintPrompt || ""}
							onChange={(e) =>
								setEditForm((prev) => ({
									...prev,
									complaintPrompt: e.target.value,
								}))
							}
						/>
					</label>
					<label className="dente-label" style={{ marginTop: "1rem" }}>
						<span>Шаблон объективного статуса</span>
						<textarea
							className="dente-input"
							rows={3}
							value={editForm.objectiveTemplate || ""}
							onChange={(e) =>
								setEditForm((prev) => ({
									...prev,
									objectiveTemplate: e.target.value,
								}))
							}
						/>
					</label>
					<label className="dente-label" style={{ marginTop: "1rem" }}>
						<span>Шаблон плана лечения</span>
						<textarea
							className="dente-input"
							rows={3}
							value={editForm.treatmentPlanTemplate || ""}
							onChange={(e) =>
								setEditForm((prev) => ({
									...prev,
									treatmentPlanTemplate: e.target.value,
								}))
							}
						/>
					</label>
				</div>

				<div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
					<button
						className="primary-button"
						onClick={handleSave}
						disabled={loading}
					>
						{loading ? "Сохранение..." : "Сохранить"}
					</button>
					<button
						className="secondary-button"
						onClick={handleCancel}
						disabled={loading}
					>
						Отмена
					</button>
				</div>
			</section>
		);
	}

	return (
		<section
			className="protocol-settings animate-fade-in"
			aria-label="Библиотека клинических протоколов"
		>
			<div
				className="import-copy"
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
				}}
			>
				<div style={{ display: "flex", gap: "1rem" }}>
					<ClipboardCheck aria-hidden="true" />
					<div>
						<p className="eyebrow">Протоколы</p>
						<h2>Шаблоны приема по специальностям</h2>
						<p>
							Настройте протоколы для ваших врачей, чтобы ускорить заполнение
							карты.
						</p>
					</div>
				</div>
				<button className="primary-button" onClick={handleCreateNew}>
					<Plus size={16} /> Добавить шаблон
				</button>
			</div>

			<div className="protocol-settings-grid">
				{typedProtocolTemplates.map((template) => (
					<article className="protocol-settings-card" key={template.id}>
						<div className="protocol-settings-head">
							<span>{specialtyLabels[template.specialty]}</span>
							<strong>{template.title}</strong>
							<p>
								{template.visitReason} · {template.defaultDurationMinutes} мин
							</p>
						</div>
						<div
							className="protocol-token-row"
							aria-label="Документы протокола"
						>
							{template.requiredDocuments.map((kind) => (
								<span key={kind}>{documentLabels[kind]}</span>
							))}
						</div>
						<div
							className="protocol-token-row protocol-token-row-soft"
							aria-label="Снимки протокола"
						>
							{template.suggestedImaging.map((kind) => (
								<span key={kind}>{imagingKindLabels[kind]}</span>
							))}
						</div>
						<ul>
							{template.safetyWarnings.slice(0, 2).map((warning) => (
								<li key={warning}>{warning}</li>
							))}
						</ul>
						<div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
							<button
								className="secondary-button"
								type="button"
								onClick={() => handleEdit(template)}
								title="Редактировать"
							>
								<Edit2 size={16} />
							</button>
							<button
								className="danger-button"
								type="button"
								style={{
									padding: "0.5rem",
									backgroundColor: "var(--dente-red-10)",
									color: "var(--dente-red-60)",
									border: "none",
									borderRadius: "0.5rem",
									cursor: "pointer",
								}}
								onClick={() => handleDelete(template.id)}
								title="Удалить"
								disabled={loading}
							>
								<Trash2 size={16} />
							</button>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}
