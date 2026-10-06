import React from 'react';
import {
	AlertCircle,
	ArrowUpDown,
	Copy,
	Edit3,
	Trash2,
} from 'lucide-react';
import {
	calculateServiceProfitability,
	calculateTierPrice,
	formatRubles,
	type PricelistSortDirection,
	type PricelistSortField,
} from './servicePricelistEngine';
import {
	SPECIALTY_LABELS,
	type PriceTierKind,
	type ServicePricelistItem,
} from './servicePricelistPresets';

export interface PricelistDataTableProps {
	readonly filteredCount: number;
	readonly visibleItems: readonly ServicePricelistItem[];
	readonly hasMore: boolean;
	readonly remainingCount: number;
	readonly onShowMore: () => void;
	readonly selectedItemIds: Set<string>;
	readonly onToggleSelectAll: (checked: boolean) => void;
	readonly onToggleSelectItem: (id: string, checked: boolean) => void;
	readonly sortField: PricelistSortField;
	readonly onToggleSort: (field: PricelistSortField) => void;
	readonly activeTier: PriceTierKind;
	readonly editingPriceCellId: string | null;
	readonly editingPriceBuffer: string;
	readonly onStartEditPrice: (id: string, currentPrice: number) => void;
	readonly onPriceBufferChange: (val: string) => void;
	readonly onCommitPrice: (id: string, rawInput: string) => void;
	readonly onCancelEditPrice: () => void;
	readonly onSetZeroWarrantyPrice: (id: string) => void;
	readonly onEditItem: (item: ServicePricelistItem) => void;
	readonly onDuplicateItem: (item: ServicePricelistItem) => void;
	readonly onDeleteItem: (id: string) => void;
}

