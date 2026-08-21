/**
 * TreatmentPlanCompletedActPrint.tsx — Печатная форма Акта выполненных работ и Накладной на списание ТМЦ.
 */

import React from "react";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	Coins,
	FileText,
	Layers,
	Package,
	Printer,
	ShieldCheck,
	TrendingUp,
	X,
} from "lucide-react";
import type { CompletedWorksActAndWriteOffData } from "./types";

export interface TreatmentPlanCompletedActPrintProps {
	readonly isOpen: boolean;
	readonly actData: CompletedWorksActAndWriteOffData;
	readonly clinicLegalName?: string;
	readonly clinicInn?: string;
	readonly clinicAddress?: string;
	readonly clinicLicense?: string;
	readonly onClose: () => void;
	readonly onConfirmExecuteWriteOff?: () => void;
	readonly isExecuting?: boolean;
}

export const TreatmentPlanCompletedActPrint: React.FC<TreatmentPlanCompletedActPrintProps> = ({
	isOpen,
	actData,
	clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "7701234567",
	clinicAddress = "г. Москва, ул. Клиническая, д. 10, стр. 1",
	clinicLicense = "ЛО41-01137-77/00567890 от 15.01.2023 выдана Департаментом здравоохранения г. Москвы",
	onClose,
	onConfirmExecuteWriteOff,
	isExecuting = false,
}) => {
	if (!isOpen) return null;

	const handlePrint = () => {
		window.print();
	};

	const hasDeficit = actData.writtenOffMaterials.some((m) => m.isDeficit);

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 print:p-0 print:static print:bg-white print:inset-auto"
			data-testid="treatment-completed-act-print-modal"
		>
			<div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none">
				{/* Top Action Bar (hidden on print) */}
				<div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 print:hidden">
					<div className="flex items-center gap-2">
						<FileText className="text-teal-600 w-5 h-5" />
						<span className="font-bold text-sm text-slate-800">
							Акт выполненных работ и Накладная на списание ТМЦ
						</span>
					</div>
					<div className="flex items-center gap-2">
						{onConfirmExecuteWriteOff && (
							<button
								type="button"
								onClick={onConfirmExecuteWriteOff}
								disabled={isExecuting}
								className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md cursor-pointer transition-all disabled:opacity-50"
							>
								<Package size={14} />
								<span>{isExecuting ? "Списание..." : "Провести списание на складе"}</span>
							</button>
						)}
						<button
							type="button"
							onClick={handlePrint}
							className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 cursor-pointer transition-colors"
						>
							<Printer size={14} />
							<span>Печать (Ctrl+P)</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer transition-colors"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* Printable Document Body */}
				<div className="p-8 sm:p-12 space-y-6 text-xs leading-relaxed print:p-0 print:space-y-4 print:text-[10pt]">
					{/* Header */}
					<div className="flex justify-between items-start border-b border-slate-200 pb-4">
						<div className="space-y-1">
							<h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
								{actData.clinicName}
							</h1>
							<p className="text-[11px] text-slate-500 max-w-md">
								{clinicLegalName} · ИНН: {clinicInn}
								<br />
								Лицензия: {clinicLicense}
								<br />
								Адрес: {clinicAddress}
							</p>
						</div>
						<div className="text-right space-y-1">
							<div className="inline-block px-3 py-1 bg-slate-100 rounded-lg font-mono font-bold text-slate-800">
								АКТ № {actData.actNumber}
							</div>
							<p className="text-[11px] text-slate-500">
								к Договору № {actData.contractNumber} от {actData.actDate} г.
							</p>
						</div>
					</div>

					{/* Document Title */}
					<div className="text-center space-y-1 py-2">
						<h2 className="text-sm sm:text-base font-extrabold uppercase text-slate-900">
							Акт сдачи-приемки оказанных стоматологических услуг
						</h2>
						<p className="text-[11px] font-semibold text-slate-700">
							{actData.stageTitle}
						</p>
					</div>

					{/* Parties Details */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
						<div>
							<strong className="text-slate-900 block mb-1">Исполнитель (Клиника):</strong>
							<p className="text-slate-700">
								{clinicLegalName}<br />
								Лечащий врач: <strong>{actData.doctorFullName}</strong>
							</p>
						</div>
						<div>
							<strong className="text-slate-900 block mb-1">Пациент (Заказчик):</strong>
							<p className="text-slate-700">
								ФИО: <strong>{actData.patientName}</strong><br />
								ID пациента: {actData.patientId}
							</p>
						</div>
					</div>

					{/* Section 1: Completed Medical Procedures */}
					<div className="space-y-2">
						<h3 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] flex items-center justify-between">
							<span>1. Выполненные медицинские услуги (Номенклатура МЗ РФ № 804н)</span>
							<span className="text-[10px] text-slate-500 font-normal">
								Всего: {actData.completedProcedures.length}
							</span>
						</h3>

						<table className="w-full border-collapse border border-slate-300 text-[10px]">
							<thead>
								<tr className="bg-slate-100 text-slate-700">
									<th className="border border-slate-300 p-1.5 text-center w-8">№</th>
									<th className="border border-slate-300 p-1.5 text-center w-16">Код 804н</th>
									<th className="border border-slate-300 p-1.5 text-center w-12">Зуб</th>
									<th className="border border-slate-300 p-1.5 text-left">Наименование медицинской услуги</th>
									<th className="border border-slate-300 p-1.5 text-center w-10">Кол.</th>
									<th className="border border-slate-300 p-1.5 text-right w-20">Цена, ₽</th>
									<th className="border border-slate-300 p-1.5 text-right w-16">Скидка</th>
									<th className="border border-slate-300 p-1.5 text-right w-20">Сумма, ₽</th>
								</tr>
							</thead>
							<tbody>
								{actData.completedProcedures.map((it, idx) => (
									<tr key={it.id} className="hover:bg-slate-50">
										<td className="border border-slate-300 p-1 text-center">{idx + 1}</td>
										<td className="border border-slate-300 p-1 text-center font-mono text-[9px] text-slate-600">
											{it.code804n}
										</td>
										<td className="border border-slate-300 p-1 text-center font-bold">
											{it.toothNumber ? `№${it.toothNumber}` : "—"}
										</td>
										<td className="border border-slate-300 p-1 text-slate-800">
											{it.name}
										</td>
										<td className="border border-slate-300 p-1 text-center">{it.quantity}</td>
										<td className="border border-slate-300 p-1 text-right font-mono">
											{it.unitPriceRub.toLocaleString("ru-RU")}
										</td>
										<td className="border border-slate-300 p-1 text-right font-mono text-slate-500">
											{it.discountRub > 0 ? `-${it.discountRub.toLocaleString("ru-RU")}` : "0"}
										</td>
										<td className="border border-slate-300 p-1 text-right font-mono font-semibold text-slate-900">
											{it.priceRub.toLocaleString("ru-RU")}
										</td>
									</tr>
								))}
								<tr className="bg-slate-100/90 font-bold text-slate-900">
									<td colSpan={7} className="border border-slate-300 p-1.5 text-right">
										Итого стоимость оказанных медицинских услуг:
									</td>
									<td className="border border-slate-300 p-1.5 text-right font-mono text-teal-800">
										{actData.totalServiceRub.toLocaleString("ru-RU")} ₽
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					{/* Section 2: Material Write-off Specification (Warehouse Bill of Materials) */}
					<div className="space-y-2 pt-2">
						<h3 className="font-bold text-slate-900 uppercase tracking-wide text-[11px] flex items-center justify-between">
							<span>2. Накладная на списание медикаментов и расходных материалов (ТМЦ)</span>
							<span className="text-[10px] text-slate-500 font-normal">
								Позиций ТМЦ: {actData.writtenOffMaterials.length}
							</span>
						</h3>

						<table className="w-full border-collapse border border-slate-300 text-[10px]">
							<thead>
								<tr className="bg-slate-100 text-slate-700">
									<th className="border border-slate-300 p-1.5 text-center w-8">№</th>
									<th className="border border-slate-300 p-1.5 text-left">Наименование материала / медикамента</th>
									<th className="border border-slate-300 p-1.5 text-center w-14">Ед. изм.</th>
									<th className="border border-slate-300 p-1.5 text-center w-14">Расход</th>
									<th className="border border-slate-300 p-1.5 text-right w-20">Уч. цена, ₽</th>
									<th className="border border-slate-300 p-1.5 text-right w-24">Сумма списания, ₽</th>
									<th className="border border-slate-300 p-1.5 text-center w-24">Остаток на складе</th>
								</tr>
							</thead>
							<tbody>
								{actData.writtenOffMaterials.map((mat, idx) => (
									<tr key={mat.id} className="hover:bg-slate-50">
										<td className="border border-slate-300 p-1 text-center">{idx + 1}</td>
										<td className="border border-slate-300 p-1 text-slate-800">
											{mat.materialName}
											<span className="block text-[8px] text-slate-400">
												К процедуре: {mat.procedureName} {mat.toothNumber ? `(зуб №${mat.toothNumber})` : ""}
											</span>
										</td>
										<td className="border border-slate-300 p-1 text-center font-mono">{mat.unitOfMeasure}</td>
										<td className="border border-slate-300 p-1 text-center font-mono font-bold">
											{mat.quantityRequired}
										</td>
										<td className="border border-slate-300 p-1 text-right font-mono text-slate-600">
											{mat.unitCostRub.toLocaleString("ru-RU")}
										</td>
										<td className="border border-slate-300 p-1 text-right font-mono font-bold text-slate-900">
											{mat.totalCostRub.toLocaleString("ru-RU")}
										</td>
										<td className="border border-slate-300 p-1 text-center font-mono">
											{mat.inStockQuantity !== undefined ? (
												mat.isDeficit ? (
													<span className="text-rose-600 font-bold">
														{mat.inStockQuantity} (Дефицит {mat.deficitQuantity})
													</span>
												) : (
													<span className="text-emerald-700">
														{mat.inStockQuantity} {mat.unitOfMeasure}
													</span>
												)
											) : (
												<span className="text-slate-400">—</span>
											)}
										</td>
									</tr>
								))}
								<tr className="bg-slate-100/90 font-bold text-slate-900">
									<td colSpan={5} className="border border-slate-300 p-1.5 text-right">
										Итого себестоимость списанных материалов:
									</td>
									<td className="border border-slate-300 p-1.5 text-right font-mono text-slate-800">
										{actData.totalMaterialCostRub.toLocaleString("ru-RU")} ₽
									</td>
									<td className="border border-slate-300 p-1.5"></td>
								</tr>
							</tbody>
						</table>
					</div>

					{/* Section 3: Financial & Profitability Summary */}
					<div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px]">
						<div className="space-y-1">
							<span className="text-slate-500 block">Выручка за этап:</span>
							<strong className="text-base font-mono text-slate-900">
								{actData.totalServiceRub.toLocaleString("ru-RU")} ₽
							</strong>
						</div>

						<div className="space-y-1">
							<span className="text-slate-500 block">Себестоимость ТМЦ:</span>
							<strong className="text-base font-mono text-slate-700">
								{actData.totalMaterialCostRub.toLocaleString("ru-RU")} ₽
							</strong>
						</div>

						<div className="space-y-1">
							<span className="text-slate-500 block">Валовая маржинальность этапа:</span>
							<strong className="text-base font-mono text-emerald-700 flex items-center gap-1">
								<TrendingUp size={16} />
								<span>{actData.marginRub.toLocaleString("ru-RU")} ₽ ({actData.marginPercent}%)</span>
							</strong>
						</div>
					</div>

					{/* Patient Acceptance & Signatures */}
					<div className="space-y-2 pt-2 border-t border-slate-300 text-[10px] text-slate-700">
						<p className="text-justify">
							Вышеперечисленные медицинские услуги оказаны Исполнителем в полном объеме, качественно и в установленный срок. Претензий по объему, качеству и срокам оказания услуг Пациент не имеет. Расходные материалы и лекарственные препараты использованы по назначению в соответствии с клиническими стандартами.
						</p>

						<div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 text-[11px]">
							<div className="space-y-3">
								<strong className="text-slate-900 block">От Исполнителя:</strong>
								<p className="text-slate-700">
									Врач-стоматолог: {actData.doctorFullName}<br />
									М.П. ___________________ / {actData.doctorFullName.split(" ")[0]} /
								</p>
							</div>

							<div className="space-y-3">
								<strong className="text-slate-900 block">Пациент (Заказчик):</strong>
								<p className="text-slate-700">
									ФИО: {actData.patientName}<br />
									Подпись: ___________________ / {actData.patientName.split(" ")[0]} /
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
