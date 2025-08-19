export const GRAPH_CONSTANTS = {
    // Visual defaults
    DEFAULT_NODE_RADIUS: 20,
    DEFAULT_NODE_COLOR: '#6737E8',
    DEFAULT_EDGE_WEIGHT: 1,
    DEFAULT_LINE_WIDTH: 2,
    
    // Visual ranges
    MIN_NODE_RADIUS: 1,
    MAX_NODE_RADIUS: 100,
    MIN_EDGE_WEIGHT: 0.1,
    MAX_EDGE_WEIGHT: 30,
    MIN_LINE_WIDTH: 0.5,
    MAX_LINE_WIDTH: 8,
    
    // Grid settings
    GRID_SIZE: 30,
    GRID_COLOR: '#F0F0F0',
    GRID_LINE_WIDTH: 1,
    
    // Colors
    SELECTED_NODE_COLOR: '#87CEFA',
    SELECTED_NODE_BORDER: '#B0C4DE',
    HIGHLIGHT_NODE_COLOR: '#FFD700',
    DEFAULT_NODE_BORDER: '#C0C0C0',
    
    // Text settings
    DEFAULT_FONT_SIZE: 14,
    DEFAULT_FONT_FAMILY: 'Arial',
    TEXT_BACKGROUND_COLOR: 'rgba(105, 105, 105, 0.7)',
    TEXT_COLOR: '#ffffff',
    
    // Animation
    ANIMATION_FRAME_RATE: 60,
    PULSE_AMPLITUDE: 0.2,
    PULSE_FREQUENCY: 0.005,
    
    // Zoom limits
    MIN_SCALE: 0.1,
    MAX_SCALE: 5,
    ZOOM_SENSITIVITY: 0.1,
    
    // Interaction
    SELECTION_TOLERANCE: 5,
    MAX_LABEL_LENGTH: 20,
    
    // Centrality calculation constants
    MAX_ITERATIONS: 100,
    CONVERGENCE_THRESHOLD: 1e-6,
    DAMPING_FACTOR: 0.85,
    
    // UUID generation
    UUID_LENGTH: 9
};

export const WEIGHT_MAPPING = {
    MIN_LOG_WEIGHT: 1.5,
    MAX_LOG_WEIGHT: 3.5,
    LOG_OFFSET: 2.3,
    LOG_BASE: Math.log,
    INVERT_MAPPING: true
};