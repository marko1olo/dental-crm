import type { GeneralCleaningLog } from "@dental/shared";
import { CheckCircle2, UserCheck } from "lucide-react";
import React from "react";

export interface GeneralCleaningLogTableProps {
	logs: GeneralCleaningLog[];
	loading: boolean;
	onVerify: (id: string) => void;
}

export function GeneralCleaningLogTable({
	logs,
	loading,
	onVerify,
}: GeneralCleaningLogTableProps) {
	return (
		<div className="sanpin-table-wrapper">
			<table className="sanpin-table">
				<thead>
					<tr>
						<th>План / Факт дата</th>
						<th>Помещение</th>
						<th>Площадь (м²)</th>
						<th>Дезсредство / Концентрация</th>
						<th>Экспозиция (мин)</th>
						<th>УФ-обеззараживание</th>
						<th>Проветривание</th>
						<th>Исполнитель</th>
						<th>Контроль / Подпись</th>
					</tr>
				</thead>
				<tbody>
					{loading ? (
						<tr>
							<td colSpan={9} style={{ textAlign: "center", padding: "2rem" }}>
								Загрузка журнала генеральных уборок...
							</td>
						</tr>
					) : logs.length === 0 ? (
						<tr>
							<td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
								Записи генеральных уборок не найдены.
							</td>
						</tr>
					) : (
						logs.map((log) => (
							<tr
								key={log.id}
								className="sanpin-log-row"
								style={{
									minHeight: "44px",
									contentVisibility: "auto",
									containIntrinsicSize: "1px 44px",
									contain: "content",
								}}
							>
								<td>
									<div style={{ fontWeight: 600 }}>{log.scheduledDate}</div>
									<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
										Факт: {new Date(log.actualDateTime).toLocaleDateString("ru-RU")}
									</div>
								</td>
								<td>
									<div style={{ fontWeight: 600 }}>{log.roomName}</div>
									<span className="sanpin-tag sanpin-tag-neutral">
										{log.cleaningType === "general" ? "Генеральная" : "Текущая"}
									</span>
								</td>
								<td>{log.treatedAreaM2} м²</td>
								<td>
									<div style={{ fontWeight: 500 }}>{log.disinfectantName}</div>
									<div style={{ fontSize: "0.725rem", color: "var(--muted)" }}>
										Концентрация: {log.solutionConcentrationPercent}%
									</div>
								</td>
								<td>{log.exposureTimeMinutes} мин</td>
								<td>
									<span style={{ fontWeight: 600, color: "var(--brand-primary)" }}>
										{log.uvIrradiationMinutes} мин
									</span>
								</td>
								<td>{log.ventilationMinutes} мин</td>
								<td style={{ fontSize: "0.8rem" }}>{log.operatorName || "Санитарка / Медсестра"}</td>
								<td>
									{log.status === "verified_by_inspector" ? (
										<span className="sanpin-tag sanpin-tag-success">
											<CheckCircle2 size={12} /> Проверено
										</span>
									) : (
										<button
											type="button"
											onClick={() => onVerify(log.id)}
											style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
											className="sanpin-btn sanpin-btn-secondary"
										>
											<UserCheck size={12} /> Заверить
										</button>
									)}
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
