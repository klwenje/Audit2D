import { useEffect, useMemo, useRef } from "react";
import {
  decor,
  deskInteractZone,
  deskZone,
  furniture,
  intersects,
  isBlocked,
  OFFICE_HEIGHT,
  OFFICE_WIDTH,
  PLAYER_SIZE,
  PLAYER_SPEED,
  type OfficeFixture,
  walls,
} from "./officeLayout";
import { useGameStore } from "../store/useGameStore";

const canvasWidth = OFFICE_WIDTH;
const canvasHeight = OFFICE_HEIGHT;

const palette = {
  outer: "#050a10",
  roomDark: "#0b1420",
  roomMid: "#122131",
  roomLight: "#1b3246",
  wall: "#243a50",
  wallHighlight: "#385b79",
  floor: "#182736",
  floorAlt: "#203445",
  floorLine: "rgba(141, 174, 204, 0.13)",
  trim: "#36536c",
  shadow: "rgba(0, 0, 0, 0.33)",
  deepShadow: "rgba(0, 0, 0, 0.5)",
  highlight: "#8ad3ff",
  paper: "#f3e7b0",
  paperDark: "#d4c18a",
  text: "#d6e1f0",
  plant: "#86b178",
  green: "#9de4b0",
  brass: "#cba45d",
  monitor: "#79c2ff",
  monitorGlow: "rgba(121, 194, 255, 0.34)",
  accent: "#fff7bf",
};

type Point = {
  x: number;
  y: number;
};

function drawRectShadow(
  ctx: CanvasRenderingContext2D,
  rect: OfficeFixture,
  fill: string,
  offsetX = 4,
  offsetY = 5,
) {
  ctx.fillStyle = palette.deepShadow;
  ctx.fillRect(rect.x + offsetX, rect.y + offsetY, rect.width, rect.height);
  ctx.fillStyle = fill;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
}

function drawInsetPanel(
  ctx: CanvasRenderingContext2D,
  rect: OfficeFixture,
  fill: string,
  accent: string,
  shadow = palette.shadow,
) {
  ctx.fillStyle = shadow;
  ctx.fillRect(rect.x + 4, rect.y + 4, rect.width, rect.height);
  ctx.fillStyle = fill;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = accent;
  ctx.fillRect(rect.x + 2, rect.y + 2, rect.width - 4, 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(rect.x + 2, rect.y + 4, 2, rect.height - 6);
  ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
  ctx.fillRect(rect.x + rect.width - 2, rect.y + 2, 2, rect.height - 4);
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign = "left") {
  ctx.save();
  ctx.font = '10px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = align;
  ctx.fillStyle = "rgba(245, 242, 220, 0.88)";
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.restore();
}

function drawClock(ctx: CanvasRenderingContext2D, rect: OfficeFixture, time: number) {
  const radius = Math.min(rect.width, rect.height) / 2;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  ctx.save();
  ctx.fillStyle = palette.deepShadow;
  ctx.beginPath();
  ctx.arc(centerX + 3, centerY + 4, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.roomLight;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = palette.highlight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 247, 191, 0.68)";
  ctx.lineWidth = 1.5;
  const minute = time / 2400;
  const minuteAngle = Math.PI * 2 * (minute % 1);
  const hourAngle = minuteAngle * 0.25 - Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + Math.cos(hourAngle) * 8, centerY + Math.sin(hourAngle) * 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + Math.cos(minuteAngle - Math.PI / 2) * 11, centerY + Math.sin(minuteAngle - Math.PI / 2) * 11);
  ctx.stroke();
  ctx.restore();
}

function drawVent(ctx: CanvasRenderingContext2D, rect: OfficeFixture) {
  ctx.save();
  ctx.fillStyle = palette.deepShadow;
  ctx.fillRect(rect.x + 3, rect.y + 3, rect.width, rect.height);
  ctx.fillStyle = palette.roomLight;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  for (let i = 0; i < 4; i += 1) {
    ctx.fillRect(rect.x + 5, rect.y + 4 + i * 4, rect.width - 10, 1);
  }
  ctx.restore();
}

