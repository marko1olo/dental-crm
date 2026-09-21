/**
 * DENTE Dental CRM — Dual-Pane Legacy Price List Ingestion & 804n Mapping Diff View
 *
 * Implements Mandate 8c & 8e:
 * - Left Window: Exact raw line from old legacy document (Word / PDF / OCR / CSV).
 * - Right Window: Semantic Minzdrav Order 804n mapping, price with kopecks, confidence badge.
 * - 1-Click Action Buttons: «Принять всё», «Создать новую услугу», «Привязать к существующей».
 * - Pure Design Tokens, Zero Emojis (Lucide icons only), Strict WCAG AAA Contrast.
 */

import React, { useId, useMemo, useState } from 'react';
import {
	AlertTriangle,
	ArrowRight,
	Check,
	CheckCheck,
	CheckCircle2,
	ChevronDown,
	FileText,
	Filter,
	Link2,
	Plus,
	Search,
	ShieldCheck,
	Sparkles,
	X,
} from 'lucide-react';
import './PriceListMappingDiffView.css';

export type MappingConfidenceKind =
	| 'exact_code'
	| 'high_keyword'
	| 'medium_keyword'
	| 'low_keyword'
	| 'fallback';

export type MappingSuggestedAction =
	| 'create_new'
	| 'update_existing'
	| 'link_existing'
	| 'identical';

export interface IngestedMappingItem {
	id: string;
	sourceLineNumber: number;
	rawLine: string;
	cleanedTitle: string;
	code804n: string;
	statutoryTitle804n: string;
	category: string;
	specialty: string;
	priceRub: number;
	priceKopecks: number;
	confidence: number;
	confidenceKind: MappingConfidenceKind;
	matchedExistingServiceId?: string | null;
	matchedExistingTitle?: string | null;
	matchedExistingPriceRub?: number | null;
	suggestedAction: MappingSuggestedAction;
	isApproved: boolean;
}

export interface ExistingCatalogReference {
	readonly id: string;
	readonly code?: string;
	readonly title: string;
	readonly basePriceRub?: number;
}

export interface PriceListMappingDiffViewProps {
	readonly items: readonly IngestedMappingItem[];
	readonly onItemsChange?: (items: readonly IngestedMappingItem[]) => void;
	readonly onAcceptAll?: () => void;
	readonly onApply?: (approvedItems: readonly IngestedMappingItem[]) => void;
	readonly onCancel?: () => void;
	readonly existingCatalog?: readonly ExistingCatalogReference[];
	readonly isLoading?: boolean;
}

