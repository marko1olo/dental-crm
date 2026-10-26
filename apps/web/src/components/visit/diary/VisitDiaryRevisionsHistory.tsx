import React from "react";
import type { DiaryRevision } from "../../useVisitDiaryLogic";

export interface VisitDiaryRevisionsHistoryProps {
	readonly revisionCount?: number;
	readonly diaryRevisions?: readonly DiaryRevision[];
}

export function VisitDiaryRevisionsHistory({
	revisionCount = 0,
	diaryRevisions = [],
}: VisitDiaryRevisionsHistoryProps) {
	if (!revisionCount || revisionCount <= 0 || diaryRevisions.length === 0) {
		return null;
	}

	return (
		<details
			className="vde-043__revisions no-print"
			data-testid="diary-revisions-history"
		>
			<summary className="vde-043__revisions-summary">
				История правок ({diaryRevisions.length})
			</summary>
			<ol className="vde-043__revisions-list">
				{(diaryRevisions ?? []).map((rev, idx) => {
					const when = rev.revisedAt
						? new Date(rev.revisedAt).toLocaleString("ru-RU")
						: "дата не указана";
					const prevBits: { label: string; text: string }[] = [];
					const pushPrev = (label: string, text: string | null) => {
						if (typeof text === "string" && text.trim().length > 0) {
							prevBits.push({ label, text: text.trim() });
						}
					};
					pushPrev("Жалобы/анамнез", rev.previousAnamnesis);
					pushPrev("Осмотр (объективно)", rev.previousStatusLocalis);
					pushPrev("Диагноз (МКБ-10)", rev.previousDiagnosisIcd10);
					pushPrev("Зуб", rev.previousDiagnosisTooth);
					pushPrev("Лечение", rev.previousTreatmentDescription);
					pushPrev("Осложнения", rev.previousComplications);
					pushPrev("Сопутствующие", rev.previousComorbidities);
					return (
						<li
							key={rev.id}
							className="vde-043__revision-item"
							data-testid={`diary-revision-item-${idx}`}
						>
							<div className="vde-043__revision-meta">
								<span className="vde-043__revision-when">{when}</span>
								{rev.revisedByFullName ? (
									<span className="vde-043__revision-who">
										Кто: {rev.revisedByFullName}
									</span>
								) : rev.revisedByUserId ? (
									<span className="vde-043__revision-who vde-043__revision-who--unknown">
										Кто: ФИО в записи не сохранено
									</span>
								) : null}
								{rev.revisionReason ? (
									<span className="vde-043__revision-reason">
										Причина: {rev.revisionReason}
									</span>
								) : (
									<span className="vde-043__revision-reason vde-043__revision-reason--missing">
										Причина не указана
									</span>
								)}
							</div>
							{prevBits.length > 0 ? (
								<ul className="vde-043__revision-prev">
									{(prevBits ?? []).map((b) => (
										<li key={b.label} className="min-w-0 break-words">
											<strong>{b.label}:</strong>{" "}
											<span className="vde-043__revision-prev-text min-w-0 break-words">
												{b.text.length > 280
													? `${b.text.slice(0, 280)}…`
													: b.text}
											</span>
										</li>
									))}
								</ul>
							) : (
								<div className="vde-043__revision-prev-empty">
									Поля дневника до правки не сохранены
								</div>
							)}
						</li>
					);
				})}
			</ol>
		</details>
	);
}
