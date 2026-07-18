import { Hash, Lock, Mail, Phone, ShieldCheck, UserCog, X } from "lucide-react";

export function StaffEditModal({
	editingStaffId,
	editForm,
	setEditForm,
	setEditingStaffId,
	handleSaveStaff,
	loading,
	specialtyLabels,
}: {
	editingStaffId: string;
	editForm: any;
	setEditForm: (form: any) => void;
	setEditingStaffId: (id: string | null) => void;
	handleSaveStaff: (e: React.FormEvent) => void;
	loading: boolean;
	specialtyLabels: Record<string, string>;
	hasAssistants: boolean;
}) {
	return (
		<div
			className="premium-modal-overlay"
			onClick={(e) => {
				if (e.target === e.currentTarget) setEditingStaffId(null);
			}}
		>
			<div className="premium-modal-content" style={{ maxWidth: "650px" }}>
				<div className="premium-modal-header">
					<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
						<UserCog size={24} color="var(--teal)" />
						<h3>
							{editingStaffId === "new"
								? "Новый сотрудник"
								: "Профиль сотрудника"}
						</h3>
					</div>
					<button
						className="premium-modal-close"
						onClick={() => setEditingStaffId(null)}
					>
						<X size={20} />
					</button>
				</div>

				<form onSubmit={handleSaveStaff} className="premium-modal-body">
					<div className="staff-form-grid">
						<div className="staff-form-group full-width">
							<label>ФИО сотрудника</label>
							<input
								type="text"
								value={editForm.fullName}
								onChange={(e) =>
									setEditForm({ ...editForm, fullName: e.target.value })
								}
								required
								placeholder="Иванов Иван Иванович"
							/>
						</div>

						<div className="staff-form-group">
							<label>Должность</label>
							<select
								value={editForm.role}
								onChange={(e) =>
									setEditForm({ ...editForm, role: e.target.value })
								}
							>
								<option value="doctor">Врач</option>
								{hasAssistants && <option value="assistant">Ассистент</option>}
								<option value="administrator">Администратор</option>
								<option value="manager">Управляющий</option>
								<option value="owner">Владелец</option>
							</select>
						</div>

						<div className="staff-form-group">
							<label>Специализация</label>
							<select
								value={editForm.specialties[0] || "universal"}
								onChange={(e) =>
									setEditForm({
										...editForm,
										specialties: [e.target.value],
									})
								}
								disabled={editForm.role !== "doctor"}
							>
								{Object.entries(specialtyLabels || {}).map(([key, label]) => (
									<option key={key} value={key}>
										{label as string}
									</option>
								))}
							</select>
						</div>

						<div className="staff-form-group">
							<label>
								<Mail size={14} /> Email (логин)
							</label>
							<input
								type="email"
								value={editForm.email}
								onChange={(e) =>
									setEditForm({ ...editForm, email: e.target.value })
								}
								placeholder="mail@clinic.com"
							/>
						</div>

						<div className="staff-form-group">
							<label>
								<Phone size={14} /> Телефон
							</label>
							<input
								type="text"
								value={editForm.phone}
								onChange={(e) =>
									setEditForm({ ...editForm, phone: e.target.value })
								}
								placeholder="+7 (999) 000-00-00"
							/>
						</div>

						<div className="staff-form-group">
							<label>
								<Lock size={14} /> Пароль для входа
							</label>
							<input
								type="password"
								value={editForm.password}
								onChange={(e) =>
									setEditForm({ ...editForm, password: e.target.value })
								}
								placeholder={
									editingStaffId === "new"
										? "Введите пароль"
										: "Оставьте пустым — не изменится"
								}
							/>
						</div>

						<div className="staff-form-group">
							<label>
								<Hash size={14} /> Пин-код (планшет)
							</label>
							<input
								type="text"
								maxLength={4}
								value={editForm.pin}
								onChange={(e) =>
									setEditForm({
										...editForm,
										pin: e.target.value.replace(/[^0-9]/g, ""),
									})
								}
								placeholder="4 цифры, например 1234"
							/>
						</div>
					</div>

					<div className="staff-form-divider">Права доступа</div>

					<div className="permissions-box">
						<label className="permission-toggle">
							<input
								type="checkbox"
								checked={editForm.active}
								onChange={(e) =>
									setEditForm({ ...editForm, active: e.target.checked })
								}
							/>
							<div>
								<strong>Доступ к системе (Активен)</strong>
								<span>
									Если выключить — сотрудник не сможет войти в систему
								</span>
							</div>
						</label>

						{editForm.role === "doctor" && (
							<>
								<label className="permission-toggle">
									<input
										type="checkbox"
										checked={editForm.canSignMedicalRecords}
										onChange={(e) =>
											setEditForm({
												...editForm,
												canSignMedicalRecords: e.target.checked,
											})
										}
									/>
									<div>
										<strong>Подписание мед. документации</strong>
										<span>
											Право создавать и подписывать дневники приемов
										</span>
									</div>
								</label>
								<div
									className="staff-form-group"
									style={{
										marginTop: "16px",
										background: "rgba(255,255,255,0.03)",
										padding: "16px",
										borderRadius: "12px",
										border: "1px solid rgba(255,255,255,0.05)",
									}}
								>
									<label style={{ fontWeight: 600, color: "var(--teal)" }}>
										Комиссия врача (Зарплата, %)
									</label>
									<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
										<input
											type="number"
											min="0"
											max="100"
											step="0.1"
											value={editForm.commissionRate}
											onChange={(e) =>
												setEditForm({
													...editForm,
													commissionRate: parseFloat(e.target.value) || 0,
												})
											}
											placeholder="Например, 30"
											style={{ maxWidth: "120px" }}
										/>
										<span style={{ fontSize: "18px", fontWeight: 600 }}>%</span>
									</div>
									<span
										style={{
											fontSize: "12px",
											color: "var(--foreground-muted)",
											display: "block",
											marginTop: "8px",
											lineHeight: "1.4",
										}}
									>
										Доля, которую получает врач от выручки за оказанные им услуги, за вычетом стоимости материалов (если применимо).
									</span>
								</div>
							</>
						)}

						{["administrator", "manager", "owner"].includes(editForm.role) && (
							<>
								<label className="permission-toggle">
									<input
										type="checkbox"
										checked={editForm.canManageMoney}
										onChange={(e) =>
											setEditForm({
												...editForm,
												canManageMoney: e.target.checked,
											})
										}
									/>
									<div>
										<strong>Доступ к кассе и финансам</strong>
										<span>
											Проведение платежей, просмотр финансовых отчетов
										</span>
									</div>
								</label>
								<label className="permission-toggle">
									<input
										type="checkbox"
										checked={editForm.canManageImports}
										onChange={(e) =>
											setEditForm({
												...editForm,
												canManageImports: e.target.checked,
											})
										}
									/>
									<div>
										<strong>Настройки клиники и прайс-лист</strong>
										<span>
											Доступ к системным настройкам, прайсам, импорту базы
										</span>
									</div>
								</label>
								<label className="permission-toggle">
									<input
										type="checkbox"
										checked={editForm.canManageSchedule}
										onChange={(e) =>
											setEditForm({
												...editForm,
												canManageSchedule: e.target.checked,
											})
										}
									/>
									<div>
										<strong>Управление расписанием врачей</strong>
										<span>
											Настройка рабочих смен и перерывов в календаре
										</span>
									</div>
								</label>
							</>
						)}
					</div>

					<div className="premium-modal-footer">
						<button
							type="button"
							className="secondary-button"
							onClick={() => setEditingStaffId(null)}
						>
							Отмена
						</button>
						<button type="submit" className="primary-button" disabled={loading}>
							{loading ? (
								"Сохранение..."
							) : (
								<>
									<ShieldCheck size={16} /> Сохранить профиль
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