export const PriceListMappingDiffView: React.FC<PriceListMappingDiffViewProps> = ({
	items,
	onItemsChange,
	onAcceptAll,
	onApply,
	onCancel,
	existingCatalog = [],
	isLoading = false,
}) => {
	const [filterTab, setFilterTab] = useState<'all' | 'new' | 'update' | 'attention'>('all');
	const [searchTerm, setSearchTerm] = useState('');
	const [activeLinkRowId, setActiveLinkRowId] = useState<string | null>(null);

	const searchInputId = useId();

	// Stats Calculation
	const stats = useMemo(() => {
		const total = items.length;
		const approvedCount = items.filter((i) => i.isApproved).length;
		const exactCount = items.filter((i) => i.confidenceKind === 'exact_code').length;
		const newCount = items.filter((i) => i.suggestedAction === 'create_new').length;
		const updateCount = items.filter((i) => i.suggestedAction === 'update_existing').length;
		const attentionCount = items.filter((i) => i.confidence < 0.75).length;
		const totalConfidence = items.reduce((acc, it) => acc + it.confidence, 0);
		const avgConfidence = total > 0 ? Math.round((totalConfidence / total) * 100) : 0;

		return {
			total,
			approvedCount,
			exactCount,
			newCount,
			updateCount,
			attentionCount,
			avgConfidence,
		};
	}, [items]);

	// Filtered Items
	const filteredItems = useMemo(() => {
		const term = searchTerm.trim().toLowerCase();
		return items.filter((item) => {
			if (filterTab === 'new' && item.suggestedAction !== 'create_new') return false;
			if (filterTab === 'update' && item.suggestedAction !== 'update_existing' && item.suggestedAction !== 'link_existing') return false;
			if (filterTab === 'attention' && item.confidence >= 0.75) return false;

			if (term) {
				const matchesCode = item.code804n.toLowerCase().includes(term);
				const matchesTitle = item.cleanedTitle.toLowerCase().includes(term);
				const matchesRaw = item.rawLine.toLowerCase().includes(term);
				if (!matchesCode && !matchesTitle && !matchesRaw) return false;
			}
			return true;
		});
	}, [items, filterTab, searchTerm]);

	// 1-Click Action: Accept All
	const handleAcceptAllClick = () => {
		if (onAcceptAll) {
			onAcceptAll();
		} else if (onItemsChange) {
			const updated = items.map((it) => ({ ...it, isApproved: true }));
			onItemsChange(updated);
		}
	};

	// 1-Click Action: Deselect All
	const handleDeselectAll = () => {
		if (onItemsChange) {
			const updated = items.map((it) => ({ ...it, isApproved: false }));
			onItemsChange(updated);
		}
	};

	// Toggle Row Approval
	const handleToggleApproveRow = (rowId: string) => {
		if (!onItemsChange) return;
		const updated = items.map((it) =>
			it.id === rowId ? { ...it, isApproved: !it.isApproved } : it,
		);
		onItemsChange(updated);
	};

	// 1-Click Action: Create New Service for a Row
	const handleSetCreateNew = (rowId: string) => {
		if (!onItemsChange) return;
		const updated = items.map((it) =>
			it.id === rowId
				? {
						...it,
						suggestedAction: 'create_new' as const,
						matchedExistingServiceId: null,
						isApproved: true,
				  }
				: it,
		);
		onItemsChange(updated);
		setActiveLinkRowId(null);
	};

	// 1-Click Action: Link Row to Existing Service
	const handleSetLinkExisting = (rowId: string, targetServiceId: string) => {
		if (!onItemsChange) return;
		const targetService = existingCatalog.find((s) => s.id === targetServiceId);
		const updated = items.map((it) =>
			it.id === rowId
				? {
						...it,
						suggestedAction: 'link_existing' as const,
						matchedExistingServiceId: targetServiceId,
						matchedExistingTitle: targetService?.title ?? it.matchedExistingTitle,
						matchedExistingPriceRub: targetService?.basePriceRub ?? it.matchedExistingPriceRub,
						isApproved: true,
				  }
				: it,
		);
		onItemsChange(updated);
		setActiveLinkRowId(null);
	};

	// Format rubles with optional kopecks
	const formatPrice = (rub: number) => {
		return new Intl.NumberFormat('ru-RU', {
			style: 'currency',
			currency: 'RUB',
			maximumFractionDigits: rub % 1 !== 0 ? 2 : 0,
		}).format(rub);
	};

	// Confidence badge helper
	const renderConfidenceBadge = (confidence: number, kind: MappingConfidenceKind) => {
		const percent = Math.round(confidence * 100);
		if (kind === 'exact_code') {
			return (
				<span className="pricelist-diff-confidence-badge exact" title="Точный код классификатора Минздрава 804н">
					{percent}% Код 804н
				</span>
			);
		}
		if (confidence >= 0.85) {
			return (
				<span className="pricelist-diff-confidence-badge high" title="Высокая уверенность сопоставления по клиническим ключевым словам">
					{percent}% Высокая
				</span>
			);
		}
		if (confidence >= 0.75) {
			return (
				<span className="pricelist-diff-confidence-badge medium" title="Средняя уверенность">
					{percent}% Средняя
				</span>
			);
		}
		return (
			<span className="pricelist-diff-confidence-badge low" title="Требует ручной проверки соответствия стандарту 804н">
				{percent}% Проверить
			</span>
		);
	};

	// Suggested action badge helper
	const renderActionBadge = (action: MappingSuggestedAction) => {
		switch (action) {
			case 'create_new':
				return <span className="pricelist-diff-action-tag create">+ Новая</span>;
			case 'update_existing':
				return <span className="pricelist-diff-action-tag update">Обновить цену</span>;
			case 'link_existing':
				return <span className="pricelist-diff-action-tag link">Привязана</span>;
			case 'identical':
				return <span className="pricelist-diff-action-tag">Без изменений</span>;
			default:
				return null;
		}
	};

	return (
		<div className="pricelist-diff-container">
			{/* Top Bar: Stats, 1-Click Accept All & Filters */}
			<div className="pricelist-diff-toolbar">
				<div className="pricelist-diff-toolbar-left">
					<div className="pricelist-diff-stat-chip accent" title="Всего распознано строк">
						<Sparkles size={13} />
						<span>Всего: {stats.total}</span>
					</div>

					<div className="pricelist-diff-stat-chip success" title="Точные коды по Приказу Минздрава РФ № 804н">
						<ShieldCheck size={13} />
						<span>Коды 804н: {stats.exactCount}</span>
					</div>

					<div className="pricelist-diff-stat-chip" title="Средняя уверенность сопоставления">
						<span>Уверенность: {stats.avgConfidence}%</span>
					</div>

					{stats.attentionCount > 0 && (
						<div className="pricelist-diff-stat-chip warning" title="Позиции, требующие ручного подтверждения">
							<AlertTriangle size={13} />
							<span>Внимание: {stats.attentionCount}</span>
						</div>
					)}

					{/* Filter Segmented Control */}
					<div className="pricelist-diff-filters" role="tablist">
						<button
							type="button"
							className={`pricelist-diff-filter-btn ${filterTab === 'all' ? 'active' : ''}`}
							onClick={() => setFilterTab('all')}
						>
							Все ({stats.total})
						</button>
						<button
							type="button"
							className={`pricelist-diff-filter-btn ${filterTab === 'new' ? 'active' : ''}`}
							onClick={() => setFilterTab('new')}
						>
							Новые ({stats.newCount})
						</button>
						<button
							type="button"
							className={`pricelist-diff-filter-btn ${filterTab === 'update' ? 'active' : ''}`}
							onClick={() => setFilterTab('update')}
						>
							Обновление цен ({stats.updateCount})
						</button>
						{stats.attentionCount > 0 && (
							<button
								type="button"
								className={`pricelist-diff-filter-btn ${filterTab === 'attention' ? 'active' : ''}`}
								onClick={() => setFilterTab('attention')}
							>
								Проверить ({stats.attentionCount})
							</button>
						)}
					</div>
				</div>

				<div className="pricelist-diff-toolbar-right">
					{/* Search in diff */}
					<div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
						<Search size={13} style={{ position: 'absolute', left: '8px', color: 'var(--muted)', pointerEvents: 'none' }} />
						<input
							id={searchInputId}
							type="text"
							className="pricelist-search-input"
							style={{ height: '30px', padding: '0 1.75rem 0 1.75rem', width: '180px', fontSize: '0.75rem' }}
							placeholder="Поиск в результатах..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
						{searchTerm && (
							<button
								type="button"
								className="pricelist-search-clear"
								onClick={() => setSearchTerm('')}
								style={{ height: '30px' }}
							>
								<X size={11} />
							</button>
						)}
					</div>

					{/* 1-Click Accept All Button */}
					<button
						type="button"
						className="pricelist-diff-btn pricelist-diff-btn-success"
						onClick={handleAcceptAllClick}
						title="Принять все сопоставления в один клик"
					>
						<CheckCheck size={14} />
						<span>Принять всё ({stats.total})</span>
					</button>

					{stats.approvedCount > 0 && stats.approvedCount < stats.total && (
						<button
							type="button"
							className="pricelist-diff-btn"
							onClick={handleDeselectAll}
							title="Снять отметки выбора"
						>
							<span>Снять выбор</span>
						</button>
					)}
				</div>
			</div>

			{/* Dual-Pane View: Left = Raw Old Document, Right = 804n Mapping */}
			<div className="pricelist-diff-panes">
				{/* Left Pane: Original Unstructured Document */}
				<section className="pricelist-diff-pane left-pane" aria-label="Исходный документ">
					<header className="pricelist-diff-pane-header">
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
							<FileText size={14} />
							<span>1. Исходная строка старого документа</span>
						</div>
						<span style={{ fontSize: '0.6875rem' }}>{filteredItems.length} строк</span>
					</header>

					<div className="pricelist-diff-pane-body">
						{filteredItems.map((item) => (
							<div key={`raw-${item.id}`} className="pricelist-diff-raw-row">
								<span className="pricelist-diff-line-number">#{item.sourceLineNumber}</span>
								<div className="pricelist-diff-raw-text">
									{item.rawLine}
								</div>
							</div>
						))}

						{filteredItems.length === 0 && (
							<div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.8125rem' }}>
								Нет строк, соответствующих выбранному фильтру
							</div>
						)}
					</div>
				</section>

				{/* Right Pane: Statutory Nomenclature Mapping & Actions */}
				<section className="pricelist-diff-pane right-pane" aria-label="Сопоставление с номенклатурой 804н">
					<header className="pricelist-diff-pane-header">
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
							<ShieldCheck size={14} style={{ color: 'var(--ok-fg, #10b981)' }} />
							<span>2. Распознанное наименование, код 804н, цена и действие</span>
						</div>
						<span style={{ fontSize: '0.6875rem' }}>
							Выбрано к загрузке: {items.filter((i) => i.isApproved).length} из {items.length}
						</span>
					</header>

					<div className="pricelist-diff-pane-body">
						{filteredItems.map((item) => {
							const isLinkingThisRow = activeLinkRowId === item.id;

							return (
								<div
									key={`mapped-${item.id}`}
									className={`pricelist-diff-mapped-row ${item.isApproved ? '' : 'unapproved'}`}
								>
									{/* Main Item Metadata */}
									<div className="pricelist-diff-mapped-main">
										<div className="pricelist-diff-mapped-header">
											<span className="pricelist-diff-code-badge" title={item.statutoryTitle804n}>
												{item.code804n}
											</span>
											{renderConfidenceBadge(item.confidence, item.confidenceKind)}
											{renderActionBadge(item.suggestedAction)}
										</div>

										<div className="pricelist-diff-mapped-title" title={item.cleanedTitle}>
											{item.cleanedTitle}
										</div>

										<div className="pricelist-diff-statutory-title" title={`Минздрав 804н: ${item.statutoryTitle804n}`}>
											{item.statutoryTitle804n}
										</div>

										{/* Inline Service Linker Drawer (if active) */}
										{isLinkingThisRow && existingCatalog.length > 0 && (
											<div style={{ marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
												<select
													className="pricelist-search-input"
													style={{ height: '28px', fontSize: '0.75rem', padding: '0 0.5rem', width: 'auto', flex: 1 }}
													defaultValue={item.matchedExistingServiceId ?? ''}
													onChange={(e) => {
														if (e.target.value) {
															handleSetLinkExisting(item.id, e.target.value);
														}
													}}
												>
													<option value="">Выберите существующую услугу клиники...</option>
													{existingCatalog.map((catItem) => (
														<option key={catItem.id} value={catItem.id}>
															{catItem.code ? `[${catItem.code}] ` : ''}{catItem.title} ({formatPrice(catItem.basePriceRub ?? 0)})
														</option>
													))}
												</select>
												<button
													type="button"
													className="pricelist-diff-icon-btn"
													onClick={() => setActiveLinkRowId(null)}
													title="Отмена"
												>
													<X size={12} />
												</button>
											</div>
										)}
									</div>

									{/* Price in Rubles */}
									<div className="pricelist-diff-mapped-price">
										{formatPrice(item.priceRub)}
									</div>

									{/* 1-Click Row Actions */}
									<div className="pricelist-diff-row-actions">
										{/* 1-Click: Create New Service */}
										<button
											type="button"
											className={`pricelist-diff-action-btn ${item.suggestedAction === 'create_new' ? 'active' : ''}`}
											onClick={() => handleSetCreateNew(item.id)}
											title="Создать новую услугу в прейскуранте"
										>
											<Plus size={11} />
											<span>Новая</span>
										</button>

										{/* 1-Click: Link to Existing */}
										<button
											type="button"
											className={`pricelist-diff-action-btn ${item.suggestedAction === 'link_existing' ? 'active' : ''}`}
											onClick={() => setActiveLinkRowId(isLinkingThisRow ? null : item.id)}
											title="Привязать к существующей позиции каталога"
										>
											<Link2 size={11} />
											<span>Привязать</span>
										</button>

										{/* Toggle Approve / Exclude */}
										<button
											type="button"
											className={`pricelist-diff-icon-btn ${item.isApproved ? 'approved' : ''}`}
											onClick={() => handleToggleApproveRow(item.id)}
											title={item.isApproved ? 'Услуга будет загружена (нажмите, чтобы исключить)' : 'Исключено из загрузки (нажмите, чтобы включить)'}
											aria-label={item.isApproved ? 'Исключить услугу' : 'Включить услугу'}
										>
											<Check size={14} />
										</button>
									</div>
								</div>
							);
						})}

						{filteredItems.length === 0 && (
							<div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.8125rem' }}>
								Нет позиций для сопоставления
							</div>
						)}
					</div>
				</section>
			</div>

			{/* Footer: Apply or Cancel */}
			<footer
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '0.625rem 1rem',
					borderTop: '1px solid var(--line, #e2e8f0)',
					background: 'var(--paper-strong, #f8fafc)',
					gap: '0.75rem',
				}}
			>
				<div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)' }}>
					Будет добавлено / обновлено {items.filter((i) => i.isApproved).length} услуг по стандарту Минздрава России № 804н
				</div>

				<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
					{onCancel && (
						<button
							type="button"
							className="pricelist-diff-btn"
							onClick={onCancel}
						>
							Отмена
						</button>
					)}

					<button
						type="button"
						className="pricelist-diff-btn pricelist-diff-btn-primary"
						disabled={isLoading || items.filter((i) => i.isApproved).length === 0}
						onClick={() => {
							const approved = items.filter((i) => i.isApproved);
							if (onApply) onApply(approved);
						}}
					>
						<Check size={14} />
						<span>
							{isLoading ? 'Загрузка...' : `Загрузить в прейскурант (${items.filter((i) => i.isApproved).length})`}
						</span>
					</button>
				</div>
			</footer>
		</div>
	);
};
