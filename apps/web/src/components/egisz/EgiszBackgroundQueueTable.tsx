import React from "react";
import { AlertCircle, CheckCircle, Clock, Download, RefreshCw } from "lucide-react";
import type { RemdDocumentRecord } from "./egiszJournalData";

export interface EgiszBackgroundQueueTableProps {
	readonly records: readonly RemdDocumentRecord[];
	readonly onRetryRecord?: ((record: RemdDocumentRecord) => void) | undefined;
	readonly onDownloadZip?: ((record: RemdDocumentRecord) => void) | undefined;
	readonly onRefresh?: (() => void) | undefined;
}

const getDocTitle = (r: RemdDocumentRecord) => (r as any).docTitle || r.docTypeName || `СЭМД ${(r as any).semdDocCode || r.docTypeCode || "105"}`;
const getPatientName = (r: RemdDocumentRecord) => (r as any).patientFullName || r.patient?.fullName || "Пациент";

export const EgiszBackgroundQueueTable: React.FC<EgiszBackgroundQueueTableProps> = ({
	records,
	onRetryRecord,
	onDownloadZip,
	onRefresh,
}) => {
	const renderBadge = (status: string) => {
		if (status === "registered" || status === "accepted_by_egisz" || status === "sent") {
			return <span className="egisz-queue-badge success"><CheckCircle size={12} /> Отправлен</span>;
		}
		if (status === "error" || status === "rejected_by_egisz") {
			return <span className="egisz-queue-badge danger"><AlertCircle size={12} /> Ошибка</span>;
		}
		return <span className="egisz-queue-badge warning"><Clock size={12} /> В очереди</span>;
	};

	return (
		<div className="egisz-queue-wrap" data-testid="egisz-queue-table">
			<div className="egisz-queue-header-row">
				<div>
					<h3 className="egisz-queue-heading">Фоновый журнал пакетов ЕГИСЗ</h3>
					<p className="egisz-queue-subheading">Асинхронная очередь отправки СЭМД без блокировки работы врача</p>
				</div>
				{onRefresh && (
					<button type="button" onClick={onRefresh} className="egisz-btn sm" aria-label="Обновить журнал">
						<RefreshCw size={14} /> Обновить
					</button>
				)}
			</div>

			{records.length === 0 ? (
				<div className="egisz-empty-box" data-testid="egisz-queue-empty">
					<CheckCircle size={32} className="text-teal" />
					<p className="egisz-empty-title">Фоновая очередь чиста</p>
					<p className="egisz-empty-desc">Все медицинские протоколы и справки успешно переданы в ЕГИСЗ.</p>
				</div>
			) : (
				<>
					{/* Десктопная таблица */}
					<div className="egisz-queue-desktop-table">
						<table className="egisz-queue-table">
							<thead>
								<tr>
									<th>Документ</th>
									<th>Пациент</th>
									<th>Время</th>
									<th>Статус</th>
									<th style={{ textAlign: "right" }}>Действия</th>
								</tr>
							</thead>
							<tbody>
								{records.map((r) => (
									<tr key={r.id} data-testid={`queue-row-${r.id}`}>
										<td className="font-semibold">{getDocTitle(r)}</td>
										<td>{getPatientName(r)}</td>
										<td className="text-muted">{r.createdAt ? new Date(r.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
										<td>{renderBadge(r.status)}</td>
										<td style={{ textAlign: "right" }}>
											<div className="egisz-action-btns">
												{(r.status === "error" || r.status === "rejected_by_egisz" || r.status === "draft") && onRetryRecord && (
													<button type="button" onClick={() => onRetryRecord(r)} className="egisz-btn xs" title="Повторить отправку">
														<RefreshCw size={12} /> Повторить
													</button>
												)}
												{onDownloadZip && (
													<button type="button" onClick={() => onDownloadZip(r)} className="egisz-btn xs" title="Скачать ZIP">
														<Download size={12} /> ZIP
													</button>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Мобильный список карточек по Apple HIG */}
					<div className="egisz-queue-mobile-cards">
						{records.map((r) => (
							<div key={r.id} className="egisz-queue-card" data-testid={`queue-card-${r.id}`}>
								<div className="egisz-card-top">
									<span className="font-bold">{getDocTitle(r)}</span>
									{renderBadge(r.status)}
								</div>
								<div className="egisz-card-patient">{getPatientName(r)}</div>
								<div className="egisz-card-actions">
									{(r.status === "error" || r.status === "rejected_by_egisz" || r.status === "draft") && onRetryRecord && (
										<button type="button" onClick={() => onRetryRecord(r)} className="egisz-btn sm flex-1">
											<RefreshCw size={14} /> Повторить
										</button>
									)}
									{onDownloadZip && (
										<button type="button" onClick={() => onDownloadZip(r)} className="egisz-btn sm">
											<Download size={14} /> ZIP
										</button>
									)}
								</div>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
};
