export const ROOM_TABLE_SIZES = {
  "2x2": { length: 2, width: 2 },
  "3x2": { length: 3, width: 2 },
  "4x2": { length: 4, width: 2 },
  "4x2.5": { length: 4, width: 2.5 },
  "6x3": { length: 6, width: 3 },
} as const;

export type RoomTableSize = keyof typeof ROOM_TABLE_SIZES;

export interface RoomLayoutInput {
  roomLengthFt: number;
  roomWidthFt: number;
  tableSize: RoomTableSize;
  seatsPerTable: number;
  clearanceFt: number;
  aislePct: number;
}

export interface RoomLayoutResult {
  tableLengthFt: number;
  tableWidthFt: number;
  footprintSqft: number;
  usableAreaSqft: number;
  tableCount: number;
  totalSeats: number;
  columns: number;
  rows: number;
}

export function calculateRoomLayout(input: RoomLayoutInput): RoomLayoutResult {
  const table = ROOM_TABLE_SIZES[input.tableSize];
  const clearance = input.clearanceFt;
  const tableLengthFt = table.length + clearance * 2;
  const tableWidthFt = table.width + clearance * 2;
  const footprintSqft = tableLengthFt * tableWidthFt;
  const usableAreaSqft =
    input.roomLengthFt * input.roomWidthFt * (1 - input.aislePct / 100);

  const tableCount = Math.max(
    0,
    Math.floor(usableAreaSqft / Math.max(footprintSqft, 0.0001))
  );
  const totalSeats = tableCount * input.seatsPerTable;
  const columns = Math.max(1, Math.floor(input.roomLengthFt / tableLengthFt));
  const rows = Math.max(1, Math.floor(input.roomWidthFt / tableWidthFt));

  return {
    tableLengthFt,
    tableWidthFt,
    footprintSqft,
    usableAreaSqft,
    tableCount,
    totalSeats,
    columns,
    rows,
  };
}
