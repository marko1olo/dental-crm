import React from "react";
import { UserCheck, ShieldCheck } from "lucide-react";
import { viewLabels as workspaceViewLabels } from "../../workspaceShell";
import { StaffRole } from "@dental/shared";
type WorkspaceProfile = any;
type RoleAccessPolicy = any;

export function SettingsAccessTab({ props, settingsTab }: { props: Record<string, any>, settingsTab: string }) {
  const {
    dashboard,
    activeWorkspaceProfile,
    workspaceScopeLabels,
    staffRoleLabels,
    clinicModeLabels,
    policyAuditEventLabels
  } = props;
  const viewLabels = workspaceViewLabels as Record<string, string>;

  if (settingsTab !== "access") return null;

  const typedActiveWorkspaceProfile = activeWorkspaceProfile as WorkspaceProfile | null;
  const typedWorkspaceProfiles = dashboard.clinicSettings.workspaceProfiles as WorkspaceProfile[];
  const typedRoleAccessPolicies = dashboard.clinicSettings.roleAccessPolicies as RoleAccessPolicy[];

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
                      {policy.canWrite.map((section) => (
                        <span key={section}>{viewLabels[section]}</span>
                      ))}
                    </div>
                    <div>
                      <strong>Ограничено</strong>
                      {policy.restricted.length ? (
                        policy.restricted.map((section) => <span key={section}>{viewLabels[section]}</span>)
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
                  <small>Аудит: {policy.auditEvents.map((event) => policyAuditEventLabels[event] ?? event).join(", ")}</small>
                </article>
              ))}
            </div>
          </section>
  );
}
