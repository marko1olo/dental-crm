import React from "react";
import { AlertTriangle, Check, Edit3, PackageCheck, ShieldCheck } from "lucide-react";
import { MissingPriceInlineEditor } from "./MissingPriceInlineEditor";
import type { MissingPriceInlineAlertProps } from "./types";

export const MissingPriceInlineAlert: React.FC<MissingPriceInlineAlertProps> = ({
	item,
	state,
	basePrice,
	onApplyBasePrice,
	className = "",
}) => {
	const {
		isEditing,
		setIsEditing,
		inputPrice,
		setInputPrice,
		error,
		setError,
		inputRef,
		isMissingPrice,
		handleSetWarrantyZeroPrice,
		handleKeepAgreedPrice,
		handleSavePrice,
		handleKeyDown,
	} = state;

	return (
		<div
			className={`missing-price-alert-inline inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-colors ${
				isMissingPrice
					? "bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/30"
					: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
			} ${className}`.trim()}
			data-testid={`missing-price-alert-${item.id}`}
		>
			<AlertTriangle size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />

			{isEditing ? (
				<MissingPriceInlineEditor
					itemId={item.id}
					inputRef={inputRef}
					inputPrice={inputPrice}
					setInputPrice={setInputPrice}
					error={error}
					setError={setError}
					handleKeyDown={handleKeyDown}
					handleSavePrice={handleSavePrice}
					setIsEditing={setIsEditing}
				/>
			) : (
				<div className="inline-flex items-center gap-1.5 flex-wrap">
					<span className="font-semibold text-amber-800 dark:text-amber-300">
						Требуется ручная оценка
					</span>
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="min-h-[26px] inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white hover:bg-amber-700 cursor-pointer transition-colors shadow-xs active:scale-98"
						data-testid={`inline-price-edit-btn-${item.id}`}
						title="Ввести договорную стоимость услуги"
					>
						<Edit3 size={10} />
						<span>Указать цену</span>
					</button>

					{Boolean(basePrice && basePrice > 0 && onApplyBasePrice) && (
						<button
							type="button"
							onClick={onApplyBasePrice}
							className="min-h-[26px] inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-600 text-white hover:bg-sky-700 cursor-pointer transition-colors shadow-xs active:scale-98"
							data-testid={`inline-base-price-btn-${item.id}`}
							title={`Применить базовую цену из пакета/каталога (${(basePrice ?? 0).toLocaleString("ru-RU")} ₽)`}
						>
							<PackageCheck size={10} />
							<span>Базовая {(basePrice ?? 0).toLocaleString("ru-RU")} ₽</span>
						</button>
					)}

					<button
						type="button"
						onClick={handleSetWarrantyZeroPrice}
						className="min-h-[26px] inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-colors shadow-xs active:scale-98"
						data-testid={`inline-warranty-btn-${item.id}`}
						title="Гарантийная переделка (0 ₽)"
					>
						<ShieldCheck size={10} />
						<span>Гарантия 0 ₽</span>
					</button>

					{Boolean(item.isArchivedInCatalog || item.priceRub > 0) && (
						<button
							type="button"
							onClick={handleKeepAgreedPrice}
							className="min-h-[26px] inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-600 text-white hover:bg-teal-700 cursor-pointer transition-colors shadow-xs active:scale-98"
							data-testid={`inline-keep-agreed-btn-${item.id}`}
							title="Выполнить по согласованной цене плана"
						>
							<Check size={10} />
							<span>По плану</span>
						</button>
					)}
				</div>
			)}

			{error && (
				<span className="text-[10px] text-rose-600 font-bold ml-1">{error}</span>
			)}
		</div>
	);
};
