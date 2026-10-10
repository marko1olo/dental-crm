import type React from "react";
import { BookingHeader } from "../BookingHeader";
import type { BookingHeaderStepProps } from "./types";

export const BookingHeaderStep: React.FC<BookingHeaderStepProps> = ({
	title = "Онлайн-запись в клинику DENTE",
	subtitle = "Выберите врача и удобное время визита",
	isTelegramContext,
}) => {
	const scrollToStep = (id: string) => {
		if (typeof document !== "undefined") {
			document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
		}
	};

	return (
		<>
			{/* Top Glass Header */}
			<BookingHeader
				title={title}
				subtitle={subtitle}
				isTelegramContext={isTelegramContext}
			/>

			{/* Apple Store HIG Segmented Step Indicator */}
			<nav
				className="dbw-stepper-bar"
				aria-label="Этапы онлайн-записи"
			>
				<div className="dbw-stepper-track">
					<button
						type="button"
						onClick={() => scrollToStep("dbw-step-categories")}
						className="dbw-stepper-step active"
					>
						<span className="dbw-stepper-num">1</span>
						<span className="dbw-stepper-title">Услуга</span>
					</button>
					<div className="dbw-stepper-line" />
					<button
						type="button"
						onClick={() => scrollToStep("dbw-step-doctor")}
						className="dbw-stepper-step active"
					>
						<span className="dbw-stepper-num">2</span>
						<span className="dbw-stepper-title">Врач</span>
					</button>
					<div className="dbw-stepper-line" />
					<button
						type="button"
						onClick={() => scrollToStep("dbw-step-slots")}
						className="dbw-stepper-step active"
					>
						<span className="dbw-stepper-num">3</span>
						<span className="dbw-stepper-title">Дата и время</span>
					</button>
					<div className="dbw-stepper-line" />
					<button
						type="button"
						onClick={() => scrollToStep("dbw-step-contacts")}
						className="dbw-stepper-step active"
					>
						<span className="dbw-stepper-num">4</span>
						<span className="dbw-stepper-title">Контакты</span>
					</button>
				</div>
			</nav>
		</>
	);
};
