/**
 * ConsentItemRow.tsx — Единый консолидированный компонент строки информированного согласия (SSOT, Мандат 8b/8bf).
 * Объединяет рендер заголовка, бейджей статуса, кнопок действий и инлайн-превью.
 */
import React from "react";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	Eye,
	EyeOff,
	FileText,
	History,
	MoreVertical,
	Printer,
	RotateCcw,
	Tablet,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import type { ConsentSubstitutionContext, renderConsentTemplate } from "../../consents/consentTemplates";
import type { ClinicalConsentConfig, ConsentRecordState, ConsentStatusType } from "./visitConsentTypes";

export interface ConsentItemRowProps {
	readonly item: ClinicalConsentConfig & {
		status: ConsentStatusType;
		record?: ConsentRecordState | undefined;
		renderedTemplate: ReturnType<typeof renderConsentTemplate> | null;
	};
	readonly isExpanded: boolean;
	readonly onToggleExpand: () => void;
	readonly onTogglePaperSigned: () => void;
	readonly onPrintSingleFilled: () => void;
	readonly onPrintSingleBlank: () => void;
	readonly onOpenTabletModal?: (() => void) | undefined;
	readonly substitutionContext: ConsentSubstitutionContext;
	readonly isDropdownOpen: boolean;
	readonly onToggleDropdown: () => void;
	readonly onCloseDropdown: () => void;
}

export function ConsentItemRow(props: ConsentItemRowProps) {
	const { item, isExpanded } = props;
	const isSigned = item.status === "signed";
	const isRequired = item.status === "required_today";

	return (
		<div className={`vct-consent-card ${isRequired ? "highlight-required" : ""} ${isSigned ? "highlight-signed" : ""}`}>
			<div className="vct-card-summary-row">
				<ConsentItemRowHeader item={item} />
				<ConsentItemRowBadges status={item.status} record={item.record} />
				<ConsentItemRowActions {...props} />
			</div>

			{isExpanded && item.renderedTemplate && (
				<ConsentItemRowPreview
					item={item}
					substitutionContext={props.substitutionContext}
					onPrintSingleFilled={props.onPrintSingleFilled}
					onToggleExpand={props.onToggleExpand}
				/>
			)}
		</div>
	);
}

function ConsentItemRowHeader({ item }: { readonly item: Pick<ClinicalConsentConfig, "code" | "title" | "statutoryBasis" | "summary"> }) {
	return (
		<div className="vct-card-left">
			<div className="vct-card-meta">
				<div className="vct-card-title-row">
					<span className="vct-code-pill">{item.code}</span>
					<h4 className="vct-card-title">{item.title}</h4>
					<span className="vct-statutory-pill">{item.statutoryBasis}</span>
				</div>
				<p className="vct-card-desc">{item.summary}</p>
			</div>
		</div>
	);
}

function ConsentItemRowBadges({ status, record }: { readonly status: ConsentStatusType; readonly record?: ConsentRecordState | undefined }) {
	const isSigned = status === "signed";
	const isRequired = status === "required_today";

	return (
		<div className="vct-card-badges">
			{isSigned && (
				<div className="vct-badge vct-badge-signed">
					<CheckCircle2 size={13} />
					<span>Подписано</span>
				</div>
			)}
			{isRequired && (
				<div className="vct-badge vct-badge-required">
					<AlertTriangle size={13} />
					<span>Требуется для сегодняшнего приёма</span>
				</div>
			)}
			{!isSigned && !isRequired && (
				<div className="vct-badge vct-badge-neutral">
					<FileText size={13} />
					<span>Не оформлено</span>
				</div>
			)}
			{isSigned && record?.signedAt && (
				<span className="vct-signed-detail">
					({record.signedAt} • {record.method === "paper" ? "на бумаге" : "планшет"})
				</span>
			)}
		</div>
	);
}

