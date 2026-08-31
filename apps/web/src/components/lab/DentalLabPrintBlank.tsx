import React from "react";
import { Printer } from "lucide-react";
import { money } from "../../AppHelpers";
import {
	CONSTRUCTION_TYPES,
	LAB_MATERIALS,
	OCCLUSAL_SCHEMES,
	CONTACT_TIGHTNESS_OPTIONS,
	SURFACE_TEXTURE_OPTIONS,
	generateBarcodeSvg,
	generateQrCodeSvg,
} from "./labMath";

export interface DentalLabPrintBlankProps {
	gostOrderNumber: string;
	secureToken: string;
	formPatientName: string;
	formDoctorName: string;
	selectedTeeth: number[];
	constructionType: string;
	material: string;
	shadeSystem: "classical" | "3d_master" | "bleach";
	shadeClassical: string;
	shade3dMaster: string;
	shadeBleach: string;
	shadeCervical: string;
	shadeBody: string;
	shadeIncisal: string;
	shadeStump: string;
	translucency: string;
	mamelons: boolean;
	calcifications: boolean;
	occlusalScheme: string;
	contactTightness: string;
	surfaceTexture: string;
	cementGapMicrons: number;
	frameworkTrialDate?: string | null;
	ceramicTrialDate?: string | null;
	dueDate?: string | null;
	clinicalNotes: string;
	totalLabPriceRub: number;
	portalUrl: string;
	handlePrint: () => void;
}

