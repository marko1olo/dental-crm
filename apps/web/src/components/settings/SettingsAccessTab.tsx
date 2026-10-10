import {
	type StaffRole,
} from "@dental/shared";
import {
	Check,
	Coins,
	FileCheck,
	Link as LinkIcon,
	Lock,
	Mail,
	ShieldCheck,
	UserCheck,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { readDenteStaffToken } from "../../lib/safeLocalStorage";
import { logger } from "../../utils/logger";
import { viewLabels as workspaceViewLabels } from "../../workspaceShell";
import { showToast } from "../GlobalToast";
import { GranularRoleMatrixView } from "./GranularRoleMatrixView";
import {
	INVITABLE_STAFF_ROLES,
	inviteRoleTitle,
	parseInviteCreationPayload,
} from "./settingsInviteRoles";

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
type WorkspaceProfile = any;
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
type RoleAccessPolicy = any;

export interface SettingsAccessTabProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	props?: any;
	settingsTab: string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	[key: string]: any;
}

export function SettingsAccessTab({
	props = {},
	settingsTab,
}: SettingsAccessTabProps) {
	const {
		dashboard,
		activeWorkspaceProfile,
		workspaceScopeLabels = {},
		staffRoleLabels = {},
		clinicModeLabels = {},
		policyAuditEventLabels = {},
	} = props || {};
	const viewLabels = (workspaceViewLabels || {}) as Record<string, string>;

	// Hooks MUST be called before any conditional returns (React Rules of Hooks)
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState<StaffRole>("doctor");
	const [inviteLink, setInviteLink] = useState("");
	const [loading, setLoading] = useState(false);
	const [copied, setCopied] = useState(false);

	if (settingsTab !== "access") return null;

	const handleGenerateInvite = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inviteEmail.trim()) {
			showToast(
				"Укажите рабочий адрес почты сотрудника — по нему он войдёт в программу",
				"warning",
			);
			return;
		}
		setLoading(true);
		setCopied(false);
		setInviteLink("");
		try {
			const staffToken = readDenteStaffToken();
			const response = await fetch("/api/auth/invites/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": staffToken,
				},
				body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
			});
			const raw = await response.text();
			const outcome = parseInviteCreationPayload(response.status, raw);
			if (!outcome.ok) {
				logger.error("[приглашение] не создано, ответ", outcome.status);
				showToast(
					outcome.message ??
						actionFailureToast(
							`Приглашение для ${inviteEmail.trim()} не создано`,
							outcome.status,
						),
					"error",
				);
				return;
			}
			setInviteLink(window.location.origin + outcome.inviteLink);
			showToast(
				`Ссылка для ${inviteRoleTitle(inviteRole).toLowerCase()} готова — скопируйте её и передайте сотруднику, она действует 7 дней`,
				"success",
			);
		} catch (err) {
			logger.error("[приглашение] запрос не дошёл до сервера", err);
			showToast(
				actionFailureToast(
					`Приглашение для ${inviteEmail.trim()} не создано`,
					null,
				),
				"error",
			);
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
			className="access-settings flex flex-col gap-6 pb-32 sm:pb-24 w-full max-w-full min-w-0"
			aria-label="Доступы, рабочие профили и роли"
		>
			<div className="import-copy p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs flex items-start gap-3.5 min-w-0">
				<div className="w-11 h-11 rounded-xl bg-teal-600 dark:bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
					<UserCheck size={22} aria-hidden="true" />
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h2 className="text-sm sm:text-lg font-bold text-[var(--ink)] m-0 tracking-tight leading-snug">
							Матрица прав доступа к модулям DENTE, защита данных и финансовая изоляция
						</h2>
						<span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-500/30 whitespace-nowrap shrink-0 select-none">
							<ShieldCheck size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Безопасность и RBAC</span>
						</span>
					</div>
					<p className="text-xs text-[var(--muted)] m-0 mt-1 leading-relaxed break-words hidden sm:block">
						Гранулярная ролевая модель для 8 клинических и административных ролей.
						Строгая изоляция финансовой отчётности клиники, маскирование персональных данных
						пациентов и расчёт сдельной мотивации в целых копейках.
					</p>
				</div>
			</div>

			{/* Ключевые гарантии безопасности системы (Канонические отграниченные тайлы) */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0" data-testid="security-guarantees-grid">
				<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xs flex flex-col justify-between gap-2 min-w-0 min-h-[88px]">
					<div className="flex items-center gap-2.5">
						<div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 flex items-center justify-center shrink-0">
							<ShieldCheck size={15} />
						</div>
						<span className="font-bold text-xs sm:text-sm text-[var(--ink)] leading-snug">Защита данных</span>
					</div>
					<p className="text-[11px] sm:text-xs text-[var(--muted)] m-0 leading-relaxed break-words min-w-0 pl-9">
						Телефоны, паспорта и СНИЛС маскируются для ассистентов. Врачи и администраторы видят необходимые контакты.
					</p>
				</div>

				<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xs flex flex-col justify-between gap-2 min-w-0 min-h-[88px]">
					<div className="flex items-center gap-2.5">
						<div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 flex items-center justify-center shrink-0">
							<Lock size={15} />
						</div>
						<span className="font-bold text-xs sm:text-sm text-[var(--ink)] leading-snug">Финансовая изоляция</span>
					</div>
					<p className="text-[11px] sm:text-xs text-[var(--muted)] m-0 leading-relaxed break-words min-w-0 pl-9">
						Сводный P&L и общая выручка клиники доступны только Директору и Главврачу. Врач видит личную выработку.
					</p>
				</div>

				<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xs flex flex-col justify-between gap-2 min-w-0 min-h-[88px]">
					<div className="flex items-center gap-2.5">
						<div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 flex items-center justify-center shrink-0">
							<Coins size={15} />
						</div>
						<span className="font-bold text-xs sm:text-sm text-[var(--ink)] leading-snug">Сдельная оплата</span>
					</div>
					<p className="text-[11px] sm:text-xs text-[var(--muted)] m-0 leading-relaxed break-words min-w-0 pl-9">
						Расчёт мотивации (% от приёма минус ЗТЛ и материалы) ведётся строго в целых копейках с нулевой погрешностью.
					</p>
				</div>

				<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xs flex flex-col justify-between gap-2 min-w-0 min-h-[88px]">
					<div className="flex items-center gap-2.5">
						<div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 flex items-center justify-center shrink-0">
							<FileCheck size={15} />
						</div>
						<span className="font-bold text-xs sm:text-sm text-[var(--ink)] leading-snug">Подпись протоколов</span>
					</div>
					<p className="text-[11px] sm:text-xs text-[var(--muted)] m-0 leading-relaxed break-words min-w-0 pl-9">
						Клинические протоколы подписывают исключительно врачи. Ассистенты и регистраторы лишены права подписи.
					</p>
				</div>
			</div>

			{/* Гранулярная ролевая матрица (8 канонических ролей) */}
			<GranularRoleMatrixView />

			{/* Пригласить сотрудника */}
			<article className="p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-sm">
				<div className="mb-4">
					<h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 m-0">
						<Mail size={18} className="text-[var(--teal)]" /> Пригласить сотрудника
					</h3>
					<p className="text-xs text-slate-600 dark:text-slate-400 mt-1 m-0">
						Сгенерируйте уникальную ссылку для регистрации нового врача,
						ассистента или администратора.
					</p>
				</div>
				<form
					onSubmit={handleGenerateInvite}
					className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2.5 items-center"
				>
					<input
						type="email"
						placeholder="email@example.com"
						value={inviteEmail}
						onChange={(e) => setInviteEmail(e.target.value)}
						disabled={loading}
						className="w-full px-3.5 py-2 min-h-[44px] rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
					/>
					<select
						id="invite-role"
						aria-label="Роль нового сотрудника"
						value={inviteRole}
						onChange={(e) => setInviteRole(e.target.value as StaffRole)}
						disabled={loading}
						className="w-full sm:w-auto px-3.5 py-2 min-h-[44px] rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 min-w-[160px] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
					>
						{INVITABLE_STAFF_ROLES.map((role) => (
							<option key={role} value={role}>
								{inviteRoleTitle(role)}
							</option>
						))}
					</select>
					<button
						type="submit"
						disabled={loading}
						className="w-full sm:w-auto px-4 py-2 min-h-[44px] rounded-lg bg-[var(--teal)] hover:opacity-90 text-white font-semibold text-sm transition-opacity cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5 touch-manipulation"
					>
						{loading ? "Создание..." : "Сгенерировать"}
					</button>
				</form>

				{inviteLink && (
					<div
						className="mt-4 p-3 rounded-lg border flex items-center justify-between"
						style={{
							borderColor: "var(--teal-ring, var(--line-strong))",
							background: "var(--teal-surface, var(--paper-soft))",
							color: "var(--ink)",
						}}
					>
						<span
							className="font-mono text-xs break-all"
							style={{ color: "var(--teal-dark, var(--teal))" }}
						>
							{inviteLink}
						</span>
						<button
							type="button"
							onClick={handleCopy}
							className="secondary-button ml-3 shrink-0 flex items-center gap-1"
							style={{ minHeight: "32px", fontSize: "12px" }}
						>
							{copied ? (
								<span className="flex items-center gap-1">
									<Check size={14} className="text-emerald-500" /> Скопировано
								</span>
							) : (
								<span className="flex items-center gap-1">
									<LinkIcon size={14} /> Копировать
								</span>
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
						className={`workspace-profile-card ${profile.mode === dashboard?.clinicSettings?.profile?.mode ? "active" : ""}`}
						key={profile.id}
					>
						<div className="workspace-profile-head">
							<span>{clinicModeLabels[profile.mode]?.title ?? profile.mode}</span>
							<strong>{profile.title}</strong>
							<p>{profile.description}</p>
						</div>
						<section
							className="workspace-token-row"
							aria-label="Разделы профиля"
						>
							{profile.visibleSections.map((section: string) => (
								<span key={section}>{viewLabels[section] ?? section}</span>
							))}
						</section>
						<ul>
							{profile.automations.slice(0, 3).map((automation: string) => (
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
								{(policy.canWrite ?? []).map((section: string) => (
									<span key={section}>{viewLabels[section] ?? section}</span>
								))}
							</div>
							<div>
								<strong>Ограничено</strong>
								{(policy.restricted ?? []).length ? (
									(policy.restricted ?? []).map((section: string) => (
										<span key={section}>{viewLabels[section] ?? section}</span>
									))
								) : (
									<span>нет</span>
								)}
							</div>
						</div>
						<ul>
							{(policy.requiresApprovalFor ?? [])
								.slice(0, 3)
								.map((item: string) => (
									<li key={item}>{item}</li>
								))}
						</ul>
						<small>
							Аудит:{" "}
							{(policy.auditEvents ?? [])
								.map((event: string) => policyAuditEventLabels[event] ?? event)
								.join(", ")}
						</small>
					</article>
				))}
			</div>

			{/* FAB clearance bottom spacer */}
			<div className="h-24 w-full shrink-0 pointer-events-none" aria-hidden="true" />
		</section>
	);
}
