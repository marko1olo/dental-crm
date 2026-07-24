import React, { useEffect, useState } from "react";

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
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
			className="p-4 bg-slate-900 border border-sky-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🛡️</span>
					<h3 className="font-semibold text-sky-400">
						Защита От Параллельного Входа (Single Session Enforcement)
					</h3>
				</div>
				<span className="text-xs bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/40">
					Безопасность Сессий
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка активных сессий...</div>
			) : (
				<div className="space-y-3">
					{sessions.map((sess) => (
						<div
							key={sess.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold text-slate-200">{sess.userLogin}</span>
									<span className="text-xs text-sky-300 font-mono">IP: {sess.clientIp}</span>
								</div>
								<div className="text-xs text-slate-400 mt-1">
									Токен: <span className="font-mono text-slate-300">{sess.activeSessionToken}</span>
								</div>
							</div>
							<div className="flex items-center space-x-2">
								{sess.ejectedPreviousSession && (
									<span className="text-xs bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800 font-semibold">
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
