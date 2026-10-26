import React from "react";
import { ArrowRight, UserCheck } from "lucide-react";
import type { QuickResumeData } from "../authSmartIdentity";

interface UserLoginQuickResumeProps {
	quickResume: QuickResumeData;
	onResume: () => void;
}

export function UserLoginQuickResume({ quickResume, onResume }: UserLoginQuickResumeProps) {
	if (!quickResume.hasResume) return null;

	return (
		<div className="auth-quick-resume-card">
			<div className="auth-quick-resume-left">
				<div className="auth-quick-resume-avatar">
					<UserCheck size={18} />
				</div>
				<div className="auth-quick-resume-meta">
					<div className="auth-quick-resume-label">Быстрый возврат:</div>
					<div className="auth-quick-resume-name">{quickResume.fullName}</div>
					<div className="auth-quick-resume-role">{quickResume.roleLabel}</div>
				</div>
			</div>
			<button
				type="button"
				onClick={onResume}
				className="auth-quick-resume-btn"
				title="Мгновенно продолжить работу под этим пользователем"
			>
				Войти <ArrowRight size={14} />
			</button>
		</div>
	);
}
