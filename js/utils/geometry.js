/**
 * Geometry utility functions for graph operations
 */

/**
 * Calculate distance from point to line segment
 * @param {number} px - Point x coordinate
 * @param {number} py - Point y coordinate  
 * @param {number} x1 - Line segment start x
 * @param {number} y1 - Line segment start y
 * @param {number} x2 - Line segment end x
 * @param {number} y2 - Line segment end y
 * @returns {number} Distance from point to line segment
 */
export function distanceToLineSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (len * len)));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    
    return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
}

/**
 * Check if a point is within a circle (node)
 * @param {number} px - Point x coordinate
 * @param {number} py - Point y coordinate
 * @param {number} cx - Circle center x
 * @param {number} cy - Circle center y
 * @param {number} radius - Circle radius
 * @returns {boolean} True if point is inside circle
 */
export function isPointInCircle(px, py, cx, cy, radius) {
    const dx = px - cx;
    const dy = py - cy;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
}

/**
 * Calculate distance between two points
 * @param {number} x1 - First point x
 * @param {number} y1 - First point y
 * @param {number} x2 - Second point x
 * @param {number} y2 - Second point y
 * @returns {number} Distance between points
 */
export function distanceBetweenPoints(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Convert screen coordinates to world coordinates
 * @param {number} screenX - Screen x coordinate
 * @param {number} screenY - Screen y coordinate
 * @param {number} offsetX - Canvas offset x
 * @param {number} offsetY - Canvas offset y
 * @param {number} scale - Current zoom scale
 * @returns {{x: number, y: number}} World coordinates
 */
export function screenToWorld(screenX, screenY, offsetX, offsetY, scale) {
    return {
        x: (screenX - offsetX) / scale,
        y: (screenY - offsetY) / scale
    };
}

/**
 * Convert world coordinates to screen coordinates
 * @param {number} worldX - World x coordinate
 * @param {number} worldY - World y coordinate
 * @param {number} offsetX - Canvas offset x
 * @param {number} offsetY - Canvas offset y
 * @param {number} scale - Current zoom scale
 * @returns {{x: number, y: number}} Screen coordinates
 */
export function worldToScreen(worldX, worldY, offsetX, offsetY, scale) {
    return {
        x: worldX * scale + offsetX,
        y: worldY * scale + offsetY
    };
}

/**
 * Calculate bounding box for visible area
 * @param {number} offsetX - Canvas offset x
 * @param {number} offsetY - Canvas offset y
 * @param {number} scale - Current zoom scale
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {{left: number, top: number, right: number, bottom: number}} Bounding box
 */
export function getVisibleBounds(offsetX, offsetY, scale, canvasWidth, canvasHeight) {
    return {
        left: -offsetX / scale,
        top: -offsetY / scale,
        right: (-offsetX + canvasWidth) / scale,
        bottom: (-offsetY + canvasHeight) / scale
    };
}

/**
 * Calculate grid boundaries for rendering
 * @param {number} left - Left boundary
 * @param {number} top - Top boundary
 * @param {number} right - Right boundary
 * @param {number} bottom - Bottom boundary
 * @param {number} gridSize - Grid cell size
 * @param {number} padding - Padding around boundaries
 * @returns {{startX: number, endX: number, startY: number, endY: number}} Grid boundaries
 */
export function calculateGridBounds(left, top, right, bottom, gridSize, padding = 0) {
    return {
        startX: Math.floor((left - padding) / gridSize) * gridSize,
        endX: Math.ceil((right + padding) / gridSize) * gridSize,
        startY: Math.floor((top - padding) / gridSize) * gridSize,
        endY: Math.ceil((bottom + padding) / gridSize) * gridSize
    };
}