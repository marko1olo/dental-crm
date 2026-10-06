import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { rublesToKopecks } from './servicePricelistEngine';
import {
	CATEGORY_LABELS,
	SPECIALTY_LABELS,
	type DoctorSpecialty,
	type Order804nCategory,
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
		}
	}, [editingItem, isOpen]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const parsedPrice = parseFloat(formPriceRub.replace(',', '.')) || 0;
		const matCost = parseFloat(formMaterialCostRub.replace(',', '.')) || 0;
		const labCost = parseFloat(formLabCostRub.replace(',', '.')) || 0;
		const icdArray = formIcd10
			.split(',')
			.map((s) => s.trim().toUpperCase())
			.filter(Boolean);

		if (editingItem) {
			const updatedItem: ServicePricelistItem = {
				...editingItem,
				code804n: formCode804n.trim().toUpperCase(),
				commercialTitle: formCommercialTitle.trim() || formStatutoryTitle.trim(),
				statutoryTitle804n: formStatutoryTitle.trim() || formCommercialTitle.trim(),
				category: formCategory,
				specialty: formSpecialty,
				basePriceRub: parsedPrice,
				basePriceKopecks: rublesToKopecks(parsedPrice),
				materialCostRub: matCost,
				labCostRub: labCost,
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
					maxWidth: '680px',
					width: '95%',
					maxHeight: '90vh',
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
									Код услуги
								</label>
								<input
									type="text"
									className="pricelist-search-input"
									style={{ padding: '0 0.75rem' }}
									placeholder="A16.07.002"
									value={formCode804n}
									onChange={(e) => setFormCode804n(e.target.value)}
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
								Официальное наименование услуги
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
									onChange={(e) => setFormPriceRub(e.target.value)}
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
