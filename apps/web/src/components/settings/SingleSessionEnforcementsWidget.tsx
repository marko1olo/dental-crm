import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

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
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">🛡️</span>
					<h3 className="font-semibold text-sky-600 dark:text-sky-400">
						Защита От Параллельного Входа (Single Session Enforcement)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
					Безопасность Сессий
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка активных сессий...
				</div>
			) : sessions.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Активных параллельных сессий не обнаружено.
				</div>
			) : (
				<div className="space-y-3">
					{sessions.map((sess) => (
						<div
							key={sess.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold">{sess.userLogin}</span>
									<span className="text-xs text-sky-600 dark:text-sky-300 font-mono font-bold">IP: {sess.clientIp}</span>
								</div>
								<div className="text-xs mt-1" style={{ color: "var(--muted, #64748b)" }}>
									Токен: <span className="font-mono text-slate-700 dark:text-slate-300">{sess.activeSessionToken}</span>
								</div>
							</div>
							<div className="flex items-center space-x-2">
								{sess.ejectedPreviousSession && (
									<span className="text-xs px-2 py-0.5 rounded border font-semibold bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
										⚡ Повторная сессия вытолкнута
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
