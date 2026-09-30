import React from "react";
import { Printer, Award } from "lucide-react";
import type { ConsentTemplateKey } from "../../consents/consentTemplates";
import type { ConsentRecordState } from "./visitConsentTypes";

export interface ConsentArchiveItem {
	key: ConsentTemplateKey;
	code: string;
	title: string;
	category: string;
	statutoryBasis: string;
	record: ConsentRecordState;
}

export interface ConsentArchiveSectionProps {
	readonly archiveList: readonly ConsentArchiveItem[];
	readonly onPrintSingleFilled: (key: ConsentTemplateKey) => void;
	readonly onOpenWarrantyModal?: (() => void) | undefined;
}

export function ConsentArchiveSection({
	archiveList,
	onPrintSingleFilled,
	onOpenWarrantyModal,
}: ConsentArchiveSectionProps) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
			<div className="vct-archive-container">
				<table className="vct-archive-table">
					<thead>
						<tr>
							<th>Код / Наименование</th>
							<th>Нормативное основание</th>
							<th>Дата и время</th>
							<th>Способ</th>
							<th>Хеш целостности SHA-256</th>
							<th style={{ textAlign: "right" }}>Действия</th>
						</tr>
					</thead>
					<tbody>
						{archiveList.length === 0 ? (
							<tr>
								<td colSpan={6} className="vct-archive-empty">
									У пациента пока нет архивных подписанных согласий
								</td>
							</tr>
						) : (
							archiveList.map((doc) => (
								<tr key={doc.key}>
									<td>
										<span className="vct-code-pill" style={{ marginRight: "6px" }}>
											{doc.code}
										</span>
										<strong>{doc.title}</strong>
									</td>
									<td style={{ color: "var(--muted)", fontSize: "11px" }}>
										{doc.statutoryBasis}
									</td>
									<td>{doc.record.signedAt || "—"}</td>
									<td>
										<span className="vct-badge vct-badge-signed">
											{doc.record.method === "paper" ? "На бумаге" : "Планшет Touch"}
										</span>
									</td>
									<td style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--teal)" }}>
										{doc.record.integrityHash ? `${doc.record.integrityHash.slice(0, 16)}...` : "—"}
									</td>
									<td style={{ textAlign: "right" }}>
										<button
											type="button"
											onClick={() => onPrintSingleFilled(doc.key)}
											className="vct-btn vct-btn-secondary"
											title="Повторная печать согласия из архива"
										>
											<Printer size={13} />
											<span>Печать</span>
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Блок гарантийного паспорта */}
			<div
				style={{
					background: "var(--paper-soft)",
					border: "1px solid var(--glass-border)",
					borderRadius: "10px",
					padding: "14px 16px",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "16px",
					flexWrap: "wrap",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "12px", maxWidth: "600px" }}>
					<Award size={28} style={{ color: "var(--teal)", flexShrink: 0 }} />
					<div>
						<div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--ink)" }}>
							Гарантийный паспорт и сроки службы стоматологических услуг
						</div>
						<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
							В соответствии со ст. 5, 10, 29 Закона РФ «О защите прав потребителей» и протоколами СтАР. Световые пломбы: гарантия 12–24 мес., металлокерамика и диоксид циркония: 12–36 мес.
						</div>
					</div>
				</div>
				<button
					type="button"
					onClick={onOpenWarrantyModal}
					className="vct-btn vct-btn-primary"
					title="Оформить официальный гарантийный паспорт на оказанные услуги"
				>
					<Award size={14} />
					<span>Оформить гарантийный паспорт</span>
				</button>
			</div>
		</div>
	);
}