export const PricelistDataTable: React.FC<PricelistDataTableProps> = ({
	filteredCount,
	visibleItems,
	hasMore,
	remainingCount,
	onShowMore,
	selectedItemIds,
	onToggleSelectAll,
	onToggleSelectItem,
	sortField,
	onToggleSort,
	activeTier,
	editingPriceCellId,
	editingPriceBuffer,
	onStartEditPrice,
	onPriceBufferChange,
	onCommitPrice,
	onCancelEditPrice,
	onSetZeroWarrantyPrice,
	onEditItem,
	onDuplicateItem,
	onDeleteItem,
}) => {
	const allSelected = visibleItems.length > 0 && visibleItems.every((i) => selectedItemIds.has(i.id));

	return (
		<div className="pricelist-table-container">
			<table className="pricelist-data-table">
				<thead>
					<tr>
						<th style={{ width: '40px' }}>
							<input
								type="checkbox"
								checked={allSelected}
								onChange={(e) => onToggleSelectAll(e.target.checked)}
							/>
						</th>
						<th style={{ width: '120px', cursor: 'pointer' }} onClick={() => onToggleSort('code')}>
							<div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
								<span>Код услуги</span>
								<ArrowUpDown size={12} style={{ opacity: sortField === 'code' ? 1 : 0.35 }} />
							</div>
						</th>
						<th style={{ cursor: 'pointer' }} onClick={() => onToggleSort('title')}>
							<div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
								<span>Наименование медицинской услуги</span>
								<ArrowUpDown size={12} style={{ opacity: sortField === 'title' ? 1 : 0.35 }} />
							</div>
						</th>
						<th style={{ width: '130px' }}>Специальность</th>
						<th style={{ width: '130px', textAlign: 'right', cursor: 'pointer' }} onClick={() => onToggleSort('price')}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
								<span>Цена ({activeTier === 'standard' ? 'Руб.' : activeTier.toUpperCase()})</span>
								<ArrowUpDown size={12} style={{ opacity: sortField === 'price' ? 1 : 0.35 }} />
							</div>
						</th>
						<th style={{ width: '90px', textAlign: 'center', cursor: 'pointer' }} onClick={() => onToggleSort('margin')}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
								<span>Маржа %</span>
								<ArrowUpDown size={12} style={{ opacity: sortField === 'margin' ? 1 : 0.35 }} />
							</div>
						</th>
						<th style={{ width: '90px', textAlign: 'center', cursor: 'pointer' }} onClick={() => onToggleSort('duration')}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
								<span>Время</span>
								<ArrowUpDown size={12} style={{ opacity: sortField === 'duration' ? 1 : 0.35 }} />
							</div>
						</th>
						<th style={{ width: '90px', textAlign: 'center' }}>Действия</th>
					</tr>
				</thead>
				<tbody>
					{visibleItems.map((item) => {
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
									contain: 'content',
									contentVisibility: 'auto',
									containIntrinsicSize: '1px 64px',
								}}
							>
								<td>
									<input
										type="checkbox"
										checked={isSelected}
										onChange={(e) => onToggleSelectItem(item.id, e.target.checked)}
									/>
								</td>
								<td>
									<span className="pricelist-code-pill">{item.code804n}</span>
								</td>
								<td>
									<div className="service-title-cell">
										<div
											className="service-commercial-name"
											style={{ cursor: 'pointer' }}
											onClick={() => onEditItem(item)}
											title="Кликните для редактирования карточки услуги"
										>
											{item.commercialTitle}
										</div>
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
								<td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
									<div className="price-edit-container" style={{ justifyContent: 'flex-end', gap: '3px' }}>
										{editingPriceCellId === item.id ? (
											<div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
												<input
													type="text"
													inputMode="numeric"
													className="price-input-quick"
													style={{ width: '85px', fontWeight: 600, textAlign: 'right', height: '28px', padding: '0 4px' }}
													autoFocus
													value={editingPriceBuffer}
													onChange={(e) => onPriceBufferChange(e.target.value.replace(/[^\d]/g, ''))}
													onKeyDown={(e) => {
														if (e.key === 'Enter') {
															onCommitPrice(item.id, editingPriceBuffer);
														} else if (e.key === 'Escape') {
															onCancelEditPrice();
														}
													}}
													onBlur={() => onCommitPrice(item.id, editingPriceBuffer)}
												/>
												<span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>₽</span>
											</div>
										) : (
											<button
												type="button"
												onClick={() => onStartEditPrice(item.id, currentPrice)}
												title="Кликните для ввода цены с клавиатуры"
												style={{
													background: 'transparent',
													border: '1px solid transparent',
													borderRadius: '4px',
													padding: '2px 4px',
													cursor: 'pointer',
													fontWeight: 600,
													fontSize: '0.8125rem',
													color: 'var(--ink)',
													display: 'inline-flex',
													alignItems: 'center',
													gap: '3px',
												}}
											>
												<span>{formatRubles(currentPrice)}</span>
												<Edit3 size={11} style={{ opacity: 0.4 }} />
											</button>
										)}

										<button
											type="button"
											className={`batch-quick-btn ${currentPrice === 0 ? 'active' : ''}`}
											style={{
												padding: '0 5px',
												fontSize: '0.6875rem',
												height: '22px',
												minWidth: '28px',
												color: currentPrice === 0 ? 'var(--ok-fg, #10b981)' : undefined,
												borderColor: currentPrice === 0 ? 'rgba(16, 185, 129, 0.4)' : undefined,
												background: currentPrice === 0 ? 'rgba(16, 185, 129, 0.12)' : undefined,
											}}
											onClick={() => onSetZeroWarrantyPrice(item.id)}
											title="Установить 0 ₽ (Гарантийная переделка / бесплатная услуга)"
										>
											0 ₽
										</button>
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
								<td style={{ textAlign: 'center', width: '90px', whiteSpace: 'nowrap' }}>
									<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
										<button
											type="button"
											className="pricelist-btn pricelist-btn-icon"
											style={{ width: '26px', height: '26px', padding: 0 }}
											onClick={() => onEditItem(item)}
											title="Редактировать карточку услуги"
										>
											<Edit3 size={13} />
										</button>
										<button
											type="button"
											className="pricelist-btn pricelist-btn-icon"
											style={{ width: '26px', height: '26px', padding: 0 }}
											onClick={() => onDuplicateItem(item)}
											title="Создать копию услуги"
										>
											<Copy size={13} />
										</button>
										<button
											type="button"
											className="pricelist-btn pricelist-btn-icon"
											style={{ width: '26px', height: '26px', padding: 0, color: 'var(--alert-fg, #ef4444)' }}
											onClick={() => onDeleteItem(item.id)}
											title="Удалить услугу"
										>
											<Trash2 size={13} />
										</button>
									</div>
								</td>
							</tr>
						);
					})}

					{hasMore && (
						<tr>
							<td colSpan={8} style={{ textAlign: 'center', padding: '0.75rem' }}>
								<button
									type="button"
									className="pricelist-btn btn-pricelist-show-more"
									onClick={onShowMore}
									style={{ margin: '0 auto', fontSize: '0.8125rem', height: '32px' }}
									title="Подгрузить следующие позиции прейскуранта"
								>
									<span>Показать ещё 40 услуг (осталось {remainingCount})</span>
								</button>
							</td>
						</tr>
					)}

					{filteredCount === 0 && (
						<tr>
							<td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
								<AlertCircle size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
								<div>Позиции по запросу не найдены</div>
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
};
