class AppController {
    constructor() {
        this.graph = null;
        this.dataManager = null;
        this.currentDialog = null;
        this.isDialogOpen = false;
        
        // State management
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = 50;
        
        // UI elements cache
        this.elements = {};
        
        this.init();
    }

    async init() {
        this.cacheElements();
        this.dataManager = new DataManager();
        
        await this.setupGraph();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.startRenderLoop();
        
        // Load initial data or sample
        await this.loadInitialData();
    }

    cacheElements() {
        this.elements = {
            canvas: document.getElementById('graph-canvas'),
            modeButtons: document.querySelectorAll('.mode-btn'),
            nodeDialog: document.getElementById('node-dialog'),
            edgeDialog: document.getElementById('edge-dialog'),
            contextMenu: document.getElementById('context-menu'),
            importBtn: document.getElementById('import-btn'),
            exportBtn: document.getElementById('export-btn'),
            clearBtn: document.getElementById('clear-btn'),
            zoomInBtn: document.getElementById('zoom-in-btn'),
            zoomOutBtn: document.getElementById('zoom-out-btn'),
            fitViewBtn: document.getElementById('fit-view-btn'),
            nodeCount: document.getElementById('node-count'),
            edgeCount: document.getElementById('edge-count'),
            fileInput: document.getElementById('file-input'),
            propertiesPanel: document.getElementById('properties-panel'),
            loadingOverlay: document.getElementById('loading-overlay'),
            performanceInfo: document.getElementById('performance-info')
        };
    }

    async setupGraph() {
        this.graph = new GraphEngine(this.elements.canvas, {
            mode: 'select',
            onGraphUpdate: () => this.saveState(),
            onSelectionChange: () => this.updatePropertiesPanel(),
            onPerformanceUpdate: (info) => this.updatePerformanceInfo(info)
        });

        this.graph.startRenderLoop();
        this.updateCounters();
    }

