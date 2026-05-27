import type { Dashboard, DentalSpecialty } from "@dental/shared";

export const visitSpecialtyFocusOptions: Array<{ specialty: DentalSpecialty; title: string; hint: string }> = [
  { specialty: "therapist", title: "Терапия", hint: "кариес, эндо, реставрации" },
  { specialty: "orthopedist", title: "Ортопедия", hint: "коронки, вкладки, протезы" },
  { specialty: "surgeon", title: "Хирургия", hint: "удаления, швы, послеоперационно" },
  { specialty: "implantologist", title: "Имплантация", hint: "КТ, план, этапы" },
  { specialty: "orthodontist", title: "Ортодонтия", hint: "прикус, аппараты, брекеты" },
  { specialty: "periodontist", title: "Пародонтология", hint: "десна, карманы, recall" },
  { specialty: "hygienist", title: "Профилактика", hint: "гигиена, пародонтальный контроль" },
  { specialty: "pediatric", title: "Детская", hint: "дети, родители, профилактика" },
  { specialty: "radiologist", title: "Рентген", hint: "RVG, ОПТГ, КТ, описание" },
  { specialty: "universal", title: "Осмотр", hint: "консультация, план, маршрутизация" }
];

const specialtyReasonMatchers: Array<{ specialty: DentalSpecialty; pattern: RegExp }> = [
  { specialty: "implantologist", pattern: /имплант|костн|синус|остео/i },
  { specialty: "orthodontist", pattern: /ортодонт|брекет|элайн|прикус|скуч/i },
  { specialty: "orthopedist", pattern: /ортопед|корон|вклад|протез|скан|слеп/i },
  { specialty: "surgeon", pattern: /хирург|удал|шов|альвеолит|абсцесс|отек/i },
  { specialty: "periodontist", pattern: /пародонт|десн|карман|кровоточ|рецесс/i },
  { specialty: "hygienist", pattern: /гигиен|проф|чистк|налет|камень|air\s*flow/i },
  { specialty: "therapist", pattern: /леч|кариес|пульп|рестав|пломб|эндо|канал/i },
  { specialty: "radiologist", pattern: /рентген|сним|кт|cbct|оптг|трг|rvg/i },
  { specialty: "universal", pattern: /осмотр|консульт|первич/i }
];

export function inferSpecialtyFromText(value: string | null | undefined): DentalSpecialty | null {
  const text = value?.trim();
  if (!text) return null;
  return specialtyReasonMatchers.find((matcher) => matcher.pattern.test(text))?.specialty ?? null;
}

function firstClinicalSpecialty(specialties: DentalSpecialty[]): DentalSpecialty | null {
  return specialties.find((specialty) => specialty !== "universal") ?? specialties[0] ?? null;
}

export function inferDashboardVisitSpecialty(dashboard: Dashboard): DentalSpecialty {
  const appointment = dashboard.appointments.find((candidate) => candidate.id === dashboard.activeVisit.appointmentId) ?? null;
  const doctor = appointment
    ? dashboard.clinicSettings.staff.find((member) => member.id === appointment.doctorUserId && member.active) ?? null
    : null;
  const chair = appointment
    ? dashboard.clinicSettings.chairs.find((candidate) => candidate.id === appointment.chairId && candidate.active) ?? null
    : null;
  const reasonSpecialty = inferSpecialtyFromText(appointment?.reason);

  if (reasonSpecialty && doctor?.specialties.includes(reasonSpecialty)) return reasonSpecialty;
  return firstClinicalSpecialty(doctor?.specialties ?? []) ?? chair?.specialization ?? reasonSpecialty ?? "universal";
}
