import React, { useState } from 'react';
import { Package, Plus, Trash2, CheckCircle2, QrCode, AlertCircle, Clock } from 'lucide-react';
import { AutoclavePackagingType, SANPIN_PACKAGING_RULES } from './autoclavePresets';
import { SterilePackRecord, generateSterileBatchPacks, evaluatePackStatus } from './autoclaveEngine';

export interface KraftPackBatchBuilderProps {
	autoclaveId: string;
	cycleNumber: number;
	operatorName: string;
	packs: SterilePackRecord[];
	onPacksUpdated: (packs: SterilePackRecord[]) => void;
}

const COMMON_INSTRUMENT_SETS = [
	{
		category: 'Терапевтический базовый набор',
		items: ['Зеркало стоматологическое', 'Зонд угловой', 'Пинцет анатомический', 'Гладилка-штопфер']
	},
	{
		category: 'Хирургический набор для удаления',
		items: ['Щипцы байонетные', 'Элеватор прямой', 'Элеватор штыковидный', 'Кюрета хирургическая']
	},
	{
		category: 'Эндодонтический набор',
		items: ['Эндодонтический пинцет', 'Зонд DG-16', 'Линейка эндодонтическая', 'Набор спредеров']
	},
	{
		category: 'Стоматологический наконечник',
		items: ['Наконечник турбинный с подсветкой KaVo', 'Масляный адаптер для продувки']
	},
	{
		category: 'Имплантологическая кассета',
		items: ['Набор фрез пилотных', 'Динамометрический ключ', 'Параллелометры', 'Пинцет для титана']
	}
];

