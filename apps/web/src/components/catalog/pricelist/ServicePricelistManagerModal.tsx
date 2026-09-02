/**
 * DENTE Dental CRM — Statutory Minzdrav Order 804n Service Catalog & Pricelist Manager Modal
 *
 * Provides complete statutory Russian dental catalog management:
 * - Order 804n nomenclature tree with A16.07/B01.065/A06.07 codes.
 * - Price Tier Matrix (Standard, VIP, DMS, Promo).
 * - Inline price editing and 1-click batch markups (+5%, +10%, rounding).
 * - Unit margin & lab/material cost profitability indicators.
 * - RFC 4180 CSV Import/Export with UTF-8 BOM.
 * - 1-Click Official Printable A4 Clinic Pricelist (ст. 149 НК РФ, НДС 0%).
 */

import React, { useId, useMemo, useState } from 'react';
import {
	AlertCircle,
	ArrowUpDown,
	Check,
	CheckCircle2,
	Download,
	Edit3,
	FileSpreadsheet,
	Filter,
	Layers,
	Plus,
	Printer,
	RefreshCw,
	Search,
	ShieldCheck,
	Sparkles,
	Trash2,
	Upload,
	X,
} from 'lucide-react';
import './servicePricelist.css';
import {
	applyBatchPriceMarkup,
	calculateServiceProfitability,
	calculateTierPrice,
	detectCategoryFrom804nCode,
	exportPricelistToCsv,
	formatRubles,
	generatePrintablePricelistHtml,
	importPricelistFromCsv,
	isValidOrder804nCode,
	rublesToKopecks,
	searchPricelistItems,
	type PriceRoundingMode,
} from './servicePricelistEngine';
import {
	CATEGORY_LABELS,
	PRICE_TIER_LABELS,
	SPECIALTY_LABELS,
	STATUTORY_ORDER_804N_PRESETS,
	STATUTORY_VAT_EXEMPTION_NOTE,
	type DoctorSpecialty,
	type Order804nCategory,
	type PriceTierKind,
	type ServicePricelistItem,
} from './servicePricelistPresets';

export interface ServicePricelistManagerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialItems?: readonly ServicePricelistItem[];
	readonly onSaveCatalog?: (items: readonly ServicePricelistItem[]) => void;
	readonly clinicName?: string;
	readonly clinicAddress?: string;
	readonly clinicPhone?: string;
	readonly clinicLicense?: string;
	readonly chiefDoctorName?: string;
}

