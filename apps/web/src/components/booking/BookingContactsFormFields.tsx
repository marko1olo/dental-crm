import { MessageSquare, Phone, User } from "lucide-react";
import type React from "react";

export interface BookingContactsFormFieldsProps {
	readonly patientName: string;
	readonly onNameChange: (val: string) => void;
	readonly patientPhone: string;
	readonly onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly patientComment: string;
	readonly onCommentChange: (val: string) => void;
	readonly clearSubmitError: () => void;
}

export const BookingContactsFormFields: React.FC<BookingContactsFormFieldsProps> = ({
	patientName,
	onNameChange,
	patientPhone,
	onPhoneChange,
	patientComment,
	onCommentChange,
	clearSubmitError,
}) => {
	return (
		<div className="dbw-form-grid">
			<div className="dbw-form-group">
				<label htmlFor="patient-name-input" className="dbw-label">
					<User size={16} /> Ваше имя *
				</label>
				<input
					id="patient-name-input"
					data-testid="patient-name-input"
					type="text"
					placeholder="Иван Петров"
					value={patientName}
					onChange={(e) => {
						onNameChange(e.target.value);
						clearSubmitError();
					}}
					className="dbw-input min-h-[44px]"
					required
				/>
			</div>

			<div className="dbw-form-group">
				<label htmlFor="patient-phone-input" className="dbw-label">
					<Phone size={16} /> Номер мобильного телефона *
				</label>
				<input
					id="patient-phone-input"
					data-testid="patient-phone-input"
					type="tel"
					placeholder="+7 (999) 000-00-00"
					value={patientPhone}
					onChange={onPhoneChange}
					className="dbw-input font-mono min-h-[44px]"
					required
				/>
			</div>

			<div className="dbw-form-group">
				<label htmlFor="patient-comment-input" className="dbw-label">
					<MessageSquare size={16} /> Пожелания / Что вас беспокоит?
				</label>
				<textarea
					id="patient-comment-input"
					placeholder="Опишите цель визита (например: консультация, острая боль)"
					value={patientComment}
					onChange={(e) => onCommentChange(e.target.value)}
					rows={2}
					className="dbw-textarea"
				/>
			</div>
		</div>
	);
};