export function KraftPackBatchBuilder({
	autoclaveId,
	cycleNumber,
	operatorName,
	packs,
	onPacksUpdated
}: KraftPackBatchBuilderProps) {
	const [packagingType, setPackagingType] = useState<AutoclavePackagingType>('kraft_paper_sealed');
	const [selectedCategory, setSelectedCategory] = useState(COMMON_INSTRUMENT_SETS[0]?.category || 'Терапевтический набор');
	const [customItemsText, setCustomItemsText] = useState(COMMON_INSTRUMENT_SETS[0]?.items.join(', ') || '');
	const [packQuantity, setPackQuantity] = useState(6);

	const handleCategoryChange = (catName: string) => {
		setSelectedCategory(catName);
		const found = COMMON_INSTRUMENT_SETS.find(s => s.category === catName);
		if (found) {
			setCustomItemsText(found.items.join(', '));
		}
	};

	const handleAddBatch = () => {
		const items = customItemsText.split(',').map(s => s.trim()).filter(Boolean);
		const newBatch = generateSterileBatchPacks({
			autoclaveId,
			cycleNumber,
			packagingType,
			packCount: packQuantity,
			itemCategoryRu: selectedCategory,
			itemsListRu: items.length > 0 ? items : [selectedCategory],
			operatorName
		});

		onPacksUpdated([...packs, ...newBatch]);
	};

	const handleRemovePack = (barcode: string) => {
		onPacksUpdated(packs.filter(p => p.barcode !== barcode));
	};

	const handleClearAll = () => {
		onPacksUpdated([]);
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
			{/* Builder Input Box */}
			<div style={{ background: 'var(--paper-strong, #f8fafc)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--line, #e2e8f0)' }}>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
					{/* Packaging Type */}
					<div>
						<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
							Тип стерилизационной упаковки
						</label>
						<select
							value={packagingType}
							onChange={e => setPackagingType(e.target.value as AutoclavePackagingType)}
							style={{ width: '100%', minHeight: '44px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)' }}
						>
							{Object.values(SANPIN_PACKAGING_RULES).map(rule => (
								<option key={rule.packagingType} value={rule.packagingType}>
									{rule.nameRu} ({rule.shelfLifeDays} дн.)
								</option>
							))}
						</select>
					</div>

					{/* Set Preset */}
					<div>
						<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
							Шаблон набора инструментов
						</label>
						<select
							value={selectedCategory}
							onChange={e => handleCategoryChange(e.target.value)}
							style={{ width: '100%', minHeight: '44px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)' }}
						>
							{COMMON_INSTRUMENT_SETS.map(set => (
								<option key={set.category} value={set.category}>
									{set.category}
								</option>
							))}
						</select>
					</div>

					{/* Quantity */}
					<div>
						<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
							Количество пакетов в партии (шт.)
						</label>
						<input
							type="number"
							min={1}
							max={50}
							value={packQuantity}
							onChange={e => setPackQuantity(Math.max(1, parseInt(e.target.value) || 1))}
							style={{ width: '100%', minHeight: '44px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)' }}
						/>
					</div>
				</div>

				{/* Items Textarea */}
				<div style={{ marginBottom: '0.75rem' }}>
					<label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted, #64748b)', marginBottom: '0.25rem' }}>
						Содержимое пакета (через запятую)
					</label>
					<input
						type="text"
						value={customItemsText}
						onChange={e => setCustomItemsText(e.target.value)}
						placeholder="Зеркало, пинцет, зонд..."
						style={{ width: '100%', minHeight: '44px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)', background: 'var(--paper, #fff)', color: 'var(--ink, #0f172a)' }}
					/>
				</div>

				{/* Action Row */}
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<span style={{ fontSize: '0.8125rem', color: 'var(--muted, #64748b)' }}>
						Срок годности: <strong>{SANPIN_PACKAGING_RULES[packagingType].shelfLifeDays} дней</strong> согласно {SANPIN_PACKAGING_RULES[packagingType].sanpinClauseRu}
					</span>
					<button
						type="button"
						onClick={handleAddBatch}
						className="autoclave-btn autoclave-btn-primary"
					>
						<Plus size={16} />
						Добавить партию ({packQuantity} шт.)
					</button>
				</div>
			</div>

			{/* Batch Table */}
			<div>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
					<div style={{ fontWeight: 700, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						<Package size={18} />
						Сформированные стерильные пакеты ({packs.length} шт.)
					</div>
					{packs.length > 0 && (
						<button
							type="button"
							onClick={handleClearAll}
							className="autoclave-btn"
							style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', minHeight: '36px' }}
						>
							<Trash2 size={14} />
							Очистить список
						</button>
					)}
				</div>

				{packs.length === 0 ? (
					<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted, #64748b)', background: 'var(--paper-strong, #f8fafc)', borderRadius: '8px', border: '1px dashed var(--line, #e2e8f0)' }}>
						Пакеты еще не добавлены. Заполните параметры выше и нажмите «Добавить партию».
					</div>
				) : (
					<div style={{ overflowX: 'auto', border: '1px solid var(--line, #e2e8f0)', borderRadius: '8px' }}>
						<table className="sterile-packs-table">
							<thead>
								<tr>
									<th>Штрихкод СанПиН</th>
									<th>Наименование набора</th>
									<th>Упаковка</th>
									<th>Стерилизован</th>
									<th>Годен до</th>
									<th>Статус</th>
									<th>Действие</th>
								</tr>
							</thead>
							<tbody>
								{packs.map(pack => {
									const status = evaluatePackStatus(pack.sterilizationDate, pack.packagingType, pack.isBreached);
									return (
										<tr key={pack.barcode}>
											<td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{pack.barcode}</td>
											<td>{pack.itemCategoryRu}</td>
											<td>{pack.packagingNameRu}</td>
											<td>{pack.sterilizationDate.slice(0, 10)}</td>
											<td>{pack.expirationDate.slice(0, 10)}</td>
											<td>
												<span className={`pack-status-badge ${status}`}>
													<CheckCircle2 size={12} />
													{status === 'sterile' && 'Стерильно'}
													{status === 'expiring_soon' && 'Истекает'}
													{status === 'expired' && 'Просрочено'}
													{status === 'breached' && 'Вскрыто'}
												</span>
											</td>
											<td>
												<button
													type="button"
													onClick={() => handleRemovePack(pack.barcode)}
													style={{ background: 'transparent', border: 'none', color: 'var(--bad, #ef4444)', cursor: 'pointer', padding: '0.25rem' }}
													title="Удалить"
												>
													<Trash2 size={16} />
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
