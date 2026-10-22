import type React from "react";
import { AlertTriangle } from "lucide-react";

export interface EstimatorIssuesAlertProps {
	readonly issueMessages: readonly string[];
}

export const EstimatorIssuesAlert: React.FC<EstimatorIssuesAlertProps> = ({
	issueMessages,
}) => {
	if (issueMessages.length === 0) return null;

	return (
		<div
			role="alert"
			className="flex flex-wrap items-start gap-x-3 gap-y-2 p-3 mb-3 rounded-lg border text-xs leading-relaxed bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-900"
		>
			<AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
			<div className="flex-1 min-w-0 break-words">
				<div className="font-semibold">
					Часть лечения посчитать не удалось — цены нет в вашем прайсе.
				</div>
				<ul className="mt-1 flex flex-col gap-1">
					{issueMessages.map((message) => (
						<li key={message}>{message}</li>
					))}
				</ul>
			</div>
		</div>
	);
};
