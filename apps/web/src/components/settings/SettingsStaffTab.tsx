import {
	AlertTriangle,
	Edit2,
	KeyRound,
	ShieldCheck,
	UserPlus,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { showToast } from "../GlobalToast";

interface SettingsStaffTabProps {
	props: Record<string, any>;
}

export function SettingsStaffTab({ props }: SettingsStaffTabProps) {
	const { dashboard, staffRoleLabels } = props;
	const staff = dashboard?.clinicSettings?.staff || [];

	const [loading, setLoading] = useState(false);

	// New staff form state
	const [newStaffName, setNewStaffName] = useState("");
	const [newStaffRole, setNewStaffRole] = useState("doctor");
	const [newStaffEmail, setNewStaffEmail] = useState("");

	// PIN editing state
	const [editingPinForId, setEditingPinForId] = useState<string | null>(null);
	const [newPin, setNewPin] = useState("");

	// Password editing state
	const [editingPasswordForId, setEditingPasswordForId] = useState<
		string | null
	>(null);
	const [newPassword, setNewPassword] = useState("");

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
					color: "#3b82f6",
				}),
			});
			const data = await res.json();
			if (!res.ok)
				throw new Error(data.message || "Ошибка добавления сотрудника");
			showToast(
				"Сотрудник успешно добавлен. Пожалуйста, перезагрузите страницу.",
				"success",
			);
			setNewStaffName("");
			setNewStaffEmail("");
		} catch (err: any) {
			showToast(err.message, "error");
		} finally {
			setLoading(false);
		}
	};

	const handleUpdatePin = async (e: React.FormEvent, staffId: string) => {
		e.preventDefault();
		if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
			showToast("PIN-код должен состоять из 4 цифр", "warning");
			return;
		}

		setLoading(true);
		try {
			const clinicToken = localStorage.getItem("dente_clinic_token");
			const res = await fetch(`/api/settings/staff/${staffId}/credentials`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": clinicToken || "",
				},
				body: JSON.stringify({ pinCode: newPin }),
			});
			const data = await res.json();
			if (!res.ok)
				throw new Error(data.message || "Ошибка обновления PIN-кода");
			showToast("PIN-код успешно изменен", "success");
			setEditingPinForId(null);
			setNewPin("");
		} catch (err: any) {
			showToast(err.message, "error");
		} finally {
			setLoading(false);
		}
	};

	const handleUpdatePassword = async (e: React.FormEvent, staffId: string) => {
		e.preventDefault();
		if (newPassword.length < 6) {
			showToast("Пароль должен быть не менее 6 символов", "warning");
			return;
		}

		setLoading(true);
		try {
			const clinicToken = localStorage.getItem("dente_clinic_token");
			const res = await fetch(`/api/settings/staff/${staffId}/credentials`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": clinicToken || "",
				},
				body: JSON.stringify({ password: newPassword }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Ошибка обновления пароля");
			showToast("Пароль успешно изменен", "success");
			setEditingPasswordForId(null);
			setNewPassword("");
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
					Добавляйте новых врачей, ассистентов и администраторов. Устанавливайте
					PIN-коды для доступа к планшету клиники.
				</p>
			</div>

			<div className="settings-cards-grid">
				{/* Список сотрудников */}
				<article className="settings-card" style={{ gridColumn: "1 / -1" }}>
					<div className="settings-card-header">
						<h4>Активный персонал</h4>
					</div>
					<div
						className="staff-grid"
						style={{
							display: "grid",
							gap: "12px",
							gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
						}}
					>
						{staff.map((member: any) => (
							<div
								key={member.id}
								className="staff-grid-cell"
								style={{
									border: "1px solid rgba(255,255,255,0.1)",
									borderRadius: "8px",
									padding: "16px",
									minHeight: "140px",
									display: "flex",
									flexDirection: "column",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "12px",
										marginBottom: "12px",
									}}
								>
									<div
										style={{
											width: 40,
											height: 40,
											borderRadius: "50%",
											backgroundColor: member.color || "#3b82f6",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontWeight: "bold",
											fontSize: 18,
										}}
									>
										{member.fullName.charAt(0)}
									</div>
									<div>
										<h5 style={{ margin: 0, fontSize: 15 }}>
											{member.fullName}
										</h5>
										<span style={{ fontSize: 12, opacity: 0.7 }}>
											{staffRoleLabels
												? staffRoleLabels[member.role]
												: member.role}
										</span>
									</div>
								</div>

								<div
									style={{
										marginTop: "auto",
										borderTop: "1px solid rgba(255,255,255,0.05)",
										paddingTop: "12px",
										display: "flex",
										flexDirection: "column",
										gap: "8px",
									}}
								>
									{editingPinForId === member.id ? (
										<form
											onSubmit={(e) => handleUpdatePin(e, member.id)}
											style={{ display: "flex", gap: "8px" }}
										>
											<input
												type="password"
												maxLength={4}
												placeholder="PIN"
												value={newPin}
												onChange={(e) => setNewPin(e.target.value)}
												style={{ width: "80px", textAlign: "center" }}
												autoFocus
											/>
											<button
												type="submit"
												className="primary-button"
												disabled={loading}
												style={{ padding: "4px 12px" }}
											>
												ОК
											</button>
											<button
												type="button"
												className="secondary-button"
												onClick={() => setEditingPinForId(null)}
												style={{ padding: "4px 12px" }}
											>
												Отмена
											</button>
										</form>
									) : editingPasswordForId === member.id ? (
										<form
											onSubmit={(e) => handleUpdatePassword(e, member.id)}
											style={{ display: "flex", gap: "8px" }}
										>
											<input
												type="password"
												placeholder="Пароль"
												value={newPassword}
												onChange={(e) => setNewPassword(e.target.value)}
												style={{ width: "100%", padding: "4px 8px" }}
												autoFocus
											/>
											<button
												type="submit"
												className="primary-button"
												disabled={loading}
												style={{ padding: "4px 12px" }}
											>
												ОК
											</button>
											<button
												type="button"
												className="secondary-button"
												onClick={() => setEditingPasswordForId(null)}
												style={{ padding: "4px 12px" }}
											>
												Отмена
											</button>
										</form>
									) : (
										<div style={{ display: "flex", gap: "8px" }}>
											<button
												className="secondary-button"
												onClick={() => {
													setEditingPinForId(member.id);
													setEditingPasswordForId(null);
													setNewPin("");
												}}
												style={{
													flex: 1,
													justifyContent: "center",
													padding: "4px 8px",
												}}
												title="Назначить PIN-код для планшета"
											>
												<KeyRound size={14} /> PIN
											</button>
											<button
												className="secondary-button"
												onClick={() => {
													setEditingPasswordForId(member.id);
													setEditingPinForId(null);
													setNewPassword("");
												}}
												style={{
													flex: 1,
													justifyContent: "center",
													padding: "4px 8px",
												}}
												title="Назначить пароль для входа"
											>
												<ShieldCheck size={14} /> Пароль
											</button>
										</div>
									)}
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
		</section>
	);
}
