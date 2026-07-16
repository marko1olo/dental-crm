import { Check, Link as LinkIcon, Mail, ShieldCheck, UserCheck, Key, FileSignature, Copy, Settings2 } from "lucide-react";
import "./SettingsAccessTab.css";
import type React from "react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { viewLabels as workspaceViewLabels } from "../../workspaceShell";
import { showToast } from "../GlobalToast";

type WorkspaceProfile = any;
type RoleAccessPolicy = any;

export function SettingsAccessTab({ settingsTab }: { settingsTab: string }) {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const {
		dashboard,
		activeWorkspaceProfile,
		workspaceScopeLabels,
		staffRoleLabels,
		clinicModeLabels,
		policyAuditEventLabels,
	} = mergedProps;
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
		<div className="access-studio-container animate-fade-in">
			
			{/* Инвайты */}
			<section className="access-section-card">
				<div className="access-section-header">
					<div className="access-section-icon">
						<Mail size={24} />
					</div>
					<div className="access-section-title">
						<h3>Приглашение сотрудников</h3>
						<p>Генерация защищенных ссылок для регистрации персонала клиники</p>
					</div>
				</div>

				<form className="access-invite-grid" onSubmit={handleGenerateInvite}>
					<div className="access-invite-input-group">
						<label>Email сотрудника</label>
						<input
							type="email"
							placeholder="doctor@example.com"
							value={inviteEmail}
							onChange={(e) => setInviteEmail(e.target.value)}
							disabled={loading}
							className="access-invite-input"
						/>
					</div>
					<div className="access-invite-input-group">
						<label>Роль в системе</label>
						<select
							value={inviteRole}
							onChange={(e) => setInviteRole(e.target.value)}
							disabled={loading}
							className="access-invite-select"
						>
							<option value="doctor">Врач</option>
							<option value="admin">Администратор</option>
							<option value="assistant">Ассистент</option>
							<option value="owner">Владелец / Главврач</option>
						</select>
					</div>
					<button type="submit" disabled={loading} className="primary-button" style={{ height: '44px' }}>
						<Key size={16} style={{ marginRight: '8px' }} />
						{loading ? "Создание..." : "Создать инвайт"}
					</button>
				</form>

				{inviteLink && (
					<div className="access-invite-result">
						<span className="access-invite-link">{inviteLink}</span>
						<button type="button" onClick={handleCopy} className="secondary-button" style={{ background: 'white' }}>
							{copied ? <><Check size={16} style={{marginRight: '6px'}} /> Скопировано</> : <><Copy size={16} style={{marginRight: '6px'}} /> Копировать</>}
						</button>
					</div>
				)}
			</section>

			{/* Активный профиль */}
			{typedActiveWorkspaceProfile && (
				<section className="access-workspace-active">
					<div className="access-workspace-active-head">
						<div>
							<h3>{typedActiveWorkspaceProfile.title}</h3>
							<p>{typedActiveWorkspaceProfile.description}</p>
						</div>
						<span className="access-workspace-active-badge">
							{workspaceScopeLabels[typedActiveWorkspaceProfile.scope]}
						</span>
					</div>
					<div className="access-workspace-active-roles">
						<strong>Стартовый экран: {viewLabels[typedActiveWorkspaceProfile.defaultSection]}</strong>
						<span style={{ margin: '0 8px', opacity: 0.5 }}>|</span>
						{typedActiveWorkspaceProfile.primaryRoles.map((role: string) => (
							<span key={role}>{staffRoleLabels[role]}</span>
						))}
					</div>
				</section>
			)}

			{/* Политики Доступа */}
			<section className="access-section-card">
				<div className="access-section-header">
					<div className="access-section-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'rgb(245, 158, 11)' }}>
						<ShieldCheck size={24} />
					</div>
					<div className="access-section-title">
						<h3>Политики и права доступа</h3>
						<p>Настройки прав на просмотр и редактирование разделов клиники</p>
					</div>
				</div>

				<div className="access-policy-grid">
					{typedRoleAccessPolicies.map((policy: any) => (
						<article className="premium-policy-card" key={policy.role}>
							<div className="premium-policy-header">
								<div className="premium-policy-icon">
									<UserCheck size={20} />
								</div>
								<div className="premium-policy-title">
									<h4>{policy.title}</h4>
									<span>{workspaceScopeLabels[policy.scope]}</span>
								</div>
							</div>
							
							<div className="premium-policy-cols">
								<div className="premium-policy-col">
									<strong>Разрешено (Запись)</strong>
									{policy.canWrite.map((section: string) => (
										<span key={section}>{viewLabels[section]}</span>
									))}
								</div>
								<div className="premium-policy-col">
									<strong>Ограничено</strong>
									{policy.restricted.length > 0 ? (
										policy.restricted.map((section: string) => (
											<span key={section}>{viewLabels[section]}</span>
										))
									) : (
										<span>Ограничений нет</span>
									)}
								</div>
							</div>

							{policy.requiresApprovalFor.length > 0 && (
								<div>
									<strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>Требует подтверждения:</strong>
									<ul className="premium-policy-requires">
										{policy.requiresApprovalFor.slice(0, 3).map((item: string) => (
											<li key={item}>{item}</li>
										))}
									</ul>
								</div>
							)}

							<div className="premium-policy-audit">
								<strong>Журнал аудита: </strong> 
								{policy.auditEvents.map((event: string) => policyAuditEventLabels[event] ?? event).join(", ")}
							</div>
						</article>
					))}
				</div>
			</section>

		</div>
	);
}
