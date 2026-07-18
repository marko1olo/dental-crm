import { ClipboardCheck } from "lucide-react";
import type { ChangeEvent } from "react";
import type { ProtocolTemplate } from "@dental/shared";

export function ProtocolEditorForm({
	editingId,
	editForm,
	setEditForm,
	specialtyLabels,
	handleSave,
	handleCancel,
	loading,
	error,
}: {
	editingId: string | null;
	editForm: Partial<ProtocolTemplate>;
	setEditForm: React.Dispatch<React.SetStateAction<Partial<ProtocolTemplate>>>;
	specialtyLabels: any;
	handleSave: () => void;
	handleCancel: () => void;
	loading: boolean;
	error: string | null;
}) {
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
