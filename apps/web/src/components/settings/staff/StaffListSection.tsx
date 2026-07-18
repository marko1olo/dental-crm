import { Mail, Phone, UserCog, UserPlus, Users } from "lucide-react";

export function StaffListSection({
	staff,
	staffRoleLabels,
	startCreating,
	startEditing,
}: {
	staff: any[];
	staffRoleLabels: Record<string, string>;
	startCreating: () => void;
	startEditing: (member: any) => void;
}) {
	return (
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
	);
}
