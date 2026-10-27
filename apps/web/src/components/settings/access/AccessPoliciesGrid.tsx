import { ShieldCheck } from "lucide-react";
import type React from "react";

export interface AccessPoliciesGridProps {
	// biome-ignore lint/suspicious/noExplicitAny: policy list
	policies: any[];
	workspaceScopeLabels: Record<string, string>;
	viewLabels: Record<string, string>;
	policyAuditEventLabels: Record<string, string>;
}

export const AccessPoliciesGrid: React.FC<AccessPoliciesGridProps> = ({
	policies,
	workspaceScopeLabels,
	viewLabels,
	policyAuditEventLabels,
}) => {
	if (!policies.length) return null;

	return (
		<div className="access-policy-grid">
			{policies.map((policy) => (
				<article className="access-policy-card" key={policy.role}>
					<div className="access-policy-head">
						<ShieldCheck aria-hidden="true" />
						<div>
							<span>{workspaceScopeLabels[policy.scope] ?? policy.scope}</span>
							<h3>{policy.title}</h3>
							<p>Первый экран: {viewLabels[policy.defaultSection] ?? policy.defaultSection}</p>
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
						{(policy.requiresApprovalFor ?? []).slice(0, 3).map((item: string) => (
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
	);
};
