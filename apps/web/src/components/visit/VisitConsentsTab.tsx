/**
 * VisitConsentsTab.tsx
 * ============================================================================
 * КЛИНИЧЕСКИЙ АРМ ИНФОРМИРОВАННЫХ СОГЛАСИЙ (ИДС) У КРЕСЛА ВРАЧА-СТОМАТОЛОГА
 * ============================================================================
 * 
 * Декомпозирован по Мандату 8b (лимит строк <= 800):
 * - consents/visitConsentTypes.ts: интерфейсы и конфигурации
 * - consents/visitConsentsTabStyles.ts: CSS-стили
 * - consents/useVisitConsentsLogic.ts: хук бизнес-логики, синхронизации и печати
 * - consents/ConsentScopeMismatchBanner.tsx: индикатор несовпадения объема вмешательств
 * - consents/Consent1ClickBatchBanner.tsx: баннер 1-клик пакета на сегодня
 * - consents/ConsentItemRow.tsx: строка согласия с действиями и инлайн-превью
 * - consents/ConsentArchiveSection.tsx: архив подписанных согласий и гарантийный паспорт
 */

import React from "react";
import {
	ShieldCheck,
	FileText,
	FileCheck,
	Award,
	History,
	Printer,
} from "lucide-react";

// Re-export all types and configs for full backwards compatibility
export * from "./consents/visitConsentTypes";

import { type VisitConsentsTabProps } from "./consents/visitConsentTypes";
import { VISIT_CONSENTS_TAB_STYLES } from "./consents/visitConsentsTabStyles";
import { ConsentScopeMismatchBanner } from "./consents/ConsentScopeMismatchBanner";
import { Consent1ClickBatchBanner } from "./consents/Consent1ClickBatchBanner";
import { ConsentItemRow } from "./consents/ConsentItemRow";
import { ConsentArchiveSection } from "./consents/ConsentArchiveSection";
import { useVisitConsentsLogic } from "./consents/useVisitConsentsLogic";

