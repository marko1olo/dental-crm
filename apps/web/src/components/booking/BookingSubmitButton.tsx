import { CheckCircle2, Clock } from "lucide-react";
import type React from "react";

export interface BookingSubmitButtonProps {
	readonly isSubmitting: boolean;
}

export const BookingSubmitButton: React.FC<BookingSubmitButtonProps> = ({
	isSubmitting,
}) => {
	return (
		<div className="dbw-submit-row pt-2">
			<button
				type="submit"
				disabled={isSubmitting}
				className="dbw-btn-confirm primary-button w-full min-h-[48px]"
				data-testid="step4-confirm-btn"
				aria-label="Подтвердить запись и записаться на приём"
			>
				{isSubmitting ? (
					<>
						<Clock size={18} className="animate-spin" />
						<span>Оформление записи...</span>
					</>
				) : (
					<>
						<CheckCircle2 size={18} />
						<span>Записаться на приём</span>
					</>
				)}
			</button>
		</div>
	);
};