export function DentalLabPrintBlank({
	gostOrderNumber,
	secureToken,
	formPatientName,
	formDoctorName,
	selectedTeeth,
	constructionType,
	material,
	shadeSystem,
	shadeClassical,
	shade3dMaster,
	shadeBleach,
	shadeCervical,
	shadeBody,
	shadeIncisal,
	shadeStump,
	translucency,
	mamelons,
	calcifications,
	occlusalScheme,
	contactTightness,
	surfaceTexture,
	cementGapMicrons,
	frameworkTrialDate,
	ceramicTrialDate,
	dueDate,
	clinicalNotes,
	totalLabPriceRub,
	portalUrl,
	handlePrint,
}: DentalLabPrintBlankProps) {
	const finalShade =
		shadeSystem === "3d_master"
			? shade3dMaster
			: shadeSystem === "bleach"
			? shadeBleach
			: shadeClassical;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div>
					<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
						Бланк наряд-заказа ЗТЛ (ГОСТ / Медицинская документация)
					</h3>
					<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
						Официальный наряд-заказ с уникальным штрихкодом и ссылкой для трекинга техником.
					</p>
				</div>
				<button
					type="button"
					onClick={handlePrint}
					className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-md"
				>
					<Printer className="w-4 h-4" />
					Распечатать наряд (A4 / Термочехол)
				</button>
			</div>

			{/* Printable Paper Card conforming to GOST standards */}
			<div
				id="printable-lab-order-sheet"
				className="p-6 sm:p-8 bg-white text-slate-900 rounded-xl border border-slate-300 shadow-sm space-y-5 print:border-none print:shadow-none print:p-0"
			>
				{/* Blank Header */}
				<div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
					<div>
						<h1 className="text-lg sm:text-xl font-black tracking-wide uppercase m-0">
							Наряд-заказ в зуботехническую лабораторию № {gostOrderNumber}
						</h1>
						<p className="text-xs text-slate-600 mt-0.5 m-0 font-medium">
							Стоматологическая медицинская организация · Отделение ортопедии и цифрового зубопротезирования CAD/CAM
						</p>
					</div>
					<div className="text-right">
						<span className="text-xs font-bold block">Дата приема: {new Date().toLocaleDateString("ru-RU")}</span>
						{dueDate && (
							<span className="text-xs font-bold text-rose-600 block">
								Срок сдачи: {new Date(dueDate).toLocaleDateString("ru-RU")}
							</span>
						)}
					</div>
				</div>

				{/* Info Table */}
				<div className="grid grid-cols-2 gap-4 text-xs">
					<div className="space-y-1.5">
						<div><strong>Пациент:</strong> <span className="font-bold">{formPatientName}</span></div>
						<div><strong>Лечащий врач:</strong> <span className="font-bold">{formDoctorName}</span></div>
						<div><strong>Зубная формула (FDI):</strong> <span className="font-bold text-sm bg-slate-100 px-2 py-0.5 rounded">{selectedTeeth.join(", ") || "—"}</span></div>
					</div>
					<div className="space-y-1.5">
						<div><strong>Вид конструкции:</strong> <span className="font-bold">{CONSTRUCTION_TYPES.find((c) => c.id === constructionType)?.name || constructionType}</span></div>
						<div><strong>Материал:</strong> <span className="font-bold">{LAB_MATERIALS.find((m) => m.id === material)?.name || material}</span></div>
						<div><strong>Основной цвет VITA:</strong> <span className="font-bold">{finalShade}</span> {shadeStump ? `(Цвет культи: ${shadeStump})` : ""}</div>
					</div>
				</div>

				{/* Detailed Spec Box */}
				<div className="p-3.5 bg-slate-50 border border-slate-300 rounded-lg text-xs space-y-2">
					<div className="font-bold border-b border-slate-200 pb-1 uppercase tracking-wider text-[11px] text-slate-700">
						Техническое задание зубному технику:
					</div>
					<div className="grid grid-cols-2 gap-2 text-xs">
						<div>• <strong>3-Зонная стратификация:</strong> Пришейка {shadeCervical} / Тело {shadeBody} / Край {shadeIncisal}</div>
						<div>• <strong>Оптические свойства:</strong> {translucency} {mamelons ? "(Мамелоны)" : ""} {calcifications ? "(Кальцификаты)" : ""}</div>
						<div>• <strong>Окклюзия:</strong> {OCCLUSAL_SCHEMES.find((o) => o.id === occlusalScheme)?.name}</div>
						<div>• <strong>Апроксимальный контакт:</strong> {CONTACT_TIGHTNESS_OPTIONS.find((c) => c.id === contactTightness)?.name}</div>
						<div>• <strong>Микротекстура:</strong> {SURFACE_TEXTURE_OPTIONS.find((s) => s.id === surfaceTexture)?.name}</div>
						<div>• <strong>Цементный зазор:</strong> {cementGapMicrons} мкм</div>
					</div>
					{frameworkTrialDate && (
						<div className="text-xs">
							• <strong>Дата примерки каркаса:</strong> {new Date(frameworkTrialDate).toLocaleDateString("ru-RU")}
						</div>
					)}
					{ceramicTrialDate && (
						<div className="text-xs">
							• <strong>Дата примерки керамики:</strong> {new Date(ceramicTrialDate).toLocaleDateString("ru-RU")}
						</div>
					)}
					{clinicalNotes && (
						<div className="pt-1.5 text-xs italic text-slate-800">
							<strong>Клинические указания:</strong> {clinicalNotes}
						</div>
					)}
				</div>

				{/* Disinfection & SanPiN Mark */}
				<div className="p-2.5 border border-dashed border-slate-300 rounded text-xs flex justify-between items-center text-slate-600">
					<span>[СанПиН 3.3686-21] Оттиски / прикусные шаблоны дезинфицированы в дез. растворе</span>
					<span className="font-bold">Стоимость наряда: {money(totalLabPriceRub)}</span>
				</div>

				{/* Barcode & QR Code Section */}
				<div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-300">
					<div className="w-1/2">
						<div className="text-xs uppercase font-bold text-slate-500 mb-1">
							Штрихкод наряда
						</div>
						<div
							className="w-48 text-slate-900"
							dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(secureToken) }}
						/>
					</div>

					<div className="flex items-center gap-3 text-right">
						<div>
							<div className="text-xs uppercase font-bold text-slate-600">
								Портал техника (QR)
							</div>
							<div className="text-xs text-slate-500">
								Сканируйте для онлайн-статуса
							</div>
						</div>
						<div
							className="text-slate-900 flex-shrink-0"
							dangerouslySetInnerHTML={{ __html: generateQrCodeSvg(portalUrl) }}
						/>
					</div>
				</div>

				{/* Signatures */}
				<div className="grid grid-cols-2 gap-8 pt-4 text-xs">
					<div className="border-t border-slate-400 pt-1">
						Врач-ортопед: ___________________ / {formDoctorName} /
					</div>
					<div className="border-t border-slate-400 pt-1 text-right">
						Зубной техник (ЗТЛ): ___________________ /
					</div>
				</div>
			</div>
		</div>
	);
}
