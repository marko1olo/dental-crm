import React, { useState } from "react";
import { Bot, Image as ImageIcon } from "lucide-react";
import { countLabel } from "../../AppHelpers";
import { EmptyState } from "../EmptyState";
import {
	imagingStudyHasFile,
	type ImagingStudy,
	type ImagingStudyKind,
} from "./types";

export interface ImagingStudyThumbnailProps {
	study: ImagingStudy;
	previewSrc?: string | undefined;
}

function resolveThumbnailRasterUrl(study: ImagingStudy, rawSrc?: string): string | undefined {
	if (!rawSrc) return undefined;
	if (rawSrc.startsWith("blob:") || rawSrc.startsWith("data:")) return rawSrc;
	const storagePath = String((study as any)?.storagePath || "").replace(/\\/g, "/");
	for (const publicPrefix of ["/radiology/", "/models/", "/photos/"]) {
		const idx = storagePath.indexOf(publicPrefix);
		if (idx !== -1) {
			const candidate = storagePath.slice(idx);
			if (/\.(png|jpe?g|webp|avif)$/i.test(candidate)) {
				return candidate;
			}
		}
	}
	if (rawSrc.startsWith("/api/imaging/") || rawSrc.endsWith("/preview.svg")) {
		const kind = String(study?.kind || "").toLowerCase();
		const tooth = String(study?.toothCode || "").trim();
		if (kind === "opg" || kind === "panoramic") return "/models/sample_opg_temur.png";
		if (kind === "ceph") return "/radiology/sample_trg_cephalogram.jpg";
		if (kind === "photo") return "/photos/vita_a2_clinical_guide.jpg";
		if (tooth === "36") return "/radiology/sample_rvg_tooth36_periapical.jpg";
		if (tooth === "26") return "/radiology/sample_rvg_pathology.jpg";
		return "/radiology/sample_rvg_tooth16.jpg";
	}
	return rawSrc;
}

export function ImagingStudyThumbnail({
	study,
	previewSrc,
}: ImagingStudyThumbnailProps) {
	const [hasError, setHasError] = useState(false);
	const rawSrc = previewSrc || study?.previewUrl;
	const src = resolveThumbnailRasterUrl(study, rawSrc ?? undefined);
	const isDirectBlob = rawSrc?.startsWith("blob:") || rawSrc?.startsWith("data:");

	if (hasError || !src || (!isDirectBlob && !imagingStudyHasFile(study))) {
		return (
			<div
				className="w-12 h-12 rounded-lg bg-[var(--paper-soft,#1e293b)] border border-[var(--line,#334155)] flex flex-col items-center justify-center text-[var(--teal,#0d9488)] shrink-0 select-none"
				style={{ width: "48px", height: "48px", minWidth: "48px", minHeight: "48px", aspectRatio: "1 / 1" }}
				title={study?.title || "Рентген-снимок"}
			>
				<svg viewBox="0 0 28 28" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
					<rect x="4" y="2" width="20" height="24" rx="4" fill="currentColor" fillOpacity="0.1" stroke="currentColor" />
					<rect x="7" y="5" width="14" height="18" rx="2" stroke="currentColor" strokeOpacity="0.4" strokeDasharray="1.5 1.5" />
					<circle cx="14" cy="14" r="3" stroke="currentColor" strokeOpacity="0.7" />
				</svg>
			</div>
		);
	}

	return (
		<img
			src={src}
			alt=""
			loading="lazy"
			decoding="async"
			className="w-12 h-12 object-cover rounded-lg shrink-0 aspect-square border border-[var(--line,#334155)] bg-[var(--paper-soft,#1e293b)]"
			style={{ width: "48px", height: "48px", minWidth: "48px", minHeight: "48px", aspectRatio: "1 / 1" }}
			onError={() => setHasError(true)}
		/>
	);
}

export interface ImagingStudyListProps {
	visibleImagingStudies: ImagingStudy[];
	activeImagingStudies: ImagingStudy[];
	selectedImagingStudy?: ImagingStudy | null;
	activePatient?: { fullName?: string; name?: string } | null;
	imagingKindFilter: string;
	setImagingKindFilter: (filter: string) => void;
	imagingToothFilter?: string;
	setImagingToothFilter?: (filter: string) => void;
	imagingKindLabels: Record<string, string>;
	imagingSourceLabels: Record<string, string>;
	imagingPreviewSource: (study: ImagingStudy) => string | undefined;
	imagingViewerHref: (study: ImagingStudy) => string;
	onSelectStudy: (studyId: string) => void;
	formatShortDate: (date: string) => string;
}

