import { User } from "lucide-react";
import type { UserProfile } from "./useProfileSettingsLogic";

export function ProfilePersonalSection({
	profile,
	staffRoleLabels,
}: {
	profile: UserProfile | null;
	staffRoleLabels: Record<string, string>;
}) {
	return (
		<section className="profile-section-card">
			<div className="profile-section-header">
				<div
					className="profile-section-icon"
					style={{
						background: "rgba(59, 130, 246, 0.1)",
						color: "rgb(59, 130, 246)",
					}}
				>
					<User size={24} />
				</div>
				<div className="profile-section-title">
					<h3>Личные данные</h3>
					<p>Ваша базовая информация в системе клиники</p>
				</div>
			</div>

			<div className="profile-form-grid">
				<div className="profile-form-group full-width">
					<label>ФИО</label>
					<input type="text" value={profile?.fullName || ""} disabled />
				</div>
				<div className="profile-form-group">
					<label>Email</label>
					<input type="email" value={profile?.email || "Не указан"} disabled />
				</div>
				<div className="profile-form-group">
					<label>Роль в системе</label>
					<input
						type="text"
						value={
							profile?.role
								? (staffRoleLabels?.[
										profile.role as "admin" | "doctor" | "assistant" | "manager"
									] ?? profile.role)
								: ""
						}
						disabled
					/>
				</div>
			</div>
			<p className="profile-form-hint">
				Изменить ФИО или Email может только владелец клиники в разделе «Клиника
				→ Персонал».
			</p>
		</section>
	);
}