function drawBulletinBoard(ctx: CanvasRenderingContext2D, rect: OfficeFixture) {
  ctx.save();
  ctx.fillStyle = palette.shadow;
  ctx.fillRect(rect.x + 4, rect.y + 5, rect.width, rect.height);
  ctx.fillStyle = "#1a2736";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = palette.highlight;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rect.x + 1, rect.y + 1, rect.width - 2, rect.height - 2);
  ctx.fillStyle = "rgba(121, 194, 255, 0.13)";
  ctx.fillRect(rect.x + 6, rect.y + 6, rect.width - 12, 18);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(rect.x + 10, rect.y + 28, rect.width - 20, 6);
  ctx.fillRect(rect.x + 12, rect.y + 40, rect.width - 30, 4);
  ctx.fillRect(rect.x + 18, rect.y + 53, rect.width - 42, 4);
  ctx.fillStyle = palette.brass;
  ctx.fillRect(rect.x + 8, rect.y + 8, 5, 5);
  ctx.fillRect(rect.x + rect.width - 13, rect.y + 8, 5, 5);
  ctx.fillRect(rect.x + 8, rect.y + rect.height - 13, 5, 5);
  ctx.fillRect(rect.x + rect.width - 13, rect.y + rect.height - 13, 5, 5);
  ctx.restore();
}

function drawPlant(ctx: CanvasRenderingContext2D, rect: OfficeFixture) {
  const potHeight = Math.max(10, Math.floor(rect.height * 0.25));
  const leavesHeight = rect.height - potHeight;
  ctx.save();
  ctx.fillStyle = palette.deepShadow;
  ctx.fillRect(rect.x + 3, rect.y + 5, rect.width, rect.height);
  ctx.fillStyle = "#6b4429";
  ctx.fillRect(rect.x + 4, rect.y + rect.height - potHeight, rect.width - 8, potHeight);
  ctx.fillStyle = "#8b5c37";
  ctx.fillRect(rect.x + 6, rect.y + rect.height - potHeight + 2, rect.width - 12, 4);
  ctx.fillStyle = palette.plant;
  ctx.fillRect(rect.x + 9, rect.y + 6, 4, leavesHeight - 2);
  ctx.fillRect(rect.x + 13, rect.y + 2, 4, leavesHeight);
  ctx.fillRect(rect.x + 17, rect.y + 6, 4, leavesHeight - 3);
  ctx.fillRect(rect.x + 21, rect.y + 1, 4, leavesHeight - 1);
  ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
  ctx.fillRect(rect.x + 10, rect.y + 7, 2, leavesHeight - 4);
  ctx.restore();
}

function drawPaperStack(ctx: CanvasRenderingContext2D, rect: OfficeFixture) {
  ctx.save();
  ctx.fillStyle = palette.deepShadow;
  ctx.fillRect(rect.x + 3, rect.y + 4, rect.width, rect.height);
  ctx.fillStyle = "#2d4257";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = palette.paper;
  ctx.fillRect(rect.x + 3, rect.y + 3, rect.width - 8, rect.height - 8);
  ctx.fillStyle = palette.paperDark;
  ctx.fillRect(rect.x + 6, rect.y + 6, rect.width - 14, 3);
  ctx.fillRect(rect.x + 6, rect.y + 12, rect.width - 18, 2);
  ctx.fillRect(rect.x + 8, rect.y + 18, rect.width - 16, 2);
  ctx.restore();
}