const KIND_LABELS: Record<string, string> = {
	periapical: "Прицельный RVG",
	bitewing: "Интерпроксимальный",
	opg: "ОПТГ",
	ceph: "ТРГ",
	cbct: "КЛКТ 3D",
	photo: "Фотопротокол",
	other: "Снимок",
};

const SOURCE_KIND_LABELS: Record<string, string> = {
	manual_upload: "Файл",
	dicom_file: "DICOM серия",
	dicomweb: "Архив PACS",
	pacs: "Архив PACS",
	twain_wia: "Сканер",
	sensor_bridge: "Датчик RVG",
	folder_watch: "Папка обмена",
	hot_folder: "Горячая папка",
	dicom_worklist: "Рабочий список",
	other: "Внешний файл",
};

const REGION_LABELS: Record<string, string> = {
	maxilla_mandible: "Обе челюсти",
	maxilla: "Верхняя челюсть",
	mandible: "Нижняя челюсть",
	anterior: "Фронтальный отдел",
	posterior: "Жевательный отдел",
	tmj: "ВНЧС",
	sinus: "Пазухи",
};

const SOURCE_NAME_LABELS: Record<string, string> = {
	manual: "Вручную",
	manual_upload: "Ручная загрузка",
	dicom_import: "Импорт DICOM",
	pacs: "PACS архив",
	sensor: "Датчик RVG",
};

function formatStudyRegion(toothCode?: string | null, region?: string | null): string {
	if (toothCode) return `Зуб ${toothCode}`;
	if (!region) return "Область не указана";
	return REGION_LABELS[region] ?? region;
}

function formatStudySourceName(sourceName?: string | null): string {
	if (!sourceName) return "Загружено";
	return SOURCE_NAME_LABELS[sourceName] ?? sourceName;
}

