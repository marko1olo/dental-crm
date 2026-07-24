import React, { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { ShieldAlert, UserCheck } from "lucide-react";

interface SessionItem {
	id: string;
	organizationId: string;
	userId: string;
	userLogin: string;
	activeSessionToken: string;
	clientIp: string;
	userAgent: string;
	ejectedPreviousSession: boolean;
	lastActiveAt: string;
}

export const SingleSessionEnforcementsWidget: React.FC = () => {
	const appLogic = (useAppLogicContext() || {}) as any;
	const authContext = appLogic?.auth;
	const [sessions, setSessions] = useState<SessionItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		const headers = authContext
			? authContext.denteClinicalReadHeaders()
			: { "x-organization-id": "00000000-0000-0000-0000-000000000001" };
		fetch("/api/system/single-session-enforcements", { headers })
			.then((res) => res.json())
			.then((data) => {
				setSessions(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[SingleSessionEnforcementsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="single-session-enforcements-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<ShieldAlert className="w-5 h-5 text-sky-500" />
					<h3 className="font-semibold text-sky-600 dark:text-sky-400">
						Контроль единственного параллельного входа (Single Session Enforcement)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800 font-medium">
					Безопасность сессий
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">
					Загрузка активных сессий...
				</div>
			) : sessions.length === 0 ? (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Активных параллельных сессий не обнаружено.
				</div>
			) : (
				<div className="space-y-3">
					{sessions.map((sess) => (
						<div
							key={sess.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold text-slate-900 dark:text-white">{sess.userLogin}</span>
									<span className="text-xs text-sky-600 dark:text-sky-300 font-mono font-bold">IP: {sess.clientIp}</span>
								</div>
								<div className="text-xs mt-1 text-slate-600 dark:text-slate-400">
									Токен сессии: <span className="font-mono text-slate-700 dark:text-slate-300">{sess.activeSessionToken}</span>
								</div>
							</div>
							{sess.ejectedPreviousSession && (
								<span className="px-2 py-1 text-xs rounded border font-bold uppercase bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
									Вытеснена предыдущая
								</span>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
};
