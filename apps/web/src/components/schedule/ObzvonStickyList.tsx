import type { CommunicationTask, Dashboard } from"@dental/shared";
import { Bell, Check, PhoneCall, X } from"lucide-react";
import type React from"react";
import { useState } from"react";

interface ObzvonStickyListProps {
	dashboard: Dashboard;
}

export const ObzvonStickyList: React.FC<ObzvonStickyListProps> = ({
	dashboard,
}) => {
	const [minimized, setMinimized] = useState(false);

	const pendingCalls = dashboard.communicationTasks.filter(
		(task) =>
			task.status ==="needs_call" ||
			task.status ==="queued" ||
			(task.status ==="scheduled" &&
				(task.intent ==="recall" ||
					task.intent ==="appointment_confirmation" ||
					task.intent ==="post_visit_instruction")),
	);

	if (pendingCalls.length === 0) return null;

	const sortedCalls = pendingCalls.sort((a, b) => {
		const prioMap = { urgent: 3, high: 2, medium: 1, low: 0 };
		return prioMap[b.priority] - prioMap[a.priority];
	});

	if (minimized) {
		return (
			<div
				className="fixed bottom-4 left-4 z-40 rounded-full p-3 shadow-lg cursor-pointer transition-colors flex items-center justify-center gap-2"
				style={{ background: "var(--primary)", color: "var(--paper)" }}
				onClick={() => setMinimized(false)}
				title="Открыть задачи обзвона"
			>
				<PhoneCall size={20} />
				<span className="font-bold text-sm rounded-full px-2 py-0.5" style={{ background: "var(--paper)", color: "var(--primary)" }}>
					{pendingCalls.length}
				</span>
			</div>
		);
	}

	return (
		<div
			className="fixed bottom-4 left-4 z-40 w-80 rounded-xl shadow-2xl flex flex-col max-h-[60vh] overflow-hidden"
			style={{
				background:"var(--paper)",
				color:"var(--ink)",
				border:"1px solid var(--line)",
				boxShadow:"0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
			}}
		>
			<div className="flex items-center justify-between p-3" style={{ background:"var(--paper-muted)", borderBottom:"1px solid var(--line)" }}>
				<h4 className="font-semibold text-sm flex items-center gap-2 m-0" style={{ color: "var(--ink)" }}>
					<PhoneCall size={16} style={{ color: "var(--primary)" }} />
					Звонки: очередь ({pendingCalls.length})
				</h4>
				<button
					type="button"
					onClick={() => setMinimized(true)}
					className="p-1"
					style={{ color: "var(--ink-muted)" }}
					title="Свернуть"
				>
					<X size={16} />
				</button>
			</div>

			<div className="flex-1 overflow-y-auto p-2 space-y-2">
				{sortedCalls.map((task) => {
					const patient = dashboard.patients.find(
						(p) => p.id === task.patientId,
					);
					const isUrgent =
						task.priority ==="urgent" || task.priority ==="high";

					return (
						<div
							key={task.id}
							className={`p-3 rounded-lg border text-sm transition-all`}
							style={{ borderColor: isUrgent ? "var(--color-danger)" : "var(--line)" }}
						>
							<div className="flex items-start justify-between mb-1" style={{ background: isUrgent ?"var(--color-danger-muted, #fee2e2)" :"var(--paper)" }}>
								<span className="font-medium" style={{ color: "var(--ink)" }}>
									{patient?.fullName || "Пациент DB"}
								</span>
								{isUrgent && (
									<Bell size={14} style={{ color: "var(--color-danger)" }} className="animate-pulse" />
								)}
							</div>
							<div className="text-xs mb-2" style={{ color: "var(--ink-muted)" }}>
								{task.intent ==="recall" &&"Приглашение на осмотр (Recall)"}
								{task.intent ==="appointment_confirmation" &&"Подтверждение записи"}
								{task.intent ==="post_visit_instruction" &&"Контроль самочувствия"}
							</div>
							<div className="flex items-center gap-2 mt-2">
								<a
									href={`tel:${patient?.phone}`}
									className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors"
									style={{ background: "var(--paper-muted)", color: "var(--primary)" }}
									title="Позвонить"
								>
									<PhoneCall size={12} /> Звонок
								</a>
								<a
									href={`https://wa.me/${patient?.phone?.replace(/\D/g,"")}`}
									target="_blank"
									rel="noreferrer"
									className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors"
									style={{ background: "var(--color-success-muted, #dcfce7)", color: "var(--color-success)" }}
									title="Написать в WhatsApp"
								>
									WA
								</a>
								<a
									href={`https://t.me/+${patient?.phone?.replace(/\D/g,"")}`}
									target="_blank"
									rel="noreferrer"
									className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors"
									style={{ background: "var(--color-info-muted, #dbeafe)", color: "var(--color-info)" }}
									title="Написать в Telegram"
								>
									TG
								</a>
								<button
									type="button"
									className="flex-none p-1.5 rounded-md transition-colors"
									style={{ color: "var(--ink-muted)" }}
									title="Отметить как выполненное"
								>
									<Check size={14} />
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
