import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";
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
	const [sessions, setSessions] = useState<SessionItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/system/single-session-enforcements", {
			headers: auth.denteClinicalReadHeaders(),
		})
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
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
				<div className="flex items-center space-x-2">
					<ShieldAlert className="w-5 h-5 text-sky-500" />
					<h3 className="font-semibold text-sky-600 dark:text-sky-400">
						Контроль единственного параллельного входа (Single Session Enforcement)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
					Безопасность сессий
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted)" }}>
					Загрузка активных сессий...
				</div>
			) : sessions.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
					Активных параллельных сессий не обнаружено.
				</div>
			) : (
				<div className="space-y-3">
					{sessions.map((sess) => (
						<div
							key={sess.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold">{sess.userLogin}</span>
									<span className="text-xs text-sky-600 dark:text-sky-300 font-mono font-bold">IP: {sess.clientIp}</span>
								</div>
								<div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
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
