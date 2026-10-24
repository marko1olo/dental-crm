/**
 * LauncherDocumentsContractsSection — реестр документов пациента из базы (Мандат 8b).
 *
 * Список строится по реальным записям GET /api/documents?patientId=.
 * Генерация новых документов (налоговый пакет, карта приёма) выполняется
 * в живом разделе «Документы» — кнопка-проводник ведёт туда (Мандат 8e).
 */

import { ArrowRight, FileText } from "lucide-react";
import type React from "react";
import type { LauncherDocument } from "../launcherFinanceApi";

const STATUS_LABELS: Record<string, string> = {
	signed: "Подписан",
	issued: "Выпущен",
	active: "Действует",
	draft: "Черновик",
	voided: "Аннулирован",
};

function statusLabel(status: string): string {
	return STATUS_LABELS[status] || status;
}

function goToLiveDocuments() {
	const u = new URL(window.location.href);
	window.location.href = `${u.pathname}#documents`;
}

export interface LauncherDocumentsContractsSectionProps {
	readonly patientId: string;
	readonly patientName: string;
	readonly documents: readonly LauncherDocument[];
}

export const LauncherDocumentsContractsSection: React.FC<
	LauncherDocumentsContractsSectionProps
> = ({ patientId, patientName, documents }) => {
	return (
		<div className="min-h-screen w-full bg-[var(--paper)] text-[var(--ink)] p-4 md:p-6 flex flex-col gap-5">
			<header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
				<div className="min-w-0">
					<h1 className="text-xl md:text-2xl font-bold tracking-tight">Документы и договоры</h1>
					<p className="text-sm text-[var(--muted)] truncate">
						Пациент: <span className="font-semibold text-[var(--ink)]">{patientName}</span> • документов в базе: {documents.length}
					</p>
				</div>
				<button
					type="button"
					onClick={goToLiveDocuments}
					className="primary-button min-h-[44px] h-11 px-5 rounded-xl text-sm font-medium inline-flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs whitespace-nowrap cursor-pointer transition-colors shrink-0"
					data-testid="standalone-documents-open-live-btn"
					title="Открыть полный раздел документов клиники"
				>
					<span>Раздел «Документы»</span>
					<ArrowRight size={16} aria-hidden="true" />
				</button>
			</header>

			{documents.length === 0 ? (
				<div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)]" data-testid="standalone-documents-empty">
					<div className="w-14 h-14 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center mb-3 text-[var(--muted)]">
						<FileText size={26} aria-hidden="true" />
					</div>
					<p className="text-sm text-[var(--muted)] max-w-md leading-relaxed">
						У этого пациента пока нет выпущенных документов. Договоры, согласия и справки
						оформляются в живом разделе «Документы» из карточки пациента.
					</p>
				</div>
			) : (
				<ul className="flex flex-col gap-2 list-none p-0 m-0" data-testid="standalone-documents-list">
					{documents.map((doc) => (
						<li
							key={doc.id}
							className="flex items-center justify-between gap-3 min-h-[52px] px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xs"
						>
							<div className="min-w-0 flex items-center gap-2.5">
								<FileText size={16} className="text-[var(--muted)] shrink-0" aria-hidden="true" />
								<span className="text-sm font-semibold text-[var(--ink)] truncate" title={doc.title}>
									{doc.title}
								</span>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								{doc.totalAmountRub != null && doc.totalAmountRub > 0 && (
									<span className="text-xs font-bold text-[var(--ink)] tabular-nums">
										{doc.totalAmountRub.toLocaleString("ru-RU")} ₽
									</span>
								)}
								<span className="text-xs px-2 py-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
									{statusLabel(doc.status)}
								</span>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export default LauncherDocumentsContractsSection;
