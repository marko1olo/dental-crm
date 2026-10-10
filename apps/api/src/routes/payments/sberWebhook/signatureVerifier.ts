import crypto from "node:crypto";
import { timingSafeSecretEqual } from "../../../utils/timingSafeSecretEqual.js";

/**
 * Validates Sberbank POS / SberPay HMAC-SHA256 checksum across standard acquiring formats.
 */
export function verifySberPosWebhookChecksum(
	payload: Record<string, unknown>,
	secret: string,
	incomingChecksum: string,
): boolean {
	const cleanPayload: Record<string, string> = {};
	for (const [key, value] of Object.entries(payload)) {
		if (
			key === "checksum" ||
			key === "sign" ||
			key === "signature" ||
			key === "sign_alias" ||
			value === undefined ||
			value === null ||
			typeof value === "object"
		) {
			continue;
		}
		cleanPayload[key] = String(value);
	}

	const sortedKeys = Object.keys(cleanPayload).sort();
	if (sortedKeys.length === 0) return false;

	// Format 1: Sberbank Standard v2: key1;val1;key2;val2;...; (with trailing semicolon)
	const strStandard = `${sortedKeys.map((k) => `${k};${cleanPayload[k]}`).join(";")};`;
	const hmacStandard = crypto
		.createHmac("sha256", secret)
		.update(strStandard)
		.digest("hex");

	if (
		timingSafeSecretEqual(hmacStandard.toUpperCase(), incomingChecksum.toUpperCase()) ||
		timingSafeSecretEqual(hmacStandard.toLowerCase(), incomingChecksum.toLowerCase())
	) {
		return true;
	}

	// Format 2: key1=val1;key2=val2
	const strKeyEq = sortedKeys.map((k) => `${k}=${cleanPayload[k]}`).join(";");
	const hmacKeyEq = crypto
		.createHmac("sha256", secret)
		.update(strKeyEq)
		.digest("hex");

	if (
		timingSafeSecretEqual(hmacKeyEq.toUpperCase(), incomingChecksum.toUpperCase()) ||
		timingSafeSecretEqual(hmacKeyEq.toLowerCase(), incomingChecksum.toLowerCase())
	) {
		return true;
	}

	// Format 3: key1=val1&key2=val2 (URL query format)
	const strUrl = sortedKeys.map((k) => `${k}=${cleanPayload[k]}`).join("&");
	const hmacUrl = crypto
		.createHmac("sha256", secret)
		.update(strUrl)
		.digest("hex");

	if (
		timingSafeSecretEqual(hmacUrl.toUpperCase(), incomingChecksum.toUpperCase()) ||
		timingSafeSecretEqual(hmacUrl.toLowerCase(), incomingChecksum.toLowerCase())
	) {
		return true;
	}

	// Format 4: SHA-256 (key1=val1;...;secret)
	const shaKeyEq = crypto
		.createHash("sha256")
		.update(`${strKeyEq}${secret}`)
		.digest("hex");

	if (
		timingSafeSecretEqual(shaKeyEq.toUpperCase(), incomingChecksum.toUpperCase()) ||
		timingSafeSecretEqual(shaKeyEq.toLowerCase(), incomingChecksum.toLowerCase())
	) {
		return true;
	}

	// Format 5: SHA-256 (key1;val1;...;secret)
	const shaStandard = crypto
		.createHash("sha256")
		.update(`${strStandard}${secret}`)
		.digest("hex");

	if (
		timingSafeSecretEqual(shaStandard.toUpperCase(), incomingChecksum.toUpperCase()) ||
		timingSafeSecretEqual(shaStandard.toLowerCase(), incomingChecksum.toLowerCase())
	) {
		return true;
	}

	return false;
}
