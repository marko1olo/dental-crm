import React from "react";
import {
	Check,
	CheckCircle2,
	AlertTriangle,
	Printer,
	Eye,
	EyeOff,
	Tablet,
	FileText,
	History,
	RotateCcw,
	MoreVertical,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import type { ConsentSubstitutionContext } from "../../consents/consentTemplates";
import type { renderConsentTemplate } from "../../consents/consentTemplates";
import type { ClinicalConsentConfig, ConsentStatusType, ConsentRecordState } from "./visitConsentTypes";

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

export function ConsentItemRow({
	item,
	isExpanded,
	onToggleExpand,
	onTogglePaperSigned,
	onPrintSingleFilled,
	onPrintSingleBlank,
	onOpenTabletModal,
	substitutionContext,
	isDropdownOpen,
	onToggleDropdown,
	onCloseDropdown,
}: ConsentItemRowProps) {
	const isSigned = item.status === "signed";
	const isRequired = item.status === "required_today";

	return (
		<div
			className={`vct-consent-card ${isRequired ? "highlight-required" : ""} ${isSigned ? "highlight-signed" : ""}`}
		>
			{/* Строка с кратким резюме и действиями */}
			<div className="vct-card-summary-row">
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

					{isSigned && item.record?.signedAt && (
						<span className="vct-signed-detail">
							({item.record.signedAt} • {item.record.method === "paper" ? "на бумаге" : "планшет"})
						</span>
					)}
				</div>

				<div className="vct-card-actions">
					{/* 1. Статус / Подтверждение: отметка подписи */}
					<button
						type="button"
						onClick={onTogglePaperSigned}
						className={`vct-btn ${isSigned ? "vct-btn-secondary" : "vct-btn-success"}`}
						title={isSigned ? "Снять отметку о подписи" : "Отметка: пациент подписал согласие на бумаге"}
					>
						{isSigned ? (
							<>
								<RotateCcw size={13} />
								<span>Изменить</span>
							</>
						) : (
							<>
								<Check size={14} />
								<span>Отметить подписанным</span>
							</>
						)}
					</button>

					{/* 2. Главное действие печати бланка */}
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

					{/* 3. Лаконичный переключатель быстрого просмотра */}
					<button
						type="button"
						onClick={onToggleExpand}
						className={`vct-btn ${isExpanded ? "vct-btn-outline-teal" : "vct-btn-secondary"}`}
						title={isExpanded ? "Скрыть текст согласия" : "Раскрыть текст согласия для ознакомления"}
					>
						{isExpanded ? <EyeOff size={13} /> : <Eye size={13} />}
						<span>{isExpanded ? "Скрыть" : "Быстрый просмотр"}</span>
					</button>

					{/* 4. Вторичные действия под компактной кнопкой-меню [...] */}
					<div className="vct-dropdown-wrapper">
						<button
							type="button"
							onClick={onToggleDropdown}
							className={`vct-btn-icon ${isDropdownOpen ? "active" : ""}`}
							title="Дополнительные действия (чистый бланк, подпись на планшете, история)"
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
									onClick={() => {
										onCloseDropdown();
										onPrintSingleBlank();
									}}
								>
									<FileText size={14} style={{ color: "var(--muted)" }} />
									<span>Чистый бланк со строками</span>
								</button>
								<button
									type="button"
									className="vct-dropdown-item"
									role="menuitem"
									onClick={() => {
										onCloseDropdown();
										onOpenTabletModal?.();
									}}
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
			</div>

			{/* Инлайн превью текста согласия (Zero Popups) */}
			{isExpanded && item.renderedTemplate && (
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
						{item.renderedTemplate.renderedSections.map((sec) => (
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

						{item.renderedTemplate.riskFactors.length > 0 && (
							<div className="vct-preview-risk-box">
								<strong>Разъясненные клинические риски и возможные осложнения:</strong>
								<ul className="vct-preview-bullets" style={{ marginTop: "4px" }}>
									{item.renderedTemplate.riskFactors.map((rf, rfIdx) => (
										<li key={rfIdx}>{rf}</li>
									))}
								</ul>
							</div>
						)}

						{item.renderedTemplate.aftercareInstructions.length > 0 && (
							<div className="vct-preview-aftercare-box">
								<strong>Рекомендации и ограничения после вмешательства:</strong>
								<ul className="vct-preview-bullets" style={{ marginTop: "4px" }}>
									{item.renderedTemplate.aftercareInstructions.map((ac, acIdx) => (
										<li key={acIdx}>{ac}</li>
									))}
								</ul>
							</div>
						)}
					</div>

					<div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "4px" }}>
						<button
							type="button"
							onClick={onPrintSingleFilled}
							className="vct-btn vct-btn-primary"
						>
							<Printer size={13} />
							<span>Распечатать этот текст</span>
						</button>
						<button
							type="button"
							onClick={onToggleExpand}
							className="vct-btn vct-btn-secondary"
						>
							Закрыть превью
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
