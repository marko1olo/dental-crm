import React, { useRef, useState } from 'react';
import {
	FileSpreadsheet,
	ShieldCheck,
	Sparkles,
	Upload,
	X,
} from 'lucide-react';
import {
	PriceListMappingDiffView,
	type IngestedMappingItem,
} from '../../pricing/PriceListMappingDiffView';
import { denteAdminSecretRequestHeaders } from '../../../lib/denteRequestHeaders';
import {
	exportPricelistToCsv,
	importPricelistFromCsv,
	parseUnstructuredPriceText,
	rublesToKopecks,
	type ParsedPriceProposal,
} from './servicePricelistEngine';
import type {
	DoctorSpecialty,
	Order804nCategory,
	ServicePricelistItem,
} from './servicePricelistPresets';

export function downloadPricelistCsv(items: readonly ServicePricelistItem[]): void {
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
}

export interface PricelistImportExportModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly items: readonly ServicePricelistItem[];
	readonly onApplyImported: (updatedItems: readonly ServicePricelistItem[], message: string) => void;
	readonly adminSecret?: string | undefined;
}

export const PricelistImportExportModal: React.FC<PricelistImportExportModalProps> = ({
	isOpen,
	onClose,
	items,
	onApplyImported,
	adminSecret,
}) => {
	const [importMode, setImportMode] = useState<'smart_text' | 'csv'>('smart_text');
	const [smartTextInput, setSmartTextInput] = useState('');
	const [, setParsedProposals] = useState<readonly ParsedPriceProposal[]>([]);
	const [ingestedMappingItems, setIngestedMappingItems] = useState<readonly IngestedMappingItem[]>([]);
	const [isIngestingApi, setIsIngestingApi] = useState(false);
	const [csvInputText, setCsvInputText] = useState('');
	const [importErrors, setImportErrors] = useState<string[]>([]);
	const importTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	if (!isOpen) return null;

	const handleIngestPriceList = async (contentToParse: string, sourceType: 'text' | 'csv' = 'text') => {
		const text = contentToParse.trim();
		if (!text) {
			setIngestedMappingItems([]);
			setParsedProposals([]);
			return;
		}

		setIsIngestingApi(true);
		try {
			const res = await fetch('/api/pricelist/ingest', {
				method: 'POST',
				headers: denteAdminSecretRequestHeaders({ 'Content-Type': 'application/json' }, adminSecret),
				body: JSON.stringify({
					rawContent: text,
					sourceType,
				}),
			});

			if (res.ok) {
				const data = await res.json();
				if (data.success && Array.isArray(data.proposals) && data.proposals.length > 0) {
					setIngestedMappingItems(data.proposals);
					setIsIngestingApi(false);
					return;
				}
			}
		} catch {
			// Fallback to local heuristic engine
		}

		const localProposals = parseUnstructuredPriceText(text);
		setParsedProposals(localProposals);
		const mapped = localProposals.map((p, idx): IngestedMappingItem => {
			const existingMatch = items.find(
				(it) =>
					it.code804n === p.detectedCode804n ||
					it.commercialTitle.toLowerCase() === p.commercialTitle.toLowerCase(),
			);
			return {
				id: `local-ingest-${idx}-${Date.now()}`,
				sourceLineNumber: idx + 1,
				rawLine: p.commercialTitle + (p.priceRub ? ` ${p.priceRub} руб` : ''),
				cleanedTitle: p.commercialTitle,
				code804n: p.detectedCode804n,
				statutoryTitle804n: existingMatch?.statutoryTitle804n || p.statutoryTitle804n || p.commercialTitle,
				category: p.suggestedCategory,
				specialty: p.suggestedSpecialty,
				priceRub: p.priceRub,
				priceKopecks: rublesToKopecks(p.priceRub),
				confidence:
					p.confidence === 'exact_code'
						? 0.98
						: p.confidence === 'keyword_match'
							? 0.85
							: 0.65,
				confidenceKind:
					p.confidence === 'exact_code'
						? 'exact_code'
						: p.confidence === 'keyword_match'
							? 'high_keyword'
							: 'low_keyword',
				matchedExistingServiceId: existingMatch?.id ?? null,
				matchedExistingTitle: existingMatch?.commercialTitle ?? null,
				matchedExistingPriceRub: existingMatch?.basePriceRub ?? null,
				suggestedAction: existingMatch
					? existingMatch.basePriceRub === p.priceRub
						? 'identical'
						: 'update_existing'
					: 'create_new',
				isApproved: true,
			};
		});
		setIngestedMappingItems(mapped);
		setIsIngestingApi(false);
	};

	const handleApplyIngestedMapping = (approved: readonly IngestedMappingItem[]) => {
		if (approved.length === 0) return;

		const existingMap = new Map(items.map((i) => [i.id, i]));
		const addedList: ServicePricelistItem[] = [];

		for (const item of approved) {
			if (item.matchedExistingServiceId && existingMap.has(item.matchedExistingServiceId)) {
				const cur = existingMap.get(item.matchedExistingServiceId)!;
				existingMap.set(item.matchedExistingServiceId, {
					...cur,
					code804n: item.code804n || cur.code804n,
					commercialTitle: item.cleanedTitle || cur.commercialTitle,
					basePriceRub: item.priceRub,
					basePriceKopecks: item.priceKopecks || rublesToKopecks(item.priceRub),
				});
			} else {
				const idSuffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
					? crypto.randomUUID().slice(0, 8)
					: Date.now().toString(36);
				const newItem: ServicePricelistItem = {
					id: `srv-ingested-${Date.now()}-${idSuffix}`,
					code804n: item.code804n || 'A16.07.002',
					commercialTitle: item.cleanedTitle,
					statutoryTitle804n: item.statutoryTitle804n || item.cleanedTitle,
					category: (item.category as Order804nCategory) || 'therapy',
					specialty: (item.specialty as DoctorSpecialty) || 'therapist',
					basePriceRub: item.priceRub,
					basePriceKopecks: item.priceKopecks || rublesToKopecks(item.priceRub),
					estimatedDurationMin: 30,
					icd10Indications: [],
					vatRate: 0,
					vatExemptionArticle: 'пп. 2 п. 2 ст. 149 НК РФ',
					isActive: true,
					isArchived: false,
					tags: ['импорт_804н'],
				};
				addedList.push(newItem);
			}
		}

		const merged = [...addedList, ...Array.from(existingMap.values())];
		onApplyImported(merged, `Успешно добавлено / обновлено ${approved.length} позиций в каталог услуг`);
		setIngestedMappingItems([]);
		setSmartTextInput('');
		onClose();
	};

	const handleImportCsvDirect = () => {
		setImportErrors([]);
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
			const existingMap = new Map(items.map((i) => [i.code804n, i]));
			for (const imported of result.validItems) {
				existingMap.set(imported.code804n, imported);
			}
			const merged = Array.from(existingMap.values());
			onApplyImported(merged, `Импортировано ${result.validItems.length} позиций прейскуранта`);
			if (importTimerRef.current) clearTimeout(importTimerRef.current);
			importTimerRef.current = setTimeout(() => {
				importTimerRef.current = null;
				setCsvInputText('');
				onClose();
			}, 500);
		}
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (evt) => {
			const text = evt.target?.result as string;
			if (text) {
				setCsvInputText(text);
				setSmartTextInput(text);
				handleIngestPriceList(text, file.name.endsWith('.csv') ? 'csv' : 'text');
			}
		};
		reader.readAsText(file, 'utf-8');
	};

	return (
		<div className="csv-import-modal" role="dialog" aria-modal="true">
			<div
				className="csv-import-container"
				style={{
					maxWidth: ingestedMappingItems.length > 0 ? '1180px' : '780px',
					width: '95%',
					height: ingestedMappingItems.length > 0 ? '88vh' : 'auto',
					display: 'flex',
					flexDirection: 'column',
					transition: 'max-width 0.2s ease',
				}}
			>
				<header
					className="pricelist-modal-header"
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						padding: '0.5rem 0.75rem',
						gap: '0.5rem',
						flexWrap: 'nowrap',
					}}
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1, overflow: 'hidden' }}>
						<div className="pricelist-header-title" style={{ fontSize: '1rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
							{ingestedMappingItems.length > 0 ? 'Сопоставление услуг' : 'Импорт прейскуранта'}
						</div>

						{ingestedMappingItems.length === 0 && (
							<div className="pricelist-tier-segmented" style={{ padding: '2px' }}>
								<button
									type="button"
									className={`tier-segment-btn ${importMode === 'smart_text' ? 'active' : ''}`}
									style={{ minHeight: '28px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', gap: '0.375rem' }}
									onClick={() => setImportMode('smart_text')}
								>
									<Sparkles size={13} />
									<span>Умный текст (Word / PDF / Скан)</span>
								</button>
								<button
									type="button"
									className={`tier-segment-btn ${importMode === 'csv' ? 'active' : ''}`}
									style={{ minHeight: '28px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', gap: '0.375rem' }}
									onClick={() => setImportMode('csv')}
								>
									<FileSpreadsheet size={13} />
									<span>CSV / Excel</span>
								</button>
							</div>
						)}

						{ingestedMappingItems.length > 0 && (
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: 'auto', flexShrink: 0 }}>
								<span className="pricelist-statutory-badge hide-on-mobile">
									<ShieldCheck size={13} />
									<span>Справочник услуг</span>
								</span>
								<button
									type="button"
									className="pricelist-btn"
									style={{ height: '28px', fontSize: '0.75rem', padding: '0 0.5rem', whiteSpace: 'nowrap' }}
									onClick={() => setIngestedMappingItems([])}
									title="Вернуться к редактированию исходного текста"
								>
									<span>Назад</span>
								</button>
							</div>
						)}
					</div>

					<button
						type="button"
						className="pricelist-btn pricelist-btn-icon"
						style={{ flexShrink: 0, marginLeft: '0.25rem' }}
						onClick={() => {
							setIngestedMappingItems([]);
							onClose();
						}}
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</header>

				{ingestedMappingItems.length > 0 ? (
					<div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
						<PriceListMappingDiffView
							items={ingestedMappingItems}
							onItemsChange={setIngestedMappingItems}
							onAcceptAll={() => {
								setIngestedMappingItems((prev) => prev.map((i) => ({ ...i, isApproved: true })));
							}}
							onApply={handleApplyIngestedMapping}
							onCancel={() => setIngestedMappingItems([])}
							existingCatalog={items.map((it) => ({
								id: it.id,
								code: it.code804n,
								title: it.commercialTitle,
								basePriceRub: it.basePriceRub,
							}))}
							isLoading={isIngestingApi}
						/>
					</div>
				) : (
					<>
						<div className="csv-import-body">
							{importMode === 'smart_text' ? (
								<div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
									<div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
										Вставьте скопированный текст из старого прейскуранта клиники, выгрузки Word или распознанного PDF.
										Алгоритм автоматически выделит цены, очистит наименования и сопоставит услуги с каталогом услуг.
									</div>

									<textarea
										className="pricelist-search-input"
										style={{ height: '140px', fontFamily: 'monospace', fontSize: '0.75rem', padding: '0.5rem', lineHeight: '1.4' }}
										placeholder={`Пример строк для вставки:\nA16.07.002.001 Наложение световой пломбы 4 500 руб\nЛечение глубокого кариеса - 3500\nУдаление зуба мудрости сложное 5 200 ₽\nУстановка имплантата Straumann SLA 38000\nКоронка из диоксида циркония 18000 руб\nАнестезия Убистезин 700 р`}
										value={smartTextInput}
										onChange={(e) => {
											setSmartTextInput(e.target.value);
											const proposals = parseUnstructuredPriceText(e.target.value);
											setParsedProposals(proposals);
										}}
									/>

									<label className="csv-dropzone" style={{ padding: '0.75rem', marginTop: '0.25rem' }}>
										<FileSpreadsheet size={24} style={{ color: 'var(--brand-500)' }} />
										<div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Загрузить файл прейскуранта (TXT, CSV, PDF выгрузка)</div>
										<input
											type="file"
											accept=".txt,.csv,.doc,.docx"
											style={{ display: 'none' }}
											onChange={handleFileUpload}
										/>
									</label>
								</div>
							) : (
								<div>
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

									<div style={{ marginTop: '0.75rem' }}>
										<div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
											Или вставьте текст таблицы CSV:
										</div>
										<textarea
											className="pricelist-search-input"
											style={{ height: '120px', fontFamily: 'monospace', fontSize: '0.75rem', padding: '0.5rem' }}
											placeholder="Код услуги;Коммерческое наименование;Категория;Цена standard..."
											value={csvInputText}
											onChange={(e) => setCsvInputText(e.target.value)}
										/>
									</div>

									{importErrors.length > 0 && (
										<div
											style={{
												marginTop: '0.5rem',
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
								onClick={() => {
									setIngestedMappingItems([]);
									onClose();
								}}
							>
								Отмена
							</button>
							{importMode === 'smart_text' ? (
								<button
									type="button"
									className="pricelist-btn pricelist-btn-primary"
									onClick={() => {
										if (!smartTextInput.trim()) {
											return;
										}
										if (isIngestingApi) return;
										handleIngestPriceList(smartTextInput, 'text');
									}}
									title="Запустить распознавание и сопоставление с каталогом услуг"
								>
									<Sparkles size={14} />
									<span>{isIngestingApi ? 'Распознавание...' : 'Распознать и сопоставить'}</span>
								</button>
							) : (
								<div style={{ display: 'flex', gap: '0.5rem' }}>
									<button
										type="button"
										className="pricelist-btn"
										onClick={() => {
											if (!csvInputText.trim()) {
												return;
											}
											if (isIngestingApi) return;
											handleIngestPriceList(csvInputText, 'csv');
										}}
										title="Сопоставить строки CSV с каталогом услуг в двухоконном виде"
									>
										<ShieldCheck size={14} />
										<span>Сопоставить с каталогом</span>
									</button>
									<button
										type="button"
										className="pricelist-btn pricelist-btn-primary"
										onClick={handleImportCsvDirect}
									>
										Загрузить CSV напрямую
									</button>
								</div>
							)}
						</footer>
					</>
				)}
			</div>
		</div>
	);
};
