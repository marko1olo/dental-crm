import React from "react";
import { Calendar, Check, Loader2 } from "lucide-react";

export interface LabTrackingFittingDatesProps {
	frameworkTrialDate: string;
	setFrameworkTrialDate: (d: string) => void;
	ceramicTrialDate: string;
	setCeramicTrialDate: (d: string) => void;
	deliveryDate: string;
	setDeliveryDate: (d: string) => void;
	handleSaveFittingDates: () => Promise<void> | void;
	isUpdating: boolean;
}

export function LabTrackingFittingDates({
	frameworkTrialDate,
	setFrameworkTrialDate,
	ceramicTrialDate,
	setCeramicTrialDate,
	deliveryDate,
	setDeliveryDate,
	handleSaveFittingDates,
	isUpdating,
}: LabTrackingFittingDatesProps): React.JSX.Element {
	return (
		<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Calendar className="w-4 h-4 text-[var(--teal)]" />
					<h3 className="text-sm font-bold text-[var(--ink)] m-0">
						График клинических примерок и сдачи работы
					</h3>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div className="space-y-1.5">
					<label className="block text-xs font-bold text-[var(--ink)]">
						1. Примерка каркаса
					</label>
					<input
						type="date"
						value={frameworkTrialDate}
						onChange={(e) => setFrameworkTrialDate(e.target.value)}
						className="w-full h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-bold text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal)]"
					/>
				</div>

				<div className="space-y-1.5">
					<label className="block text-xs font-bold text-[var(--ink)]">
						2. Примерка керамики
					</label>
					<input
						type="date"
						value={ceramicTrialDate}
						onChange={(e) => setCeramicTrialDate(e.target.value)}
						className="w-full h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-bold text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal)]"
					/>
				</div>

				<div className="space-y-1.5">
					<label className="block text-xs font-bold text-[var(--ink)]">
						3. Финальная сдача
					</label>
					<input
						type="date"
						value={deliveryDate}
						onChange={(e) => setDeliveryDate(e.target.value)}
						className="w-full h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-bold text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal)]"
					/>
				</div>
			</div>

			<div className="flex justify-end">
				<button
					type="button"
					onClick={handleSaveFittingDates}
					disabled={isUpdating}
					className="min-h-[36px] h-9 px-4 py-1.5 text-xs font-bold rounded-xl bg-[var(--teal)] hover:opacity-90 text-white shadow-sm disabled:opacity-50 transition-all inline-flex items-center gap-2 cursor-pointer"
				>
					{isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
					Сохранить даты примерок
				</button>
			</div>
		</div>
	);
}