    setupEventListeners() {
        // Mode switching
        this.elements.modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.setMode(mode);
            });
        });

        // Toolbar actions
        this.elements.importBtn.addEventListener('click', () => this.importGraph());
        this.elements.exportBtn.addEventListener('click', () => this.exportGraph());
        this.elements.clearBtn.addEventListener('click', () => this.clearGraph());
        
        this.elements.zoomInBtn.addEventListener('click', () => this.zoomIn());
        this.elements.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        this.elements.fitViewBtn.addEventListener('click', () => this.fitToView());

        // Dialog events
        this.setupDialogEvents();

        // Context menu
        this.setupContextMenu();

        // File input
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileImport(e));

        // Canvas events for context menu
        this.elements.canvas.addEventListener('contextmenu', (e) => this.showContextMenu(e));

        // Global click handler for context menu
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.hideContextMenu();
            }
        });
    }

    setupDialogEvents() {
        // Node dialog
        const nodeDialog = this.elements.nodeDialog;
        const nodeLabel = document.getElementById('node-label');
        const nodeColor = document.getElementById('node-color');
        const nodeRadius = document.getElementById('node-radius');
        const radiusValue = document.getElementById('radius-value');
        const nodeCategory = document.getElementById('node-category');

        nodeRadius.addEventListener('input', (e) => {
            radiusValue.textContent = e.target.value;
        });

        nodeDialog.querySelector('[data-action="save"]').addEventListener('click', () => {
            this.saveNodeProperties();
        });

        nodeDialog.querySelector('[data-action="cancel"]').addEventListener('click', () => {
            this.closeDialog();
        });

        nodeDialog.querySelector('.dialog-close').addEventListener('click', () => {
            this.closeDialog();
        });

        // Edge dialog
        const edgeDialog = this.elements.edgeDialog;
        const edgeWeight = document.getElementById('edge-weight');
        const weightValue = document.getElementById('weight-value');
        const edgeCategory = document.getElementById('edge-category');

        edgeWeight.addEventListener('input', (e) => {
            weightValue.textContent = e.target.value;
        });

        edgeDialog.querySelector('[data-action="save"]').addEventListener('click', () => {
            this.saveEdgeProperties();
        });

        edgeDialog.querySelector('[data-action="cancel"]').addEventListener('click', () => {
            this.closeDialog();
        });

        edgeDialog.querySelector('.dialog-close').addEventListener('click', () => {
            this.closeDialog();
        });
    }

    setupContextMenu() {
        const contextMenu = this.elements.contextMenu;
        
        contextMenu.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleContextAction(action);
                this.hideContextMenu();
            });
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (this.isDialogOpen) return;
            
            switch (e.key) {
                case 'Delete':
                case 'Backspace':
                    this.deleteSelected();
                    break;
                case 'z':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.redo();
                        } else {
                            this.undo();
                        }
                    }
                    break;
                case 's':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.exportGraph();
                    }
                    break;
                case 'o':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.importGraph();
                    }
                    break;
                case '1':
                    this.setMode('select');
                    break;
                case '2':
                    this.setMode('node');
                    break;
                case '3':
                    this.setMode('edge');
                    break;
                case 'Escape':
                    this.deselectAll();
                    break;
            }
        });
    }

    setMode(mode) {
        this.graph.mode = mode;
        this.elements.modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // Update cursor
        const cursors = {
            select: 'default',
            node: 'crosshair',
            edge: 'pointer'
        };
        this.elements.canvas.style.cursor = cursors[mode];
    }

    // Dialog management
    showNodeDialog(node) {
        const dialog = this.elements.nodeDialog;
        const nodeLabel = document.getElementById('node-label');
        const nodeColor = document.getElementById('node-color');
        const nodeRadius = document.getElementById('node-radius');
        const nodeCategory = document.getElementById('node-category');
        
        nodeLabel.value = node.label;
        nodeColor.value = node.color;
        nodeRadius.value = node.radius;
        nodeCategory.value = node.category || '';
        
        dialog.dataset.nodeId = node.id;
        this.showDialog(dialog);
    }

    showEdgeDialog(edge) {
        const dialog = this.elements.edgeDialog;
        const edgeWeight = document.getElementById('edge-weight');
        const edgeCategory = document.getElementById('edge-category');
        
        edgeWeight.value = edge.weight;
        edgeCategory.value = edge.category || '';
        
        dialog.dataset.edgeId = edge.id;
        this.showDialog(dialog);
    }

    showDialog(dialog) {
        dialog.classList.remove('hidden');
        this.isDialogOpen = true;
        this.currentDialog = dialog;
    }

    closeDialog() {
        if (this.currentDialog) {
            this.currentDialog.classList.add('hidden');
            this.currentDialog.removeAttribute('data-node-id');
            this.currentDialog.removeAttribute('data-edge-id');
            this.currentDialog = null;
            this.isDialogOpen = false;
        }
    }

    saveNodeProperties() {
        const dialog = this.elements.nodeDialog;
        const nodeId = dialog.dataset.nodeId;
        const node = this.graph.nodes.find(n => n.id == nodeId);
        
        if (node) {
            node.label = document.getElementById('node-label').value;
            node.color = document.getElementById('node-color').value;
            node.radius = parseInt(document.getElementById('node-radius').value);
            node.category = document.getElementById('node-category').value || null;
            
            this.graph.updateSpatialIndex();
            this.graph.markDirty();
            this.saveState();
            this.updateCounters();
        }
        
        this.closeDialog();
    }

    saveEdgeProperties() {
        const dialog = this.elements.edgeDialog;
        const edgeId = dialog.dataset.edgeId;
        const edge = this.graph.edges.find(e => e.id == edgeId);
        
        if (edge) {
            edge.weight = parseFloat(document.getElementById('edge-weight').value);
            edge.category = document.getElementById('edge-category').value || null;
            
            this.graph.markDirty();
            this.saveState();
        }
        
        this.closeDialog();
    }

    // Context menu
    showContextMenu(e) {
        const pos = this.graph.getMousePos(e);
        const node = this.graph.getNodeAt(pos.x, pos.y);
        const edge = this.graph.getEdgeAt(pos.x, pos.y);
        
        if (node) {
            this.graph.selectNode(node);
        } else if (edge) {
            this.graph.selectEdge(edge);
        }
        
        const contextMenu = this.elements.contextMenu;
        const rect = this.elements.canvas.getBoundingClientRect();
        
        contextMenu.style.left = `${e.clientX - rect.left}px`;
        contextMenu.style.top = `${e.clientY - rect.top}px`;
        contextMenu.classList.remove('hidden');
    }

    hideContextMenu() {
        this.elements.contextMenu.classList.add('hidden');
    }

    handleContextAction(action) {
        switch (action) {
            case 'edit':
                if (this.graph.selectedNode) {
                    this.showNodeDialog(this.graph.selectedNode);
                } else if (this.graph.selectedEdge) {
                    this.showEdgeDialog(this.graph.selectedEdge);
                }
                break;
            case 'delete':
                this.deleteSelected();
                break;
            case 'duplicate':
                if (this.graph.selectedNode) {
                    this.duplicateNode(this.graph.selectedNode);
                }
                break;
        }
    }

    // Data operations
    async importGraph() {
        this.elements.fileInput.click();
    }

    async handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            this.showLoading(true);
            const data = await this.dataManager.readFile(file);
            this.graph.importData(data);
            this.saveState();
            this.updateCounters();
        } catch (error) {
            alert(`Error importing graph: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async exportGraph() {
        try {
            const data = this.graph.exportData();
            await this.dataManager.downloadFile(data, 'graph.json');
        } catch (error) {
            alert(`Error exporting graph: ${error.message}`);
        }
    }

    clearGraph() {
        if (confirm('Are you sure you want to clear the entire graph?')) {
            this.graph.clear();
            this.saveState();
            this.updateCounters();
        }
    }

    // Selection operations
    deleteSelected() {
        if (this.graph.selectedNode) {
            this.graph.deleteNode(this.graph.selectedNode.id);
            this.saveState();
            this.updateCounters();
        } else if (this.graph.selectedEdge) {
            this.graph.deleteEdge(this.graph.selectedEdge.id);
            this.saveState();
            this.updateCounters();
        }
    }

    duplicateNode(node) {
        const newNode = this.graph.addNode(
            node.x + 20,
            node.y + 20,
            `${node.label} (copy)`,
            node.color,
            node.category,
            node.radius
        );
        this.graph.selectNode(newNode);
        this.saveState();
        this.updateCounters();
    }

    deselectAll() {
        this.graph.deselectAll();
        this.updatePropertiesPanel();
    }

    // View operations
    zoomIn() {
        this.graph.scale *= 1.2;
        this.graph.scale = Math.min(5, this.graph.scale);
        this.graph.updateViewport();
        this.graph.markDirty();
    }

    zoomOut() {
        this.graph.scale *= 0.8;
        this.graph.scale = Math.max(0.1, this.graph.scale);
        this.graph.updateViewport();
        this.graph.markDirty();
    }

    fitToView() {
        this.graph.fitToView();
        this.updateCounters();
    }

    // Undo/Redo
    saveState() {
        const state = this.graph.exportData();
        this.undoStack.push(JSON.stringify(state));
        
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }
        
        this.redoStack = [];
        this.updateCounters();
    }

    undo() {
        if (this.undoStack.length > 0) {
            const currentState = JSON.stringify(this.graph.exportData());
            this.redoStack.push(currentState);
            
            const stateStr = this.undoStack.pop();
            const state = JSON.parse(stateStr);
            this.graph.importData(state);
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const stateStr = this.redoStack.pop();
            const state = JSON.parse(stateStr);
            this.undoStack.push(JSON.stringify(this.graph.exportData()));
            this.graph.importData(state);
        }
    }

    // UI updates
    updateCounters() {
        this.elements.nodeCount.textContent = `${this.graph.nodes.length} nodes`;
        this.elements.edgeCount.textContent = `${this.graph.edges.length} edges`;
    }

    updatePropertiesPanel() {
        const panel = this.elements.propertiesPanel;
        
        if (this.graph.selectedNode) {
            const node = this.graph.selectedNode;
            panel.innerHTML = `
                <div class="properties-content">
                    <h4>Node Properties</h4>
                    <div class="property-item">
                        <label>Label:</label>
                        <span>${node.label}</span>
                    </div>
                    <div class="property-item">
                        <label>Color:</label>
                        <div class="color-preview" style="background-color: ${node.color}"></div>
                    </div>
                    <div class="property-item">
                        <label>Size:</label>
                        <span>${node.radius}px</span>
                    </div>
                    ${node.category ? `<div class="property-item">
                        <label>Category:</label>
                        <span>${node.category}</span>
                    </div>` : ''}
                    <div class="property-actions">
                        <button class="btn btn-sm" onclick="app.editSelected()">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteSelected()">Delete</button>
                    </div>
                </div>
            `;
        } else if (this.graph.selectedEdge) {
            const edge = this.graph.selectedEdge;
            const fromNode = this.graph.nodes.find(n => n.id === edge.from);
            const toNode = this.graph.nodes.find(n => n.id === edge.to);
            
            panel.innerHTML = `
                <div class="properties-content">
                    <h4>Edge Properties</h4>
                    <div class="property-item">
                        <label>From:</label>
                        <span>${fromNode?.label || 'Unknown'}</span>
                    </div>
                    <div class="property-item">
                        <label>To:</label>
                        <span>${toNode?.label || 'Unknown'}</span>
                    </div>
                    <div class="property-item">
                        <label>Weight:</label>
                        <span>${edge.weight}</span>
                    </div>
                    ${edge.category ? `<div class="property-item">
                        <label>Category:</label>
                        <span>${edge.category}</span>
                    </div>` : ''}
                    <div class="property-actions">
                        <button class="btn btn-sm" onclick="app.editSelected()">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteSelected()">Delete</button>
                    </div>
                </div>
            `;
        } else {
            panel.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-mouse-pointer"></i>
                    <p>Select an element to edit properties</p>
                </div>
            `;
        }
    }

    updatePerformanceInfo(info) {
        document.getElementById('fps-counter').textContent = info.fps;
        document.getElementById('perf-nodes').textContent = info.nodes;
        document.getElementById('perf-edges').textContent = info.edges;
    }

    // Utility methods
    showLoading(show) {
        this.elements.loadingOverlay.classList.toggle('hidden', !show);
    }

    editSelected() {
        if (this.graph.selectedNode) {
            this.showNodeDialog(this.graph.selectedNode);
        } else if (this.graph.selectedEdge) {
            this.showEdgeDialog(this.graph.selectedEdge);
        }
    }

    async loadInitialData() {
        try {
            // Try to load from localStorage
            const saved = localStorage.getItem('graph-data');
            if (saved) {
                const data = JSON.parse(saved);
                this.graph.importData(data);
                this.saveState();
            }
        } catch (error) {
            console.warn('Could not load saved graph:', error);
        }
        
        this.updateCounters();
    }

    startRenderLoop() {
        // Auto-save every 30 seconds
        setInterval(() => {
            try {
                const data = this.graph.exportData();
                localStorage.setItem('graph-data', JSON.stringify(data));
            } catch (error) {
                console.warn('Could not auto-save graph:', error);
            }
        }, 30000);
    }
}

// Global app instance
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new AppController();
});