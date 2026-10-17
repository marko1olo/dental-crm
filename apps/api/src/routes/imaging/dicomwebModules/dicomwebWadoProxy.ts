import dns from "node:dns/promises";
import net from "node:net";
import type {
	BlockedIpv4Range,
	BlockedIpv6Range,
	TargetSafety,
	WadoFrameRequest,
} from "./dicomwebTypes.js";
import { safeJoinUrl } from "./dicomwebQueryEngine.js";

export function ipv4ToUint32(ip: string): number | null {
	const parts = ip.split(".");
	if (parts.length !== 4) return null;
	let value = 0;
	for (const part of parts) {
		if (!/^(?:0|[1-9][0-9]{0,2})$/.test(part)) return null;
		const octet = Number(part);
		if (octet > 255) return null;
		value = value * 256 + octet;
	}
	return value >>> 0;
}

export function parseIpv4Cidr(cidr: string, why: string): BlockedIpv4Range {
	const [prefix, bitsText] = cidr.split("/");
	const base = ipv4ToUint32(prefix ?? "");
	const bits = Number(bitsText);
	if (base === null || !Number.isInteger(bits) || bits < 0 || bits > 32) {
		throw new Error(`Некорректный IPv4-CIDR в списке SSRF-блокировок: ${cidr}`);
	}
	const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
	return { cidr, base: (base & mask) >>> 0, mask, why };
}

export const blockedIpv4Ranges: readonly BlockedIpv4Range[] = [
	parseIpv4Cidr(
		"0.0.0.0/8",
		"«этот хост в этой сети» (RFC 1122); 0.0.0.0 на многих стеках означает локальный интерфейс",
	),
	parseIpv4Cidr(
		"10.0.0.0/8",
		"частная сеть RFC 1918 — внутренняя сеть клиники",
	),
	parseIpv4Cidr(
		"100.64.0.0/10",
		"CGNAT RFC 6598: операторский NAT и оборудование клиники за ним. Сюда же попадает 100.100.100.200 — эндпоинт метаданных Alibaba Cloud ECS, отдельная строка под него не нужна",
	),
	parseIpv4Cidr(
		"127.0.0.0/8",
		"loopback: сам сервер CRM, БД на 127.0.0.1:5432, локальные модули-мосты",
	),
	parseIpv4Cidr(
		"169.254.0.0/16",
		"link-local RFC 3927 и, главное, 169.254.169.254 — эндпоинт метаданных с временными учётными данными у AWS, GCP, Azure, Oracle Cloud, DigitalOcean, Hetzner и OpenStack",
	),
	parseIpv4Cidr("172.16.0.0/12", "частная сеть RFC 1918"),
	parseIpv4Cidr(
		"192.0.0.0/24",
		"назначения протоколов IETF: сюда входит 192.0.0.192 и служебные адреса NAT64/DS-Lite",
	),
	parseIpv4Cidr(
		"192.0.2.0/24",
		"TEST-NET-1 (RFC 5737): в реальной сети такой адрес указывает на подмену или на локальную заглушку",
	),
	parseIpv4Cidr("192.31.196.0/24", "AS112-v4 (RFC 7535) — служебный anycast"),
	parseIpv4Cidr("192.52.193.0/24", "AMT (RFC 7450) — служебный anycast"),
	parseIpv4Cidr(
		"192.88.99.0/24",
		"anycast-релей 6to4 (RFC 7526, объявлен устаревшим) — точка входа в чужой туннель",
	),
	parseIpv4Cidr("192.168.0.0/16", "частная сеть RFC 1918"),
	parseIpv4Cidr(
		"192.175.48.0/24",
		"прямое делегирование AS112 (RFC 7534) — служебный anycast",
	),
	parseIpv4Cidr(
		"198.18.0.0/15",
		"сетевой benchmark (RFC 2544): маршрутизируется внутрь лабораторных сегментов",
	),
	parseIpv4Cidr("198.51.100.0/24", "TEST-NET-2 (RFC 5737)"),
	parseIpv4Cidr("203.0.113.0/24", "TEST-NET-3 (RFC 5737)"),
	parseIpv4Cidr(
		"224.0.0.0/4",
		"multicast (RFC 5771): запрос уходит группе узлов внутренней сети, а не одному архиву",
	),
	parseIpv4Cidr(
		"240.0.0.0/4",
		"зарезервировано (RFC 1112); сюда же попадает широковещательный 255.255.255.255",
	),
];

