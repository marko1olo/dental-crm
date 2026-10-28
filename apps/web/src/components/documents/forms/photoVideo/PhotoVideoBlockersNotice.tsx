import React from "react";
import type { PhotoVideoConsentGuidanceReview } from "../photoVideoConsentGuiding";

export const PhotoVideoBlockersNotice: React.FC<{ review: PhotoVideoConsentGuidanceReview }> = ({ review }) => {
	if (review.blockers.length === 0) return null;

	return (
		<div
			className="schedule-create-missing document-photo-video-blockers"
			role="status"
			aria-live="polite"
			style={{ marginTop: "12px" }}
		>
			<strong className="block font-semibold mb-1 text-[var(--teal,#0d9488)]">
				Печать и сохранение доступны: незаполненные отметки ({review.blockers.length} из {review.requiredCount}) можно отметить вручную на распечатанном бланке:
			</strong>
			<ul>
				{review.blockers.map((blocker) => (
					<li key={blocker.field}>
						{blocker.label} — {blocker.hint}
					</li>
				))}
			</ul>
			<small>Перечень пересчитывается автоматически по мере выбора параметров.</small>
		</div>
	);
};
