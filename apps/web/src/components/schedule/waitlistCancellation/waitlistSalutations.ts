export function extractPatientPoliteName(fullName: string | null | undefined): string {
  const raw = (fullName || "").trim();
  if (!raw) return "Пациент";
  const parts = raw.split(/\s+/).filter(Boolean);

  if (parts.length === 3) {
    return `${parts[1]} ${parts[2]}`;
  }
  if (parts.length === 2) {
    const p0 = parts[0]!;
    const p1 = parts[1]!;
    if (/(ов|ова|ев|ева|ин|ина|ский|ская|ых|их)$/i.test(p0)) return p1;
    if (/(ов|ова|ев|ева|ин|ина|ский|ская|ых|их)$/i.test(p1)) return p0;
    return p0;
  }
  return parts[0] || "Пациент";
}

export function formatDoctorSalutation(doctorName?: string | null | undefined): string {
  if (!doctorName || !doctorName.trim()) return "доктора";
  const clean = doctorName.trim().replace(/^(д-р|доктор|врач)\s+/i, "");
  return `доктора ${clean}`;
}

export function generateWaitlistOfferMessage(params: {
  patientName?: string | null | undefined;
  doctorName?: string | null | undefined;
  startsAt: string;
  clinicName?: string;
}): string {
  const politeName = extractPatientPoliteName(params.patientName);
  const dateObj = new Date(params.startsAt);
  const now = new Date();

  const isToday =
    !Number.isNaN(dateObj.getTime()) &&
    dateObj.getFullYear() === now.getFullYear() &&
    dateObj.getMonth() === now.getMonth() &&
    dateObj.getDate() === now.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    !Number.isNaN(dateObj.getTime()) &&
    dateObj.getFullYear() === tomorrow.getFullYear() &&
    dateObj.getMonth() === tomorrow.getMonth() &&
    dateObj.getDate() === tomorrow.getDate();

  let dateWord = "сегодня";
  if (isTomorrow) {
    dateWord = "завтра";
  } else if (!isToday && !Number.isNaN(dateObj.getTime())) {
    dateWord = dateObj.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  }

  let timeStr = "10:00";
  if (params.startsAt && params.startsAt.includes("T")) {
    timeStr = params.startsAt.split("T")[1]?.slice(0, 5) || "10:00";
  } else if (!Number.isNaN(dateObj.getTime())) {
    timeStr = dateObj.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  const docSalutation = params.doctorName ? formatDoctorSalutation(params.doctorName) : null;
  const clinicNameStr = params.clinicName ? `«${params.clinicName}»` : "";

  let whoPhrase = "В клинике";
  if (docSalutation && clinicNameStr) {
    whoPhrase = `В клинике ${clinicNameStr} у ${docSalutation}`;
  } else if (docSalutation) {
    whoPhrase = `У ${docSalutation}`;
  } else if (clinicNameStr) {
    whoPhrase = `В клинике ${clinicNameStr}`;
  }

  return `Здравствуйте, ${politeName}! ${whoPhrase} освободилось удобное время для визита: ${dateWord} в ${timeStr}. Сможете подойти?`;
}
