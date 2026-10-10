import type React from "react";
import { ArrowRight } from "lucide-react";
import { formatRussianDate } from "../bookingUtils";
import type { BookingFloatingBottomBarProps } from "./types";

export const BookingFloatingBottomBar: React.FC<BookingFloatingBottomBarProps> = ({
	selectedCategory,
	selectedDate,
	selectedSlot,
	patientName,
	patientPhone,
	isSubmitting,
	onSubmit,
}) => {
	const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		if (!patientName.trim()) {
			if (typeof document !== "undefined") {
				const nameInput = document.getElementById("patient-name-input");
				nameInput?.focus();
				nameInput?.scrollIntoView({ behavior: "smooth", block: "center" });
			}
			return;
		}
		if (!patientPhone.trim()) {
			if (typeof document !== "undefined") {
				const phoneInput = document.getElementById("patient-phone-input");
				phoneInput?.focus();
				phoneInput?.scrollIntoView({ behavior: "smooth", block: "center" });
			}
			return;
		}
		onSubmit(e);
	};

	return (
		<aside
			className="dbw-floating-bottom-bar"
			aria-label="Быстрое действие записи"
			data-testid="floating-bottom-bar"
		>
			<div className="dbw-floating-bar-inner">
				<div className="dbw-floating-bar-summary min-w-0 flex-1">
					<div className="dbw-floating-summary-service truncate text-xs font-bold text-slate-900 dark:text-slate-100">
						{selectedCategory.title}
					</div>
					<div className="dbw-floating-summary-meta text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
						<span className="font-semibold text-teal-600 dark:text-teal-400">
							{selectedCategory.priceLabel}
						</span>
						<span>•</span>
						<span>
							{selectedSlot
								? `${formatRussianDate(selectedDate)} в ${selectedSlot.time}`
								: "Выберите время"}
						</span>
					</div>
				</div>

				<button
					type="button"
					onClick={handleClick}
					disabled={isSubmitting}
					className="dbw-floating-cta-btn shrink-0"
					data-testid="floating-primary-cta"
					aria-label="Записаться на приём"
				>
					{isSubmitting ? (
						<span>Оформление...</span>
					) : (
						<>
							<span>Записаться на приём</span>
							<ArrowRight size={16} />
						</>
					)}
				</button>
			</div>
		</aside>
	);
};
