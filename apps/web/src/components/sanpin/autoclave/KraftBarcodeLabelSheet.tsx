import React, { useState } from 'react';
import { Printer, QrCode, ShieldCheck, Check, Calendar, User, Package } from 'lucide-react';
import { SterilePackRecord } from './autoclaveEngine';

export interface KraftBarcodeLabelSheetProps {
	packs: SterilePackRecord[];
	clinicName?: string;
}

export function KraftBarcodeLabelSheet({
	packs,
	clinicName = 'Стоматологическая клиника «DENTE»'
}: KraftBarcodeLabelSheetProps) {
	const [selectedBarcodes, setSelectedBarcodes] = useState<Set<string>>(
		new Set(packs.map(p => p.barcode))
	);

	const handleToggleBarcode = (barcode: string) => {
		const next = new Set(selectedBarcodes);
		if (next.has(barcode)) {
			next.delete(barcode);
		} else {
			next.add(barcode);
		}
		setSelectedBarcodes(next);
	};

	const handleSelectAll = () => {
		setSelectedBarcodes(new Set(packs.map(p => p.barcode)));
	};

	const handleDeselectAll = () => {
		setSelectedBarcodes(new Set());
	};

	const handlePrint = () => {
		window.print();
	};

	const printablePacks = packs.filter(p => selectedBarcodes.has(p.barcode));

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
			{/* Toolbar (Hidden on Print) */}
			<div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper-strong, #f8fafc)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)' }}>
				<div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
					Выбрано для печати: {printablePacks.length} из {packs.length} этикеток
				</div>
				<div style={{ display: 'flex', gap: '0.5rem' }}>
					<button
						type="button"
						onClick={handleSelectAll}
						className="autoclave-btn"
						style={{ minHeight: '38px', padding: '0.25rem 0.75rem', fontSize: '0.8125rem' }}
					>
						Выбрать все
					</button>
					<button
						type="button"
						onClick={handleDeselectAll}
						className="autoclave-btn"
						style={{ minHeight: '38px', padding: '0.25rem 0.75rem', fontSize: '0.8125rem' }}
					>
						Снять выбор
					</button>
					<button
						type="button"
						onClick={handlePrint}
						className="autoclave-btn autoclave-btn-primary"
						disabled={printablePacks.length === 0}
					>
						<Printer size={16} />
						Печать этикеток ({printablePacks.length})
					</button>
				</div>
			</div>

			{/* Printable Sheet */}
			{printablePacks.length === 0 ? (
				<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted, #64748b)' }}>
					Нет выбранных этикеток для печати.
				</div>
			) : (
				<div className="kraft-label-sheet">
					{printablePacks.map(pack => (
						<div
							key={pack.barcode}
							className="kraft-label-card"
							onClick={() => handleToggleBarcode(pack.barcode)}
							style={{ cursor: 'pointer' }}
						>
							{/* Label Header */}
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line, #e2e8f0)', paddingBottom: '0.25rem' }}>
								<span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-500, #3b82f6)' }}>
									СТЕРИЛЬНО • СанПиН 3.3686-21
								</span>
								<span style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>
									{pack.autoclaveId} / ЦИКЛ #{pack.cycleNumber}
								</span>
							</div>

							{/* Content Title */}
							<div style={{ fontWeight: 700, fontSize: '0.875rem', marginTop: '0.125rem' }}>
								{pack.itemCategoryRu}
							</div>

							{/* Barcode Text Box */}
							<div className="kraft-label-barcode">
								{pack.barcode}
							</div>

							{/* Metadata Details */}
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>
								<div>
									Стерилизация: <strong style={{ color: 'var(--ink, #0f172a)' }}>{pack.sterilizationDate.slice(0, 10)}</strong>
								</div>
								<div>
									Годен до: <strong style={{ color: 'var(--ok, #10b981)' }}>{pack.expirationDate.slice(0, 10)}</strong>
								</div>
								<div>
									Упаковка: {pack.packagingType === 'kraft_paper_sealed' ? 'Термошов 30д' : 'Пакет 20д'}
								</div>
								<div>
									Медсестра: {pack.operatorName.split(' ')[0] || 'Оператор'}
								</div>
							</div>

							{/* Security Seal Stamp */}
							<div style={{ fontSize: '0.625rem', color: 'var(--muted, #64748b)', textAlign: 'right', borderTop: '1px dashed var(--line, #e2e8f0)', paddingTop: '0.25rem' }}>
								{clinicName} • УКЭП валидна
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