export function ImagingStudyList({
	visibleImagingStudies,
	activeImagingStudies,
	selectedImagingStudy,
	activePatient,
	imagingKindFilter,
	setImagingKindFilter,
	imagingToothFilter,
	setImagingToothFilter,
	imagingKindLabels,
	imagingSourceLabels,
	imagingPreviewSource,
	imagingViewerHref,
	onSelectStudy,
	formatShortDate,
}: ImagingStudyListProps) {
	const [localToothFilter, setLocalToothFilter] = useState("all");
	const effectiveToothFilter = imagingToothFilter ?? localToothFilter;
	const handleToothChange = (tooth: string) => {
		if (setImagingToothFilter) {
			setImagingToothFilter(tooth);
		} else {
			setLocalToothFilter(tooth);
		}
		if (tooth !== "all") {
			const candidateStudies =
				activeImagingStudies && activeImagingStudies.length > 0
					? activeImagingStudies
					: visibleImagingStudies;
			const matching = (candidateStudies || []).find(
				(s) => String(s.toothCode ?? "").trim() === String(tooth).trim(),
			);
			if (matching && matching.id) {
				onSelectStudy(matching.id);
			}
		}
	};

	const availableTeeth = React.useMemo(() => {
		const set = new Set<string>();
		for (const s of activeImagingStudies ?? []) {
			if (s.toothCode) {
				const cleaned = String(s.toothCode).trim();
				if (cleaned) set.add(cleaned);
			}
		}
		return Array.from(set).sort((a, b) => {
			const na = Number.parseInt(a, 10);
			const nb = Number.parseInt(b, 10);
			if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
			return a.localeCompare(b);
		});
	}, [activeImagingStudies]);

	const displayStudies = React.useMemo(() => {
		if (!effectiveToothFilter || effectiveToothFilter === "all") {
			return visibleImagingStudies;
		}
		return visibleImagingStudies.filter(
			(study) => String(study.toothCode ?? "").trim() === String(effectiveToothFilter).trim(),
		);
	}, [visibleImagingStudies, effectiveToothFilter]);

	return (
		<div className="imaging-list flex flex-col gap-2">
			{/* FDI Tooth Filter Bar (Mandate 8d, Zero Dead-Ends) */}
			<div
				className="imaging-tooth-filter-bar flex items-center justify-between gap-1.5 p-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] shadow-2xs select-none w-full"
				data-testid="imaging-tooth-filter-bar"
				aria-label="Фильтр по зубам формулы FDI"
			>
				<div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar min-w-0 flex-1">
					<span className="text-[11px] font-bold text-[var(--muted)] px-1 shrink-0">
						Зуб:
					</span>
					<button
						type="button"
						className={`h-6 min-h-[24px] px-2 rounded text-[11px] font-semibold shrink-0 transition-colors cursor-pointer ${
							effectiveToothFilter === "all"
								? "bg-[var(--teal)] text-white shadow-2xs"
								: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-teal-500"
						}`}
						onClick={() => handleToothChange("all")}
						data-testid="tooth-filter-all"
					>
						Все
					</button>

					{availableTeeth.map((tooth) => {
						const isSelected = effectiveToothFilter === tooth;
						return (
							<button
								key={tooth}
								type="button"
								className={`h-6 min-h-[24px] px-2 rounded text-[11px] font-semibold font-mono shrink-0 transition-colors cursor-pointer ${
									isSelected
										? "bg-[var(--teal)] text-white shadow-2xs"
										: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-teal-500"
								}`}
								onClick={() => handleToothChange(isSelected ? "all" : tooth)}
								data-testid={`tooth-filter-${tooth}`}
								title={`Показать снимки для зуба ${tooth}`}
							>
								#{tooth}
							</button>
						);
					})}
				</div>

				<div className="flex items-center gap-1 shrink-0">
					<select
						className="h-6 min-h-[24px] px-1.5 text-[11px] font-medium rounded bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-teal-500 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
						value={effectiveToothFilter}
						onChange={(e) => handleToothChange(e.target.value)}
						data-testid="fdi-tooth-select"
						aria-label="Выбрать зуб по формуле FDI"
						title="Выбрать любой зуб по классификации FDI (11..48, 51..85)"
					>
						<option value="all">Выбор зуба</option>
						<optgroup label="Q1 Верхний правый (11-18)">
							<option value="18">18 - Третий моляр</option>
							<option value="17">17 - Второй моляр</option>
							<option value="16">16 - Первый моляр</option>
							<option value="15">15 - Второй премоляр</option>
							<option value="14">14 - Первый премоляр</option>
							<option value="13">13 - Клык</option>
							<option value="12">12 - Боковой резец</option>
							<option value="11">11 - Центральный резец</option>
						</optgroup>
						<optgroup label="Q2 Верхний левый (21-28)">
							<option value="21">21 - Центральный резец</option>
							<option value="22">22 - Боковой резец</option>
							<option value="23">23 - Клык</option>
							<option value="24">24 - Первый премоляр</option>
							<option value="25">25 - Второй премоляр</option>
							<option value="26">26 - Первый моляр</option>
							<option value="27">27 - Второй моляр</option>
							<option value="28">28 - Третий моляр</option>
						</optgroup>
						<optgroup label="Q3 Нижний левый (31-38)">
							<option value="31">31 - Центральный резец</option>
							<option value="32">32 - Боковой резец</option>
							<option value="33">33 - Клык</option>
							<option value="34">34 - Первый премоляр</option>
							<option value="35">35 - Второй премоляр</option>
							<option value="36">36 - Первый моляр</option>
							<option value="37">37 - Второй моляр</option>
							<option value="38">38 - Третий моляр</option>
						</optgroup>
						<optgroup label="Q4 Нижний правый (41-48)">
							<option value="48">48 - Третий моляр</option>
							<option value="47">47 - Второй моляр</option>
							<option value="46">46 - Первый моляр</option>
							<option value="45">45 - Второй премоляр</option>
							<option value="44">44 - Первый премоляр</option>
							<option value="43">43 - Клык</option>
							<option value="42">42 - Боковой резец</option>
							<option value="41">41 - Центральный резец</option>
						</optgroup>
						<optgroup label="Молочные зубы (51-85)">
							<option value="51">51</option>
							<option value="52">52</option>
							<option value="53">53</option>
							<option value="54">54</option>
							<option value="55">55</option>
							<option value="61">61</option>
							<option value="62">62</option>
							<option value="63">63</option>
							<option value="64">64</option>
							<option value="65">65</option>
							<option value="71">71</option>
							<option value="72">72</option>
							<option value="73">73</option>
							<option value="74">74</option>
							<option value="75">75</option>
							<option value="81">81</option>
							<option value="82">82</option>
							<option value="83">83</option>
							<option value="84">84</option>
							<option value="85">85</option>
						</optgroup>
					</select>
				</div>
			</div>

			{displayStudies?.length === 0 ? (
				!activePatient ? (
					<EmptyState
						icon={<ImageIcon size={28} />}
						title="Пациент не выбран"
						description="Лента показывает снимки того пациента, который назван в шапке экрана. Выберите пациента в картотеке или откройте приём — снимки подтянутся сами."
					/>
				) : activeImagingStudies?.length > 0 && effectiveToothFilter !== "all" ? (
					<EmptyState
						icon={<ImageIcon size={28} />}
						title={`Снимков для зуба #${effectiveToothFilter} у пациента нет`}
						description={`В карте пациента есть ${countLabel(activeImagingStudies?.length, "снимок", "снимка", "снимков")} для других зубов.`}
						action={
							<div className="flex flex-col gap-1.5 w-full">
								<button
									className="primary-button h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
									type="button"
									onClick={() => {
										window.dispatchEvent(
											new CustomEvent("dente-open-rvg-capture-modal", {
												detail: { toothCode: effectiveToothFilter },
											}),
										);
									}}
								>
									<span>Сделать снимок зуба #{effectiveToothFilter}</span>
								</button>
								<button
									className="secondary-button h-8 px-3 rounded-lg text-xs font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
									type="button"
									onClick={() => handleToothChange("all")}
								>
									Показать все зубы
								</button>
							</div>
						}
					/>
				) : activeImagingStudies?.length > 0 && imagingKindFilter !== "all" ? (
					<EmptyState
						icon={<ImageIcon size={28} />}
						title={`Снимков типа «${KIND_LABELS[imagingKindFilter] ?? imagingKindLabels?.[imagingKindFilter] ?? imagingKindFilter}» у пациента нет`}
						description={`Их скрыл фильтр типа: у пациента ${countLabel(activeImagingStudies?.length, "снимок", "снимка", "снимков")} других типов.`}
						action={
							<button
								className="h-8 px-3 rounded-lg text-[13px] font-medium border border-[var(--line-strong,var(--line))] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)]/40 transition-all shadow-2xs active:scale-98 cursor-pointer"
								type="button"
								onClick={() => setImagingKindFilter("all")}
							>
								Показать все снимки
							</button>
						}
					/>
				) : (
					<EmptyState
						icon={<ImageIcon size={28} />}
						title="Снимков в карте пациента нет"
						description="Загрузите снимки пациента (КТ, ОПТГ, прицельные RVG или фотопротокол) через верхнюю панель импорта DICOM или выберите архив исследования."
					/>
				)
			) : null}

			{(displayStudies || []).map((study) => (
				<article
					className={`imaging-row imaging-${study.status || "ready"} ${selectedImagingStudy?.id === study.id ? "active" : ""}`}
					key={study.id}
				>
					<div style={{ position: "relative", flexShrink: 0 }}>
						<ImagingStudyThumbnail
							study={study}
							previewSrc={imagingPreviewSource(study)}
						/>
						{Boolean(study.aiSummary) && (
							<span
								className="sa-ai-badge"
								title="Есть описание рентгенолога"
							>
								<Bot size={9} /> AI
							</span>
						)}
					</div>
					<div style={{ minWidth: 0, flex: 1 }}>
						<h3 className="text-sm font-semibold text-[var(--ink)] leading-snug line-clamp-2 break-words m-0" title={study.title}>{study.title}</h3>
						<p className="truncate text-xs text-[var(--muted)] m-0 mt-0.5">
							{KIND_LABELS[study.kind] || imagingKindLabels?.[study.kind] || study.kind} ·{" "}
							{formatStudyRegion(study.toothCode, study.region)} ·{" "}
							{formatShortDate(study.capturedAt)}
						</p>
						<span className="truncate block">
							{SOURCE_KIND_LABELS[study.sourceKind || "other"] || imagingSourceLabels?.[study.sourceKind || "other"] || "Файл"} · {formatStudySourceName(study.sourceName)}
						</span>
						{!imagingStudyHasFile(study) ? (
							<span
								data-testid="imaging-row-file-missing"
								style={{ color: "var(--warning-color, #f59e0b)" }}
							>
								Файл снимка не загружен — разбор недоступен
							</span>
						) : null}
					</div>
					<div className="imaging-row-actions">
						<button
							className="text-button imaging-row-select"
							type="button"
							onClick={() => onSelectStudy(study.id)}
							aria-pressed={selectedImagingStudy?.id === study.id}
							aria-label={`Выбрать снимок: ${study.title}, ${formatShortDate(study.capturedAt)}`}
							title={`Выбрать снимок: ${study.title}`}
						>
							{selectedImagingStudy?.id === study.id ? "Выбрано" : "Выбрать"}
						</button>
						<a
							className="doc-link"
							href={imagingViewerHref(study)}
							target="_blank"
							rel="noreferrer noopener"
							aria-label={`Открыть просмотрщик снимка: ${study.title}, ${formatShortDate(study.capturedAt)}`}
							title={`Открыть просмотрщик снимка: ${study.title}`}
						>
							Открыть
						</a>
					</div>
				</article>
			))}
		</div>
	);
}
