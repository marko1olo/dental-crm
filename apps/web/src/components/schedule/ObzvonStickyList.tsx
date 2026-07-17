import type { Dashboard, CommunicationTask } from "@dental/shared";
import { PhoneCall, Check, X, Bell } from "lucide-react";
import React, { useState } from "react";

interface ObzvonStickyListProps {
	dashboard: Dashboard;
}

export const ObzvonStickyList: React.FC<ObzvonStickyListProps> = ({
	dashboard,
}) => {
	const [minimized, setMinimized] = useState(false);

	const pendingCalls = dashboard.communicationTasks.filter(
		(task) =>
			task.status === "needs_call" ||
			task.status === "queued" ||
			(task.status === "scheduled" &&
				(task.intent === "recall" ||
					task.intent === "appointment_confirmation" ||
					task.intent === "post_visit_instruction")),
	);

	if (pendingCalls.length === 0) return null;

	const sortedCalls = pendingCalls.sort((a, b) => {
		const prioMap = { urgent: 3, high: 2, medium: 1, low: 0 };
		return prioMap[b.priority] - prioMap[a.priority];
	});

	if (minimized) {
		return (
			<div
				className="fixed bottom-4 left-4 z-40 bg-indigo-600 text-white rounded-full p-3 shadow-lg cursor-pointer hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
				onClick={() => setMinimized(false)}
				title="Открыть список обзвона"
			>
				<PhoneCall size={20} />
				<span className="font-bold text-sm bg-white text-indigo-600 rounded-full px-2 py-0.5">
					{pendingCalls.length}
				</span>
			</div>
		);
	}

	return (
		<div
			className="fixed bottom-4 left-4 z-40 w-80 bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-[#2a2a2c] rounded-xl shadow-2xl flex flex-col max-h-[60vh] overflow-hidden"
			style={{
				boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
			}}
		>
			<div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-[#2a2a2c] bg-gray-50 dark:bg-[#202022]">
				<h4 className="font-semibold text-sm flex items-center gap-2 m-0 text-gray-800 dark:text-gray-100">
					<PhoneCall size={16} className="text-indigo-500" />
					Задачи: Обзвон ({pendingCalls.length})
				</h4>
				<button
					type="button"
					onClick={() => setMinimized(true)}
					className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
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
					const isUrgent = task.priority === "urgent" || task.priority === "high";

					return (
						<div
							key={task.id}
							className={`p-3 rounded-lg border text-sm transition-all hover:shadow-md ${
								isUrgent
									? "border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10"
									: "border-gray-200 bg-white dark:border-[#303033] dark:bg-[#232325]"
							}`}
						>
							<div className="flex items-start justify-between mb-1">
								<span className="font-medium text-gray-900 dark:text-gray-100">
									{patient?.fullName.split(" ").slice(0, 2).join(" ") || "Пациент DB"}
								</span>
								{isUrgent && (
									<Bell size={14} className="text-red-500 animate-pulse" />
								)}
							</div>
							<div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
								{task.intent === "recall" && "Приглашение на осмотр (Recall)"}
								{task.intent === "appointment_confirmation" && "Подтверждение записи"}
								{task.intent === "post_visit_instruction" && "Контроль самочувствия"}
							</div>
							<div className="flex items-center gap-2 mt-2">
								<a
									href={`tel:${patient?.phone}`}
									className="flex-1 flex items-center justify-center gap-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 py-1.5 px-2 rounded-md text-xs font-medium transition-colors"
									title="Позвонить"
								>
									<PhoneCall size={12} /> Звонок
								</a>
								<a
									href={`https://wa.me/${patient?.phone?.replace(/\D/g, "")}`}
									target="_blank"
									rel="noreferrer"
									className="flex-1 flex items-center justify-center gap-1 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 py-1.5 px-2 rounded-md text-xs font-medium transition-colors"
									title="Написать в WhatsApp"
								>
									WA
								</a>
								<a
									href={`https://t.me/+${patient?.phone?.replace(/\D/g, "")}`}
									target="_blank"
									rel="noreferrer"
									className="flex-1 flex items-center justify-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 py-1.5 px-2 rounded-md text-xs font-medium transition-colors"
									title="Написать в Telegram"
								>
									TG
								</a>
								<button
									type="button"
									className="flex-none p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
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
