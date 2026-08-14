import React, { useCallback, useEffect, useState } from "react";
import {
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	calculatePsrSextants,
	type PerioChartSummary,
	type PerioToothRecord,
} from "@dental/shared";
import {
	AlertTriangle,
	ArrowDownUp,
	CheckCircle2,
	Droplet,
	Info,
	Layers,
	Plus,
	RotateCcw,
	Save,
	ShieldAlert,
} from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";

interface PeriodontalChartModuleProps {
	patientId: string;
	visitId?: string | null;
	doctorId?: string | null;
}

const DEFAULT_TEETH_NUMBERS = [
	// Maxillary (Upper) Arch
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
	// Mandibular (Lower) Arch
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

function createDefaultTooth(toothNumber: number): PerioToothRecord {
	return {
		toothNumber,
		isMissing: false,
		isImplant: false,
		mobility: 0,
		furcation: 0,
		distoBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		midBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		mesioBuccal: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		distoLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		midLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
		mesioLingual: { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, plaque: false, suppuration: false, calculus: false },
	};
}

export function PeriodontalChartModule({
	patientId,
	visitId,
	doctorId,
}: PeriodontalChartModuleProps) {
	const [teeth, setTeeth] = useState<PerioToothRecord[]>(() =>
		DEFAULT_TEETH_NUMBERS.map(createDefaultTooth),
	);
	const [activeToothNumber, setActiveToothNumber] = useState<number>(11);
	const [activeArch, setActiveArch] = useState<"upper" | "lower">("upper");
	const [loading, setLoading] = useState<boolean>(true);
	const [saving, setSaving] = useState<boolean>(false);
	const [chartNotes, setChartNotes] = useState<string>("");
	const [summary, setSummary] = useState<PerioChartSummary>(() =>
		calculatePerioIndices(DEFAULT_TEETH_NUMBERS.map(createDefaultTooth)),
	);

	// Recompute indices whenever teeth change
	useEffect(() => {
		const newSummary = calculatePerioIndices(teeth);
		setSummary(newSummary);
	}, [teeth]);

	// Load existing chart for patient
	useEffect(() => {
		let isMounted = true;
		async function loadChart() {
			try {
				setLoading(true);
				const headers = denteAdminSecretRequestHeaders();
				const res = await fetch(`/api/perio/patients/${patientId}/charts`, { credentials: "include", headers });
				if (res.ok) {
					const body = await res.json();
					if (isMounted && Array.isArray(body.charts) && body.charts.length > 0) {
						const latest = body.charts[0];
						const loadedTeeth = Array.isArray(latest.teethData)
							? latest.teethData
							: Array.isArray(latest.teethData?.teeth)
								? latest.teethData.teeth
								: null;
						if (loadedTeeth && loadedTeeth.length > 0) {
							setTeeth(loadedTeeth);
							if (latest.notes) setChartNotes(latest.notes);
						}
					}
				}
			} catch (err) {
				console.error("Failed to load perio chart:", err);
			} finally {
				if (isMounted) setLoading(false);
			}
		}
		loadChart();
		return () => {
			isMounted = false;
		};
	}, [patientId]);

	const updateToothField = useCallback(
		(toothNumber: number, updater: (t: PerioToothRecord) => PerioToothRecord) => {
			setTeeth((prev) =>
				prev.map((t) => (t.toothNumber === toothNumber ? updater({ ...t }) : t)),
			);
		},
		[],
	);

	const handleSaveChart = async () => {
		try {
			setSaving(true);
			const payload = {
				visitId: visitId || null,
				doctorId: doctorId || null,
				chartDate: new Date().toISOString(),
				teeth,
				notes: chartNotes || null,
			};

			const headers = {
				...denteAdminSecretRequestHeaders(),
				"Content-Type": "application/json",
			};

			const res = await fetch(`/api/perio/patients/${patientId}/charts`, {
				method: "POST",
				headers,
				credentials: "include",
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				const riskLabels: Record<string, string> = {
					low: "НИЗКИЙ",
					moderate: "СРЕДНИЙ",
					high: "ВЫСОКИЙ",
				};
				showToast(
					`Пародонтологическая карта сохранена (FMBS: ${summary.fmbsPercent}%, FMPS: ${summary.fmpsPercent}%, Риск: ${riskLabels[summary.riskCategory] || summary.riskCategory})`,
					"success",
				);
			} else {
				const errJson = await res.json().catch(() => ({}));
				showToast(errJson.message || "Не удалось сохранить карту", "error");
			}
		} catch (err: any) {
			showToast(err.message || "Сетевая ошибка при отправке карты", "error");
		} finally {
			setSaving(false);
		}
	};

	const currentTooth = teeth.find((t) => t.toothNumber === activeToothNumber) || teeth[0];

	const upperTeeth = teeth.filter(
		(t) =>
			(t.toothNumber >= 11 && t.toothNumber <= 28) ||
			(t.toothNumber >= 51 && t.toothNumber <= 65),
	);
	const lowerTeeth = teeth.filter(
		(t) =>
			(t.toothNumber >= 31 && t.toothNumber <= 48) ||
			(t.toothNumber >= 71 && t.toothNumber <= 85),
	);
	const psr = calculatePsrSextants(teeth);

	return (
		<div className="perio-chart-module bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
			{/* Top Header & Risk Summary Banner */}
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
				<div>
					<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
						<Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />
						Пародонтологическая карта (Florida Probe / 6-Site Charting)
					</h3>
					<p className="text-xs text-slate-500 dark:text-slate-400">
						6-точечное зондирование десневых карманов, CAL, индексы кровоточивости FMBS и налёта FMPS
					</p>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleSaveChart}
						disabled={saving || loading}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
					>
						<Save className="w-4 h-4" />
						{saving ? "Сохранение..." : "Сохранить карту"}
					</button>
				</div>
			</div>

			{/* Clinical Indices Bar */}
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
				<div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/50 text-center">
					<span className="text-[11px] text-slate-500 dark:text-slate-400 block">FMBS (Кровоточивость)</span>
					<span
						className={`text-base font-bold ${
							summary.fmbsPercent <= 10
								? "text-emerald-600 dark:text-emerald-400"
								: summary.fmbsPercent <= 25
									? "text-amber-600 dark:text-amber-400"
									: "text-rose-600 dark:text-rose-400"
						}`}
					>
						{summary.fmbsPercent}%
					</span>
				</div>

				<div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/50 text-center">
					<span className="text-[11px] text-slate-500 dark:text-slate-400 block">FMPS (Налёт/Бляшка)</span>
					<span
						className={`text-base font-bold ${
							summary.fmpsPercent <= 20
								? "text-emerald-600 dark:text-emerald-400"
								: "text-amber-600 dark:text-amber-400"
						}`}
					>
						{summary.fmpsPercent}%
					</span>
				</div>

				<div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/50 text-center">
					<span className="text-[11px] text-slate-500 dark:text-slate-400 block">Глубокие карманы (≥5 мм)</span>
					<span
						className={`text-base font-bold ${
							summary.deepPocketsCount > 0
								? "text-rose-600 dark:text-rose-400"
								: "text-slate-700 dark:text-slate-300"
						}`}
					>
						{summary.deepPocketsCount}
					</span>
				</div>

				<div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/50 text-center">
					<span className="text-[11px] text-slate-500 dark:text-slate-400 block">Макс. глубина PD</span>
					<span className="text-base font-bold text-slate-800 dark:text-slate-200">
						{summary.maxPocketDepthMm} мм
					</span>
				</div>

				<div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/50 text-center">
					<span className="text-[11px] text-slate-500 dark:text-slate-400 block">Макс. потеря CAL</span>
					<span className="text-base font-bold text-slate-800 dark:text-slate-200">
						{summary.maxCalMm} мм
					</span>
				</div>

				<div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/50 text-center">
					<span className="text-[11px] text-slate-500 dark:text-slate-400 block">Риск (PRA / AAP)</span>
					<span
						className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 uppercase ${
							summary.riskCategory === "low"
								? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
								: summary.riskCategory === "moderate"
									? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
									: "bg-rose-500/10 text-rose-600 dark:text-rose-400"
						}`}
					>
						{summary.riskCategory === "low"
							? "Низкий"
							: summary.riskCategory === "moderate"
								? "Средний"
								: "Высокий"}
					</span>
				</div>
			</div>

			{/* PSR / CPITN Sextants Widget */}
			<div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60">
				<div className="flex items-center justify-between mb-2">
					<span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
						<Info className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
						Скрининг пародонта PSR / CPITN по секстантам (ВОЗ)
					</span>
				</div>
				<div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
					{(["S1", "S2", "S3", "S4", "S5", "S6"] as const).map((sKey) => {
						const sextant = psr[sKey];
						const labels: Record<string, string> = {
							S1: "S1 (17-14)",
							S2: "S2 (13-23)",
							S3: "S3 (24-27)",
							S4: "S4 (37-34)",
							S5: "S5 (33-43)",
							S6: "S6 (44-47)",
						};
						return (
							<div
								key={sKey}
								className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 text-center"
							>
								<div className="text-[10px] text-slate-500 dark:text-slate-400">{labels[sKey]}</div>
								<div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-1">
									{sextant ? `Код ${sextant.code}` : "—"}
									{sextant?.asterisk && (
										<span className="text-rose-500 font-black text-base leading-none">*</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Arch Selector Tabs */}
			<div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
				<button
					type="button"
					onClick={() => setActiveArch("upper")}
					className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
						activeArch === "upper"
							? "bg-teal-600 text-white"
							: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
					}`}
				>
					🦷 Верхняя челюсть (18–28 / 55–65)
				</button>
				<button
					type="button"
					onClick={() => setActiveArch("lower")}
					className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
						activeArch === "lower"
							? "bg-teal-600 text-white"
							: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
					}`}
				>
					🦷 Нижняя челюсть (48–38 / 85–75)
				</button>
			</div>

			{/* Tooth Selector Carousel */}
			<div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
				{(activeArch === "upper" ? upperTeeth : lowerTeeth).map((t) => {
					const hasBop =
						t.distoBuccal.bleedingOnProbing ||
						t.midBuccal.bleedingOnProbing ||
						t.mesioBuccal.bleedingOnProbing ||
						t.distoLingual.bleedingOnProbing ||
						t.midLingual.bleedingOnProbing ||
						t.mesioLingual.bleedingOnProbing;
					const maxPd = Math.max(
						t.distoBuccal.probingDepthMm,
						t.midBuccal.probingDepthMm,
						t.mesioBuccal.probingDepthMm,
						t.distoLingual.probingDepthMm,
						t.midLingual.probingDepthMm,
						t.mesioLingual.probingDepthMm,
					);
					const isDeep = maxPd >= 5;

					return (
						<button
							key={t.toothNumber}
							type="button"
							onClick={() => setActiveToothNumber(t.toothNumber)}
							className={`relative flex-shrink-0 w-11 h-13 py-1 px-1.5 rounded-lg border text-center transition-all ${
								t.toothNumber === activeToothNumber
									? "border-teal-500 ring-2 ring-teal-500/30 bg-teal-50 dark:bg-teal-950/40"
									: t.isMissing
										? "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 opacity-40"
										: "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300"
							}`}
						>
							<div className="text-xs font-bold text-slate-800 dark:text-slate-200">
								{t.toothNumber}
							</div>
							<div
								className={`text-[10px] font-semibold ${
									isDeep ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"
								}`}
							>
								{t.isMissing ? "—" : `${maxPd}мм`}
							</div>
							{hasBop && (
								<span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
							)}
						</button>
					);
				})}
			</div>

			{/* Active Tooth Detail Probing Editor (6 Sites) */}
			{currentTooth && (
				<div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-4">
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/50 pb-2">
						<div className="flex items-center gap-3">
							<span className="text-lg font-bold text-slate-900 dark:text-slate-100">
								Зуб {currentTooth.toothNumber}
							</span>
							<label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
								<input
									type="checkbox"
									checked={currentTooth.isMissing}
									onChange={(e) =>
										updateToothField(currentTooth.toothNumber, (t) => ({
											...t,
											isMissing: e.target.checked,
										}))
									}
									className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
								/>
								Отсутствует (адентия / удалён)
							</label>
							<label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
								<input
									type="checkbox"
									checked={currentTooth.isImplant}
									onChange={(e) =>
										updateToothField(currentTooth.toothNumber, (t) => ({
											...t,
											isImplant: e.target.checked,
										}))
									}
									className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
								/>
								Имплантат (периимплантатное зондирование)
							</label>
						</div>

						{/* Mobility and Furcation Selectors */}
						<div className="flex items-center gap-3 text-xs">
							<div className="flex items-center gap-1">
								<span className="text-slate-500">Подвижность:</span>
								<select
									value={currentTooth.mobility || 0}
									onChange={(e) =>
										updateToothField(currentTooth.toothNumber, (t) => ({
											...t,
											mobility: Number(e.target.value) as 0 | 1 | 2 | 3,
										}))
									}
									className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs font-medium"
								>
									<option value={0}>0 (Норма)</option>
									<option value={1}>I (до 1мм)</option>
									<option value={2}>II (&gt;1мм)</option>
									<option value={3}>III (Вертик.)</option>
								</select>
							</div>

							<div className="flex items-center gap-1">
								<span className="text-slate-500">Фуркация:</span>
								<select
									value={currentTooth.furcation || 0}
									onChange={(e) =>
										updateToothField(currentTooth.toothNumber, (t) => ({
											...t,
											furcation: Number(e.target.value) as 0 | 1 | 2 | 3 | 4,
										}))
									}
									className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs font-medium"
								>
									<option value={0}>0 (Нет)</option>
									<option value={1}>I (до 3мм)</option>
									<option value={2}>II (&gt;3мм)</option>
									<option value={3}>III (Сквозная)</option>
									<option value={4}>IV (Сквозная с рецессией)</option>
								</select>
							</div>
						</div>
					</div>

					{/* 6 Sites Measurement Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Buccal / Vestibular Aspects */}
						<div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
							<div className="text-xs font-semibold text-teal-700 dark:text-teal-400">
								Вестибулярно / щёчно (Buccal)
							</div>
							<div className="grid grid-cols-3 gap-2">
								{(["distoBuccal", "midBuccal", "mesioBuccal"] as const).map((siteKey) => {
									const siteLabels: Record<string, string> = {
										distoBuccal: "Дистально (DB)",
										midBuccal: "По центру (B)",
										mesioBuccal: "Медиально (MB)",
									};
									const site = currentTooth[siteKey];
									const cal = calculateClinicalAttachmentLevel(
										site.probingDepthMm,
										site.gingivalMarginMm,
									);
									return (
										<div
											key={siteKey}
											className={`p-2 rounded border text-xs space-y-1.5 ${
												site.probingDepthMm >= 6
													? "bg-rose-500/10 border-rose-500/30"
													: site.probingDepthMm >= 4
														? "bg-amber-500/10 border-amber-500/30"
														: "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
											}`}
										>
											<div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
												{siteLabels[siteKey]}
											</div>
											<div className="flex items-center justify-between gap-1">
												<span className="text-slate-500 text-[10px]">PD (мм):</span>
												<input
													type="number"
													min={0}
													max={15}
													value={site.probingDepthMm}
													onChange={(e) => {
														const val = Math.max(0, Math.min(15, Number(e.target.value) || 0));
														updateToothField(currentTooth.toothNumber, (t) => ({
															...t,
															[siteKey]: { ...t[siteKey], probingDepthMm: val },
														}));
													}}
													className="w-12 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 font-bold"
												/>
											</div>
											<div className="flex items-center justify-between gap-1">
												<span className="text-slate-500 text-[10px]">GM (мм):</span>
												<input
													type="number"
													min={-10}
													max={15}
													value={site.gingivalMarginMm}
													onChange={(e) => {
														const val = Math.max(-10, Math.min(15, Number(e.target.value) || 0));
														updateToothField(currentTooth.toothNumber, (t) => ({
															...t,
															[siteKey]: { ...t[siteKey], gingivalMarginMm: val },
														}));
													}}
													className="w-12 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 text-xs"
												/>
											</div>
											<div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5 border-t border-slate-200 dark:border-slate-700">
												<span>CAL (потеря):</span>
												<span className="font-bold text-slate-800 dark:text-slate-200">
													{cal} мм
												</span>
											</div>
											<div className="flex items-center justify-around gap-1 pt-1">
												<button
													type="button"
													title="Кровоточивость (BOP)"
													onClick={() =>
														updateToothField(currentTooth.toothNumber, (t) => ({
															...t,
															[siteKey]: {
																...t[siteKey],
																bleedingOnProbing: !t[siteKey].bleedingOnProbing,
															},
														}))
													}
													className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
														site.bleedingOnProbing
															? "bg-rose-600 text-white"
															: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
													}`}
												>
													BOP
												</button>
												<button
													type="button"
													title="Зубной налёт (Plaque)"
													onClick={() =>
														updateToothField(currentTooth.toothNumber, (t) => ({
															...t,
															[siteKey]: { ...t[siteKey], plaque: !t[siteKey].plaque },
														}))
													}
													className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
														site.plaque
															? "bg-amber-500 text-white"
															: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
													}`}
												>
													PLQ
												</button>
												<button
													type="button"
													title="Зубной камень (Calculus)"
													onClick={() =>
														updateToothField(currentTooth.toothNumber, (t) => ({
															...t,
															[siteKey]: { ...t[siteKey], calculus: !t[siteKey].calculus },
														}))
													}
													className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
														site.calculus
															? "bg-stone-600 text-white"
															: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
													}`}
												>
													CALC
												</button>
												<button
													type="button"
													title="Гноетечение (Suppuration)"
													onClick={() =>
														updateToothField(currentTooth.toothNumber, (t) => ({
															...t,
															[siteKey]: {
																...t[siteKey],
																suppuration: !t[siteKey].suppuration,
															},
														}))
													}
													className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
														site.suppuration
															? "bg-purple-600 text-white"
															: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
													}`}
												>
													SUP
												</button>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* Lingual / Palatal Aspects */}
						<div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
							<div className="text-xs font-semibold text-teal-700 dark:text-teal-400">
								Орально / язычно / нёбно (Lingual / Palatal)
							</div>
							<div className="grid grid-cols-3 gap-2">
								{(["distoLingual", "midLingual", "mesioLingual"] as const).map((siteKey) => {
									const siteLabels: Record<string, string> = {
										distoLingual: "Дистально (DL)",
										midLingual: "По центру (L)",
										mesioLingual: "Медиально (ML)",
									};
									const site = currentTooth[siteKey];
									const cal = calculateClinicalAttachmentLevel(
										site.probingDepthMm,
										site.gingivalMarginMm,
									);
									return (
										<div
											key={siteKey}
											className={`p-2 rounded border text-xs space-y-1.5 ${
												site.probingDepthMm >= 6
													? "bg-rose-500/10 border-rose-500/30"
													: site.probingDepthMm >= 4
														? "bg-amber-500/10 border-amber-500/30"
														: "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
											}`}
										>
											<div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
												{siteLabels[siteKey]}
											</div>
											<div className="flex items-center justify-between gap-1">
												<span className="text-slate-500 text-[10px]">PD (мм):</span>
												<input
													type="number"
													min={0}
													max={15}
													value={site.probingDepthMm}
													onChange={(e) => {
														const val = Math.max(0, Math.min(15, Number(e.target.value) || 0));
														updateToothField(currentTooth.toothNumber, (t) => ({
															...t,
															[siteKey]: { ...t[siteKey], probingDepthMm: val },
														}));
													}}
													className="w-12 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 font-bold"
												/>
											</div>
											<div className="flex items-center justify-between gap-1">
												<span className="text-slate-500 text-[10px]">GM (мм):</span>
												<input
													type="number"
													min={-10}
													max={15}
													value={site.gingivalMarginMm}
													onChange={(e) => {
														const val = Math.max(-10, Math.min(15, Number(e.target.value) || 0));
														updateToothField(currentTooth.toothNumber, (t) => ({
															...t,
															[siteKey]: { ...t[siteKey], gingivalMarginMm: val },
														}));
													}}
													className="w-12 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 text-xs"
												/>
											</div>
											<div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5 border-t border-slate-200 dark:border-slate-700">
												<span>CAL (потеря):</span>
												<span className="font-bold text-slate-800 dark:text-slate-200">
													{cal} мм
												</span>
											</div>
											<div className="flex items-center justify-around gap-1 pt-1">
												<button
													type="button"
													title="Кровоточивость (BOP)"
													onClick={() =>
														updateToothField(currentTooth.toothNumber, (t) => ({
															...t,
															[siteKey]: {
																...t[siteKey],
																bleedingOnProbing: !t[siteKey].bleedingOnProbing,
															},
														}))
													}
													className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
														site.bleedingOnProbing
															? "bg-rose-600 text-white"
															: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
													}`}
												>
													BOP
												</button>
												<button
													type="button"
													title="Зубной налёт (Plaque)"
													onClick={() =>
														updateToothField(currentTooth.toothNumber, (t) => ({
															...t,
															[siteKey]: { ...t[siteKey], plaque: !t[siteKey].plaque },
														}))
													}
													className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
														site.plaque
															? "bg-amber-500 text-white"
															: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
													}`}
												>
													PLQ
												</button>
												<button
													type="button"
													title="Зубной камень (Calculus)"
													onClick={() =>
														updateToothField(currentTooth.toothNumber, (t) => ({
															...t,
															[siteKey]: { ...t[siteKey], calculus: !t[siteKey].calculus },
														}))
													}
													className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
														site.calculus
															? "bg-stone-600 text-white"
															: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
													}`}
												>
													CALC
												</button>
												<button
													type="button"
													title="Гноетечение (Suppuration)"
													onClick={() =>
														updateToothField(currentTooth.toothNumber, (t) => ({
															...t,
															[siteKey]: {
																...t[siteKey],
																suppuration: !t[siteKey].suppuration,
															},
														}))
													}
													className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
														site.suppuration
															? "bg-purple-600 text-white"
															: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
													}`}
												>
													SUP
												</button>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
