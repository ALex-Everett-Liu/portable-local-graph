// Main application file - orchestrates all modules
// This file coordinates the initialization of all modular components

// Initialize application when DOM is ready
function initializeApplication() {
    console.log('Initializing modular application...');
    
    // Initialize all modules in sequence
    initializeGraph();
    setupEventListeners();
    setupIPC();
    setupSearchComponents();
    setupSidebarResize();
    
    // Load initial data
    updateGraphInfo();
    loadQuickAccess();
    renderQuickAccess();
    
    // Initialize database
    initializeDatabase();
    
    console.log('Application initialized successfully');
}

// Check if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
    // DOM is already loaded
    initializeApplication();
}