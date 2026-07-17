import {
	CalendarClock,
	Hash,
	Lock,
	Mail,
	Phone,
	ShieldCheck,
	UserCog,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import "./SettingsStaffTab.css";
import type React from "react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { showToast } from "../GlobalToast";

export function SettingsStaffTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;

	const {
		dashboard,
		staffRoleLabels,
		specialtyLabels,
		staffScheduleDrafts,
		staffScheduleDirtyIds,
		staffScheduleSavingId,
		staffScheduleSaveStates,
		updateStaffScheduleDraft,
		toggleStaffWorkingDay,
		saveStaffSchedule,
		weekdayOptions,
	} = mergedProps;

	const typedWeekdayOptions = weekdayOptions || [];
	const staff = dashboard?.clinicSettings?.staff || [];

	const [activeTab, setActiveTab] = useState<"staff_list" | "staff_schedule">(
		"staff_list",
	);
	const [loading, setLoading] = useState(false);
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
		commissionRate: number;
	}>({
		fullName: "",
		role: "doctor",
		email: "",
		phone: "",
		active: true,
		canSignMedicalRecords: true,
		canManageImports: false,
		canManageMoney: false,
		pin: "",
		password: "",
		color: "#0d9488",
		specialties: ["universal"],
		commissionRate: 30,
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
			commissionRate:
				member.commissionRate != null ? member.commissionRate : 30,
		});
	};

	const startCreating = () => {
		setEditingStaffId("new");
		setEditForm({
			fullName: "",
			role: "doctor",
			email: "",
			phone: "",
			active: true,
			canSignMedicalRecords: true,
			canManageImports: false,
			canManageMoney: false,
			pin: "",
			password: "",
			color: "#0d9488",
			specialties: ["universal"],
			commissionRate: 30,
		});
	};

	const handleSaveStaff = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editForm.fullName.trim()) {
			showToast("ФИО сотрудника не может быть пустым", "warning");
			return;
		}
		setLoading(true);
		try {
			const clinicToken = localStorage.getItem("dente_clinic_token");
			const payload = {
				fullName: editForm.fullName,
				role: editForm.role,
				email: editForm.email || null,
				phone: editForm.phone || null,
				active: editForm.active,
				canSignMedicalRecords:
					editForm.role === "doctor" ? editForm.canSignMedicalRecords : false,
				canManageMoney: ["administrator", "owner", "manager"].includes(
					editForm.role,
				)
					? editForm.canManageMoney
					: false,
				canManageImports: ["administrator", "owner", "manager"].includes(
					editForm.role,
				)
					? editForm.canManageImports
					: false,
				color: editForm.color,
				specialties: editForm.specialties,
				commissionRate:
					editForm.role === "doctor" ? editForm.commissionRate : undefined,
				...(editForm.password ? { password: editForm.password } : {}),
				...(editForm.pin ? { pin: editForm.pin } : {}),
			};

			const url =
				editingStaffId === "new"
					? "/api/settings/staff"
					: "/api/settings/staff/" + editingStaffId;
			const method = editingStaffId === "new" ? "POST" : "PUT";
			const res = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
					"x-dente-clinic-token": clinicToken || "",
				},
				body: JSON.stringify(payload),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.message || "Ошибка сохранения");
			showToast(
				editingStaffId === "new" ? "Сотрудник добавлен" : "Профиль обновлен",
				"success",
			);
			setEditingStaffId(null);
			await mergedProps.loadDashboard();
		} catch (err: any) {
			showToast(err.message || "Произошла ошибка", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="staff-studio-container animate-fade-in">
			<div className="staff-tabs-header">
				<button
					className={
						"staff-tab-btn" + (activeTab === "staff_list" ? " active" : "")
					}
					onClick={() => setActiveTab("staff_list")}
				>
					<Users size={18} />
					<span>Сотрудники и Доступы</span>
				</button>
				<button
					className={
						"staff-tab-btn" + (activeTab === "staff_schedule" ? " active" : "")
					}
					onClick={() => setActiveTab("staff_schedule")}
				>
					<CalendarClock size={18} />
					<span>Графики работы</span>
				</button>
			</div>

			{activeTab === "staff_list" && (
				<section className="staff-section-card">
					<div className="staff-section-header">
						<div className="staff-section-icon">
							<UserCog size={24} />
						</div>
						<div className="staff-section-title">
							<h3>Штат клиники</h3>
							<p>Управление профилями врачей, ассистентов и администраторов</p>
						</div>
						<div className="staff-header-actions">
							<button className="primary-button" onClick={startCreating}>
								<UserPlus size={18} /> Добавить сотрудника
							</button>
						</div>
					</div>

					<div className="staff-members-grid">
						{staff.map((member: any) => (
							<div
								className={"staff-card" + (!member.active ? " inactive" : "")}
								key={member.id}
							>
								<div className="staff-card-header">
									<div
										className="staff-avatar"
										style={{ backgroundColor: member.color || "var(--teal)" }}
									>
										{member.fullName.charAt(0).toUpperCase()}
									</div>
									<div className="staff-info-primary">
										<h4>{member.fullName}</h4>
										<span className="staff-role-badge">
											{staffRoleLabels[member.role] || member.role}
										</span>
									</div>
								</div>

								<div className="staff-card-body">
									<div className="staff-detail-row">
										<Mail size={14} /> <span>{member.email || "—"}</span>
									</div>
									<div className="staff-detail-row">
										<Phone size={14} /> <span>{member.phone || "—"}</span>
									</div>
									<div className="staff-permissions-tags">
										{member.canSignMedicalRecords && (
											<span className="perm-tag doctor">Мед. записи</span>
										)}
										{member.canManageMoney && (
											<span className="perm-tag admin">Финансы</span>
										)}
										{member.canManageImports && (
											<span className="perm-tag manager">Настройки</span>
										)}
										{!member.active && (
											<span className="perm-tag danger">Доступ закрыт</span>
										)}
									</div>
								</div>

								<div className="staff-card-footer">
									<button
										className="secondary-button compact"
										onClick={() => startEditing(member)}
									>
										Настроить профиль
									</button>
								</div>
							</div>
						))}
						{staff.length === 0 && (
							<div className="empty-staff-state">
								<Users size={48} color="var(--border)" />
								<p>В клинике пока нет сотрудников</p>
								<button
									className="primary-button"
									style={{ marginTop: "16px" }}
									onClick={startCreating}
								>
									<UserPlus size={18} /> Добавить первого сотрудника
								</button>
							</div>
						)}
					</div>
				</section>
			)}

			{activeTab === "staff_schedule" && (
				<section className="staff-section-card">
					<div className="staff-section-header">
						<div
							className="staff-section-icon"
							style={{
								background: "rgba(245, 158, 11, 0.1)",
								color: "var(--orange, #f59e0b)",
							}}
						>
							<CalendarClock size={24} />
						</div>
						<div className="staff-section-title">
							<h3>Шаблоны графиков работы</h3>
							<p>Настройте регулярные часы приема для каждого сотрудника</p>
						</div>
					</div>

					<div className="staff-schedules-list">
						{staff
							.filter((m: any) => m.active !== false)
							.map((member: any) => {
								const draft = staffScheduleDrafts?.[member.id];
								if (!draft) return null;
								const scheduleSaveState =
									staffScheduleSaveStates?.[member.id] ?? "saved";
								const isDirty = staffScheduleDirtyIds?.has(member.id);
								const isSaving =
									staffScheduleSavingId === member.id ||
									scheduleSaveState === "saving";

								const scheduleSaveLabel = isSaving
									? "Автосохранение"
									: scheduleSaveState === "error"
										? "Не сохранено"
										: isDirty
											? "Ждет автосохранения"
											: "Сохранено";

								return (
									<div className="schedule-member-row" key={member.id}>
										<div className="schedule-member-info">
											<div
												className="staff-avatar small"
												style={{
													backgroundColor: member.color || "var(--teal)",
												}}
											>
												{member.fullName.charAt(0).toUpperCase()}
											</div>
											<div>
												<strong>{member.fullName}</strong>
												<span>
													{staffRoleLabels?.[member.role] || member.role}
												</span>
											</div>
										</div>

										<div className="schedule-days-grid">
											{typedWeekdayOptions.map((wd: any) => {
												const dayDraft = draft[wd.key];
												if (!dayDraft) return null;
												return (
													<div
														className={
															"schedule-day-box" +
															(dayDraft.working ? " working" : " off")
														}
														key={wd.key}
													>
														<div className="day-header">
															<label className="checkbox-label">
																<input
																	type="checkbox"
																	checked={dayDraft.working}
																	onChange={() =>
																		toggleStaffWorkingDay(member.id, wd.key)
																	}
																/>
																<strong>{wd.shortLabel}</strong>
															</label>
														</div>
														{dayDraft.working && (
															<div className="staff-day-hours">
																<input
																	type="time"
																	value={dayDraft.start}
																	onChange={(e) =>
																		updateStaffScheduleDraft(
																			member.id,
																			wd.key,
																			"start",
																			e.target.value,
																		)
																	}
																/>
																<span>-</span>
																<input
																	type="time"
																	value={dayDraft.end}
																	onChange={(e) =>
																		updateStaffScheduleDraft(
																			member.id,
																			wd.key,
																			"end",
																			e.target.value,
																		)
																	}
																/>
															</div>
														)}
													</div>
												);
											})}
										</div>

										<div className="staff-schedule-actions">
											<span
												className={`save-state save-state-${scheduleSaveState}`}
											>
												{scheduleSaveLabel}
											</span>
											<button
												className="primary-button compact"
												disabled={!isDirty || isSaving}
												onClick={() => saveStaffSchedule(member.id)}
											>
												{isSaving ? "Сохранение..." : "Сохранить"}
											</button>
										</div>
									</div>
								);
							})}
						{staff.filter((m: any) => m.active !== false).length === 0 && (
							<div className="empty-staff-state">
								<CalendarClock size={48} color="var(--border)" />
								<p>Нет активных сотрудников для настройки графика</p>
							</div>
						)}
					</div>
				</section>
			)}

			{editingStaffId && (
				<div
					className="premium-modal-overlay"
					onClick={(e) => {
						if (e.target === e.currentTarget) setEditingStaffId(null);
					}}
				>
					<div className="premium-modal-content" style={{ maxWidth: "650px" }}>
						<div className="premium-modal-header">
							<div
								style={{ display: "flex", alignItems: "center", gap: "12px" }}
							>
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
										<option value="assistant">Ассистент</option>
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
										{Object.entries(specialtyLabels || {}).map(
											([key, label]) => (
												<option key={key} value={key}>
													{label as string}
												</option>
											),
										)}
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
												padding: "12px",
												borderRadius: "8px",
											}}
										>
											<label>Комиссия врача (Зарплата, %)</label>
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
											/>
											<span
												style={{
													fontSize: "11px",
													color: "var(--foreground-muted)",
													display: "block",
													marginTop: "4px",
												}}
											>
												Процент от выручки (за вычетом материалов)
											</span>
										</div>
									</>
								)}

								{["administrator", "manager", "owner"].includes(
									editForm.role,
								) && (
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
												<strong>Настройки и импорт данных</strong>
												<span>
													Доступ к системным настройкам, прайсам, шаблонам
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
								<button
									type="submit"
									className="primary-button"
									disabled={loading}
								>
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
			)}
		</div>
	);
}
