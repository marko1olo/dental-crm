import React from "react";
import type { AuditEvent } from "@dental/shared";
import { Eye, FileText, LogOut, ShieldCheck, Upload, UserCheck } from "lucide-react";

export interface SecurityAuditDataPanelProps {
	auditEvents: AuditEvent[];
	formatDateTime: (iso: string) => string;
	onOpenAuditTrailModal: () => void;
}

export function SecurityAuditDataPanel({
	auditEvents,
	formatDateTime,
	onOpenAuditTrailModal,
}: SecurityAuditDataPanelProps) {
	return (
		<div className="panel audit-panel" data-testid="152fz-audit-panel">
			<div className="panel-heading">
				<div>
					<h2>Аудит действий и журнал безопасности</h2>
					<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
						Криптографический реестр обращений: входы сотрудников, открытие медицинских карт, выгрузка данных и отзыв сессий.
					</p>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<button
						className="secondary-button"
						type="button"
						onClick={onOpenAuditTrailModal}
						style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
						data-testid="open-152fz-audit-modal-btn"
					>
						<FileText size={16} aria-hidden="true" />
						<span>Журнал безопасности данных</span>
					</button>
					<ShieldCheck aria-hidden="true" />
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] my-2 text-xs">
				<div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
						<UserCheck size={14} className="shrink-0 text-teal-600" />
						<span>Авторизации</span>
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0 leading-normal">
						Фиксация входов, IP-адресов и попыток подбора паролей.
					</p>
				</div>

				<div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
						<Eye size={14} className="shrink-0 text-teal-600" />
						<span>Медкарты (ЭМК)</span>
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0 leading-normal">
						Учёт каждого открытия медкарты (соблюдение врачебной тайны).
					</p>
				</div>

				<div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
						<Upload size={14} className="shrink-0 text-teal-600" />
						<span>Выгрузка данных</span>
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0 leading-normal">
						Контроль экспорта базы пациентов и просмотра неэкранированных данных.
					</p>
				</div>

				<div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
						<LogOut size={14} className="shrink-0 text-teal-600" />
						<span>Отзыв сессий</span>
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0 leading-normal">
						Сброс параллельных сессий и блокировка уволенных сотрудников.
					</p>
				</div>
			</div>

			<div className="ops-list">
				{auditEvents.length > 0 ? (
					auditEvents.map((event) => (
						<article className="ops-row" key={event.id}>
							<ShieldCheck aria-hidden="true" />
							<div>
								<h3>{event.reason ? "Системное событие" : "Запись аудита"}</h3>
								<p>
									{event.reason ?? "Служебная запись без публичного описания"}
								</p>
							</div>
							<span>{formatDateTime(event.createdAt)}</span>
						</article>
					))
				) : (
					<article className="ops-empty">
						<ShieldCheck aria-hidden="true" />
						<p>
							Журнал криптографического аудита безопасности активен. Все обращения к медицинским картам,
							авторизации и выгрузки фиксируются цепочкой SHA-256. Нажмите «Журнал безопасности данных» для полного отчёта.
						</p>
					</article>
				)}
			</div>
		</div>
	);
}

/** Backward-compatible alias for existing tests and callers (Mandate 8ap clean name preferred) */
export const SecurityAudit152FzPanel = SecurityAuditDataPanel;
export type SecurityAudit152FzPanelProps = SecurityAuditDataPanelProps;
