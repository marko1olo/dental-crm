import { ReceiptText, X } from "lucide-react";

export function PriceEditModal({
	editServiceId,
	editServiceForm,
	setEditServiceForm,
	setEditServiceId,
	handleSaveService,
	isSaving,
	serviceCategoryLabels,
	specialtyLabels,
}: {
	editServiceId: string;
	editServiceForm: any;
	setEditServiceForm: (form: any) => void;
	setEditServiceId: (id: string | null) => void;
	handleSaveService: (e: React.FormEvent) => void;
	isSaving: boolean;
	serviceCategoryLabels: Record<string, string>;
	specialtyLabels: Record<string, string>;
}) {
	return (
		<div
			className="premium-modal-overlay"
			onClick={(e) => {
				if (e.target === e.currentTarget) setEditServiceId(null);
			}}
		>
			<div className="premium-modal-content" style={{ maxWidth: "500px" }}>
				<div className="premium-modal-header">
					<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
						<ReceiptText size={24} color="var(--teal)" />
						<h3>
							{editServiceId === "new" ? "Новая услуга" : "Редактировать услугу"}
						</h3>
					</div>
					<button
						className="premium-modal-close"
						onClick={() => setEditServiceId(null)}
					>
						<X size={20} />
					</button>
				</div>

				<form onSubmit={handleSaveService} className="premium-modal-body">
					<div className="staff-form-group full-width">
						<label>Название услуги</label>
						<input
							type="text"
							value={editServiceForm.title}
							onChange={(e) =>
								setEditServiceForm({
									...editServiceForm,
									title: e.target.value,
								})
							}
							required
							placeholder="Например: Первичная консультация врача-терапевта"
						/>
					</div>

					<div className="staff-form-grid">
						<div className="staff-form-group">
							<label>Код (внутренний)</label>
							<input
								type="text"
								value={editServiceForm.code}
								onChange={(e) =>
									setEditServiceForm({
										...editServiceForm,
										code: e.target.value,
									})
								}
								placeholder="A01.07.001"
							/>
						</div>
						<div className="staff-form-group">
							<label>Цена (₽)</label>
							<input
								type="number"
								min="0"
								step="100"
								value={editServiceForm.basePriceRub}
								onChange={(e) =>
									setEditServiceForm({
										...editServiceForm,
										basePriceRub: parseInt(e.target.value) || 0,
									})
								}
								required
							/>
						</div>
					</div>

					<div className="staff-form-grid">
						<div className="staff-form-group">
							<label>Категория</label>
							<select
								value={editServiceForm.category}
								onChange={(e) =>
									setEditServiceForm({
										...editServiceForm,
										category: e.target.value as any,
									})
								}
							>
								{Object.entries(serviceCategoryLabels).map(([key, label]) => (
									<option key={key} value={key}>
										{label as string}
									</option>
								))}
							</select>
						</div>
						<div className="staff-form-group">
							<label>Специализация врача</label>
							<select
								value={editServiceForm.specialty}
								onChange={(e) =>
									setEditServiceForm({
										...editServiceForm,
										specialty: e.target.value as any,
									})
								}
							>
								{Object.entries(specialtyLabels).map(([key, label]) => (
									<option key={key} value={key}>
										{label as string}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="staff-form-grid">
						<div className="staff-form-group">
							<label>Длительность (мин)</label>
							<select
								value={editServiceForm.durationMinutes}
								onChange={(e) =>
									setEditServiceForm({
										...editServiceForm,
										durationMinutes: parseInt(e.target.value),
									})
								}
							>
								<option value={15}>15 минут</option>
								<option value={30}>30 минут</option>
								<option value={45}>45 минут</option>
								<option value={60}>1 час</option>
								<option value={90}>1.5 часа</option>
								<option value={120}>2 часа</option>
								<option value={180}>3 часа</option>
							</select>
						</div>
					</div>

					<div className="permissions-box" style={{ marginTop: "8px" }}>
						<label className="permission-toggle">
							<input
								type="checkbox"
								checked={editServiceForm.taxDeductible}
								onChange={(e) =>
									setEditServiceForm({
										...editServiceForm,
										taxDeductible: e.target.checked,
									})
								}
							/>
							<span>🧾 Учитывать в справках на налоговый вычет</span>
						</label>
						<label className="permission-toggle">
							<input
								type="checkbox"
								checked={editServiceForm.active}
								onChange={(e) =>
									setEditServiceForm({
										...editServiceForm,
										active: e.target.checked,
									})
								}
							/>
							<span>🟢 Услуга активна (доступна для записи)</span>
						</label>
					</div>

					<div className="premium-modal-footer">
						<button
							type="button"
							className="secondary-button"
							onClick={() => setEditServiceId(null)}
						>
							Отмена
						</button>
						<button type="submit" className="primary-button" disabled={isSaving}>
							{isSaving ? "Сохранение..." : "Сохранить"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
