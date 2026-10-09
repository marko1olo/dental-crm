import crypto from "node:crypto";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";

/**
 * Validates SBP HMAC-SHA256 / SHA-256 webhook signature.
 * 1. Excludes checksum, sign, signature, sign_alias, crc.
 * 2. Sorts remaining parameters in alphabetical order.
 * 3. Computes HMAC-SHA256 and SHA-256 and compares in constant time.
 */
export function verifySbpWebhookSignature(
	payload: Record<string, unknown>,
	secret: string,
	incomingSignature: string,
): boolean {
	const cleanPayload: Record<string, string> = {};
	for (const [key, value] of Object.entries(payload)) {
		if (
			key === "checksum" ||
			key === "sign" ||
			key === "signature" ||
			key === "sign_alias" ||
			key === "crc" ||
			value === undefined ||
			value === null ||
			typeof value === "object"
		) {
			continue;
		}
		cleanPayload[key] = String(value);
	}

	if (timingSafeSecretEqual(incomingSignature, secret)) {
		return true;
	}

	const sortedKeys = Object.keys(cleanPayload).sort();
	if (sortedKeys.length === 0) return false;

	// Format 1: key1=val1;key2=val2
	const strKeyEq = sortedKeys.map((k) => `${k}=${cleanPayload[k]}`).join(";");
	const hmacKeyEq = crypto
		.createHmac("sha256", secret)
		.update(strKeyEq)
		.digest("hex");

	if (
		timingSafeSecretEqual(hmacKeyEq.toUpperCase(), incomingSignature.toUpperCase()) ||
		timingSafeSecretEqual(hmacKeyEq.toLowerCase(), incomingSignature.toLowerCase())
	) {
		return true;
	}

	// Format 2: key1;val1;key2;val2;...;
	const strStandard = `${sortedKeys.map((k) => `${k};${cleanPayload[k]}`).join(";")};`;
	const hmacStandard = crypto
		.createHmac("sha256", secret)
		.update(strStandard)
		.digest("hex");

	if (
		timingSafeSecretEqual(hmacStandard.toUpperCase(), incomingSignature.toUpperCase()) ||
		timingSafeSecretEqual(hmacStandard.toLowerCase(), incomingSignature.toLowerCase())
	) {
		return true;
	}

	// Format 3: key1=val1&key2=val2
	const strUrl = sortedKeys.map((k) => `${k}=${cleanPayload[k]}`).join("&");
	const hmacUrl = crypto
		.createHmac("sha256", secret)
		.update(strUrl)
		.digest("hex");

	if (
		timingSafeSecretEqual(hmacUrl.toUpperCase(), incomingSignature.toUpperCase()) ||
		timingSafeSecretEqual(hmacUrl.toLowerCase(), incomingSignature.toLowerCase())
	) {
		return true;
	}

	// Format 4: SHA-256 (strKeyEq + secret)
	const shaKeyEq = crypto
		.createHash("sha256")
		.update(`${strKeyEq}${secret}`)
		.digest("hex");

	if (
		timingSafeSecretEqual(shaKeyEq.toUpperCase(), incomingSignature.toUpperCase()) ||
		timingSafeSecretEqual(shaKeyEq.toLowerCase(), incomingSignature.toLowerCase())
	) {
		return true;
	}

	// Format 5: SHA-256 (strStandard + secret)
	const shaStandard = crypto
		.createHash("sha256")
		.update(`${strStandard}${secret}`)
		.digest("hex");

	if (
		timingSafeSecretEqual(shaStandard.toUpperCase(), incomingSignature.toUpperCase()) ||
		timingSafeSecretEqual(shaStandard.toLowerCase(), incomingSignature.toLowerCase())
	) {
		return true;
	}

	return false;
}
