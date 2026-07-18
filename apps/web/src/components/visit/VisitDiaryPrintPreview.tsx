import { Printer, X } from "lucide-react";
import React from "react";
import { ICD10_DICTIONARY } from "../../lib/icd10";

export interface VisitDiaryPrintPreviewProps {
	diary: {
		anamnesis: string;
		statusLocalis: string;
		diagnosisIcd10: string;
		diagnosisTooth: string;
		treatmentDescription: string;
	};
	isLocked: boolean;
	diaryHash: string | null;
	lockedAt: string | null;
	revisionCount: number;
	setShowPreview: (show: boolean) => void;
}

export const VisitDiaryPrintPreview: React.FC<VisitDiaryPrintPreviewProps> = ({
	diary,
	isLocked,
	diaryHash,
	lockedAt,
	revisionCount,
	setShowPreview,
}) => {
	const icdEntry = ICD10_DICTIONARY.find((i) => i.code === diary.diagnosisIcd10);

	return (
		<div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print-layer">
			<div className="bg-zinc-50/40 text-black w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[92vh] print-content">
				<div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl no-print">
					<h3 className="font-bold flex items-center gap-2 text-gray-800">
						<Printer className="w-5 h-5" /> Медицинская карта (Форма 043/у)
					</h3>
					<button
						onClick={() => setShowPreview(false)}
						className="text-gray-500 hover:text-black flex items-center gap-1 text-sm"
					>
						<X className="w-4 h-4" /> Закрыть
					</button>
				</div>

				<div className="p-8 overflow-y-auto" id="print-043">
					<div className="text-center mb-6 border-b-2 border-black pb-4">
						<h1 className="text-xl font-bold uppercase">
							Медицинская карта стоматологического больного
						</h1>
						<p className="text-sm text-gray-600">
							Форма № 043/у (Приказ МЗ РФ № 834н)
						</p>
					</div>

					{isLocked && diaryHash && (
						<div
							className="mb-6 mt-4 p-4 bg-green-50 border border-green-300 rounded text-xs text-green-800 font-mono break-all page-break-avoid"
							style={{ clear: "both", display: "block", position: "relative" }}
						>
							<strong>ЭЦП (SHA-256):</strong> {diaryHash}
							<br />
							<strong>Подписан:</strong>{" "}
							{lockedAt ? new Date(lockedAt).toLocaleString("ru-RU") : "—"}
							{revisionCount > 0 && (
								<span className="ml-3 text-orange-700">
									{" "}
									⚠ Ревизий: {revisionCount}
								</span>
							)}
						</div>
					)}

					<div className="space-y-5">
						<div className="page-break-avoid">
							<h4 className="font-bold border-b border-gray-300 mb-2">
								S — Жалобы и анамнез (Subjective)
							</h4>
							<p className="text-sm whitespace-pre-wrap">
								{diary.anamnesis || "—"}
							</p>
						</div>
						<div className="page-break-avoid">
							<h4 className="font-bold border-b border-gray-300 mb-2">
								O — Объективный статус (Status Localis)
							</h4>
							<p className="text-sm whitespace-pre-wrap">
								{diary.statusLocalis || "—"}
							</p>
						</div>
						<div className="page-break-avoid">
							<h4 className="font-bold border-b border-gray-300 mb-2">
								A — Диагноз (Assessment)
							</h4>
							<p className="text-sm">
								<strong>МКБ-10:</strong> {diary.diagnosisIcd10 || "—"}{" "}
								{icdEntry ? `(${icdEntry.label})` : ""}
								{diary.diagnosisTooth
									? ` | Зуб по FDI: ${diary.diagnosisTooth}`
									: ""}
							</p>
						</div>
						<div className="page-break-avoid">
							<h4 className="font-bold border-b border-gray-300 mb-2">
								P — Лечение и план (Plan)
							</h4>
							<p className="text-sm whitespace-pre-wrap">
								{diary.treatmentDescription || "—"}
							</p>
						</div>
					</div>

					<div className="mt-10 pt-6 border-t border-gray-300 flex justify-between text-sm page-break-avoid">
						<div>Подпись врача: ___________________</div>
						<div>Дата: {new Date().toLocaleDateString("ru-RU")}</div>
					</div>
				</div>

				<div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end rounded-b-xl no-print gap-3">
					<button
						onClick={() => setShowPreview(false)}
						className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
					>
						Закрыть
					</button>
					<button
						onClick={() => window.print()}
						className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow flex items-center gap-2 text-sm"
					>
						<Printer className="w-4 h-4" /> Напечатать
					</button>
				</div>
			</div>
		</div>
	);
};
