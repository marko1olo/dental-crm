/**
 * @file apps/web/src/helpers/remainingHelpers.ts
 * @description Canonical auth and initial preferences helper.
 */

import {
	defaultUiPreferences,
	type UiPreferences,
} from "../constants/uiPreferencesConstants";
import { readDenteClinicToken } from "../lib/safeLocalStorage";

export const initialUiPreferences: UiPreferences = defaultUiPreferences;

export const auth = {
	denteClinicalReadHeaders: (
		customHeaders: Record<string, string> = {},
		adminSecret?: string,
	): Record<string, string> => {
		const token = readDenteClinicToken();
		const headers: Record<string, string> = { ...customHeaders };
		if (token) headers["x-dente-clinic-token"] = token;
		if (adminSecret) headers["x-dente-admin-secret"] = adminSecret;
		return headers;
	},
	denteClinicalMutationHeaders: (
		customHeaders: Record<string, string> = {},
		adminSecret?: string,
	): Record<string, string> => {
		const token = readDenteClinicToken();
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...customHeaders,
		};
		if (token) headers["x-dente-clinic-token"] = token;
		if (adminSecret) headers["x-dente-admin-secret"] = adminSecret;
		return headers;
	},
};
