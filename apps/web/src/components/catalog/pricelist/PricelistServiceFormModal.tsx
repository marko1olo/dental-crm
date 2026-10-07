import React, { useEffect, useState } from 'react';
import { HelpCircle, Sparkles, X } from 'lucide-react';
import {
	calculateTierPrice,
	detectCategoryFrom804nCode,
	rublesToKopecks,
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

export interface PricelistServiceFormModalProps {
	readonly isOpen: boolean;
	readonly editingItem: ServicePricelistItem | null;
	readonly onClose: () => void;
	readonly onSave: (item: ServicePricelistItem) => void;
}

export const PricelistServiceFormModal: React.FC<PricelistServiceFormModalProps> = ({
	isOpen,
	editingItem,
	onClose,
	onSave,
}) => {
	const [formCode804n, setFormCode804n] = useState('');
	const [formCommercialTitle, setFormCommercialTitle] = useState('');
	const [formStatutoryTitle, setFormStatutoryTitle] = useState('');
	const [formCategory, setFormCategory] = useState<Order804nCategory>('therapy');
	const [formSpecialty, setFormSpecialty] = useState<DoctorSpecialty>('therapist');
	const [formPriceRub, setFormPriceRub] = useState<string>('0');
	const [formMaterialCostRub, setFormMaterialCostRub] = useState<string>('0');
	const [formLabCostRub, setFormLabCostRub] = useState<string>('0');
	const [formDurationMin, setFormDurationMin] = useState<number>(30);
	const [formIcd10, setFormIcd10] = useState<string>('');

	// Price Tiers State
	const [formVipPrice, setFormVipPrice] = useState<string>('');
	const [formDmsPrice, setFormDmsPrice] = useState<string>('');
	const [formPromoPrice, setFormPromoPrice] = useState<string>('');
	const [formNightPrice, setFormNightPrice] = useState<string>('');
	const [showTiersSection, setShowTiersSection] = useState(false);

	useEffect(() => {
		if (editingItem) {
			setFormCode804n(editingItem.code804n || '');
			setFormCommercialTitle(editingItem.commercialTitle);
			setFormStatutoryTitle(editingItem.statutoryTitle804n);
			setFormCategory(editingItem.category);
			setFormSpecialty(editingItem.specialty);
			setFormPriceRub(String(editingItem.basePriceRub));
			setFormMaterialCostRub(String(editingItem.materialCostRub ?? 0));
			setFormLabCostRub(String(editingItem.labCostRub ?? 0));
			setFormDurationMin(editingItem.estimatedDurationMin);
			setFormIcd10(editingItem.icd10Indications.join(', '));

			const base = editingItem.basePriceRub;
			setFormVipPrice(String(editingItem.tierPrices?.vip ?? calculateTierPrice(base, 'vip')));
			setFormDmsPrice(String(editingItem.tierPrices?.dms ?? calculateTierPrice(base, 'dms')));
			setFormPromoPrice(String(editingItem.tierPrices?.promo ?? calculateTierPrice(base, 'promo')));
			setFormNightPrice(String(editingItem.tierPrices?.night_weekend ?? calculateTierPrice(base, 'night_weekend')));
			setShowTiersSection(Boolean(editingItem.tierPrices && Object.keys(editingItem.tierPrices).length > 0));
		} else {
			setFormCode804n('');
			setFormCommercialTitle('');
			setFormStatutoryTitle('');
			setFormCategory('therapy');
			setFormSpecialty('therapist');
			setFormPriceRub('');
			setFormMaterialCostRub('0');
			setFormLabCostRub('0');
			setFormDurationMin(30);
			setFormIcd10('');
			setFormVipPrice('');
			setFormDmsPrice('');
			setFormPromoPrice('');
			setFormNightPrice('');
			setShowTiersSection(false);
		}
	}, [editingItem, isOpen]);

	if (!isOpen) return null;

	const handleBasePriceChange = (newVal: string) => {
		setFormPriceRub(newVal);
		const parsed = parseFloat(newVal.replace(',', '.')) || 0;
		if (parsed > 0) {
			setFormVipPrice(String(calculateTierPrice(parsed, 'vip')));
			setFormDmsPrice(String(calculateTierPrice(parsed, 'dms')));
			setFormPromoPrice(String(calculateTierPrice(parsed, 'promo')));
			setFormNightPrice(String(calculateTierPrice(parsed, 'night_weekend')));
		}
	};

	const handleCodeChange = (newCode: string) => {
		setFormCode804n(newCode);
		const trimmed = newCode.trim().toUpperCase();
		if (!trimmed) return;

		// 1. Try to find match in Statutory Order 804n Presets
		const match = STATUTORY_ORDER_804N_PRESETS.find(
			(p) => p.code804n.toUpperCase() === trimmed,
		);
		if (match) {
			if (!formStatutoryTitle || formStatutoryTitle === formCommercialTitle) {
				setFormStatutoryTitle(match.statutoryTitle804n);
			}
			setFormCategory(match.category);
			setFormSpecialty(match.specialty);
			if (match.icd10Indications.length > 0 && !formIcd10) {
				setFormIcd10(match.icd10Indications.join(', '));
			}
			if (match.estimatedDurationMin && !editingItem) {
				setFormDurationMin(match.estimatedDurationMin);
			}
		} else {
			// Auto-detect category from prefix
			const detected = detectCategoryFrom804nCode(trimmed, formCommercialTitle);
			if (detected !== 'other') {
				setFormCategory(detected);
			}
		}
	};

	const handleAutoRecalculateTiers = () => {
		const parsed = parseFloat(formPriceRub.replace(',', '.')) || 0;
		setFormVipPrice(String(calculateTierPrice(parsed, 'vip')));
		setFormDmsPrice(String(calculateTierPrice(parsed, 'dms')));
		setFormPromoPrice(String(calculateTierPrice(parsed, 'promo')));
		setFormNightPrice(String(calculateTierPrice(parsed, 'night_weekend')));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const parsedPrice = parseFloat(formPriceRub.replace(',', '.')) || 0;
		const matCost = parseFloat(formMaterialCostRub.replace(',', '.')) || 0;
		const labCost = parseFloat(formLabCostRub.replace(',', '.')) || 0;
		const icdArray = formIcd10
			.split(',')
			.map((s) => s.trim().toUpperCase())
			.filter(Boolean);

		const tierPrices: Partial<Record<PriceTierKind, number>> = {};
		const vipVal = parseFloat(formVipPrice.replace(',', '.'));
		const dmsVal = parseFloat(formDmsPrice.replace(',', '.'));
		const promoVal = parseFloat(formPromoPrice.replace(',', '.'));
		const nightVal = parseFloat(formNightPrice.replace(',', '.'));

		if (!Number.isNaN(vipVal) && vipVal > 0) tierPrices.vip = Math.round(vipVal);
		if (!Number.isNaN(dmsVal) && dmsVal > 0) tierPrices.dms = Math.round(dmsVal);
		if (!Number.isNaN(promoVal) && promoVal > 0) tierPrices.promo = Math.round(promoVal);
		if (!Number.isNaN(nightVal) && nightVal > 0) tierPrices.night_weekend = Math.round(nightVal);

		if (editingItem) {
			const updatedItem: ServicePricelistItem = {
				...editingItem,
				code804n: formCode804n.trim().toUpperCase() || editingItem.code804n,
				commercialTitle: formCommercialTitle.trim() || formStatutoryTitle.trim(),
				statutoryTitle804n: formStatutoryTitle.trim() || formCommercialTitle.trim(),
				category: formCategory,
				specialty: formSpecialty,
				basePriceRub: parsedPrice,
				basePriceKopecks: rublesToKopecks(parsedPrice),
				materialCostRub: matCost,
				labCostRub: labCost,
				tierPrices: Object.keys(tierPrices).length > 0 ? tierPrices : editingItem.tierPrices,
				estimatedDurationMin: formDurationMin,
				icd10Indications: icdArray,
			};
			onSave(updatedItem);
		} else {
			const newItemId = `srv-custom-${Date.now()}`;
			const newItem: ServicePricelistItem = {
				id: newItemId,
				code804n: formCode804n.trim().toUpperCase() || 'A16.07.002',
				commercialTitle: formCommercialTitle.trim(),
				statutoryTitle804n: formStatutoryTitle.trim() || formCommercialTitle.trim(),
				category: formCategory,
				specialty: formSpecialty,
				basePriceRub: parsedPrice,
				basePriceKopecks: rublesToKopecks(parsedPrice),
				materialCostRub: matCost,
				labCostRub: labCost,
				tierPrices: Object.keys(tierPrices).length > 0 ? tierPrices : undefined,
				estimatedDurationMin: formDurationMin,
				icd10Indications: icdArray,
				vatRate: 0,
				vatExemptionArticle: 'пп. 2 п. 2 ст. 149 НК РФ',
				isActive: true,
				isArchived: false,
				tags: [],
			};
			onSave(newItem);
		}
	};

	return (
		<div className="csv-import-modal" role="dialog" aria-modal="true">
			<div
				className="csv-import-container"
				style={{
					maxWidth: '720px',
					width: '95%',
					maxHeight: '92vh',
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				<header className="pricelist-modal-header">
					<div className="pricelist-header-title">
						{editingItem ? 'Редактирование услуги' : 'Новая услуга в прейскурант'}
					</div>
					<button
						type="button"
						className="pricelist-btn"
						style={{ padding: '0.25rem', minHeight: '28px', border: 'none' }}
						onClick={onClose}
						aria-label="Закрыть окно"
					>
						<X size={16} />
					</button>
				</header>

				<form
					onSubmit={handleSubmit}
					style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1 }}
				>
					<div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
						<div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
							<div>
								<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>
									Код услуги (Номенклатура 804н)
								</label>
								<input
									type="text"
									className="pricelist-search-input"
									style={{ padding: '0 0.75rem' }}
									placeholder="A16.07.002"
									value={formCode804n}
									onChange={(e) => handleCodeChange(e.target.value)}
								/>
							</div>
							<div>
								<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>
									Коммерческое название *
								</label>
								<input
									type="text"
									required
									className="pricelist-search-input"
									style={{ padding: '0 0.75rem' }}
									placeholder="Восстановление зуба пломбой..."
									value={formCommercialTitle}
									onChange={(e) => setFormCommercialTitle(e.target.value)}
								/>
							</div>
						</div>

						<div>
							<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>
								Официальное наименование услуги (Приказ Минздрава 804н)
							</label>
							<input
								type="text"
								className="pricelist-search-input"
								style={{ padding: '0 0.75rem' }}
								placeholder="Восстановление зуба пломбой I, V, VI класс по Блэку..."
								value={formStatutoryTitle}
								onChange={(e) => setFormStatutoryTitle(e.target.value)}
							/>
						</div>

						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
							<div>
								<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>
									Категория услуги
								</label>
								<select
									className="pricelist-search-input"
									style={{ padding: '0 0.75rem', cursor: 'pointer' }}
									value={formCategory}
									onChange={(e) => setFormCategory(e.target.value as Order804nCategory)}
								>
									{Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => (
										<option key={catKey} value={catKey}>
											{catLabel}
										</option>
									))}
								</select>
							</div>

							<div>
								<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>
									Специальность врача
								</label>
								<select
									className="pricelist-search-input"
									style={{ padding: '0 0.75rem', cursor: 'pointer' }}
									value={formSpecialty}
									onChange={(e) => setFormSpecialty(e.target.value as DoctorSpecialty)}
								>
									{Object.entries(SPECIALTY_LABELS).map(([specKey, specLabel]) => (
										<option key={specKey} value={specKey}>
											{specLabel}
										</option>
									))}
								</select>
							</div>
						</div>

						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
							<div>
								<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>
									Цена (₽) *
								</label>
								<input
									type="text"
									required
									className="pricelist-search-input"
									style={{ padding: '0 0.75rem', fontWeight: 700 }}
									placeholder="0"
									value={formPriceRub}
									onChange={(e) => handleBasePriceChange(e.target.value)}
								/>
							</div>

							<div>
								<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>
									Материалы (₽)
								</label>
								<input
									type="text"
									className="pricelist-search-input"
									style={{ padding: '0 0.75rem' }}
									placeholder="0"
									value={formMaterialCostRub}
									onChange={(e) => setFormMaterialCostRub(e.target.value)}
								/>
							</div>

							<div>
								<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>
									ЗТЛ лаб. (₽)
								</label>
								<input
									type="text"
									className="pricelist-search-input"
									style={{ padding: '0 0.75rem' }}
									placeholder="0"
									value={formLabCostRub}
									onChange={(e) => setFormLabCostRub(e.target.value)}
								/>
							</div>

							<div>
								<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>
									Длительность (мин)
								</label>
								<input
									type="number"
									min={5}
									max={480}
									step={5}
									className="pricelist-search-input"
									style={{ padding: '0 0.75rem' }}
									value={formDurationMin}
									onChange={(e) => setFormDurationMin(Number(e.target.value) || 15)}
								/>
							</div>
						</div>

						{/* Tier Prices Section */}
						<div style={{ border: '1px solid var(--line)', borderRadius: '0.5rem', padding: '0.75rem', background: 'var(--paper-subtle, rgba(0,0,0,0.02))' }}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showTiersSection ? '0.75rem' : 0 }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
									<span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text)' }}>
										Тарифная сетка и коэффициенты (VIP, ДМС, Промо, Ночной)
									</span>
								</div>
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
									{showTiersSection && (
										<button
											type="button"
											className="pricelist-btn"
											style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
											onClick={handleAutoRecalculateTiers}
											title="Пересчитать по стандартным коэффициентам"
										>
											<Sparkles size={12} style={{ marginRight: '0.25rem' }} />
											Пересчитать
										</button>
									)}
									<button
										type="button"
										className="pricelist-btn"
										style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
										onClick={() => setShowTiersSection(!showTiersSection)}
									>
										{showTiersSection ? 'Скрыть тарифы' : 'Настроить тарифы'}
									</button>
								</div>
							</div>

							{showTiersSection && (
								<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
									<div>
										<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>
											VIP (+20%)
										</label>
										<input
											type="text"
											className="pricelist-search-input"
											style={{ padding: '0 0.75rem' }}
											placeholder="0"
											value={formVipPrice}
											onChange={(e) => setFormVipPrice(e.target.value)}
										/>
									</div>
									<div>
										<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>
											ДМС
										</label>
										<input
											type="text"
											className="pricelist-search-input"
											style={{ padding: '0 0.75rem' }}
											placeholder="0"
											value={formDmsPrice}
											onChange={(e) => setFormDmsPrice(e.target.value)}
										/>
									</div>
									<div>
										<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>
											Промо (-10%)
										</label>
										<input
											type="text"
											className="pricelist-search-input"
											style={{ padding: '0 0.75rem' }}
											placeholder="0"
											value={formPromoPrice}
											onChange={(e) => setFormPromoPrice(e.target.value)}
										/>
									</div>
									<div>
										<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>
											Ночной (+30%)
										</label>
										<input
											type="text"
											className="pricelist-search-input"
											style={{ padding: '0 0.75rem' }}
											placeholder="0"
											value={formNightPrice}
											onChange={(e) => setFormNightPrice(e.target.value)}
										/>
									</div>
								</div>
							)}
						</div>

						<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
							<div>
								<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>
									Коды МКБ-10 (через запятую)
								</label>
								<input
									type="text"
									className="pricelist-search-input"
									style={{ padding: '0 0.75rem' }}
									placeholder="K02.1, K04.0, K05.1"
									value={formIcd10}
									onChange={(e) => setFormIcd10(e.target.value)}
								/>
							</div>

							<div>
								<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>
									Налогообложение (НДС)
								</label>
								<div
									style={{
										padding: '0.45rem 0.6rem',
										fontSize: '0.75rem',
										borderRadius: '0.375rem',
										background: 'rgba(16, 185, 129, 0.08)',
										border: '1px solid rgba(16, 185, 129, 0.25)',
										color: '#059669',
										fontWeight: 600,
										lineHeight: 1.25,
									}}
								>
									0% (пп. 2 п. 2 ст. 149 НК РФ)
								</div>
							</div>
						</div>
					</div>

					<footer
						style={{
							padding: '0.75rem 1.25rem',
							borderTop: '1px solid var(--line)',
							display: 'flex',
							justifyContent: 'flex-end',
							gap: '0.5rem',
							background: 'var(--paper)',
						}}
					>
						<button
							type="button"
							className="pricelist-btn"
							onClick={onClose}
						>
							Отмена
						</button>
						<button
							type="submit"
							className="pricelist-btn pricelist-btn-primary"
						>
							{editingItem ? 'Сохранить изменения' : 'Добавить услугу'}
						</button>
					</footer>
				</form>
			</div>
		</div>
	);
};