function ConsentItemRowActions({
	item,
	isExpanded,
	onToggleExpand,
	onTogglePaperSigned,
	onPrintSingleFilled,
	onPrintSingleBlank,
	onOpenTabletModal,
	isDropdownOpen,
	onToggleDropdown,
	onCloseDropdown,
}: Pick<
	ConsentItemRowProps,
	"item" | "isExpanded" | "onToggleExpand" | "onTogglePaperSigned" | "onPrintSingleFilled" |
	"onPrintSingleBlank" | "onOpenTabletModal" | "isDropdownOpen" | "onToggleDropdown" | "onCloseDropdown"
>) {
	const isSigned = item.status === "signed";

	return (
		<div className="vct-card-actions">
			<button
				type="button"
				onClick={onTogglePaperSigned}
				className={`vct-btn ${isSigned ? "vct-btn-secondary" : "vct-btn-success"}`}
				title={isSigned ? "Снять отметку о подписи" : "Отметка: пациент подписал согласие на бумаге"}
			>
				{isSigned ? <><RotateCcw size={13} /><span>Изменить</span></> : <><Check size={14} /><span>Отметить подписанным</span></>}
			</button>

			<button
				type="button"
				onClick={onPrintSingleFilled}
				className="vct-btn vct-btn-secondary"
				data-testid={item.key === "CONSENT_INSPECTION_1051N" ? "btn-visit-fast-print-consent-1051n" : undefined}
				title="Распечатать предварительно заполненный бланк согласия (А4)"
			>
				<Printer size={13} />
				<span>Печать бланка</span>
			</button>

			<button
				type="button"
				onClick={onToggleExpand}
				className={`vct-btn ${isExpanded ? "vct-btn-outline-teal" : "vct-btn-secondary"}`}
				title={isExpanded ? "Скрыть текст согласия" : "Раскрыть текст согласия для ознакомления"}
			>
				{isExpanded ? <EyeOff size={13} /> : <Eye size={13} />}
				<span>{isExpanded ? "Скрыть" : "Быстрый просмотр"}</span>
			</button>

			<div className="vct-dropdown-wrapper">
				<button
					type="button"
					onClick={onToggleDropdown}
					className={`vct-btn-icon ${isDropdownOpen ? "active" : ""}`}
					title="Дополнительные действия"
					aria-label="Дополнительные действия"
					aria-expanded={isDropdownOpen}
				>
					<MoreVertical size={15} />
				</button>

				{isDropdownOpen && (
					<div className="vct-dropdown-menu" role="menu">
						<button
							type="button"
							className="vct-dropdown-item"
							role="menuitem"
							onClick={() => { onCloseDropdown(); onPrintSingleBlank(); }}
						>
							<FileText size={14} style={{ color: "var(--muted)" }} />
							<span>Чистый бланк со строками</span>
						</button>
						<button
							type="button"
							className="vct-dropdown-item"
							role="menuitem"
							onClick={() => { onCloseDropdown(); onOpenTabletModal?.(); }}
						>
							<Tablet size={14} style={{ color: "var(--teal)" }} />
							<span>Подпись на экране (если есть планшет)</span>
						</button>
						<div className="vct-dropdown-divider" />
						<button
							type="button"
							className="vct-dropdown-item"
							role="menuitem"
							onClick={() => {
								onCloseDropdown();
								if (item.record?.integrityHash) {
									showToast(`SHA-256: ${item.record.integrityHash}`, "info");
								} else {
									showToast(`Согласие «${item.title}» ожидает оформления`, "info");
								}
							}}
						>
							<History size={14} style={{ color: "var(--muted)" }} />
							<span>История и целостность</span>
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

function ConsentItemRowPreview({
	item,
	substitutionContext,
	onPrintSingleFilled,
	onToggleExpand,
}: Pick<
	ConsentItemRowProps,
	"item" | "substitutionContext" | "onPrintSingleFilled" | "onToggleExpand"
>) {
	const rendered = item.renderedTemplate;
	if (!rendered) return null;

	return (
		<div className="vct-inline-preview">
			<div className="vct-preview-header">
				<div className="vct-preview-title">
					Текст информированного добровольного согласия ({item.statutoryBasis})
				</div>
				<span style={{ fontSize: "11px", color: "var(--muted)" }}>
					Пациент: {substitutionContext.patientName} • Врач: {substitutionContext.doctorName}
				</span>
			</div>

			<div className="vct-preview-body">
				{rendered.renderedSections.map((sec) => (
					<div key={sec.id} className="vct-preview-section">
						<div className="vct-preview-section-title">{sec.title}</div>
						<div>{sec.content}</div>
						{sec.bullets && sec.bullets.length > 0 && (
							<ul className="vct-preview-bullets">
								{sec.bullets.map((b, bIdx) => (
									<li key={bIdx}>{b}</li>
								))}
							</ul>
						)}
					</div>
				))}

				{rendered.riskFactors.length > 0 && (
					<div className="vct-preview-risk-box">
						<strong>Разъясненные клинические риски и возможные осложнения:</strong>
						<ul className="vct-preview-bullets" style={{ marginTop: "4px" }}>
							{rendered.riskFactors.map((rf, rfIdx) => (
								<li key={rfIdx}>{rf}</li>
							))}
						</ul>
					</div>
				)}

				{rendered.aftercareInstructions.length > 0 && (
					<div className="vct-preview-aftercare-box">
						<strong>Рекомендации и ограничения после вмешательства:</strong>
						<ul className="vct-preview-bullets" style={{ marginTop: "4px" }}>
							{rendered.aftercareInstructions.map((ac, acIdx) => (
								<li key={acIdx}>{ac}</li>
							))}
						</ul>
					</div>
				)}
			</div>

			<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "4px" }}>
				<button type="button" onClick={onPrintSingleFilled} className="vct-btn vct-btn-primary">
					<Printer size={13} />
					<span>Распечатать этот текст</span>
				</button>
				<button type="button" onClick={onToggleExpand} className="vct-btn vct-btn-secondary">
					Закрыть превью
				</button>
			</div>
		</div>
	);
}
