export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OfficeFixtureKind =
  | "archiveCabinet"
  | "boxStack"
  | "meetingTable"
  | "printerCart"
  | "deskStation"
  | "bulletinBoard"
  | "clock"
  | "vent"
  | "plant"
  | "coatRack"
  | "monitor"
  | "paperStack"
  | "chair";

export type OfficeFixture = Rect & {
  kind: OfficeFixtureKind;
  label?: string;
};

export const OFFICE_WIDTH = 640;
export const OFFICE_HEIGHT = 360;
export const PLAYER_SIZE = 18;
export const PLAYER_SPEED = 2.4;

export const walls: Rect[] = [
  { x: 0, y: 0, width: OFFICE_WIDTH, height: 18 },
  { x: 0, y: OFFICE_HEIGHT - 18, width: OFFICE_WIDTH, height: 18 },
  { x: 0, y: 0, width: 18, height: OFFICE_HEIGHT },
  { x: OFFICE_WIDTH - 18, y: 0, width: 18, height: OFFICE_HEIGHT },
];

export const furniture: OfficeFixture[] = [
  { x: 378, y: 76, width: 156, height: 60, kind: "deskStation", label: "Terminal Desk" },
  { x: 420, y: 142, width: 58, height: 34, kind: "monitor", label: "Case Node" },
  { x: 88, y: 82, width: 54, height: 104, kind: "archiveCabinet", label: "Records" },
  { x: 148, y: 92, width: 42, height: 42, kind: "boxStack", label: "Audit Trail" },
  { x: 266, y: 242, width: 112, height: 42, kind: "meetingTable", label: "Standup Table" },
];

export const decor: OfficeFixture[] = [
  { x: 42, y: 42, width: 74, height: 108, kind: "bulletinBoard", label: "Controls" },
  { x: 137, y: 36, width: 24, height: 24, kind: "clock" },
  { x: 210, y: 38, width: 118, height: 34, kind: "vent" },
  { x: 362, y: 38, width: 64, height: 26, kind: "paperStack", label: "Mail Tray" },
  { x: 474, y: 44, width: 36, height: 68, kind: "plant" },
  { x: 546, y: 190, width: 26, height: 74, kind: "coatRack" },
  { x: 58, y: 214, width: 32, height: 46, kind: "chair", label: "Visitor" },
  { x: 500, y: 256, width: 56, height: 36, kind: "paperStack", label: "Hot Files" },
];

export const deskZone: Rect = { x: 372, y: 168, width: 164, height: 74 };
export const deskInteractZone: Rect = { x: 404, y: 184, width: 112, height: 54 };

export function intersects(a: Rect, b: Rect) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function isBlocked(next: Rect) {
  return [...walls, ...furniture].some((obstacle) => intersects(next, obstacle));
}
