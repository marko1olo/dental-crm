import React, { useId } from 'react';
import {
	Filter,
	Search,
	Sparkles,
	X,
} from 'lucide-react';
import {
	PRICE_TIER_LABELS,
	SPECIALTY_LABELS,
	type DoctorSpecialty,
	type Order804nCategory,
	type PriceTierKind,
} from './servicePricelistPresets';
import type { PriceRoundingMode } from './servicePricelistEngine';

export interface PricelistFiltersAndBatchBarProps {
	readonly searchTerm: string;
	readonly onSearchChange: (value: string) => void;
	readonly selectedCategory: Order804nCategory | 'all';
	readonly onCategoryChange: (category: Order804nCategory | 'all') => void;
	readonly selectedSpecialty: DoctorSpecialty | 'all';
	readonly onSpecialtyChange: (specialty: DoctorSpecialty | 'all') => void;
	readonly activeTier: PriceTierKind;
	readonly onTierChange: (tier: PriceTierKind) => void;
	readonly isBatchBarOpen: boolean;
	readonly onToggleBatchBar: () => void;
	readonly batchRounding: PriceRoundingMode;
	readonly onApplyBatchMarkup: (percent: number, rounding: PriceRoundingMode) => void;
	readonly onApplyBatchRounding: (rounding: PriceRoundingMode) => void;
}

