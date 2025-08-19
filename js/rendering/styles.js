/**
 * Visual style calculations for graph rendering
 */
import { GRAPH_CONSTANTS, WEIGHT_MAPPING } from '../utils/constants.js';
import { clamp } from '../utils/algorithms.js';

/**
 * Calculate edge line width based on weight (inverted correlation)
 * Higher weight = thinner line (distance/cost semantics)
 * @param {number} weight - Edge weight (0.1-30)
 * @returns {number} Line width in pixels (0.5-8)
 */
export function getEdgeLineWidth(weight) {
    const clampedWeight = clamp(weight, GRAPH_CONSTANTS.MIN_EDGE_WEIGHT, GRAPH_CONSTANTS.MAX_EDGE_WEIGHT);
    
    // Inverted logarithmic mapping
    const logWeight = Math.log(clampedWeight + 0.1) + WEIGHT_MAPPING.LOG_OFFSET;
    const normalized = clamp((logWeight - WEIGHT_MAPPING.MIN_LOG_WEIGHT) / 
                          (WEIGHT_MAPPING.MAX_LOG_WEIGHT - WEIGHT_MAPPING.MIN_LOG_WEIGHT), 0, 1);
    
    // Invert the mapping: 1 - normalized
    const invertedNormalized = 1 - normalized;
    
    // Map to line width range: 0.5 to 8
    const baseWidth = GRAPH_CONSTANTS.MIN_LINE_WIDTH + 
                     (invertedNormalized * (GRAPH_CONSTANTS.MAX_LINE_WIDTH - GRAPH_CONSTANTS.MIN_LINE_WIDTH));
    
    return clamp(baseWidth, GRAPH_CONSTANTS.MIN_LINE_WIDTH, GRAPH_CONSTANTS.MAX_LINE_WIDTH);
}

/**
 * Calculate node radius based on zoom scale for consistent appearance
 * @param {number} baseRadius - Base node radius
 * @param {number} scale - Current zoom scale
 * @returns {number} Adjusted radius
 */
export function getScaledRadius(baseRadius, scale) {
    return baseRadius / scale;
}

/**
 * Calculate line width adjusted for zoom scale
 * @param {number} baseWidth - Base line width
 * @param {number} scale - Current zoom scale
 * @returns {number} Adjusted line width
 */
export function getScaledLineWidth(baseWidth, scale) {
    return Math.max(0.5, baseWidth / scale);
}

/**
 * Calculate text size adjusted for zoom scale
 * @param {number} baseSize - Base text size
 * @param {number} scale - Current zoom scale
 * @returns {number} Adjusted text size
 */
export function getScaledTextSize(baseSize, scale) {
    return Math.max(8, baseSize / scale);
}

/**
 * Generate gradient for highlighted nodes
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Node center x
 * @param {number} y - Node center y
 * @param {number} innerRadius - Inner radius of gradient
 * @param {number} outerRadius - Outer radius of gradient
 * @returns {CanvasGradient} Radial gradient
 */
export function createHighlightGradient(ctx, x, y, innerRadius, outerRadius) {
    const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 215, 0, 0.4)');
    gradient.addColorStop(0.7, 'rgba(255, 215, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    return gradient;
}

/**
 * Calculate pulsing radius for animated nodes
 * @param {number} baseRadius - Base node radius
 * @param {number} time - Current animation time
 * @returns {number} Pulsing radius
 */
export function getPulsingRadius(baseRadius, time) {
    const pulseScale = 1 + GRAPH_CONSTANTS.PULSE_AMPLITUDE * 
                      Math.sin(time * GRAPH_CONSTANTS.PULSE_FREQUENCY);
    return baseRadius * pulseScale;
}

/**
 * Truncate text to fit within maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = GRAPH_CONSTANTS.MAX_LABEL_LENGTH) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Calculate text background dimensions
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to measure
 * @param {number} fontSize - Font size
 * @returns {{width: number, height: number}} Text dimensions
 */
export function getTextDimensions(ctx, text, fontSize) {
    const metrics = ctx.measureText(text);
    return {
        width: metrics.width,
        height: fontSize
    };
}

/**
 * Determine if text background is needed based on text vs node size
 * @param {number} textWidth - Text width
 * @param {number} nodeRadius - Node radius
 * @param {number} threshold - Multiplier for node radius (default 1.5)
 * @returns {boolean} True if background is needed
 */
export function needsTextBackground(textWidth, nodeRadius, threshold = 1.5) {
    return textWidth > nodeRadius * threshold;
}

/**
 * Get node color based on selection state
 * @param {Object} node - Node object
 * @param {boolean} isSelected - Whether node is selected
 * @param {boolean} isHighlighted - Whether node is highlighted
 * @returns {string} Appropriate color
 */
export function getNodeColor(node, isSelected, isHighlighted) {
    if (isHighlighted) return node.color;
    if (isSelected) return GRAPH_CONSTANTS.SELECTED_NODE_COLOR;
    return node.color;
}

/**
 * Get node border color based on selection state
 * @param {Object} node - Node object
 * @param {boolean} isSelected - Whether node is selected
 * @param {boolean} isHighlighted - Whether node is highlighted
 * @returns {string} Appropriate border color
 */
export function getNodeBorderColor(node, isSelected, isHighlighted) {
    if (isHighlighted) return GRAPH_CONSTANTS.HIGHLIGHT_NODE_COLOR;
    if (isSelected) return GRAPH_CONSTANTS.SELECTED_NODE_BORDER;
    return GRAPH_CONSTANTS.DEFAULT_NODE_BORDER;
}

/**
 * Calculate appropriate font size for canvas
 * @param {number} baseSize - Base font size
 * @param {number} scale - Current zoom scale
 * @returns {string} Font size string for canvas
 */
export function getFontString(baseSize, scale) {
    const size = Math.max(8, baseSize / scale);
    return `${size}px ${GRAPH_CONSTANTS.DEFAULT_FONT_FAMILY}`;
}