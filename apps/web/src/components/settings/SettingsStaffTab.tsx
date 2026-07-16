import { Settings2, ShieldCheck, UserPlus, X, Users, UserCog } from "lucide-react";
import "./SettingsStaffTab.css";
import type React from "react";
import type { ChangeEvent } from "react";

type InputChangeEvent = ChangeEvent<HTMLInputElement>;

import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { showToast } from "../GlobalToast";

export function SettingsStaffTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const { dashboard, staffRoleLabels, specialtyLabels } = mergedProps;

	const {
		staffScheduleDrafts,
		staffScheduleDraftFromWorkingHours,
		staffScheduleSaveStates,
		staffScheduleDirtyIds,
		staffScheduleSavingId,
		updateStaffScheduleDraft,
		toggleStaffWorkingDay,
		updateStaffScheduleDay,
		saveStaffSchedule,
		weekdayOptions,
	} = mergedProps;
	const typedWeekdayOptions = weekdayOptions || [];
	const staff = dashboard?.clinicSettings?.staff || [];

	const [loading, setLoading] = useState(false);

	// New staff form state
	const [newStaffName, setNewStaffName] = useState("");
	const [newStaffRole, setNewStaffRole] = useState("doctor");
	const [newStaffSpecialty, setNewStaffSpecialty] = useState("universal");
	const [newStaffEmail, setNewStaffEmail] = useState("");

	// Unified Editing Modal State
	const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<{
		fullName: string;
		role: string;
		email: string;
		phone: string;
		active: boolean;
		canSignMedicalRecords: boolean;
		canManageImports: boolean;
		canManageMoney: boolean;
		pin: string;
		password: string;
		color: string;
		specialties: string[];
	}>({
		fullName: "",
		role: "",
		email: "",
		phone: "",
		active: true,
		canSignMedicalRecords: false,
		canManageImports: false,
		canManageMoney: false,
		pin: "",
		password: "",
		color: "#0d9488",
		specialties: [],
	});

	const startEditing = (member: any) => {
		setEditingStaffId(member.id);
		setEditForm({
			fullName: member.fullName || "",
			role: member.role || "doctor",
			email: member.email || "",
			phone: member.phone || "",
			active: member.active !== false,
			canSignMedicalRecords: !!member.canSignMedicalRecords,
			canManageImports: !!member.canManageImports,
			canManageMoney: !!member.canManageMoney,
			pin: "",
			password: "",
			color: member.color || "#0d9488",
			specialties: member.specialties || ["universal"],
		});
	};

	const handleCreateStaff = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newStaffName.trim()) {
			showToast("Укажите ФИО сотрудника", "warning");
			return;
		}

		setLoading(true);
		try {
			const clinicToken = localStorage.getItem("dente_clinic_token");
			const res = await fetch("/api/settings/staff", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": clinicToken || "",
				},
				body: JSON.stringify({
					fullName: newStaffName,
					role: newStaffRole,
					email: newStaffEmail || null,
					active: true,
					canSignMedicalRecords: newStaffRole === "doctor",
					canManageMoney:
						newStaffRole === "administrator" || newStaffRole === "owner",
					canManageImports: true,
					specialties: [newStaffSpecialty],
				}),
			});
			const data = await res.json();
			if (!res.ok)
				throw new Error(data.message || "Ошибка добавления сотрудника");

			showToast("Сотрудник успешно добавлен", "success");
			setNewStaffName("");
			setNewStaffEmail("");
			await mergedProps.loadDashboard();
		} catch (err: any) {
			showToast(err.message, "error");
		} finally {
			setLoading(false);
		}
	};

	const handleSaveEdit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingStaffId) return;
		if (!editForm.fullName.trim()) {
			showToast("ФИО сотрудника не может быть пустым", "warning");
			return;
		}

		setLoading(true);
		try {
			const clinicToken = localStorage.getItem("dente_clinic_token");

			// 1. Update basic profile and permissions
			const profileRes = await fetch(`/api/settings/staff/${editingStaffId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": clinicToken || "",
				},
				body: JSON.stringify({
					fullName: editForm.fullName,
					role: editForm.role,
					email: editForm.email || null,
					phone: editForm.phone || null,
					active: editForm.active,
					canSignMedicalRecords: editForm.canSignMedicalRecords,
					canManageImports: editForm.canManageImports,
					canManageMoney: editForm.canManageMoney,
					color: editForm.color || null,
					specialties:
						editForm.specialties.length > 0
							? editForm.specialties
							: ["universal"],
				}),
			});

			if (!profileRes.ok) {
				const data = await profileRes.json();
				throw new Error(data.message || "Ошибка обновления профиля сотрудника");
			}

			// 2. Update credentials if PIN or Password was typed
			if (editForm.pin || editForm.password) {
				const credsPayload: any = {};
				if (editForm.pin) {
					if (editForm.pin.length !== 4 || !/^\d+$/.test(editForm.pin)) {
						showToast("PIN-код должен состоять из 4 цифр", "warning");
						setLoading(false);
						return;
					}
					credsPayload.pinCode = editForm.pin;
				}
				if (editForm.password) {
					if (editForm.password.length < 6) {
						showToast("Пароль должен быть не менее 6 символов", "warning");
						setLoading(false);
						return;
					}
					credsPayload.password = editForm.password;
				}

				const credsRes = await fetch(
					`/api/settings/staff/${editingStaffId}/credentials`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"x-dente-clinic-token": clinicToken || "",
						},
						body: JSON.stringify(credsPayload),
					},
				);

				if (!credsRes.ok) {
					const data = await credsRes.json();
					throw new Error(data.message || "Ошибка обновления учетных данных");
				}
			}

			showToast("Профиль сотрудника успешно обновлен", "success");
			setEditingStaffId(null);
			await mergedProps.loadDashboard();
		} catch (err: any) {
			showToast(err.message, "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="staff-studio-container animate-fade-in">
			{/* New Staff Creation Card */}
			<section className="staff-section-card">
				<div className="staff-section-header">
					<div className="staff-section-icon">
						<UserPlus size={24} />
					</div>
					<div className="staff-section-title">
						<h3>Добавить сотрудника</h3>
						<p>Создайте профиль для нового врача, ассистента или администратора</p>
					</div>
				</div>
				<form onSubmit={handleCreateStaff} className="staff-form-grid">
					<div className="staff-form-group">
						<label>ФИО сотрудника</label>
						<input
							type="text"
							placeholder="Иванов Иван Иванович"
							value={newStaffName}
							onChange={(e) => setNewStaffName(e.target.value)}
							required
						/>
					</div>

					<div className="staff-form-group">
						<label>Должность</label>
						<select
							value={newStaffRole}
							onChange={(e) => setNewStaffRole(e.target.value)}
						>
							<option value="doctor">Врач</option>
							<option value="assistant">Ассистент</option>
							<option value="administrator">Администратор</option>
							<option value="manager">Управляющий</option>
						</select>
					</div>

					{newStaffRole === "doctor" && (
						<div className="staff-form-group full-width">
							<label>Специализация</label>
							<select
								value={newStaffSpecialty}
								onChange={(e) => setNewStaffSpecialty(e.target.value)}
							>
								{Object.entries(specialtyLabels).map(([key, label]) => (
									<option key={key} value={key}>
										{label as string}
									</option>
								))}
							</select>
						</div>
					)}

					<div className="staff-form-group full-width">
						<label>Email (логин для личного доступа)</label>
						<input
							type="email"
							placeholder="doctor@clinic.com"
							value={newStaffEmail}
							onChange={(e) => setNewStaffEmail(e.target.value)}
						/>
					</div>

					<div className="staff-form-group full-width" style={{ marginTop: '8px' }}>
						<button
							className="primary-button"
							type="submit"
							disabled={loading}
							style={{ alignSelf: 'flex-start' }}
						>
							<ShieldCheck size={16} style={{ marginRight: '8px' }} /> Добавить в систему
						</button>
					</div>
				</form>
			</section>

			{/* Active Staff Grid */}
			<section className="staff-section-card">
				<div className="staff-section-header">
					<div className="staff-section-icon">
						<Users size={24} />
					</div>
					<div className="staff-section-title">
						<h3>Персонал клиники</h3>
						<p>Активные сотрудники и настройки прав доступа</p>
					</div>
				</div>
				
				<div className="premium-staff-grid">
					{staff.map((member: any) => (
						<div key={member.id} className="premium-staff-card">
							<div className="premium-staff-card-header">
								<div
									className="premium-staff-avatar"
									style={
										member.color
											? { backgroundColor: member.color }
											: { backgroundColor: 'var(--teal)' }
									}
								>
									{member.fullName.charAt(0)}
								</div>
								<div className="premium-staff-info">
									<h4>{member.fullName}</h4>
									<p>{staffRoleLabels ? staffRoleLabels[member.role] : member.role}</p>
								</div>
							</div>

							<div className="premium-staff-badges">
								{member.canSignMedicalRecords && (
									<span className="status-pill status-confirmed">✍️ ЭМК</span>
								)}
								{member.canManageImports && (
									<span className="status-pill status-confirmed">💿 Импорт</span>
								)}
								{member.canManageMoney && (
									<span className="status-pill status-confirmed">💰 Касса</span>
								)}
								{member.active === false && (
									<span className="status-pill status-cancelled">❌ Неактивен</span>
								)}
							</div>

							<div className="premium-staff-actions">
								<button
									className="secondary-button"
									onClick={() => startEditing(member)}
								>
									<Settings2 size={16} style={{ marginRight: '8px' }} />
									Настроить профиль
								</button>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Unified Premium Editing Modal */}
			{editingStaffId && (
				<div className="premium-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditingStaffId(null); }}>
					<div className="premium-modal-content">
						<div className="premium-modal-header">
							<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
								<UserCog size={24} color="var(--teal)" />
								<h3>Профиль сотрудника</h3>
							</div>
							<button className="premium-modal-close" onClick={() => setEditingStaffId(null)}>
								<X size={20} />
							</button>
						</div>

						<div className="premium-modal-body">
							<div className="staff-form-group full-width">
								<label>ФИО сотрудника</label>
								<input
									type="text"
									value={editForm.fullName}
									onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
									required
								/>
							</div>

							<div className="staff-form-grid">
								<div className="staff-form-group">
									<label>Должность</label>
									<select
										value={editForm.role}
										onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
									>
										<option value="doctor">Врач</option>
										<option value="assistant">Ассистент</option>
										<option value="administrator">Администратор</option>
										<option value="manager">Управляющий</option>
									</select>
								</div>
								<div className="staff-form-group">
									<label>Цвет в расписании</label>
									<input
										type="color"
										value={editForm.color}
										onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
									/>
								</div>
							</div>

							{editForm.role === "doctor" && (
								<div className="staff-form-group full-width">
									<label>Специализации</label>
									<div className="weekday-toggle-row">
										{Object.entries(specialtyLabels).map(([key, label]) => {
											const isSelected = editForm.specialties.includes(key);
											return (
												<button
													key={key}
													type="button"
													className={isSelected ? "active" : ""}
													onClick={() => {
														if (isSelected) {
															setEditForm({
																...editForm,
																specialties: editForm.specialties.filter((s) => s !== key),
															});
														} else {
															setEditForm({
																...editForm,
																specialties: [...editForm.specialties, key],
															});
														}
													}}
												>
													{label as string}
												</button>
											);
										})}
									</div>
								</div>
							)}

							<div className="staff-form-grid">
								<div className="staff-form-group">
									<label>Email (Логин)</label>
									<input
										type="email"
										value={editForm.email}
										onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
										placeholder="doctor@clinic.com"
									/>
								</div>
								<div className="staff-form-group">
									<label>Телефон</label>
									<input
										type="text"
										value={editForm.phone}
										onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
										placeholder="+7 (999) 123-45-67"
									/>
								</div>
							</div>

							<div className="permissions-box">
								<h4 style={{ margin: 0, fontSize: '14px', color: 'var(--ink)' }}>Права доступа</h4>
								
								<label className="permission-toggle">
									<input
										type="checkbox"
										checked={editForm.canSignMedicalRecords}
										onChange={(e) => setEditForm({ ...editForm, canSignMedicalRecords: e.target.checked })}
									/>
									<span>✍️ Подписание ЭМК (медицинские карты)</span>
								</label>
								
								<label className="permission-toggle">
									<input
										type="checkbox"
										checked={editForm.canManageImports}
										onChange={(e) => setEditForm({ ...editForm, canManageImports: e.target.checked })}
									/>
									<span>💿 Управление импортом КТ / снимков</span>
								</label>
								
								<label className="permission-toggle">
									<input
										type="checkbox"
										checked={editForm.canManageMoney}
										onChange={(e) => setEditForm({ ...editForm, canManageMoney: e.target.checked })}
									/>
									<span>💰 Доступ к кассе и финансам</span>
								</label>

								<label className="permission-toggle" style={{ marginTop: '8px' }}>
									<input
										type="checkbox"
										checked={editForm.active}
										onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
									/>
									<span style={{ fontWeight: 700 }}>Сотрудник активен (имеет доступ)</span>
								</label>
							</div>

							<div className="staff-form-grid" style={{ marginTop: '8px' }}>
								<div className="staff-form-group">
									<label>Новый PIN (вход на ПК)</label>
									<input
										type="password"
										value={editForm.pin}
										onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })}
										maxLength={4}
										placeholder="4 цифры, пустой если не менять"
									/>
								</div>
								<div className="staff-form-group">
									<label>Новый пароль (личный)</label>
									<input
										type="password"
										value={editForm.password}
										onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
										placeholder="От 6 симв, пустой если не менять"
									/>
								</div>
							</div>
						</div>

						<div className="premium-modal-footer">
							<button className="secondary-button" onClick={() => setEditingStaffId(null)}>
								Отмена
							</button>
							<button className="primary-button" onClick={handleSaveEdit} disabled={loading}>
								<ShieldCheck size={16} style={{ marginRight: '8px' }} />
								{loading ? "Сохраняю..." : "Сохранить профиль"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