export const PricelistFiltersAndBatchBar: React.FC<PricelistFiltersAndBatchBarProps> = ({
	searchTerm,
	onSearchChange,
	onCategoryChange,
	selectedSpecialty,
	onSpecialtyChange,
	activeTier,
	onTierChange,
	isBatchBarOpen,
	onToggleBatchBar,
	batchRounding,
	onApplyBatchMarkup,
	onApplyBatchRounding,
}) => {
	const searchInputId = useId();

	return (
		<>
			{/* 1-Row Professional Clinical Toolbar (32-36px height) — Mandates 8d & 8p */}
			<div
				className="pricelist-toolbar"
				style={{
					padding: '0.25rem 1rem',
					gap: '0.5rem',
					display: 'flex',
					alignItems: 'center',
					minHeight: '36px',
					height: '36px',
					flexWrap: 'nowrap',
					overflowX: 'auto',
				}}
			>
				{/* Search — Canonical Dente Search Wrap */}
				<div className="dente-search-wrap pricelist-search-box" style={{ maxWidth: '320px', minWidth: '220px' }}>
					<Search size={14} className="dente-search-icon pricelist-search-icon" />
					<input
						id={searchInputId}
						type="text"
						className="dente-search-input pricelist-search-input"
						placeholder="Поиск по коду услуги, названию..."
						value={searchTerm}
						onChange={(e) => onSearchChange(e.target.value)}
					/>
					{searchTerm && (
						<button
							type="button"
							className="dente-search-clear pricelist-search-clear"
							onClick={() => onSearchChange('')}
							aria-label="Очистить поиск"
						>
							<X size={13} />
						</button>
					)}
				</div>

				{/* Fast Service Selector Dropdown */}
				<select
					className="pricelist-search-input"
					style={{ height: '34px', padding: '0 0.5rem', width: 'auto', fontSize: '0.8125rem' }}
					value={searchTerm}
					onChange={(e) => {
						onSearchChange(e.target.value);
						onCategoryChange('all');
					}}
					title="Мгновенный выбор популярной услуги"
				>
					<option value="">Быстрый выбор услуги...</option>
					<option value="A16.07.002">A16.07.002 Кариес</option>
					<option value="A16.07.008">A16.07.008 Пульпит</option>
					<option value="A11.07.012">A11.07.012 Анестезия</option>
					<option value="A06.07.003">A06.07.003 Снимок</option>
					<option value="A16.07.054">A16.07.054 Имплантация</option>
					<option value="A16.07.004">A16.07.004 Коронка</option>
					<option value="A16.07.001">A16.07.001 Удаление</option>
					<option value="A16.07.051">A16.07.051 Гигиена</option>
				</select>

				{/* Price Tier Segmented Control */}
				<div className="pricelist-tier-segmented" style={{ padding: '2px' }}>
					<button
						type="button"
						style={{ minHeight: '30px', padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
						className={`tier-segment-btn ${activeTier === 'standard' ? 'active' : ''}`}
						onClick={() => onTierChange('standard')}
					>
						Основной
					</button>
					<button
						type="button"
						style={{ minHeight: '30px', padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
						className={`tier-segment-btn ${activeTier === 'vip' ? 'active' : ''}`}
						onClick={() => onTierChange('vip')}
					>
						VIP (+20%)
					</button>
					<button
						type="button"
						style={{ minHeight: '30px', padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
						className={`tier-segment-btn ${activeTier === 'dms' ? 'active' : ''}`}
						onClick={() => onTierChange('dms')}
					>
						ДМС
					</button>
					<button
						type="button"
						style={{ minHeight: '30px', padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
						className={`tier-segment-btn ${activeTier === 'promo' ? 'active' : ''}`}
						onClick={() => onTierChange('promo')}
					>
						Промо
					</button>
					<button
						type="button"
						style={{ minHeight: '30px', padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
						className={`tier-segment-btn ${activeTier === 'night_weekend' ? 'active' : ''}`}
						onClick={() => onTierChange('night_weekend')}
						title="Тариф в ночные часы и праздничные/выходные дни (+30%)"
					>
						Ночной (+30%)
					</button>
				</div>

				{/* Specialty Filter */}
				<div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
					<Filter size={14} style={{ color: 'var(--muted)' }} />
					<select
						className="pricelist-search-input"
						style={{ height: '34px', padding: '0 0.5rem', width: 'auto', fontSize: '0.8125rem' }}
						value={selectedSpecialty}
						onChange={(e) => onSpecialtyChange(e.target.value as DoctorSpecialty | 'all')}
					>
						<option value="all">Все специальности</option>
						{Object.entries(SPECIALTY_LABELS).map(([specKey, specLabel]) => (
							<option key={specKey} value={specKey}>
								{specLabel}
							</option>
						))}
					</select>
				</div>

				{/* Batch Markup Toggle button */}
				<button
					type="button"
					className={`pricelist-btn ${isBatchBarOpen ? 'pricelist-btn-primary' : ''}`}
					style={{ minHeight: '34px', height: '34px', padding: '0 0.625rem', fontSize: '0.75rem', gap: '0.375rem', marginLeft: 'auto' }}
					onClick={onToggleBatchBar}
					title="Пакетная индексация цен (+5%, +10%, гарантия, округление)"
				>
					<Sparkles size={14} />
					<span>Индексация</span>
				</button>
			</div>

			{/* Collapsible Batch Markup Strip (Only when toggled) */}
			{isBatchBarOpen && (
				<div className="pricelist-batch-bar" style={{ padding: '0.375rem 1.25rem' }}>
					<div className="batch-bar-left">
						<Sparkles size={14} style={{ color: 'var(--brand-500)' }} />
						<span style={{ fontSize: '0.75rem' }}>Пакетная индексация ({PRICE_TIER_LABELS[activeTier]}):</span>
					</div>

					<div className="batch-bar-actions">
						<button type="button" className="batch-quick-btn" onClick={() => onApplyBatchMarkup(5, batchRounding)}>+5%</button>
						<button type="button" className="batch-quick-btn" onClick={() => onApplyBatchMarkup(10, batchRounding)}>+10%</button>
						<button type="button" className="batch-quick-btn" onClick={() => onApplyBatchMarkup(15, batchRounding)}>+15%</button>
						<button type="button" className="batch-quick-btn" onClick={() => onApplyBatchMarkup(-10, batchRounding)}>-10% (Скидка)</button>
						<button type="button" className="batch-quick-btn" onClick={() => onApplyBatchMarkup(-50, batchRounding)} title="Скидка 50%">-50%</button>
						<button type="button" className="batch-quick-btn" onClick={() => onApplyBatchMarkup(-100, batchRounding)} title="100% скидка на гарантийные переделки">-100% (Гарантия)</button>
						<span style={{ color: 'var(--line)', margin: '0 0.25rem' }}>|</span>
						<button type="button" className="batch-quick-btn" onClick={() => onApplyBatchRounding('round_100')}>До 100 ₽</button>
						<button type="button" className="batch-quick-btn" onClick={() => onApplyBatchRounding('round_500')}>До 500 ₽</button>
					</div>
				</div>
			)}
		</>
	);
};
