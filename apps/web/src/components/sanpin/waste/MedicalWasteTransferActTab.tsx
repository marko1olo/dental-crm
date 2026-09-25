import { Printer } from "lucide-react";
import React from "react";
import type { MedicalWasteJournalRecord } from "./medicalWasteEngine.js";

export interface MedicalWasteTransferActTabProps {
	readonly actNumber: string;
	readonly setActNumber: (num: string) => void;
	readonly disposalCompanyName: string;
	readonly setDisposalCompanyName: (name: string) => void;
	readonly disposalContractNo: string;
	readonly setDisposalContractNo: (contract: string) => void;
	readonly driverName: string;
	readonly setDriverName: (name: string) => void;
	readonly vehiclePlate: string;
	readonly setVehiclePlate: (plate: string) => void;
	readonly records: MedicalWasteJournalRecord[];
	readonly onCreateAndPrintAct: () => void;
}

export function MedicalWasteTransferActTab({
	actNumber,
	setActNumber,
	disposalCompanyName,
	setDisposalCompanyName,
	disposalContractNo,
	setDisposalContractNo,
	driverName,
	setDriverName,
	vehiclePlate,
	setVehiclePlate,
	records,
	onCreateAndPrintAct,
}: MedicalWasteTransferActTabProps) {
	return (
		<div className="flex flex-col gap-4">
			<div className="p-4 rounded-xl border border-line bg-paper-soft grid grid-cols-1 md:grid-cols-2 gap-3">
				<div>
					<label htmlFor="waste-act-number" className="text-xs font-semibold text-muted block mb-1">
						Номер Акта приема-передачи
					</label>
					<input
						id="waste-act-number"
						type="text"
						value={actNumber}
						onChange={(e) => setActNumber(e.target.value)}
						className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm font-bold focus:outline-none focus:ring-2 focus:ring-focus-ring"
					/>
				</div>

				<div>
					<label htmlFor="waste-disposal-company" className="text-xs font-semibold text-muted block mb-1">
						Лицензированный Спецоператор по вывозу
					</label>
					<input
						id="waste-disposal-company"
						type="text"
						value={disposalCompanyName}
						onChange={(e) => setDisposalCompanyName(e.target.value)}
						className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
					/>
				</div>

				<div>
					<label htmlFor="waste-contract-number" className="text-xs font-semibold text-muted block mb-1">
						Номер Договора
					</label>
					<input
						id="waste-contract-number"
						type="text"
						value={disposalContractNo}
						onChange={(e) => setDisposalContractNo(e.target.value)}
						className="w-full h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
					/>
				</div>

				<div>
					<label htmlFor="waste-driver-name" className="text-xs font-semibold text-muted block mb-1">
						ФИО водителя / ГРЗ спецавтотранспорта
					</label>
					<div className="flex gap-2">
						<input
							id="waste-driver-name"
							type="text"
							placeholder="Водитель"
							value={driverName}
							onChange={(e) => setDriverName(e.target.value)}
							className="flex-1 h-10 px-3 rounded-lg border border-line bg-paper text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus-ring"
						/>
						<input
							type="text"
							placeholder="ГРЗ авто"
							value={vehiclePlate}
							onChange={(e) => setVehiclePlate(e.target.value)}
							className="w-32 h-10 px-2 rounded-lg border border-line bg-paper text-ink text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-focus-ring"
						/>
					</div>
				</div>
			</div>

			{/* Сводка партии */}
			<div className="p-4 rounded-xl border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,#f0fdfa)] flex items-center justify-between">
				<div>
					<div className="text-xs font-semibold text-muted uppercase">Партия к передаче</div>
					<div className="text-lg font-black text-ink">
						{records.filter((r) => r.status === "accumulating").length} мест • Масса нетто:{" "}
						{records
							.filter((r) => r.status === "accumulating")
							.reduce((acc, r) => acc + r.netWeightKg, 0)
							.toFixed(2)}{" "}
						кг
					</div>
				</div>

				<button
					type="button"
					onClick={onCreateAndPrintAct}
					className="waste-btn waste-btn-primary"
				>
					<Printer size={18} /> Сформировать и Распечатать Акт (А4)
				</button>
			</div>
		</div>
	);
}