function drawChair(ctx: CanvasRenderingContext2D, rect: OfficeFixture) {
  ctx.save();
  ctx.fillStyle = palette.deepShadow;
  ctx.fillRect(rect.x + 3, rect.y + 4, rect.width, rect.height);
  ctx.fillStyle = "#344d60";
  ctx.fillRect(rect.x + 2, rect.y + 2, rect.width - 4, rect.height - 10);
  ctx.fillStyle = "#243849";
  ctx.fillRect(rect.x + 6, rect.y + 4, rect.width - 12, rect.height - 18);
  ctx.fillStyle = "#1a2633";
  ctx.fillRect(rect.x + Math.floor(rect.width / 2) - 1, rect.y + rect.height - 10, 2, 10);
  ctx.fillRect(rect.x + 2, rect.y + rect.height - 5, rect.width - 4, 2);
  ctx.fillStyle = "rgba(138, 211, 255, 0.18)";
  ctx.fillRect(rect.x + 6, rect.y + 6, rect.width - 16, 3);
  ctx.restore();
}

function drawArchiveCabinet(ctx: CanvasRenderingContext2D, rect: OfficeFixture) {
  ctx.save();
  drawRectShadow(ctx, rect, "#36485d");
  ctx.fillStyle = "#4a6178";
  ctx.fillRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8);
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.fillRect(rect.x + 6, rect.y + 8, rect.width - 12, 3);
  ctx.fillStyle = "#243647";
  ctx.fillRect(rect.x + 12, rect.y + 18, rect.width - 24, 2);
  ctx.fillRect(rect.x + 12, rect.y + 48, rect.width - 24, 2);
  ctx.fillRect(rect.x + 12, rect.y + 78, rect.width - 24, 2);
  ctx.fillRect(rect.x + 12, rect.y + 96, rect.width - 24, 2);
  ctx.fillStyle = palette.highlight;
  ctx.fillRect(rect.x + rect.width - 14, rect.y + 26, 3, 14);
  ctx.fillRect(rect.x + rect.width - 14, rect.y + 66, 3, 14);
  ctx.restore();
}

function drawBoxStack(ctx: CanvasRenderingContext2D, rect: OfficeFixture) {
  ctx.save();
  drawRectShadow(ctx, rect, "#56463a");
  ctx.fillStyle = "#6a5747";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = "#7b6959";
  ctx.fillRect(rect.x + 3, rect.y + 3, rect.width - 8, 8);
  ctx.fillStyle = "rgba(255, 247, 191, 0.18)";
  ctx.fillRect(rect.x + 5, rect.y + 16, rect.width - 12, 3);
  ctx.fillRect(rect.x + 6, rect.y + 24, rect.width - 16, 3);
  ctx.fillRect(rect.x + 8, rect.y + 32, rect.width - 18, 3);
  ctx.restore();
}

function drawMeetingTable(ctx: CanvasRenderingContext2D, rect: OfficeFixture, time: number, nearDesk: boolean) {
  ctx.save();
  drawRectShadow(ctx, rect, "#5d4d39");
  ctx.fillStyle = "#6f5a43";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = "#8a7457";
  ctx.fillRect(rect.x + 3, rect.y + 4, rect.width - 6, 6);
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(rect.x + 8, rect.y + 9, rect.width - 18, 2);
  ctx.fillStyle = "#445567";
  ctx.fillRect(rect.x + 8, rect.y - 6, 10, 10);
  ctx.fillRect(rect.x + rect.width - 18, rect.y - 6, 10, 10);
  ctx.fillRect(rect.x + 8, rect.y + rect.height - 4, 10, 8);
  ctx.fillRect(rect.x + rect.width - 18, rect.y + rect.height - 4, 10, 8);
  ctx.fillStyle = palette.paper;
  ctx.fillRect(rect.x + 26, rect.y + 10, 22, 16);
  ctx.fillStyle = nearDesk ? "rgba(121, 194, 255, 0.24)" : "rgba(255, 247, 191, 0.14)";
  ctx.fillRect(rect.x + 24, rect.y + 8, 26, 20);
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  const pulse = 0.5 + Math.sin(time / 280) * 0.5;
  ctx.fillRect(rect.x + 62, rect.y + 13, 36, 3 + pulse);
  ctx.restore();
}

