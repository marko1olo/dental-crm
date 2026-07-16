import type { ProtocolTemplate } from "@dental/shared";
import { ClipboardCheck, Edit2, Plus, Trash2, X } from "lucide-react";
import React, { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

export function SettingsProtocolsTab() {
	const props = useAppLogicContext();
	const {
		dashboard,
		specialtyLabels,
		documentLabels,
		imagingKindLabels,
		applyProtocolTemplate,
	} = props;

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
			title: "РќРѕРІС‹Р№ С€Р°Р±Р»РѕРЅ",
			visitReason: "РџРµСЂРІРёС‡РЅС‹Р№ РїСЂРёРµРј",
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
				throw new Error(
					data.message || "РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ С€Р°Р±Р»РѕРЅР°",
				);
			}

			// Reload page to refresh dashboard state
			window.location.reload();
		} catch (err: any) {
			console.error(err);
			setError(err.message || "РќРµРёР·РІРµСЃС‚РЅР°СЏ РѕС€РёР±РєР°");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (
			!confirm(
				"Р’С‹ СѓРІРµСЂРµРЅС‹, С‡С‚Рѕ С…РѕС‚РёС‚Рµ СѓРґР°Р»РёС‚СЊ СЌС‚РѕС‚ С€Р°Р±Р»РѕРЅ?",
			)
		)
			return;
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
				throw new Error("РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ");
			}
			window.location.reload();
		} catch (err: any) {
			alert(err.message);
			setLoading(false);
		}
	};

	if (isEditing) {
		return (
			<section className="protocol-settings animate-fade-in">
				<div className="import-copy">
					<ClipboardCheck aria-hidden="true" />
					<div>
						<h2>
							{editingId
								? "Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ С€Р°Р±Р»РѕРЅР°"
								: "РќРѕРІС‹Р№ С€Р°Р±Р»РѕРЅ"}
						</h2>
						<p>
							РќР°СЃС‚СЂРѕР№С‚Рµ РїР°СЂР°РјРµС‚СЂС‹ РєР»РёРЅРёС‡РµСЃРєРѕРіРѕ
							РїСЂРѕС‚РѕРєРѕР»Р°.
						</p>
					</div>
				</div>

				{error && (
					<div className="dente-alert dente-alert-danger" role="alert">
						{error}
					</div>
				)}

				<div className="settings-form-grid" style={{ marginTop: "1.5rem" }}>
					<label className="dente-label">
						<span>РќР°Р·РІР°РЅРёРµ</span>
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
						<span>РЎРїРµС†РёР°Р»СЊРЅРѕСЃС‚СЊ</span>
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
						<span>РџСЂРёС‡РёРЅР° РІРёР·РёС‚Р° (РїРѕ-СѓРјРѕР»С‡Р°РЅРёСЋ)</span>
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
						<span>Р”Р»РёС‚РµР»СЊРЅРѕСЃС‚СЊ (РјРёРЅ)</span>
						<input
							type="number"
							className="dente-input"
							value={editForm.defaultDurationMinutes || 30}
							onChange={(e) =>
								setEditForm((prev) => ({
									...prev,
									defaultDurationMinutes: parseInt(e.target.value) || 30,
								}))
							}
						/>
					</label>
				</div>

				<div style={{ marginTop: "1rem" }}>
					<label className="dente-label">
						<span>РЁР°Р±Р»РѕРЅ Р¶Р°Р»РѕР± (РїРѕРґСЃРєР°Р·РєР°)</span>
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
						<span>РЁР°Р±Р»РѕРЅ РѕР±СЉРµРєС‚РёРІРЅРѕРіРѕ СЃС‚Р°С‚СѓСЃР°</span>
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
						<span>РЁР°Р±Р»РѕРЅ РїР»Р°РЅР° Р»РµС‡РµРЅРёСЏ</span>
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
						{loading ? "РЎРѕС…СЂР°РЅРµРЅРёРµ..." : "РЎРѕС…СЂР°РЅРёС‚СЊ"}
					</button>
					<button
						className="secondary-button"
						onClick={handleCancel}
						disabled={loading}
					>
						РћС‚РјРµРЅР°
					</button>
				</div>
			</section>
		);
	}

	return (
		<section
			className="protocol-settings animate-fade-in"
			aria-label="Р‘РёР±Р»РёРѕС‚РµРєР° РєР»РёРЅРёС‡РµСЃРєРёС… РїСЂРѕС‚РѕРєРѕР»РѕРІ"
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
						<p className="eyebrow">РџСЂРѕС‚РѕРєРѕР»С‹</p>
						<h2>
							РЁР°Р±Р»РѕРЅС‹ РїСЂРёРµРјР° РїРѕ СЃРїРµС†РёР°Р»СЊРЅРѕСЃС‚СЏРј
						</h2>
						<p>
							РќР°СЃС‚СЂРѕР№С‚Рµ РїСЂРѕС‚РѕРєРѕР»С‹ РґР»СЏ РІР°С€РёС…
							РІСЂР°С‡РµР№, С‡С‚РѕР±С‹ СѓСЃРєРѕСЂРёС‚СЊ Р·Р°РїРѕР»РЅРµРЅРёе
							РєР°СЂС‚С‹.
						</p>
					</div>
				</div>
				<button className="primary-button" onClick={handleCreateNew}>
					<Plus size={16} /> Р”РѕР±Р°РІРёС‚СЊ С€Р°Р±Р»РѕРЅ
				</button>
			</div>

			<div className="protocol-settings-grid">
				{typedProtocolTemplates.map((template) => (
					<article className="protocol-settings-card" key={template.id}>
						<div className="protocol-settings-head">
							<span>{specialtyLabels[template.specialty]}</span>
							<strong>{template.title}</strong>
							<p>
								{template.visitReason} В· {template.defaultDurationMinutes}{" "}
								РјРёРЅ
							</p>
						</div>
						<div
							className="protocol-token-row"
							aria-label="Р”РѕРєСѓРјРµРЅС‚С‹ РїСЂРѕС‚РѕРєРѕР»Р°"
						>
							{template.requiredDocuments.map((kind) => (
								<span key={kind}>{documentLabels[kind]}</span>
							))}
						</div>
						<div
							className="protocol-token-row protocol-token-row-soft"
							aria-label="РЎРЅРёРјРєРё РїСЂРѕС‚РѕРєРѕР»Р°"
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
								title="Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ"
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
								title="РЈРґР°Р»РёС‚СЊ"
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
