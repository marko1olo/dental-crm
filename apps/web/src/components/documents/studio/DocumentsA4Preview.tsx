/**
 * apps/web/src/components/documents/studio/DocumentsA4Preview.tsx
 *
 * Компонент визуального предпросмотра медицинского листа формата А4 (Мандаты 8e, 8am).
 * Живое отображение бланка клиники, реквизитов, статуса подписания и финансовых сумм.
 */
import React from "react";
import { formatKopecksToRubles, type PatientRequisites } from "../../consents/consentCatalogData";

export interface DocumentsA4PreviewProps {
	readonly clinic: {
		readonly name: string;
		readonly inn: string;
		readonly license: string;
		readonly address: string;
		readonly phone: string;
	};
	readonly patient: PatientRequisites;
	readonly effectiveDoctorName: string;
	readonly currentDate: string;
	readonly totalDisplayAmountKopecks: number;
	readonly renderedDocumentText: string;
	readonly effectiveHasSigned: boolean;
	readonly signedAtTimeStr?: string | null | undefined;
}

export const DocumentsA4Preview: React.FC<DocumentsA4PreviewProps> = ({
	clinic,
	patient,
	effectiveDoctorName,
	currentDate,
	totalDisplayAmountKopecks,
	renderedDocumentText,
	effectiveHasSigned,
	signedAtTimeStr,
}) => {
	return (
		<main className="dente-docs-preview-area">
			<div
				className="dente-a4-paper-sheet print-paper-sheet"
				data-paper-sheet
				data-testid="dente-a4-paper-sheet"
			>
				{/* Шапка бланка А4 */}
				<div className="dente-a4-sheet-header">
					<div>
						<div className="dente-a4-clinic-name">
							{clinic.name}
						</div>
						<div className="dente-a4-clinic-sub">
							{clinic.address} · Тел: {clinic.phone}
						</div>
						<div className="dente-a4-clinic-sub">
							Лицензия: {clinic.license}
						</div>
					</div>
					<div className="dente-a4-date-badge">
						<div>Дата: {currentDate}</div>
						<div className="text-teal-700 font-medium mt-1 whitespace-nowrap">
							Сумма: {formatKopecksToRubles(totalDisplayAmountKopecks)}
						</div>
					</div>
				</div>

				{/* Содержимое бланка */}
				<div className="dente-a4-text-body">
					{renderedDocumentText}
				</div>

				{/* Подвал с подписями сторон */}
				<div className="dente-a4-sheet-footer">
					<div>
						<div className="font-semibold text-[var(--ink)]">Исполнитель:</div>
						<div className="text-[var(--ink-secondary)]">{effectiveDoctorName}</div>
						<div className="mt-4 text-[var(--ink-muted)]">Подпись: ______________________ М.П.</div>
					</div>

					<div className="text-right">
						<div className="font-semibold text-[var(--ink)]">Пациент:</div>
						<div className="text-[var(--ink-secondary)]">{patient.fullName || "______________________"}</div>
						<div className="mt-4 text-[var(--ink-muted)]">
							{effectiveHasSigned
								? `Подписано пациентом ${signedAtTimeStr ? `в ${signedAtTimeStr} ` : ""}[OK]`
								: "Подпись: ______________________"}
						</div>
					</div>
				</div>
			</div>
		</main>
	);
};

DocumentsA4Preview.displayName = "DocumentsA4Preview";
