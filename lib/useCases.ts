export const USE_CASES = [
  "CAFE",
  "OFFICE",
  "HOME",
  "HOSPITAL",
  "HOSTEL",
  "CANTEEN",
  "BAKERY",
  "HALL",
  "SCHOOL",
] as const;

export type UseCase = (typeof USE_CASES)[number];

export const USE_CASE_LABELS: Record<UseCase, string> = {
  CAFE: "Cafe & Dining",
  OFFICE: "Office & IT Desks",
  HOME: "Home & Residential",
  HOSPITAL: "Hospital & Clinic",
  HOSTEL: "PG & Hostel",
  CANTEEN: "Messes & Canteens",
  BAKERY: "Bakeries & Juice Shops",
  HALL: "Marriage Halls",
  SCHOOL: "Schools",
};

export const USE_CASE_OPTIONS = USE_CASES.map((value) => ({
  value,
  label: USE_CASE_LABELS[value],
}));

export function labelForUseCase(value: string): string {
  return USE_CASE_LABELS[value as UseCase] ?? value;
}