export function ipv6ToBytes(ip: string): Uint8Array | null {
	const withoutZone = (ip.split("%")[0] ?? "").toLowerCase();
	const sides = withoutZone.split("::");
	if (sides.length > 2) return null;

	const readGroups = (text: string): number[] | null => {
		if (text === "") return [];
		const chunks = text.split(":");
		const groups: number[] = [];
		for (let index = 0; index < chunks.length; index += 1) {
			const chunk = chunks[index] ?? "";
			if (index === chunks.length - 1 && chunk.includes(".")) {
				const embedded = ipv4ToUint32(chunk);
				if (embedded === null) return null;
				groups.push((embedded >>> 16) & 0xffff, embedded & 0xffff);
				continue;
			}
			if (!/^[0-9a-f]{1,4}$/.test(chunk)) return null;
			groups.push(Number.parseInt(chunk, 16));
		}
		return groups;
	};

	const head = readGroups(sides[0] ?? "");
	const tail = sides.length === 2 ? readGroups(sides[1] ?? "") : [];
	if (head === null || tail === null) return null;

	let groups: number[];
	if (sides.length === 2) {
		const missing = 8 - head.length - tail.length;
		if (missing < 1) return null;
		groups = [...head, ...new Array<number>(missing).fill(0), ...tail];
	} else {
		if (head.length !== 8) return null;
		groups = head;
	}

	const bytes = new Uint8Array(16);
	for (let index = 0; index < 8; index += 1) {
		const group = groups[index] ?? 0;
		bytes[index * 2] = (group >>> 8) & 0xff;
		bytes[index * 2 + 1] = group & 0xff;
	}
	return bytes;
}

export function parseIpv6Cidr(cidr: string, why: string): BlockedIpv6Range {
	const [prefix, bitsText] = cidr.split("/");
	const base = ipv6ToBytes(prefix ?? "");
	const bits = Number(bitsText);
	if (base === null || !Number.isInteger(bits) || bits < 0 || bits > 128) {
		throw new Error(`Некорректный IPv6-CIDR в списке SSRF-блокировок: ${cidr}`);
	}
	return { cidr, base, bits, why };
}

export function ipv6InRange(bytes: Uint8Array, range: BlockedIpv6Range): boolean {
	const fullBytes = range.bits >> 3;
	for (let index = 0; index < fullBytes; index += 1) {
		if (bytes[index] !== range.base[index]) return false;
	}
	const restBits = range.bits & 7;
	if (restBits === 0) return true;
	const mask = (0xff << (8 - restBits)) & 0xff;
	return (
		((bytes[fullBytes] ?? 0) & mask) === ((range.base[fullBytes] ?? 0) & mask)
	);
}

export const ipv4MappedIpv6Range = parseIpv6Cidr("::ffff:0:0/96", "IPv4-mapped");

export const ipv4TranslatedIpv6Range = parseIpv6Cidr(
	"::ffff:0:0:0/96",
	"IPv4-translated (RFC 2765)",
);

export const nat64WellKnownRange = parseIpv6Cidr(
	"64:ff9b::/96",
	"NAT64 well-known (RFC 6052)",
);

export const ipv4CompatibleIpv6Range = parseIpv6Cidr(
	"::/96",
	"IPv4-compatible (устарел, RFC 4291)",
);

export const globalUnicastIpv6Range = parseIpv6Cidr("2000::/3", "глобальный юникаст");

export const blockedIpv6Ranges: readonly BlockedIpv6Range[] = [
	parseIpv6Cidr(
		"2001::/23",
		"назначения протоколов IETF: Teredo 2001::/32 (туннель в чужую сеть), benchmark 2001:2::/48, ORCHIDv2 2001:20::/28",
	),
	parseIpv6Cidr("2001:db8::/32", "документационный префикс (RFC 3849)"),
	parseIpv6Cidr(
		"2002::/16",
		"6to4 (RFC 7526, объявлен устаревшим): вторые четыре байта — произвольный IPv4, то есть готовый обход IPv4-фильтра через релей",
	),
	parseIpv6Cidr("2620:4f:8000::/48", "прямое делегирование AS112 (RFC 7534)"),
	parseIpv6Cidr("3fff::/20", "документационный префикс (RFC 9637)"),
	parseIpv6Cidr(
		"5f00::/16",
		"идентификаторы сегментов SRv6 (RFC 9602) — внутренняя маршрутизация оператора",
	),
];

