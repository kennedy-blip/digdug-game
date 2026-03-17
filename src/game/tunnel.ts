import { COLS, ROWS, TILE_SIZE, GROUND_START_ROW } from './constants';
import { TunnelGrid, Vec2 } from './types';

export function createTunnelGrid(): TunnelGrid {
  const grid: TunnelGrid = [];
  for (let row = 0; row < ROWS; row++) {
    grid[row] = [];
    for (let col = 0; col < COLS; col++) {
      // Sky rows are always open
      grid[row][col] = row < GROUND_START_ROW;
    }
  }
  return grid;
}

export function getTileCoord(x: number, y: number): Vec2 {
  return {
    x: Math.floor(x / TILE_SIZE),
    y: Math.floor(y / TILE_SIZE),
  };
}

export function isTunnel(grid: TunnelGrid, col: number, row: number): boolean {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  return grid[row][col];
}

export function digTunnel(
  grid: TunnelGrid,
  entityX: number,
  entityY: number,
  entityW: number,
  entityH: number
): TunnelGrid {
  const newGrid = grid.map(row => [...row]);

  // Dig cells covered by the entity bounding box
  const left = Math.floor(entityX / TILE_SIZE);
  const right = Math.floor((entityX + entityW - 1) / TILE_SIZE);
  const top = Math.floor(entityY / TILE_SIZE);
  const bottom = Math.floor((entityY + entityH - 1) / TILE_SIZE);

  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (row >= GROUND_START_ROW && row < ROWS && col >= 0 && col < COLS) {
        newGrid[row][col] = true;
      }
    }
  }

  return newGrid;
}

export function canMove(
  grid: TunnelGrid,
  x: number,
  y: number,
  w: number,
  h: number
): boolean {
  const left = Math.floor(x / TILE_SIZE);
  const right = Math.floor((x + w - 1) / TILE_SIZE);
  const top = Math.floor(y / TILE_SIZE);
  const bottom = Math.floor((y + h - 1) / TILE_SIZE);

  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (!isTunnel(grid, col, row)) return false;
    }
  }
  return true;
}

// Check if a single tile position is accessible for enemies
export function isTileOpen(grid: TunnelGrid, col: number, row: number): boolean {
  return isTunnel(grid, col, row);
}

// Get list of open neighbors for pathfinding
export function getOpenNeighbors(
  grid: TunnelGrid,
  col: number,
  row: number
): Vec2[] {
  const neighbors: Vec2[] = [];
  const dirs = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];
  for (const d of dirs) {
    const nc = col + d.x;
    const nr = row + d.y;
    if (isTunnel(grid, nc, nr)) {
      neighbors.push({ x: nc, y: nr });
    }
  }
  return neighbors;
}

// Check if a rect is fully in tunneled area
export function isRectInTunnel(grid: TunnelGrid, x: number, y: number, w: number, h: number): boolean {
  return canMove(grid, x, y, w, h);
}

// Check if there's a tunnel below a given rock tile (for falling)
export function isTileBelow(grid: TunnelGrid, col: number, row: number): boolean {
  return isTunnel(grid, col, row + 1);
}