export const ServicePricelistManagerModal: React.FC<ServicePricelistManagerModalProps> = ({
	isOpen,
	onClose,
	initialItems = STATUTORY_ORDER_804N_PRESETS,
	onSaveCatalog,
	clinicName = 'Стоматологическая клиника «DENTE»',
	clinicAddress = 'г. Москва, ул. Медицинская, д. 12',
	clinicPhone = '+7 (495) 123-45-67',
	clinicLicense = 'ЛО-77-01-012345 от 12.04.2021',
	chiefDoctorName = 'Петров А. В.',
}) => {
	const [items, setItems] = useState<readonly ServicePricelistItem[]>(initialItems);
	const [selectedCategory, setSelectedCategory] = useState<Order804nCategory | 'all'>('all');
	const [selectedSpecialty, setSelectedSpecialty] = useState<DoctorSpecialty | 'all'>('all');
	const [searchTerm, setSearchTerm] = useState('');
	const [activeTier, setActiveTier] = useState<PriceTierKind>('standard');
	const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

	// Add/Edit Service Modal State
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<ServicePricelistItem | null>(null);

	// CSV Import Modal State
	const [isImportModalOpen, setIsImportModalOpen] = useState(false);
	const [csvInputText, setCsvInputText] = useState('');
	const [importErrors, setImportErrors] = useState<string[]>([]);
	const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

	// Batch Markup State
	const [batchPercent, setBatchPercent] = useState<number>(5);
	const [batchRounding, setBatchRounding] = useState<PriceRoundingMode>('round_100');

	// Notification Toast
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const searchInputId = useId();

	const showToast = (msg: string) => {
		setToastMessage(msg);
		setTimeout(() => setToastMessage(null), 3000);
	};

	// Filtered Catalog
	const filteredItems = useMemo(() => {
		return searchPricelistItems(items, {
			searchTerm,
			category: selectedCategory,
			specialty: selectedSpecialty,
			includeArchived: false,
		});
	}, [items, searchTerm, selectedCategory, selectedSpecialty]);

	// Category Item Counts
	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = { all: items.length };
		for (const item of items) {
			counts[item.category] = (counts[item.category] || 0) + 1;
		}
		return counts;
	}, [items]);

	if (!isOpen) return null;

	// Inline Price Change Handler
	const handleInlinePriceChange = (itemId: string, newPriceRub: number) => {
		if (Number.isNaN(newPriceRub) || newPriceRub < 0) return;
		setItems((prev) =>
			prev.map((item) => {
				if (item.id !== itemId) return item;
				if (activeTier === 'standard') {
					return {
						...item,
						basePriceRub: newPriceRub,
						basePriceKopecks: rublesToKopecks(newPriceRub),
					};
				}
				return {
					...item,
					tierPrices: {
						...(item.tierPrices || {}),
						[activeTier]: newPriceRub,
					},
				};
			}),
		);
	};

	// 1-Click Batch Markup
	const handleApplyBatchMarkup = (percent: number, rounding: PriceRoundingMode) => {
		const targetIds = selectedItemIds.size > 0 ? Array.from(selectedItemIds) : undefined;
		const updated = applyBatchPriceMarkup(items, {
			percentChange: percent,
			roundMode: rounding,
			categoryFilter: selectedCategory === 'all' ? undefined : selectedCategory,
			specialtyFilter: selectedSpecialty === 'all' ? undefined : selectedSpecialty,
			targetItemIds: targetIds,
			applyToTiers: [activeTier],
		});
		setItems(updated);
		showToast(`Успешно применена наценка ${percent > 0 ? `+${percent}%` : `${percent}%`} (${PRICE_TIER_LABELS[activeTier]})`);
	};

	// 1-Click Batch Rounding
	const handleApplyBatchRounding = (rounding: PriceRoundingMode) => {
		const targetIds = selectedItemIds.size > 0 ? Array.from(selectedItemIds) : undefined;
		const updated = applyBatchPriceMarkup(items, {
			percentChange: 0,
			roundMode: rounding,
			categoryFilter: selectedCategory === 'all' ? undefined : selectedCategory,
			targetItemIds: targetIds,
			applyToTiers: [activeTier],
		});
		setItems(updated);
		showToast(`Цены успешно округлены (${rounding})`);
	};

	// Export to CSV Download
	const handleExportCsv = () => {
		const csvContent = exportPricelistToCsv(items, { delimiter: ';' });
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', `DENTE_Pricelist_804n_${new Date().toISOString().slice(0, 10)}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		showToast('Прейскурант успешно экспортирован в CSV (Excel UTF-8 BOM)');
	};

	// Import from CSV
	const handleImportCsv = () => {
		setImportErrors([]);
		setImportSuccessCount(null);
		if (!csvInputText.trim()) {
			setImportErrors(['Вставьте текст CSV или выберите файл']);
			return;
		}

		const result = importPricelistFromCsv(csvInputText);
		if (result.invalidRows.length > 0 && result.validItems.length === 0) {
			setImportErrors(result.invalidRows.map((e) => `Строка ${e.rowIndex}: ${e.error}`));
			return;
		}

		if (result.validItems.length > 0) {
			// Merge with existing items (by 804n code or append)
			const existingMap = new Map(items.map((i) => [i.code804n, i]));
			for (const imported of result.validItems) {
				existingMap.set(imported.code804n, imported);
			}
			const merged = Array.from(existingMap.values());
			setItems(merged);
			setImportSuccessCount(result.validItems.length);
			showToast(`Импортировано ${result.validItems.length} позиций прейскуранта`);
			setTimeout(() => {
				setIsImportModalOpen(false);
				setCsvInputText('');
			}, 1200);
		}
	};

	// CSV File Drop/Select
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (evt) => {
			const text = evt.target?.result as string;
			if (text) {
				setCsvInputText(text);
			}
		};
		reader.readAsText(file, 'utf-8');
	};

	// 1-Click Print A4 Pricelist
	const handlePrintPricelist = () => {
		const printHtml = generatePrintablePricelistHtml(
			{
				clinicName,
				clinicAddress,
				clinicPhone,
				clinicLicense,
				chiefDoctorName,
				effectiveDateRu: new Date().toLocaleDateString('ru-RU'),
			},
			items,
			activeTier,
		);

		const printWindow = window.open('', '_blank', 'width=900,height=1000');
		if (printWindow) {
			printWindow.document.open();
			printWindow.document.write(printHtml);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 300);
		}
	};

	// Save & Apply
	const handleSaveAndClose = () => {
		if (onSaveCatalog) {
			onSaveCatalog(items);
		}
		showToast('Каталог услуг и прейскурант успешно сохранены');
		onClose();
	};

	return (
		<div className="pricelist-modal-overlay" role="dialog" aria-modal="true">
			<div className="pricelist-modal-container">
				{/* Header */}
				<header className="pricelist-modal-header">
					<div className="pricelist-header-left">
						<div className="pricelist-header-icon">
							<Layers size={24} />
						</div>
						<div>
							<div className="pricelist-header-title" title="Прейскурант и Номенклатура медицинских услуг по Приказу Минздрава России № 804н">
								Прейскурант услуг
							</div>
							<div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
								{items.length} позиций · Классификатор Минздрава РФ · НДС 0%
							</div>
						</div>
						<div className="pricelist-statutory-badge" title="Соответствует Приказу Минздрава России № 804н">
							<ShieldCheck size={14} />
							<span>Номенклатура</span>
						</div>
					</div>

					<div className="pricelist-header-actions">
						<button
							type="button"
							className="pricelist-btn"
							onClick={handlePrintPricelist}
							title="Печать официального прейскуранта клиники (A4)"
						>
							<Printer size={16} />
							<span>Печать A4</span>
						</button>

						<button
							type="button"
							className="pricelist-btn"
							onClick={handleExportCsv}
							title="Экспорт в CSV (Excel UTF-8 BOM)"
						>
							<Download size={16} />
							<span>Экспорт CSV</span>
						</button>

						<button
							type="button"
							className="pricelist-btn"
							onClick={() => setIsImportModalOpen(true)}
							title="Импорт прейскуранта из CSV / Excel"
						>
							<Upload size={16} />
							<span>Импорт</span>
						</button>

						<button
							type="button"
							className="pricelist-btn pricelist-btn-ok"
							onClick={handleSaveAndClose}
						>
							<Check size={16} />
							<span>Сохранить</span>
						</button>

						<button
							type="button"
							className="pricelist-btn pricelist-btn-icon"
							onClick={onClose}
							aria-label="Закрыть"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* Toolbar */}
				<div className="pricelist-toolbar">
					{/* Search */}
					<div className="pricelist-search-box">
						<Search size={16} className="pricelist-search-icon" />
						<input
							id={searchInputId}
							type="text"
							className="pricelist-search-input"
							placeholder="Поиск по коду 804н, наименованию, МКБ-10..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
						{searchTerm && (
							<button
								type="button"
								className="pricelist-search-clear"
								onClick={() => setSearchTerm('')}
							>
								<X size={14} />
							</button>
						)}
					</div>

					{/* Price Tier Segmented Control */}
					<div className="pricelist-tier-segmented">
						<button
							type="button"
							className={`tier-segment-btn ${activeTier === 'standard' ? 'active' : ''}`}
							onClick={() => setActiveTier('standard')}
						>
							Основной (100%)
						</button>
						<button
							type="button"
							className={`tier-segment-btn ${activeTier === 'vip' ? 'active' : ''}`}
							onClick={() => setActiveTier('vip')}
						>
							VIP (+20%)
						</button>
						<button
							type="button"
							className={`tier-segment-btn ${activeTier === 'dms' ? 'active' : ''}`}
							onClick={() => setActiveTier('dms')}
						>
							ДМС (Страховой)
						</button>
						<button
							type="button"
							className={`tier-segment-btn ${activeTier === 'promo' ? 'active' : ''}`}
							onClick={() => setActiveTier('promo')}
						>
							Промо / Акция
						</button>
					</div>

					{/* Specialty Filter */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						<Filter size={14} style={{ color: 'var(--muted)' }} />
						<select
							className="pricelist-search-input"
							style={{ height: '36px', padding: '0 0.5rem', width: 'auto' }}
							value={selectedSpecialty}
							onChange={(e) => setSelectedSpecialty(e.target.value as DoctorSpecialty | 'all')}
						>
							<option value="all">Все специальности</option>
							{Object.entries(SPECIALTY_LABELS).map(([specKey, specLabel]) => (
								<option key={specKey} value={specKey}>
									{specLabel}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Batch Markup Bar */}
				<div className="pricelist-batch-bar">
					<div className="batch-bar-left">
						<Sparkles size={16} style={{ color: 'var(--brand-500)' }} />
						<span>Пакетная индексация цен ({PRICE_TIER_LABELS[activeTier]}):</span>
					</div>

					<div className="batch-bar-actions">
						<button
							type="button"
							className="batch-quick-btn"
							onClick={() => handleApplyBatchMarkup(5, batchRounding)}
						>
							+5%
						</button>
						<button
							type="button"
							className="batch-quick-btn"
							onClick={() => handleApplyBatchMarkup(10, batchRounding)}
						>
							+10%
						</button>
						<button
							type="button"
							className="batch-quick-btn"
							onClick={() => handleApplyBatchMarkup(15, batchRounding)}
						>
							+15%
						</button>
						<button
							type="button"
							className="batch-quick-btn"
							onClick={() => handleApplyBatchMarkup(-10, batchRounding)}
						>
							-10% (Скидка)
						</button>

						<span style={{ color: 'var(--line)', margin: '0 0.25rem' }}>|</span>

						<button
							type="button"
							className="batch-quick-btn"
							onClick={() => handleApplyBatchRounding('round_100')}
						>
							До 100 ₽
						</button>
						<button
							type="button"
							className="batch-quick-btn"
							onClick={() => handleApplyBatchRounding('round_500')}
						>
							До 500 ₽
						</button>
					</div>
				</div>

				{/* Toast Message */}
				{toastMessage && (
					<div
						style={{
							position: 'absolute',
							top: '5rem',
							right: '2rem',
							zIndex: 10001,
							background: 'var(--ink, #0f172a)',
							color: 'var(--paper, #ffffff)',
							padding: '0.625rem 1.25rem',
							borderRadius: '8px',
							boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
							display: 'flex',
							alignItems: 'center',
							gap: '0.5rem',
							fontSize: '0.875rem',
						}}
					>
						<CheckCircle2 size={16} style={{ color: 'var(--ok-fg, #10b981)' }} />
						<span>{toastMessage}</span>
					</div>
				)}

				{/* Main Split Layout */}
				<div className="pricelist-main-layout">
					{/* Category Sidebar */}
					<nav className="pricelist-category-sidebar">
						<button
							type="button"
							className={`category-nav-btn ${selectedCategory === 'all' ? 'active' : ''}`}
							onClick={() => setSelectedCategory('all')}
						>
							<span>Все разделы</span>
							<span className="category-nav-count">{categoryCounts.all || 0}</span>
						</button>

						{(Object.keys(CATEGORY_LABELS) as Order804nCategory[]).map((catKey) => {
							const count = categoryCounts[catKey] || 0;
							if (count === 0 && selectedCategory !== catKey) return null;
							return (
								<button
									key={catKey}
									type="button"
									className={`category-nav-btn ${selectedCategory === catKey ? 'active' : ''}`}
									onClick={() => setSelectedCategory(catKey)}
								>
									<span>{CATEGORY_LABELS[catKey]}</span>
									<span className="category-nav-count">{count}</span>
								</button>
							);
						})}
					</nav>

					{/* Data Table */}
					<div className="pricelist-table-container">
						<table className="pricelist-data-table">
							<thead>
								<tr>
									<th style={{ width: '40px' }}>
										<input
											type="checkbox"
											checked={
												filteredItems.length > 0 &&
												filteredItems.every((i) => selectedItemIds.has(i.id))
											}
											onChange={(e) => {
												if (e.target.checked) {
													setSelectedItemIds(new Set(filteredItems.map((i) => i.id)));
												} else {
													setSelectedItemIds(new Set());
												}
											}}
										/>
									</th>
									<th style={{ width: '120px' }}>Код 804н</th>
									<th>Наименование медицинской услуги</th>
									<th style={{ width: '140px' }}>Специальность</th>
									<th style={{ width: '140px', textAlign: 'right' }}>
										Цена ({activeTier === 'standard' ? 'Руб.' : activeTier.toUpperCase()})
									</th>
									<th style={{ width: '110px', textAlign: 'center' }}>Маржа %</th>
									<th style={{ width: '100px', textAlign: 'center' }}>Длительность</th>
								</tr>
							</thead>
							<tbody>
								{filteredItems.map((item) => {
									const prof = calculateServiceProfitability(item, activeTier);
									const currentPrice = calculateTierPrice(
										item.basePriceRub,
										activeTier,
										item.tierPrices?.[activeTier],
									);
									const isSelected = selectedItemIds.has(item.id);

									return (
										<tr
											key={item.id}
											style={{
												background: isSelected ? 'rgba(59, 130, 246, 0.05)' : undefined,
											}}
										>
											<td>
												<input
													type="checkbox"
													checked={isSelected}
													onChange={(e) => {
														const next = new Set(selectedItemIds);
														if (e.target.checked) next.add(item.id);
														else next.delete(item.id);
														setSelectedItemIds(next);
													}}
												/>
											</td>
											<td>
												<span className="pricelist-code-pill">{item.code804n}</span>
											</td>
											<td>
												<div className="service-title-cell">
													<div className="service-commercial-name">{item.commercialTitle}</div>
													<div className="service-statutory-name">{item.statutoryTitle804n}</div>
													{item.icd10Indications.length > 0 && (
														<div className="service-meta-tags">
															{item.icd10Indications.map((icd) => (
																<span key={icd} className="service-icd-pill">
																	{icd}
																</span>
															))}
														</div>
													)}
												</div>
											</td>
											<td>
												<span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
													{SPECIALTY_LABELS[item.specialty] ?? item.specialty}
												</span>
											</td>
											<td style={{ textAlign: 'right' }}>
												<div className="price-edit-container" style={{ justifyContent: 'flex-end' }}>
													<input
														type="number"
														className="price-input-quick"
														value={currentPrice}
														onChange={(e) =>
															handleInlinePriceChange(item.id, parseFloat(e.target.value))
														}
														step={100}
														min={0}
													/>
													<span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>₽</span>
												</div>
											</td>
											<td style={{ textAlign: 'center' }}>
												<span className={`margin-badge ${prof.level}`}>
													{prof.marginPercent}%
												</span>
											</td>
											<td style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)' }}>
												{item.estimatedDurationMin} мин
											</td>
										</tr>
									);
								})}

								{filteredItems.length === 0 && (
									<tr>
										<td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
											<AlertCircle size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
											<div>Позиции по запросу не найдены</div>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>

				{/* Footer Bar */}
				<footer className="pricelist-footer-bar">
					<div className="pricelist-footer-legal">
						<ShieldCheck size={16} className="pricelist-legal-icon" />
						<span>{STATUTORY_VAT_EXEMPTION_NOTE} · Соответствует стандарту Минздрава России № 804н</span>
					</div>

					<div>
						Отображено {filteredItems.length} из {items.length} позиций
						{selectedItemIds.size > 0 && ` · Выбрано ${selectedItemIds.size}`}
					</div>
				</footer>
			</div>

			{/* CSV Import Modal */}
			{isImportModalOpen && (
				<div className="csv-import-modal" role="dialog" aria-modal="true">
					<div className="csv-import-container">
						<header className="pricelist-modal-header">
							<div className="pricelist-header-title">Импорт прейскуранта из CSV / Excel</div>
							<button
								type="button"
								className="pricelist-btn pricelist-btn-icon"
								onClick={() => setIsImportModalOpen(false)}
							>
								<X size={18} />
							</button>
						</header>

						<div className="csv-import-body">
							<label className="csv-dropzone">
								<FileSpreadsheet size={36} style={{ color: 'var(--brand-500)' }} />
								<div style={{ fontWeight: 600 }}>Выберите или перетащите CSV-файл прейскуранта</div>
								<div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
									Поддерживается разделитель точка с запятой (;) или запятая (,), кодировка UTF-8
								</div>
								<input
									type="file"
									accept=".csv,.txt"
									style={{ display: 'none' }}
									onChange={handleFileUpload}
								/>
							</label>

							<div>
								<div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
									Или вставьте текст таблицы CSV:
								</div>
								<textarea
									className="pricelist-search-input"
									style={{ height: '140px', fontFamily: 'monospace', fontSize: '0.75rem', padding: '0.5rem' }}
									placeholder="Код 804н;Коммерческое наименование;Категория;Цена standard..."
									value={csvInputText}
									onChange={(e) => setCsvInputText(e.target.value)}
								/>
							</div>

							{importErrors.length > 0 && (
								<div
									style={{
										padding: '0.75rem',
										borderRadius: '6px',
										background: 'rgba(239, 68, 68, 0.1)',
										color: 'var(--bad)',
										fontSize: '0.75rem',
									}}
								>
									<div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Ошибки при разборе CSV:</div>
									{importErrors.slice(0, 5).map((err, idx) => (
										<div key={idx}>• {err}</div>
									))}
								</div>
							)}

							{importSuccessCount !== null && (
								<div
									style={{
										padding: '0.75rem',
										borderRadius: '6px',
										background: 'rgba(16, 185, 129, 0.1)',
										color: 'var(--ok-fg)',
										fontSize: '0.8125rem',
										fontWeight: 600,
									}}
								>
									✓ Успешно распознано {importSuccessCount} услуг
								</div>
							)}
						</div>

						<footer
							style={{
								padding: '0.75rem 1.25rem',
								borderTop: '1px solid var(--line)',
								display: 'flex',
								justifyContent: 'flex-end',
								gap: '0.5rem',
							}}
						>
							<button
								type="button"
								className="pricelist-btn"
								onClick={() => setIsImportModalOpen(false)}
							>
								Отмена
							</button>
							<button
								type="button"
								className="pricelist-btn pricelist-btn-primary"
								onClick={handleImportCsv}
							>
								Загрузить в прейскурант
							</button>
						</footer>
					</div>
				</div>
			)}
		</div>
	);
};
