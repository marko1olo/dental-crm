import {
	Edit2,
	KeyRound,
	Settings2,
	ShieldCheck,
	UserPlus,
	X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";

export function SettingsStaffTab() {
	const props = useAppLogicContext();
	const { dashboard, staffRoleLabels } = props;
	const staff = dashboard?.clinicSettings?.staff || [];

	const [loading, setLoading] = useState(false);

	// New staff form state
	const [newStaffName, setNewStaffName] = useState("");
	const [newStaffRole, setNewStaffRole] = useState("doctor");
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
				}),
			});
			const data = await res.json();
			if (!res.ok)
				throw new Error(data.message || "Ошибка добавления сотрудника");

			showToast("Сотрудник успешно добавлен", "success");
			setNewStaffName("");
			setNewStaffEmail("");
			await props.loadDashboard();
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
			await props.loadDashboard();
		} catch (err: any) {
			showToast(err.message, "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<section
			className="staff-management-studio animate-fade-in"
			aria-label="Управление персоналом"
		>
			<div className="import-copy">
				<h3>Управление персоналом</h3>
				<p>
					Добавляйте новых врачей, ассистентов и администраторов. Управляйте
					правами доступа, цветами в календаре, PIN-кодами и паролями.
				</p>
			</div>

			<div className="settings-cards-grid">
				{/* Список сотрудников */}
				<article className="settings-card settings-card--full">
					<div className="settings-card-header">
						<h4>Активный персонал</h4>
					</div>
					<div className="staff-grid">
						{staff.map((member: any) => (
							<div key={member.id} className="staff-grid-cell">
								<div className="staff-grid-cell__head">
									<div
										className="staff-avatar"
										style={
											member.color
												? { backgroundColor: member.color }
												: undefined
										}
									>
										{member.fullName.charAt(0)}
									</div>
									<div>
										<h5 className="staff-grid-cell__name">{member.fullName}</h5>
										<span className="staff-grid-cell__role">
											{staffRoleLabels
												? staffRoleLabels[member.role]
												: member.role}
										</span>
									</div>
								</div>

								<div
									className="staff-badges-row"
									style={{
										display: "flex",
										gap: "6px",
										flexWrap: "wrap",
										margin: "6px 0 12px 0",
									}}
								>
									{member.canSignMedicalRecords && (
										<span
											className="status-pill status-confirmed"
											style={{ fontSize: "11px", padding: "2px 6px" }}
										>
											✍️ ЭМК
										</span>
									)}
									{member.canManageImports && (
										<span
											className="status-pill status-confirmed"
											style={{ fontSize: "11px", padding: "2px 6px" }}
										>
											💿 Импорт
										</span>
									)}
									{member.canManageMoney && (
										<span
											className="status-pill status-confirmed"
											style={{ fontSize: "11px", padding: "2px 6px" }}
										>
											💰 Касса
										</span>
									)}
									{member.active === false && (
										<span
											className="status-pill status-cancelled"
											style={{ fontSize: "11px", padding: "2px 6px" }}
										>
											❌ Неактивен
										</span>
									)}
								</div>

								<div className="staff-grid-cell__actions">
									<div className="staff-grid-cell__btn-row">
										<button
											className="secondary-button btn--sm btn--flex"
											onClick={() => startEditing(member)}
											style={{
												width: "100%",
												justifyContent: "center",
												gap: "6px",
											}}
										>
											<Settings2 size={14} /> Настроить сотрудника
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				</article>

				{/* Форма добавления сотрудника */}
				<article className="settings-card">
					<div className="settings-card-header">
						<h4>
							<UserPlus size={18} /> Добавить сотрудника
						</h4>
					</div>
					<form onSubmit={handleCreateStaff} className="settings-card-body">
						<label>
							ФИО
							<input
								type="text"
								placeholder="Иванов Иван Иванович"
								value={newStaffName}
								onChange={(e) => setNewStaffName(e.target.value)}
								required
							/>
						</label>

						<label>
							Должность
							<select
								value={newStaffRole}
								onChange={(e) => setNewStaffRole(e.target.value)}
							>
								<option value="doctor">Врач</option>
								<option value="assistant">Ассистент</option>
								<option value="administrator">Администратор</option>
								<option value="manager">Управляющий</option>
							</select>
						</label>

						<label>
							Email (логин для личного доступа)
							<input
								type="email"
								placeholder="doctor@clinic.com"
								value={newStaffEmail}
								onChange={(e) => setNewStaffEmail(e.target.value)}
							/>
						</label>

						<div className="form-actions">
							<button
								className="primary-button"
								type="submit"
								disabled={loading}
							>
								<ShieldCheck size={16} /> Создать сотрудника
							</button>
						</div>
					</form>
				</article>
			</div>

			{/* Unified Editing Modal */}
			{editingStaffId && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 1000,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						background: "rgba(0,0,0,0.6)",
						backdropFilter: "blur(5px)",
					}}
				>
					<div
						className="settings-card"
						style={{
							width: "500px",
							maxWidth: "90%",
							maxHeight: "90vh",
							overflowY: "auto",
							padding: "24px",
							boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
							border: "1px solid var(--line-strong)",
							background: "var(--paper)",
							borderRadius: "12px",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: "20px",
								borderBottom: "1px solid var(--line)",
								paddingBottom: "12px",
							}}
						>
							<h3
								style={{ margin: 0, fontSize: "1.25rem", color: "var(--ink)" }}
							>
								Редактировать профиль сотрудника
							</h3>
							<button
								type="button"
								onClick={() => setEditingStaffId(null)}
								style={{
									background: "none",
									border: "none",
									color: "var(--muted)",
									cursor: "pointer",
								}}
							>
								<X size={20} />
							</button>
						</div>

						<form
							onSubmit={handleSaveEdit}
							style={{ display: "flex", flexDirection: "column", gap: "16px" }}
						>
							<label
								className="settings-control-label"
								style={{ display: "flex", flexDirection: "column", gap: "6px" }}
							>
								ФИО сотрудника
								<input
									type="text"
									value={editForm.fullName}
									onChange={(e) =>
										setEditForm({ ...editForm, fullName: e.target.value })
									}
									className="settings-control-input"
									required
								/>
							</label>

							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "12px",
								}}
							>
								<label
									className="settings-control-label"
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "6px",
									}}
								>
									Должность
									<select
										value={editForm.role}
										onChange={(e) =>
											setEditForm({ ...editForm, role: e.target.value })
										}
										className="settings-control-input"
									>
										<option value="doctor">Врач</option>
										<option value="assistant">Ассистент</option>
										<option value="administrator">Администратор</option>
										<option value="manager">Управляющий</option>
									</select>
								</label>

								<label
									className="settings-control-label"
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "6px",
									}}
								>
									Цвет в календаре
									<input
										type="color"
										value={editForm.color}
										onChange={(e) =>
											setEditForm({ ...editForm, color: e.target.value })
										}
										style={{
											height: "40px",
											padding: "2px",
											width: "100%",
											cursor: "pointer",
											border: "1px solid var(--line)",
										}}
									/>
								</label>
							</div>

							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "12px",
								}}
							>
								<label
									className="settings-control-label"
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "6px",
									}}
								>
									Email (Логин)
									<input
										type="email"
										value={editForm.email}
										onChange={(e) =>
											setEditForm({ ...editForm, email: e.target.value })
										}
										placeholder="doctor@clinic.com"
										className="settings-control-input"
									/>
								</label>

								<label
									className="settings-control-label"
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "6px",
									}}
								>
									Телефон
									<input
										type="text"
										value={editForm.phone}
										onChange={(e) =>
											setEditForm({ ...editForm, phone: e.target.value })
										}
										placeholder="+7 (999) 123-45-67"
										className="settings-control-input"
									/>
								</label>
							</div>

							<div
								className="settings-section-title"
								style={{
									fontWeight: 600,
									fontSize: "0.875rem",
									color: "var(--ink)",
									marginTop: "8px",
								}}
							>
								Права доступа
							</div>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "10px",
									padding: "10px",
									background: "var(--light-bg, rgba(0,0,0,0.02))",
									borderRadius: "8px",
								}}
							>
								<label
									className="settings-checkbox-label"
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										cursor: "pointer",
									}}
								>
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
									<span style={{ fontSize: "0.875rem" }}>
										✍️ Подписание ЭМК (медицинские карты)
									</span>
								</label>
								<label
									className="settings-checkbox-label"
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										cursor: "pointer",
									}}
								>
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
									<span style={{ fontSize: "0.875rem" }}>
										💿 Управление импортом КТ / снимков
									</span>
								</label>
								<label
									className="settings-checkbox-label"
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										cursor: "pointer",
									}}
								>
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
									<span style={{ fontSize: "0.875rem" }}>
										💰 Доступ к кассе и финансам
									</span>
								</label>
							</div>

							<div
								className="settings-section-title"
								style={{
									fontWeight: 600,
									fontSize: "0.875rem",
									color: "var(--ink)",
									marginTop: "8px",
								}}
							>
								Учетные данные (Аутентификация)
							</div>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "12px",
								}}
							>
								<label
									className="settings-control-label"
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "6px",
									}}
								>
									Новый PIN (4 цифры)
									<input
										type="password"
										value={editForm.pin}
										onChange={(e) =>
											setEditForm({ ...editForm, pin: e.target.value })
										}
										maxLength={4}
										placeholder="Оставьте пустым"
										className="settings-control-input"
									/>
								</label>

								<label
									className="settings-control-label"
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "6px",
									}}
								>
									Новый пароль (от 6 симв.)
									<input
										type="password"
										value={editForm.password}
										onChange={(e) =>
											setEditForm({ ...editForm, password: e.target.value })
										}
										placeholder="Оставьте пустым"
										className="settings-control-input"
									/>
								</label>
							</div>

							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									marginTop: "8px",
								}}
							>
								<label
									className="settings-checkbox-label"
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										cursor: "pointer",
									}}
								>
									<input
										type="checkbox"
										checked={editForm.active}
										onChange={(e) =>
											setEditForm({ ...editForm, active: e.target.checked })
										}
									/>
									<span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
										Активный сотрудник (разрешен вход в систему)
									</span>
								</label>
							</div>

							<div
								className="form-actions"
								style={{
									display: "flex",
									justifyContent: "flex-end",
									gap: "12px",
									marginTop: "16px",
									borderTop: "1px solid var(--line)",
									paddingTop: "16px",
								}}
							>
								<button
									type="button"
									className="secondary-button"
									onClick={() => setEditingStaffId(null)}
								>
									Отмена
								</button>
								<button
									type="submit"
									className="primary-button"
									disabled={loading}
								>
									{loading ? "Сохранение..." : "Сохранить"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</section>
	);
}
