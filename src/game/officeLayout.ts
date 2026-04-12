export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
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

export const furniture: Rect[] = [
  { x: 384, y: 78, width: 152, height: 62 },
  { x: 420, y: 142, width: 58, height: 34 },
  { x: 88, y: 82, width: 54, height: 104 },
  { x: 148, y: 92, width: 42, height: 42 },
  { x: 266, y: 242, width: 112, height: 42 },
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

