/**
 * @file CopilotToolLogsView.tsx
 * @description Dedicated tool execution logs view displaying Fastify API and Workstation
 * tool calls, arguments, execution duration, and diff previews (Mandate 8b <= 200 lines).
 */

import React, { useState } from "react";
import {
	Activity, Check, Clock, Code, FileText, HardDrive,
	Receipt, Terminal, Wrench, XCircle
} from "lucide-react";
import { useCopilotStore, type ToolExecutionLog } from "../../../store/copilotStore";

export interface CopilotToolLogsViewProps {
	logs?: ToolExecutionLog[];
	onViewDiff?: (log: ToolExecutionLog) => void;
}

export const CopilotToolLogsView: React.FC<CopilotToolLogsViewProps> = ({
	logs: propLogs,
	onViewDiff,
}) => {
	const storeLogs = useCopilotStore((s) => s.toolExecutionLogs);
	const logs = propLogs ?? storeLogs;
	const [selectedCategory, setSelectedCategory] = useState<"all" | "clinical" | "workstation" | "financial">("all");
	const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

	const filteredLogs = logs.filter((log) => {
		if (selectedCategory === "all") return true;
		return log.category === selectedCategory;
	});

	const getCategoryIcon = (category: ToolExecutionLog["category"]) => {
		switch (category) {
			case "clinical":
				return <Wrench size={13} className="text-[var(--teal,#0d9488)]" />;
			case "workstation":
				return <HardDrive size={13} className="text-blue-500" />;
			case "financial":
				return <Receipt size={13} className="text-amber-500" />;
			default:
				return <Activity size={13} className="text-[var(--muted)]" />;
		}
	};

	const getStatusBadge = (status: ToolExecutionLog["status"]) => {
		switch (status) {
			case "success":
				return (
					<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
						<Check size={9} className="stroke-[3]" />
						<span>Успех</span>
					</span>
				);
			case "running":
				return (
					<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800 animate-pulse">
						<span>Выполняется</span>
					</span>
				);
			case "pending":
				return (
					<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
						<Clock size={9} />
						<span>Ожидание</span>
					</span>
				);
			case "rejected":
			default:
				return (
					<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
						<XCircle size={9} />
						<span>Отклонено</span>
					</span>
				);
		}
	};

	return (
		<div className="copilot-tool-logs-view space-y-3 text-xs" data-testid="copilot-tool-logs-view">
			{/* Фильтр по категориям инструментов */}
			<div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft,#f4f7f6)] border border-[var(--line)] overflow-x-auto no-scrollbar">
				{[
					{ id: "all", label: "Все вызовы" },
					{ id: "clinical", label: "Клинические" },
					{ id: "workstation", label: "ПК и файлы" },
					{ id: "financial", label: "Касса и сметы" },
				].map((tab) => (
					<button
						key={tab.id}
						type="button"
						onClick={() => setSelectedCategory(tab.id as typeof selectedCategory)}
						className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
							selectedCategory === tab.id
								? "bg-[var(--paper)] text-[var(--teal,#0d9488)] font-bold shadow-xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent border-transparent"
						}`}
						data-testid={`tool-logs-category-${tab.id}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Список логов */}
			<div className="space-y-2">
				{filteredLogs.length === 0 ? (
					<div className="p-6 text-center text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl">
						<Terminal size={20} className="mx-auto mb-1.5 opacity-40" />
						<p className="m-0 text-xs">Вызовов инструментов в текущей сессии пока не зафиксировано</p>
					</div>
				) : (
					filteredLogs.map((log) => {
						const isExpanded = expandedLogId === log.id;
						return (
							<div
								key={log.id}
								className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] space-y-1.5 text-xs transition-colors hover:border-[var(--teal,#0d9488)]/40"
								data-testid={`tool-log-item-${log.id}`}
							>
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-1.5 min-w-0 font-bold text-[var(--ink)]">
										{getCategoryIcon(log.category)}
										<span className="font-mono text-[11px] truncate">{log.toolName}</span>
									</div>
									<div className="flex items-center gap-1.5 shrink-0">
										{log.durationMs !== undefined && (
											<span className="text-[10px] font-mono text-[var(--muted)]">
												{log.durationMs} мс
											</span>
										)}
										{getStatusBadge(log.status)}
									</div>
								</div>

								<p className="text-[11px] text-[var(--ink)] m-0 leading-normal">
									{log.resultSummary}
								</p>

								<div className="flex items-center justify-between text-[10px] text-[var(--muted)] pt-1 border-t border-[var(--line)]/50">
									<span className="font-mono">{log.timestamp}</span>
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
											className="inline-flex items-center gap-1 text-[var(--teal,#0d9488)] font-semibold hover:underline cursor-pointer bg-transparent"
										>
											<Code size={10} />
											<span>{isExpanded ? "Скрыть аргументы" : "Аргументы"}</span>
										</button>
										{onViewDiff && (
											<button
												type="button"
												onClick={() => onViewDiff(log)}
												className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer bg-transparent"
											>
												<FileText size={10} />
												<span>Дифф</span>
											</button>
										)}
									</div>
								</div>

								{/* Развернутые аргументы JSON */}
								{isExpanded && (
									<pre className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[10px] font-mono overflow-x-auto text-[var(--ink)] m-0">
										{JSON.stringify(log.args, null, 2)}
									</pre>
								)}
							</div>
						);
					})
				)}
			</div>
		</div>
	);
};

export default CopilotToolLogsView;
