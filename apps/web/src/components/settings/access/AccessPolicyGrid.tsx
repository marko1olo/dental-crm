import React from "react";
import { ShieldCheck, UserCheck } from "lucide-react";
import { viewLabels as workspaceViewLabels } from "../../../workspaceShell";

export function AccessPolicyGrid({
	typedRoleAccessPolicies,
	workspaceScopeLabels,
	policyAuditEventLabels,
}: {
	typedRoleAccessPolicies: any[];
	workspaceScopeLabels: any;
	policyAuditEventLabels: any;
}) {
	const viewLabels = workspaceViewLabels as Record<string, string>;

	return (
		<section className="access-section-card">
			<div className="access-section-header">
				<div
					className="access-section-icon"
					style={{
						background: "rgba(245, 158, 11, 0.1)",
						color: "rgb(245, 158, 11)",
					}}
				>
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
								<strong
									style={{
										fontSize: "13px",
										display: "block",
										marginBottom: "8px",
									}}
								>
									Требует подтверждения:
								</strong>
								<ul className="premium-policy-requires">
									{policy.requiresApprovalFor
										.slice(0, 3)
										.map((item: string) => (
											<li key={item}>{item}</li>
										))}
								</ul>
							</div>
						)}

						<div className="premium-policy-audit">
							<strong>Журнал аудита: </strong>
							{policy.auditEvents
								.map((event: string) => policyAuditEventLabels[event] ?? event)
								.join(", ")}
						</div>
					</article>
				))}
			</div>
		</section>
	);
}
