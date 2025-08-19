// Main application file - orchestrates all modules
// This file coordinates the initialization of all modular components

// Initialize application when DOM is ready and Graph is available
function initializeApplication() {
    console.log('Initializing modular application...');
    
    if (typeof Graph === 'undefined') {
        console.error('Graph class not available');
        return;
    }
    
    try {
        // Initialize all modules in sequence
        initializeGraph();
        setupEventListeners();
        setupIPC();
        setupSearchComponents();
        setupSidebarResize();
        
        // Initialize new modules
        initializeCommandPalette();
        initializeHotkeyMode();
        
        // Load initial data
        updateGraphInfo();
        loadQuickAccess();
        renderQuickAccess();
        
        // Initialize database
        initializeDatabase();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
    }
}

// Wait for Graph to be loaded and DOM ready
function waitForGraphAndInitialize() {
    if (typeof Graph !== 'undefined') {
        initializeApplication();
    } else {
        // Wait for graph-ready event
        window.addEventListener('graph-ready', initializeApplication);
    }
}

// Check if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForGraphAndInitialize);
} else {
    // DOM is already loaded
    waitForGraphAndInitialize();
}