import {
	CheckCircle2,
	ChevronRight,
	Phone,
	User,
	UserCircle,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import "./PublicBookingWidget.css";

interface BookingDoctor {
	id: string;
	fullName: string | null;
	specialties?: string[] | null;
}

interface BookingSlot {
	time: string;
	startsAt: string;
	endsAt: string;
}

export const PublicBookingWidget: React.FC = () => {
	const searchParams = new URLSearchParams(
		window.location.hash.split("?")[1] || "",
	);
	const organizationId = searchParams.get("orgId");

	const [doctors, setDoctors] = useState<BookingDoctor[]>([]);
	const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
	const todayStr = new Date().toISOString().split("T")[0] || "";
	const [selectedDate, setSelectedDate] = useState<string>(todayStr);
	const [slots, setSlots] = useState<BookingSlot[]>([]);
	const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);

	const [patientName, setPatientName] = useState("");
	const [patientPhone, setPatientPhone] = useState("");
	const [comment, setComment] = useState("");

	const [step, setStep] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	const [doctorsLoading, setDoctorsLoading] = useState(false);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);

	// Pulls the human-readable error the API returns ({ error } / { message }),
	// falling back to a status-specific message so the patient never faces a
	// silent dead-end (e.g. 429 rate limit, 400 validation from the booking API).
	const messageFromResponse = useCallback(
		async (res: Response, fallback: string): Promise<string> => {
			if (res.status === 429)
				return "Слишком много запросов. Подождите минуту и попробуйте снова.";
			try {
				const data = await res.json();
				const detail = Array.isArray(data?.details) ? data.details[0] : null;
				return data?.message || data?.error || detail || fallback;
			} catch {
				return fallback;
			}
		},
		[],
	);

	useEffect(() => {
		if (!organizationId) return;
		let cancelled = false;
		setDoctorsLoading(true);
		setLoadError(null);
		fetch(`/api/public/booking/${organizationId}/doctors`)
			.then(async (res) => {
				if (!res.ok)
					throw new Error(
						await messageFromResponse(
							res,
							"Не удалось загрузить список врачей.",
						),
					);
				return res.json();
			})
			.then((data) => {
				if (cancelled) return;
				if (Array.isArray(data)) setDoctors(data);
			})
			.catch((err) => {
				if (cancelled) return;
				setLoadError(
					err instanceof Error
						? err.message
						: "Не удалось загрузить список врачей.",
				);
			})
			.finally(() => {
				if (!cancelled) setDoctorsLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [organizationId, messageFromResponse]);

	useEffect(() => {
		if (!organizationId || !selectedDoctorId || !selectedDate) return;
		let cancelled = false;
		setSlotsLoading(true);
		setLoadError(null);
		fetch(
			`/api/public/booking/${organizationId}/slots/${selectedDoctorId}?date=${selectedDate}`,
		)
			.then(async (res) => {
				if (!res.ok)
					throw new Error(
						await messageFromResponse(
							res,
							"Не удалось загрузить свободное время.",
						),
					);
				return res.json();
			})
			.then((data) => {
				if (cancelled) return;
				setSlots(Array.isArray(data) ? data : []);
			})
			.catch((err) => {
				if (cancelled) return;
				setSlots([]);
				setLoadError(
					err instanceof Error
						? err.message
						: "Не удалось загрузить свободное время.",
				);
			})
			.finally(() => {
				if (!cancelled) setSlotsLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [organizationId, selectedDoctorId, selectedDate, messageFromResponse]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedDoctorId || !selectedSlot) return;

		setIsSubmitting(true);
		setSubmitError(null);
		try {
			const res = await fetch(`/api/public/booking/${organizationId}/book`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					doctorId: selectedDoctorId,
					startsAt: selectedSlot.startsAt,
					endsAt: selectedSlot.endsAt,
					patientName,
					patientPhone,
					comment,
				}),
			});

			if (res.ok) {
				setIsSuccess(true);
			} else {
				setSubmitError(
					await messageFromResponse(
						res,
						"Не удалось записаться. Попробуйте ещё раз или позвоните в клинику.",
					),
				);
			}
		} catch {
			setSubmitError(
				"Нет связи с клиникой. Проверьте интернет и попробуйте снова.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!organizationId) {
		return (
			<div className="p-8 text-center text-red-500 font-medium">
				Ошибка конфигурации: orgId не указан.
			</div>
		);
	}

	if (isSuccess) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
				<CheckCircle2 className="text-green-500 w-16 h-16 mb-4" />
				<h2 className="text-2xl font-bold text-gray-900 mb-2">
					Вы успешно записаны!
				</h2>
				<p className="text-gray-600 mb-6">
					Мы свяжемся с вами по указанному номеру для подтверждения.
				</p>
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
				>
					Вернуться на главную
				</button>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-md">
				<div className="bg-blue-600 text-white p-6">
					<h1 className="text-2xl font-bold">Онлайн-запись</h1>
					<p className="text-blue-100 mt-1 opacity-90">
						Запишитесь на прием за 2 минуты
					</p>
				</div>

				<div className="p-6">
					{step === 1 && (
						<div className="space-y-4">
							<h3 className="font-semibold text-gray-900 mb-2">
								Выберите специалиста
							</h3>
							{loadError && (
								<div
									role="alert"
									className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3"
								>
									{loadError}
								</div>
							)}
							{doctorsLoading && (
								<div className="text-gray-500 text-center py-4">
									Загрузка врачей…
								</div>
							)}
							<div className="space-y-3">
								{doctors.map((doctor) => (
									<button
										type="button"
										key={doctor.id}
										onClick={() => {
											setSelectedDoctorId(doctor.id);
											setStep(2);
										}}
										className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
									>
										<div className="flex items-center gap-3">
											<div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
												<UserCircle size={24} />
											</div>
											<div>
												<div className="font-medium text-gray-900">
													{doctor.fullName}
												</div>
												<div className="text-sm text-gray-500">
													{doctor.specialties?.length
														? doctor.specialties.join(", ")
														: "Врач-стоматолог"}
												</div>
											</div>
										</div>
										<ChevronRight className="text-gray-400" size={20} />
									</button>
								))}
								{!doctorsLoading && !loadError && doctors.length === 0 && (
									<div className="text-gray-500 text-center py-4">
										Нет доступных врачей
									</div>
								)}
							</div>
						</div>
					)}

					{step === 2 && (
						<div className="space-y-6">
							<div>
								<button
									type="button"
									onClick={() => setStep(1)}
									className="text-sm text-blue-600 font-medium mb-4 flex items-center gap-1 hover:underline"
								>
									&larr; Назад к выбору врача
								</button>
								<label
									htmlFor="booking-date"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Выберите дату
								</label>
								<input
									id="booking-date"
									type="date"
									value={selectedDate}
									min={new Date().toISOString().split("T")[0]}
									onChange={(e) => setSelectedDate(e.target.value)}
									className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
								/>
							</div>

							<div>
								<div className="block text-sm font-medium text-gray-700 mb-2">
									Доступное время
								</div>
								{slotsLoading ? (
									<div className="text-center text-gray-400 py-4 text-sm">
										Загрузка свободного времени…
									</div>
								) : loadError ? (
									<div
										role="alert"
										className="text-center text-red-600 py-4 border rounded-lg border-dashed border-red-200 bg-red-50 text-sm"
									>
										{loadError}
									</div>
								) : (
									<div className="grid grid-cols-3 gap-2">
										{slots.map((slot) => (
											<button
												type="button"
												key={slot.time}
												onClick={() => {
													setSelectedSlot(slot);
													setStep(3);
												}}
												className="p-2 text-center rounded-lg border border-gray-200 font-medium text-gray-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors"
											>
												{slot.time}
											</button>
										))}
										{slots.length === 0 && (
											<div className="col-span-3 text-center text-gray-500 py-4 border rounded-lg border-dashed">
												Нет свободных мест
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					)}

					{step === 3 && (
						<form onSubmit={handleSubmit} className="space-y-5">
							<div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
								<button
									type="button"
									onClick={() => setStep(2)}
									className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:underline"
								>
									&larr; Назад
								</button>
								<div className="text-sm text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-md">
									{new Date(selectedDate).toLocaleDateString("ru-RU")} в{" "}
									{selectedSlot?.time}
								</div>
							</div>

							<div>
								<label
									htmlFor="booking-name"
									className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
								>
									<User size={16} /> ФИО
								</label>
								<input
									id="booking-name"
									type="text"
									required
									placeholder="Иванов Иван Иванович"
									value={patientName}
									onChange={(e) => setPatientName(e.target.value)}
									className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
								/>
							</div>

							<div>
								<label
									htmlFor="booking-phone"
									className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
								>
									<Phone size={16} /> Телефон
								</label>
								<input
									id="booking-phone"
									type="tel"
									required
									placeholder="+7 (999) 000-00-00"
									value={patientPhone}
									onChange={(e) => setPatientPhone(e.target.value)}
									className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
								/>
							</div>

							<div>
								<label
									htmlFor="booking-comment"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Комментарий (необязательно)
								</label>
								<textarea
									id="booking-comment"
									placeholder="Что вас беспокоит?"
									rows={2}
									value={comment}
									onChange={(e) => setComment(e.target.value)}
									className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
								/>
							</div>

							{submitError && (
								<div
									role="alert"
									className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
								>
									{submitError}
								</div>
							)}

							<button
								type="submit"
								disabled={isSubmitting}
								className="w-full bg-blue-600 text-white font-semibold rounded-xl p-4 mt-6 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isSubmitting ? "Отправка..." : "Подтвердить запись"}
							</button>
						</form>
					)}
				</div>
			</div>
		</div>
	);
};