export function isSafeIpv4(ip: string): boolean {
	const value = ipv4ToUint32(ip);
	if (value === null) return false;
	return !blockedIpv4Ranges.some(
		(range) => ((value ^ range.base) & range.mask) >>> 0 === 0,
	);
}

export function isSafeIpv6Bytes(bytes: Uint8Array): boolean {
	const embeddedIpv4 = `${bytes[12] ?? 0}.${bytes[13] ?? 0}.${bytes[14] ?? 0}.${bytes[15] ?? 0}`;

	if (ipv6InRange(bytes, ipv4MappedIpv6Range)) return isSafeIpv4(embeddedIpv4);
	if (ipv6InRange(bytes, ipv4TranslatedIpv6Range)) return isSafeIpv4(embeddedIpv4);
	if (ipv6InRange(bytes, nat64WellKnownRange)) return isSafeIpv4(embeddedIpv4);
	if (ipv6InRange(bytes, ipv4CompatibleIpv6Range)) return isSafeIpv4(embeddedIpv4);
	if (!ipv6InRange(bytes, globalUnicastIpv6Range)) return false;

	return !blockedIpv6Ranges.some((range) => ipv6InRange(bytes, range));
}

export function isSafeIp(ip: string): boolean {
	if (net.isIPv4(ip)) return isSafeIpv4(ip);
	if (net.isIPv6(ip)) {
		const bytes = ipv6ToBytes(ip);
		if (bytes === null) return false;
		return isSafeIpv6Bytes(bytes);
	}
	return false;
}

export async function isSafeTarget(urlString: string): Promise<TargetSafety> {
	let url: URL;
	try {
		url = new URL(urlString);
	} catch (err) {
		console.error("[Dente] fixed bare catch:", err);
		return { ok: false, reason: "адрес архива снимков не разбирается как URL" };
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		return { ok: false, reason: "поддерживаются только адреса http/https" };
	}

	const hostname = url.hostname
		.replace(/^\[|\]$/g, "")
		.replace(/\.$/, "")
		.toLowerCase();
	if (
		hostname === "" ||
		hostname === "localhost" ||
		hostname.endsWith(".localhost")
	) {
		return { ok: false, reason: "адрес указывает на сам сервер клиники" };
	}

	const addresses = await dns.lookup(hostname, { all: true }).catch(() => null);
	if (addresses === null) {
		return {
			ok: false,
			reason: "имя хоста архива снимков не резолвится с сервера клиники",
		};
	}

	if (addresses.length === 0) {
		return {
			ok: false,
			reason: "имя хоста архива снимков не дало ни одного адреса",
		};
	}

	if (addresses.some((entry) => !isSafeIp(entry.address))) {
		return {
			ok: false,
			reason:
				"адрес указывает на внутреннюю сеть, loopback или служебный диапазон",
		};
	}

	return { ok: true };
}

export function buildWadoInstanceUrl(
	endpointUrl: string,
	wadoRsPath: string,
	studyUid: string,
	seriesUid: string,
	sopUid: string,
): string {
	const basePath = wadoRsPath || "studies";
	return safeJoinUrl(
		endpointUrl,
		`${basePath}/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/instances/${encodeURIComponent(sopUid)}`,
	);
}

export function buildWadoFrameUrl(
	endpointUrl: string,
	wadoRsPath: string,
	studyUid: string,
	seriesUid: string,
	sopUid: string,
	frameNumber: number,
): string {
	const instanceUrl = buildWadoInstanceUrl(
		endpointUrl,
		wadoRsPath,
		studyUid,
		seriesUid,
		sopUid,
	);
	return `${instanceUrl}/frames/${Math.max(1, Math.floor(frameNumber))}`;
}

export function validateClinicRlsAccess(req: WadoFrameRequest): boolean {
	if (!req.organizationId || typeof req.organizationId !== "string") {
		return false;
	}
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(req.organizationId);
}