function drawDeskStation(ctx: CanvasRenderingContext2D, rect: OfficeFixture, time: number, nearDesk: boolean) {
  ctx.save();
  drawRectShadow(ctx, rect, "#5c4c39", 5, 7);
  ctx.fillStyle = "#69553f";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = "#836a4d";
  ctx.fillRect(rect.x + 4, rect.y + 4, rect.width - 8, 7);
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.fillRect(rect.x + 10, rect.y + 18, rect.width - 20, 3);
  ctx.fillStyle = "#3b4d5e";
  ctx.fillRect(rect.x + 12, rect.y + 18, 50, 30);
  ctx.fillStyle = nearDesk ? palette.monitor : "#6ea9d8";
  ctx.fillRect(rect.x + 18, rect.y + 23, 38, 18);
  ctx.fillStyle = palette.monitorGlow;
  const glow = 0.4 + Math.sin(time / 220) * 0.18 + (nearDesk ? 0.14 : 0);
  ctx.fillRect(rect.x + 16, rect.y + 21, 42, 22);
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.fillRect(rect.x + 22, rect.y + 28, 14, 2);
  ctx.fillStyle = "#243647";
  ctx.fillRect(rect.x + 76, rect.y + 23, 26, 5);
  ctx.fillRect(rect.x + 76, rect.y + 31, 18, 3);
  ctx.fillStyle = "#1d2832";
  ctx.fillRect(rect.x + 110, rect.y + 20, 26, 26);
  ctx.fillStyle = "rgba(255, 247, 191, 0.72)";
  ctx.fillRect(rect.x + 112, rect.y + 23, 22, 18);
  ctx.fillStyle = "#f6cf65";
  ctx.fillRect(rect.x + 144, rect.y + 18, 6, 7);
  ctx.fillRect(rect.x + 138, rect.y + 28, 12, 3);
  ctx.fillStyle = palette.paper;
  ctx.fillRect(rect.x + 28, rect.y + 42, 18, 7);
  ctx.fillStyle = "#2d4257";
  ctx.fillRect(rect.x + 32, rect.y + 47, 10, 2);
  ctx.fillStyle = "#324756";
  ctx.fillRect(rect.x + 54, rect.y + 43, 14, 4);
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(rect.x + 8, rect.y + 8, rect.width - 16, 2);
  ctx.restore();
  if (glow > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(121, 194, 255, ${glow})`;
    ctx.fillRect(rect.x + 18, rect.y + 22, 38, 18);
    ctx.restore();
  }
}

function drawMonitor(ctx: CanvasRenderingContext2D, rect: OfficeFixture, time: number, nearDesk: boolean) {
  ctx.save();
  drawRectShadow(ctx, rect, "#304355", 3, 4);
  ctx.fillStyle = "#425669";
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = nearDesk ? palette.monitor : "#5a7591";
  ctx.fillRect(rect.x + 6, rect.y + 6, rect.width - 12, rect.height - 12);
  ctx.fillStyle = "#0c1118";
  ctx.fillRect(rect.x + 10, rect.y + 10, rect.width - 20, rect.height - 20);
  ctx.fillStyle = "rgba(121, 194, 255, 0.22)";
  const sweep = (time / 30) % (rect.width - 20);
  ctx.fillRect(rect.x + 10 + sweep * 0.12, rect.y + 10, 8, rect.height - 20);
  ctx.fillStyle = "#f6cf65";
  ctx.fillRect(rect.x + 12, rect.y + 12, rect.width - 24, 4);
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(rect.x + 14, rect.y + rect.height - 10, rect.width - 28, 2);
  ctx.restore();
}

function drawCoatRack(ctx: CanvasRenderingContext2D, rect: OfficeFixture) {
  ctx.save();
  drawRectShadow(ctx, rect, "#374b60");
  ctx.fillStyle = "#4b6074";
  ctx.fillRect(rect.x + 11, rect.y + 3, 4, rect.height - 8);
  ctx.fillRect(rect.x + 3, rect.y + 2, 20, 4);
  ctx.fillStyle = palette.paper;
  ctx.fillRect(rect.x + 2, rect.y + 9, 22, 12);
  ctx.fillStyle = palette.brass;
  ctx.fillRect(rect.x + 9, rect.y + 24, 6, 6);
  ctx.fillStyle = "#6a563f";
  ctx.fillRect(rect.x + 6, rect.y + rect.height - 4, 12, 4);
  ctx.restore();
}

function drawDecor(ctx: CanvasRenderingContext2D, fixture: OfficeFixture, time: number) {
  switch (fixture.kind) {
    case "bulletinBoard":
      drawBulletinBoard(ctx, fixture);
      break;
    case "clock":
      drawClock(ctx, fixture, time);
      break;
    case "vent":
      drawVent(ctx, fixture);
      break;
    case "plant":
      drawPlant(ctx, fixture);
      break;
    case "coatRack":
      drawCoatRack(ctx, fixture);
      break;
    case "chair":
      drawChair(ctx, fixture);
      break;
    case "paperStack":
      drawPaperStack(ctx, fixture);
      break;
    default:
      drawInsetPanel(ctx, fixture, "#2a3e50", "#57799a");
      break;
  }
  if (fixture.label) {
    drawLabel(ctx, fixture.label, fixture.x + fixture.width / 2, fixture.y - 4, "center");
  }
}

function drawFurniture(ctx: CanvasRenderingContext2D, fixture: OfficeFixture, time: number, nearDesk: boolean) {
  switch (fixture.kind) {
    case "deskStation":
      drawDeskStation(ctx, fixture, time, nearDesk);
      break;
    case "monitor":
      drawMonitor(ctx, fixture, time, nearDesk);
      break;
    case "archiveCabinet":
      drawArchiveCabinet(ctx, fixture);
      break;
    case "boxStack":
      drawBoxStack(ctx, fixture);
      break;
    case "meetingTable":
      drawMeetingTable(ctx, fixture, time, nearDesk);
      break;
    default:
      drawInsetPanel(ctx, fixture, "#31495c", "#57799a");
      break;
  }
  if (fixture.label) {
    drawLabel(ctx, fixture.label, fixture.x + fixture.width / 2, fixture.y - 5, "center");
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, position: Point, time: number) {
  const bob = Math.sin(time / 180) * 0.8;
  const x = position.x;
  const y = position.y + bob;
  const shadowWidth = PLAYER_SIZE + 2;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(x + 2, y + PLAYER_SIZE - 1, shadowWidth, 4);
  ctx.fillStyle = "#1d2531";
  ctx.fillRect(x + 3, y + 4, 12, 11);
  ctx.fillStyle = "#f6cf65";
  ctx.fillRect(x + 4, y + 3, 10, 11);
  ctx.fillStyle = "#11161d";
  ctx.fillRect(x + 6, y + 5, 3, 3);
  ctx.fillRect(x + 11, y + 5, 3, 3);
  ctx.fillStyle = "#0f141b";
  ctx.fillRect(x + 7, y + 10, 5, 2);
  ctx.fillStyle = "#9de4b0";
  ctx.fillRect(x + 8, y + 12, 3, 4);
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(x + 5, y + 4, 2, 3);
  ctx.restore();
}

function drawFloor(ctx: CanvasRenderingContext2D, time: number) {
  const floorTop = 28;
  const floorBottom = OFFICE_HEIGHT - 18;
  const floorLeft = 18;
  const floorRight = OFFICE_WIDTH - 18;

  const floorGradient = ctx.createLinearGradient(0, floorTop, 0, floorBottom);
  floorGradient.addColorStop(0, palette.roomMid);
  floorGradient.addColorStop(0.6, palette.floor);
  floorGradient.addColorStop(1, "#111a24");
  ctx.fillStyle = floorGradient;
  ctx.fillRect(floorLeft, floorTop, floorRight - floorLeft, floorBottom - floorTop);

  ctx.fillStyle = "rgba(138, 211, 255, 0.08)";
  ctx.fillRect(22, 34, OFFICE_WIDTH - 44, 18);
  ctx.fillStyle = "rgba(255, 247, 191, 0.06)";
  ctx.fillRect(22, 50, OFFICE_WIDTH - 44, 4);

  ctx.strokeStyle = palette.floorLine;
  ctx.lineWidth = 1;
  for (let x = 34; x < OFFICE_WIDTH - 26; x += 34) {
    ctx.beginPath();
    ctx.moveTo(x, 54);
    ctx.lineTo(x + 18, floorBottom - 10);
    ctx.stroke();
  }
  for (let y = 72; y < floorBottom - 10; y += 24) {
    ctx.beginPath();
    ctx.moveTo(26, y);
    ctx.lineTo(OFFICE_WIDTH - 26, y + 8);
    ctx.stroke();
  }

  const carpetPulse = 0.5 + Math.sin(time / 300) * 0.12;
  ctx.fillStyle = `rgba(33, 52, 69, ${0.9 + carpetPulse * 0.05})`;
  ctx.fillRect(186, 198, 296, 88);
  ctx.fillStyle = "rgba(121, 194, 255, 0.08)";
  ctx.fillRect(200, 210, 264, 14);
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.fillRect(202, 286, 260, 4);
}

function drawWalls(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = palette.outer;
  ctx.fillRect(0, 0, OFFICE_WIDTH, OFFICE_HEIGHT);

  const wallGradient = ctx.createLinearGradient(0, 18, 0, 138);
  wallGradient.addColorStop(0, "#152232");
  wallGradient.addColorStop(1, palette.roomDark);
  ctx.fillStyle = wallGradient;
  ctx.fillRect(18, 18, OFFICE_WIDTH - 36, 120);

  const backWall = ctx.createLinearGradient(0, 138, 0, OFFICE_HEIGHT - 18);
  backWall.addColorStop(0, palette.roomMid);
  backWall.addColorStop(1, "#101821");
  ctx.fillStyle = backWall;
  ctx.fillRect(18, 138, OFFICE_WIDTH - 36, OFFICE_HEIGHT - 156);

  ctx.fillStyle = "#2b4359";
  ctx.fillRect(18, 138, OFFICE_WIDTH - 36, 6);
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  ctx.fillRect(24, 24, OFFICE_WIDTH - 48, 2);

  const wallLight = ctx.createRadialGradient(120, 72, 16, 120, 72, 162);
  wallLight.addColorStop(0, "rgba(138, 211, 255, 0.11)");
  wallLight.addColorStop(1, "rgba(138, 211, 255, 0)");
  ctx.fillStyle = wallLight;
  ctx.fillRect(18, 18, OFFICE_WIDTH - 36, 140);
}

function drawDeskGlow(ctx: CanvasRenderingContext2D, time: number, nearDesk: boolean) {
  const pulse = 0.45 + Math.sin(time / 220) * 0.18 + (nearDesk ? 0.15 : 0);
  const glow = ctx.createRadialGradient(450, 172, 18, 450, 172, 84);
  glow.addColorStop(0, `rgba(121, 194, 255, ${pulse})`);
  glow.addColorStop(1, "rgba(121, 194, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(360, 132, 188, 112);
}

function renderOfficeCanvas(
  ctx: CanvasRenderingContext2D,
  playerPosition: Point,
  nearDesk: boolean,
  time: number,
) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  drawWalls(ctx);
  drawFloor(ctx, time);

  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.fillRect(30, 24, OFFICE_WIDTH - 60, 6);

  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(30, 28, OFFICE_WIDTH - 60, 2);

  drawDeskGlow(ctx, time, nearDesk);

  decor.forEach((fixture) => drawDecor(ctx, fixture, time));
  furniture.forEach((fixture) => drawFurniture(ctx, fixture, time, nearDesk));

  ctx.strokeStyle = nearDesk ? palette.green : palette.trim;
  ctx.lineWidth = 2;
  ctx.strokeRect(
    deskInteractZone.x,
    deskInteractZone.y,
    deskInteractZone.width,
    deskInteractZone.height,
  );
  ctx.fillStyle = nearDesk ? "rgba(157, 228, 176, 0.1)" : "rgba(74, 96, 117, 0.08)";
  ctx.fillRect(
    deskInteractZone.x,
    deskInteractZone.y,
    deskInteractZone.width,
    deskInteractZone.height,
  );

  drawPlayer(ctx, playerPosition, time);

  ctx.save();
  ctx.fillStyle = "rgba(214, 225, 240, 0.85)";
  ctx.font = '10px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText("Records", 93, 76);
  ctx.fillText("Plant", 151, 87);
  ctx.fillText("Meeting Table", 270, 235);
  ctx.fillText("Desk Terminal", 404, 72);
  ctx.fillText("Mail Tray", 360, 32);
  ctx.restore();

  ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
  ctx.fillRect(18, 18, OFFICE_WIDTH - 36, OFFICE_HEIGHT - 36);
}

export function OfficeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const movementFrameRef = useRef<number | null>(null);
  const renderFrameRef = useRef<number | null>(null);
  const pressedKeys = useRef<Set<string>>(new Set());

  const playerPosition = useGameStore((state) => state.playerPosition);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);

  const isNearDesk = useMemo(
    () =>
      intersects(
        {
          x: playerPosition.x,
          y: playerPosition.y,
          width: PLAYER_SIZE,
          height: PLAYER_SIZE,
        },
        deskInteractZone,
      ),
    [playerPosition.x, playerPosition.y],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      pressedKeys.current.add(event.key.toLowerCase());
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.key.toLowerCase());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      const horizontal =
        (pressedKeys.current.has("arrowright") || pressedKeys.current.has("d") ? 1 : 0) -
        (pressedKeys.current.has("arrowleft") || pressedKeys.current.has("a") ? 1 : 0);
      const vertical =
        (pressedKeys.current.has("arrowdown") || pressedKeys.current.has("s") ? 1 : 0) -
        (pressedKeys.current.has("arrowup") || pressedKeys.current.has("w") ? 1 : 0);

      if (horizontal !== 0 || vertical !== 0) {
        const nextX = playerPosition.x + horizontal * PLAYER_SPEED;
        const nextY = playerPosition.y + vertical * PLAYER_SPEED;

        const nextHorizontal = {
          x: nextX,
          y: playerPosition.y,
          width: PLAYER_SIZE,
          height: PLAYER_SIZE,
        };
        const nextVertical = {
          x: playerPosition.x,
          y: nextY,
          width: PLAYER_SIZE,
          height: PLAYER_SIZE,
        };

        let updatedX = playerPosition.x;
        let updatedY = playerPosition.y;

        if (!isBlocked(nextHorizontal)) {
          updatedX = nextX;
        }

        if (!isBlocked(nextVertical)) {
          updatedY = nextY;
        }

        if (updatedX !== playerPosition.x || updatedY !== playerPosition.y) {
          setPlayerPosition({ x: updatedX, y: updatedY });
        }
      }

      movementFrameRef.current = window.requestAnimationFrame(tick);
    };

    movementFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (movementFrameRef.current !== null) {
        window.cancelAnimationFrame(movementFrameRef.current);
      }
    };
  }, [playerPosition.x, playerPosition.y, setPlayerPosition]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    let frame = 0;
    const draw = (time: number) => {
      renderOfficeCanvas(
        context,
        { x: playerPosition.x, y: playerPosition.y },
        isNearDesk,
        time + frame,
      );
      frame += 1;
      renderFrameRef.current = window.requestAnimationFrame(draw);
    };

    renderFrameRef.current = window.requestAnimationFrame(draw);

    return () => {
      if (renderFrameRef.current !== null) {
        window.cancelAnimationFrame(renderFrameRef.current);
      }
    };
  }, [isNearDesk, playerPosition.x, playerPosition.y]);

  return (
    <div className="office-canvas-shell">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="office-canvas"
      />
      <div className="scanlines office-scanlines" aria-hidden="true" />
      {isNearDesk && (
        <div className="interaction-hint">
          Press <strong>E</strong> to use computer
        </div>
      )}
    </div>
  );
}