export function VisitConsentsTab(props: VisitConsentsTabProps) {
	const {
		onOpenInformedConsentModal,
		onOpenWarrantyModal,
		onFastPrint043u,
	} = props;

	const {
		activeSubTab,
		setActiveSubTab,
		expandedCards,
		toggleCardExpand,
		activeDropdownKey,
		setActiveDropdownKey,
		substitutionContext,
		consentScopeMismatch,
		itemsWithStatus,
		unsignedRequiredItems,
		archiveList,
		handleTogglePaperSigned,
		handleMarkAllRequiredTodaySigned,
		handlePrintSingleFilled,
		handlePrintSingleBlank,
		handlePrintTodayPackage,
		handleFormAddendumConsent,
		handleMarkAddendumSigned,
	} = useVisitConsentsLogic(props);

	return (
		<div className="vct-root" data-testid="visit-consents-tab-panel">
			<style>{VISIT_CONSENTS_TAB_STYLES}</style>

			{/* ═══ ВЕРХНЯЯ ШАПКА РАБОЧЕГО МЕСТА СОГЛАСИЙ ═══ */}
			<div className="vct-header">
				<div className="vct-title-group">
					<h3 className="vct-title">
						<ShieldCheck size={18} style={{ color: "var(--teal)" }} />
						<span>Информированные согласия (ИДС) и гарантии</span>
					</h3>
					<p className="vct-subtitle">
						Защита врача и пациента, согласия на медицинские вмешательства и паспорт гарантий
					</p>
				</div>
				<div className="vct-header-actions">
					<button
						type="button"
						onClick={onOpenInformedConsentModal}
						data-testid="btn-visit-open-consent-modal"
						className="vct-btn vct-btn-secondary"
						title="Открыть каталог бланков согласий (печать А4 и архив)"
					>
						<FileText size={14} />
						<span>Бланки согласий ИДС</span>
					</button>
					<button
						type="button"
						onClick={onOpenWarrantyModal}
						data-testid="btn-visit-warranty-passport"
						className="vct-btn vct-btn-secondary"
						title="Открыть гарантийный паспорт пациента"
					>
						<Award size={14} />
						<span>Гарантийный паспорт</span>
					</button>
				</div>
			</div>

			{/* ═══ ЮРИДИЧЕСКИЙ ИНДИКАТОР: CONSENT SCOPE MISMATCH (МАНДАТ 8e) ═══ */}
			<ConsentScopeMismatchBanner
				mismatch={consentScopeMismatch}
				onFormAddendumConsent={handleFormAddendumConsent}
				onMarkAddendumSigned={handleMarkAddendumSigned}
			/>

			{/* ═══ HOT PATH БАННЕР: «1-КЛИК ПАКЕТ НА СЕГОДНЯ» (МАНДАТ 8e) ═══ */}
			<Consent1ClickBatchBanner
				unsignedRequiredItems={unsignedRequiredItems}
				onPrintTodayPackage={handlePrintTodayPackage}
				onMarkAllRequiredTodaySigned={handleMarkAllRequiredTodaySigned}
				onOpenInformedConsentModal={onOpenInformedConsentModal}
			/>

			{/* ═══ НАВИГАЦИОННАЯ СТРОКА: АКТУАЛЬНЫЕ СОГЛАСИЯ / АРХИВ ═══ */}
			<div className="vct-nav-row">
				<div className="vct-tabs-nav">
					<button
						type="button"
						className={`vct-tab-trigger ${activeSubTab === "current" ? "active" : ""}`}
						onClick={() => setActiveSubTab("current")}
					>
						<FileCheck size={14} />
						<span>Актуальные согласия приёма</span>
						<span className="vct-counter-badge">{itemsWithStatus.length}</span>
					</button>
					<button
						type="button"
						className={`vct-tab-trigger ${activeSubTab === "archive" ? "active" : ""}`}
						onClick={() => setActiveSubTab("archive")}
					>
						<History size={14} />
						<span>Архив и гарантии</span>
						<span className="vct-counter-badge">{archiveList.length}</span>
					</button>
				</div>
				<div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
					Пациент: <strong>{substitutionContext.patientName}</strong> | Врач: <strong>{substitutionContext.doctorName}</strong>
				</div>
			</div>

			{/* ═══ РЕЖИМ 1: СПИСОК НЕОБХОДИМЫХ И ОФОРМЛЕННЫХ СОГЛАСИЙ ═══ */}
			{activeSubTab === "current" && (
				<div className="vct-cards-list">
					{itemsWithStatus.map((item) => (
						<ConsentItemRow
							key={item.key}
							item={item}
							isExpanded={Boolean(expandedCards[item.key])}
							onToggleExpand={() => toggleCardExpand(item.key)}
							onTogglePaperSigned={() => handleTogglePaperSigned(item.key, item.title)}
							onPrintSingleFilled={() => handlePrintSingleFilled(item.key)}
							onPrintSingleBlank={() => handlePrintSingleBlank(item.key)}
							onOpenTabletModal={onOpenInformedConsentModal}
							substitutionContext={substitutionContext}
							isDropdownOpen={activeDropdownKey === item.key}
							onToggleDropdown={() => setActiveDropdownKey(activeDropdownKey === item.key ? null : item.key)}
							onCloseDropdown={() => setActiveDropdownKey(null)}
						/>
					))}
				</div>
			)}

			{/* ═══ РЕЖИМ 2: АРХИВ РАНЕЕ ПОДПИСАННЫХ СОГЛАСИЙ И ГАРАНТИЙНЫЙ ПАСПОРТ ═══ */}
			{activeSubTab === "archive" && (
				<ConsentArchiveSection
					archiveList={archiveList}
					onPrintSingleFilled={handlePrintSingleFilled}
					onOpenWarrantyModal={onOpenWarrantyModal}
				/>
			)}

			{/* ═══ НИЖНЯЯ ПАНЕЛЬ ДЕЙСТВИЙ ═══ */}
			<div className="vct-footer-bar">
				<div className="vct-footer-left">
					<ShieldCheck size={14} style={{ color: "var(--emerald)" }} />
					<span>Все согласия сохраняются в истории электронной медицинской карты (срок хранения 25 лет)</span>
				</div>
				<div className="vct-footer-actions">
					<button
						type="button"
						onClick={onFastPrint043u}
						data-testid="btn-visit-consents-print-043u"
						className="vct-btn vct-btn-secondary"
						title="Печать полного дневника приёма (медицинская карта)"
						aria-label="Печать медицинской карты"
					>
						<Printer size={13} />
						<span>Печать дневника</span>
					</button>
					<button
						type="button"
						onClick={onOpenWarrantyModal}
						className="vct-btn vct-btn-secondary"
						title="Гарантийный талон и паспорт"
					>
						<Award size={13} />
						<span>Гарантии</span>
					</button>
					<button
						type="button"
						onClick={onOpenInformedConsentModal}
						className="vct-btn vct-btn-secondary"
						title="Открыть каталог всех бланков информированных добровольных согласий (ИДС)"
					>
						<FileText size={13} />
						<span>Все бланки ИДС</span>
					</button>
				</div>
			</div>
		</div>
	);
}
