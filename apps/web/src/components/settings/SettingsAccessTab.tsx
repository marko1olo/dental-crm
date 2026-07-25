import React, { useState } from "react";
import { UserCheck, ShieldCheck, Mail, Link as LinkIcon, Check } from "lucide-react";
import { showToast } from "../GlobalToast";
import { viewLabels as workspaceViewLabels } from "../../workspaceShell";
import { StaffRole } from "@dental/shared";
import { SingleSessionEnforcementsWidget } from "./SingleSessionEnforcementsWidget";
type WorkspaceProfile = any;
type RoleAccessPolicy = any;

export interface SettingsAccessTabProps {
  props?: any;
  settingsTab: string;
  [key: string]: any;
}

export function SettingsAccessTab({ props = {}, settingsTab }: SettingsAccessTabProps) {
  const {
    dashboard,
    activeWorkspaceProfile,
    workspaceScopeLabels = {},
    staffRoleLabels = {},
    clinicModeLabels = {},
    policyAuditEventLabels = {}
  } = props || {};
  const viewLabels = (workspaceViewLabels || {}) as Record<string, string>;

  // Hooks MUST be called before any conditional returns (React Rules of Hooks)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('doctor');
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (settingsTab !== "access") return null;

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) {
      showToast('Введите email', 'warning');
      return;
    }
    setLoading(true);
    setCopied(false);
    try {
      const staffToken = localStorage.getItem('dente_staff_token') || '';
      const response = await fetch('/api/auth/invites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dente-staff-token': staffToken },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Ошибка генерации');
      
      const fullUrl = window.location.origin + data.inviteLink;
      setInviteLink(fullUrl);
      showToast('Приглашение создано!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Не удалось создать приглашение', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    showToast('Ссылка скопирована', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const typedActiveWorkspaceProfile = activeWorkspaceProfile as WorkspaceProfile | null;
  const typedWorkspaceProfiles = (dashboard?.clinicSettings?.workspaceProfiles ?? []) as WorkspaceProfile[];
  const typedRoleAccessPolicies = (dashboard?.clinicSettings?.roleAccessPolicies ?? []) as RoleAccessPolicy[];

  return (
<section className="access-settings" aria-label="Доступы, рабочие профили и роли">
            <div className="import-copy">
              <UserCheck aria-hidden="true" />
              <div>
                <p className="eyebrow">Доступы</p>
                <h2>Рабочие профили для врача, администратора, ассистента и сети</h2>
                <p>
                  Режим клиники влияет на первый экран, видимые разделы, права записи, аудит и зоны, где нужно ручное подтверждение.
                </p>
              </div>
            </div>

            <article className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 mt-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail size={18} className="text-sky-500" /> Пригласить сотрудника
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Сгенерируйте уникальную ссылку для регистрации нового врача, ассистента или администратора.
                </p>
              </div>
              <form onSubmit={handleGenerateInvite} className="flex gap-3 items-center flex-wrap">
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  disabled={loading}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 flex-1 min-w-[200px] text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  disabled={loading}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 min-w-[150px] text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="doctor">Врач</option>
                  <option value="admin">Администратор</option>
                  <option value="assistant">Ассистент</option>
                  <option value="owner">Владелец</option>
                </select>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Создание...' : 'Сгенерировать'}
                </button>
              </form>
              
              {inviteLink && (
                <div className="mt-4 p-3 bg-sky-50 dark:bg-sky-950/40 border border-dashed border-sky-300 dark:border-sky-700 rounded-lg flex items-center justify-between">
                  <span className="text-sky-700 dark:text-sky-300 font-mono text-xs break-all">{inviteLink}</span>
                  <button
                    onClick={handleCopy}
                    className="ml-3 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 shrink-0"
                  >
                    {copied ? <><Check size={14} className="text-emerald-500" /> Скопировано</> : <><LinkIcon size={14} /> Копировать</>}
                  </button>
                </div>
              )}
            </article>

            {typedActiveWorkspaceProfile ? (
              <article className="active-workspace-card">
                <div>
                  <span>{workspaceScopeLabels[typedActiveWorkspaceProfile.scope]}</span>
                  <h3>{typedActiveWorkspaceProfile.title}</h3>
                  <p>{typedActiveWorkspaceProfile.description}</p>
                </div>
                <div className="workspace-token-row">
                  <strong>Старт: {viewLabels[typedActiveWorkspaceProfile.defaultSection]}</strong>
                  {typedActiveWorkspaceProfile.primaryRoles.map((role) => (
                    <span key={role}>{staffRoleLabels[role]}</span>
                  ))}
                </div>
              </article>
            ) : null}

            <div className="workspace-profile-grid">
              {typedWorkspaceProfiles.map((profile) => (
                <article className={`workspace-profile-card ${profile.mode === dashboard.clinicSettings.profile.mode ? "active" : ""}`} key={profile.id}>
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
                  <small>{profile.compactNavigation ? "Компактная навигация для телефона" : "Расширенная навигация для команды"}</small>
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
                        (policy.restricted ?? []).map((section: string) => <span key={section}>{viewLabels[section] ?? section}</span>)
                      ) : (
                        <span>нет</span>
                      )}
                    </div>
                  </div>
                  <ul>
                    {(policy.requiresApprovalFor ?? []).slice(0, 3).map((item: string) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <small>Аудит: {(policy.auditEvents ?? []).map((event: string) => policyAuditEventLabels[event] ?? event).join(", ")}</small>
                </article>
              ))}
            </div>
            <SingleSessionEnforcementsWidget />
          </section>
  );
}
