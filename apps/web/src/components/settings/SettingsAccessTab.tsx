import { StaffRole } from "@dental/shared";
import {
	Check,
	Link as LinkIcon,
	Mail,
	ShieldCheck,
	UserCheck,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { viewLabels as workspaceViewLabels } from "../../workspaceShell";
import { showToast } from "../GlobalToast";

type WorkspaceProfile = any;
type RoleAccessPolicy = any;

export function SettingsAccessTab({
	props,
	settingsTab,
}: {
	props: Record<string, any>;
	settingsTab: string;
}) {
	const {
		dashboard,
		activeWorkspaceProfile,
		workspaceScopeLabels,
		staffRoleLabels,
		clinicModeLabels,
		policyAuditEventLabels,
	} = props;
	const viewLabels = workspaceViewLabels as Record<string, string>;

	// Hooks MUST be called before any conditional returns (React Rules of Hooks)
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState("doctor");
	const [inviteLink, setInviteLink] = useState("");
	const [loading, setLoading] = useState(false);
	const [copied, setCopied] = useState(false);

	if (settingsTab !== "access") return null;

	const handleGenerateInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inviteEmail) {
			showToast("Введите email", "warning");
			return;
		}
		setLoading(true);
		setCopied(false);
		try {
			const staffToken = localStorage.getItem("dente_staff_token") || "";
			const response = await fetch("/api/auth/invites/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": staffToken,
				},
				body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || "Ошибка генерации");

			const fullUrl = window.location.origin + data.inviteLink;
			setInviteLink(fullUrl);
			showToast("Приглашение создано!", "success");
		} catch (err: any) {
			showToast(err.message || "Не удалось создать приглашение", "error");
		} finally {
			setLoading(false);
		}
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(inviteLink);
		setCopied(true);
		showToast("Ссылка скопирована", "success");
		setTimeout(() => setCopied(false), 2000);
	};

	const typedActiveWorkspaceProfile =
		activeWorkspaceProfile as WorkspaceProfile | null;
	const typedWorkspaceProfiles = (dashboard?.clinicSettings
		?.workspaceProfiles ?? []) as WorkspaceProfile[];
	const typedRoleAccessPolicies = (dashboard?.clinicSettings
		?.roleAccessPolicies ?? []) as RoleAccessPolicy[];

	return (
		<section
			className="access-settings"
			aria-label="Доступы, рабочие профили и роли"
		>
			<div className="import-copy">
				<UserCheck aria-hidden="true" />
				<div>
					<p className="eyebrow">Доступы</p>
					<h2>Рабочие профили для врача, администратора, ассистента и сети</h2>
					<p>
						Режим клиники влияет на первый экран, видимые разделы, права записи,
						аудит и зоны, где нужно ручное подтверждение.
					</p>
				</div>
			</div>

			<article className="access-settings__invite-card">
				<div className="access-settings__invite-header">
					<h3>
						<Mail size={18} aria-hidden="true" /> Пригласить сотрудника
					</h3>
					<p>
						Сгенерируйте уникальную ссылку для регистрации нового врача,
						ассистента или администратора.
					</p>
				</div>
				<form className="access-settings__invite-form" onSubmit={handleGenerateInvite}>
					<input
						type="email"
						placeholder="email@example.com"
						value={inviteEmail}
						onChange={(e) => setInviteEmail(e.target.value)}
						disabled={loading}
						className="access-settings__invite-input"
					/>
					<select
						value={inviteRole}
						onChange={(e) => setInviteRole(e.target.value)}
						disabled={loading}
						className="access-settings__invite-select"
					>
						<option value="doctor">Врач</option>
						<option value="admin">Администратор</option>
						<option value="assistant">Ассистент</option>
						<option value="owner">Владелец</option>
					</select>
					<button
						type="submit"
						disabled={loading}
						className="primary-button"
					>
						{loading ? "Создание..." : "Сгенерировать"}
					</button>
				</form>

				{inviteLink && (
					<div className="access-settings__invite-result">
						<span className="access-settings__invite-link">
							{inviteLink}
						</span>
						<button
							type="button"
							onClick={handleCopy}
							className="secondary-button access-settings__copy-btn"
						>
							{copied ? (
								<>
									<Check size={14} /> Скопировано
								</>
							) : (
								<>
									<LinkIcon size={14} /> Копировать
								</>
							)}
						</button>
					</div>
				)}
			</article>

			{typedActiveWorkspaceProfile ? (
				<article className="active-workspace-card">
					<div>
						<span>
							{workspaceScopeLabels[typedActiveWorkspaceProfile.scope]}
						</span>
						<h3>{typedActiveWorkspaceProfile.title}</h3>
						<p>{typedActiveWorkspaceProfile.description}</p>
					</div>
					<div className="workspace-token-row">
						<strong>
							Старт: {viewLabels[typedActiveWorkspaceProfile.defaultSection]}
						</strong>
						{typedActiveWorkspaceProfile.primaryRoles.map((role) => (
							<span key={role}>{staffRoleLabels[role]}</span>
						))}
					</div>
				</article>
			) : null}

			<div className="workspace-profile-grid">
				{typedWorkspaceProfiles.map((profile) => (
					<article
						className={`workspace-profile-card ${profile.mode === dashboard.clinicSettings.profile.mode ? "active" : ""}`}
						key={profile.id}
					>
						<div className="workspace-profile-head">
							<span>{clinicModeLabels[profile.mode].title}</span>
							<strong>{profile.title}</strong>
							<p>{profile.description}</p>
						</div>
						<div className="workspace-token-row" aria-label="Разделы профиля">
							{profile.visibleSections.map((section) => (
								<span key={section}>{viewLabels[section]}</span>
							))}
						</div>
						<ul>
							{profile.automations.slice(0, 3).map((automation) => (
								<li key={automation}>{automation}</li>
							))}
						</ul>
						<small>
							{profile.compactNavigation
								? "Компактная навигация для телефона"
								: "Расширенная навигация для команды"}
						</small>
					</article>
				))}
			</div>

			<div className="access-policy-grid">
				{typedRoleAccessPolicies.map((policy) => (
					<article className="access-policy-card" key={policy.role}>
						<div className="access-policy-head">
							<ShieldCheck aria-hidden="true" />
							<div>
								<span>{workspaceScopeLabels[policy.scope]}</span>
								<h3>{policy.title}</h3>
								<p>Первый экран: {viewLabels[policy.defaultSection]}</p>
							</div>
						</div>
						<div className="access-column-row">
							<div>
								<strong>Запись</strong>
								{policy.canWrite.map((section) => (
									<span key={section}>{viewLabels[section]}</span>
								))}
							</div>
							<div>
								<strong>Ограничено</strong>
								{policy.restricted.length ? (
									policy.restricted.map((section) => (
										<span key={section}>{viewLabels[section]}</span>
									))
								) : (
									<span>нет</span>
								)}
							</div>
						</div>
						<ul>
							{policy.requiresApprovalFor.slice(0, 3).map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
						<small>
							Аудит:{" "}
							{policy.auditEvents
								.map((event) => policyAuditEventLabels[event] ?? event)
								.join(", ")}
						</small>
					</article>
				))}
			</div>
		</section>
	);
}
