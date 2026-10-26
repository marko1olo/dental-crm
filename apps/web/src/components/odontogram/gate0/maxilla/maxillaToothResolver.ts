/**
 * DENTE Dental CRM — Maxilla Anatomical Component Resolver
 * Resolves 16 upper teeth (18..11 & 21..28) to Wheeler vector components (Mandate 8b <= 120 lines).
 */

import type React from "react";
import { Tooth11Container } from "../teeth/tooth11";
import { Tooth12Container } from "../teeth/tooth12";
import { Tooth13Container } from "../teeth/tooth13";
import { Tooth14Container } from "../teeth/tooth14";
import { Tooth15Container } from "../teeth/tooth15";
import { Tooth16Container } from "../teeth/tooth16";
import { Tooth17Container } from "../teeth/tooth17";
import { Tooth18Container } from "../teeth/tooth18";
import type { Tooth46ContainerProps } from "../tooth46Types";

export function resolveMaxillaToothComponent(
	toothNumber: number,
): React.FC<Tooth46ContainerProps> {
	const lastDigit = toothNumber % 10;
	if (lastDigit === 8) return Tooth18Container;
	if (lastDigit === 7) return Tooth17Container;
	if (lastDigit === 6) return Tooth16Container;
	if (lastDigit === 5) return Tooth15Container;
	if (lastDigit === 4) return Tooth14Container;
	if (lastDigit === 3) return Tooth13Container;
	if (lastDigit === 2) return Tooth12Container;
	if (lastDigit === 1) return Tooth11Container;
	return Tooth16Container;
}
