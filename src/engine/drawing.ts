/**
 * Drawing primitives (port of the parts of drawing.cpp / line_clip.cpp that
 * the game uses). They draw into the RGBA frame buffer (row stride = pitch)
 * with an RGBA colour.
 */

/** C++ `int(float)`: truncate toward zero; non-finite results become 0. */
const toInt = (f: number): number => (Number.isFinite(f) ? Math.trunc(f) : 0);

/**
 * Clip a line to [min, max). Returns the clipped end points or null when the
 * line is fully outside. Faithful to the original, including the fact that
 * the intercept is computed after x1/y1 has already been overwritten.
 */
export function clipLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): [number, number, number, number] | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let f: number;

  if (x1 < minX) {
    if (x2 < minX) return null;
    f = Math.fround(dy / dx);
    x1 = minX;
    y1 = toInt(f * minX + (y1 - x1 * f));
  } else if (x2 < minX) {
    f = Math.fround(dy / dx);
    x2 = minX;
    y2 = toInt(f * minX + (y1 - x1 * f));
  }

  if (x1 >= maxX) {
    if (x2 >= maxX) return null;
    f = Math.fround(dy / dx);
    x1 = maxX - 1;
    y1 = toInt(f * (maxX - 1) + (y1 - x1 * f));
  } else if (x2 > maxX) {
    f = Math.fround(dy / dx);
    x2 = maxX - 1;
    y2 = toInt(f * (maxX - 1) + (y1 - x1 * f));
  }

  if (y1 < minY) {
    if (y2 < minY) return null;
    f = Math.fround(dx / dy);
    y1 = minY;
    x1 = toInt(f * minY + (x1 - y1 * f));
  } else if (y2 < minY) {
    f = Math.fround(dx / dy);
    y2 = minY;
    x2 = toInt(f * minY + (x1 - y1 * f));
  }

  if (y1 >= maxY) {
    if (y2 >= maxY) return null;
    f = Math.fround(dx / dy);
    y1 = maxY - 1;
    x1 = toInt(f * (maxY - 1) + (x1 - y1 * f));
  } else if (y2 >= maxY) {
    f = Math.fround(dx / dy);
    y2 = maxY - 1;
    x2 = toInt(f * (maxY - 1) + (x1 - y1 * f));
  }

  if (x1 < minX) x1 = minX;
  if (x2 < minX) x2 = minX;
  if (x1 >= maxX) x1 = maxX - 1;
  if (x2 >= maxX) x2 = maxX - 1;
  if (y1 < minY) y1 = minY;
  if (y2 < minY) y2 = minY;
  if (y1 >= maxY) y1 = maxY - 1;
  if (y2 >= maxY) y2 = maxY - 1;

  return [x1, y1, x2, y2];
}

/** Bresenham line, clipped to the pitch × (buffer height) area. */
export function drawLine(
  video: Uint32Array,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  pitch: number,
  color: number,
): void {
  const clipped = clipLine(x1, y1, x2, y2, 0, 0, pitch, Math.floor(video.length / pitch));
  if (clipped === null) return;
  [x1, y1, x2, y2] = clipped;

  let ptr = x1 + y1 * pitch;
  let errterm = 0;
  let dX = x2 - x1;
  let dY = y2 - y1;
  let incy: number;
  let incx: number;

  if (dY < 0) {
    incy = -pitch;
    dY = -dY;
  } else {
    incy = pitch;
  }
  if (dX < 0) {
    incx = -1;
    dX = -dX;
  } else {
    incx = 1;
  }

  if (dX > dY) {
    for (let a = 0; a <= dX; a++) {
      video[ptr] = color;
      errterm += dY;
      if (errterm >= dX) {
        errterm -= dX;
        ptr += incy;
      }
      ptr += incx;
    }
  } else {
    for (let a = 0; a <= dY; a++) {
      video[ptr] = color;
      errterm += dX;
      if (errterm >= dY) {
        errterm -= dY;
        ptr += incx;
      }
      ptr += incy;
    }
  }
}

/** Filled rectangle. */
export function fillRect(
  screen: Uint32Array,
  x: number,
  y: number,
  dx: number,
  dy: number,
  pitch: number,
  color: number,
): void {
  if (dx <= 0) return;
  for (let i = 0; i < dy; i++) {
    const start = x + (y + i) * pitch;
    screen.fill(color, start, start + dx);
  }
}

/** Rectangle outline. */
export function strokeRect(
  screen: Uint32Array,
  x: number,
  y: number,
  dx: number,
  dy: number,
  pitch: number,
  color: number,
): void {
  drawLine(screen, x, y, x + dx, y, pitch, color);
  drawLine(screen, x + dx, y, x + dx, y + dy, pitch, color);
  drawLine(screen, x + dx, y + dy, x, y + dy, pitch, color);
  drawLine(screen, x, y + dy, x, y, pitch, color);
}

/** C `memset(buf + offset, value, count)` (per element: a pixel of the frame buffer or the collision buffer). */
export function memset(buf: Uint8Array | Uint32Array, offset: number, value: number, count: number): void {
  if (count <= 0) return;
  buf.fill(value, Math.max(0, offset), Math.max(0, offset + count));
}
