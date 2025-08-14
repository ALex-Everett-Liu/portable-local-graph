// Command Palette Module
class CommandPalette {
    constructor() {
        this.isOpen = false;
        this.commands = [];
        this.filteredCommands = [];
        this.selectedIndex = 0;
        this.paletteElement = null;
        this.inputElement = null;
        this.listElement = null;
        
        this.registerCommands();
        this.createPaletteUI();
        this.bindEvents();
    }

    registerCommands() {
        this.commands = [
            {
                id: 'new-graph',
                name: 'New Graph',
                description: 'Create a new empty graph',
                keywords: ['new', 'create', 'clear', 'empty'],
                shortcut: 'Ctrl+N',
                action: () => window.newGraph && window.newGraph()
            },
            {
                id: 'save-graph',
                name: 'Save Graph',
                description: 'Save the current graph',
                keywords: ['save', 'store', 'persist'],
                shortcut: 'Ctrl+S',
                action: () => {
                    if (typeof require !== 'undefined') {
                        const { ipcRenderer } = require('electron');
                        ipcRenderer.send('save-current-graph');
                    } else {
                        window.saveGraphToDatabase && window.saveGraphToDatabase();
                    }
                }
            },
            {
                id: 'save-graph-as',
                name: 'Save Graph As...',
                description: 'Save graph to a new file',
                keywords: ['save', 'as', 'export', 'file'],
                shortcut: 'Ctrl+Shift+S',
                action: () => window.saveGraphToFile && window.saveGraphToFile()
            },
            {
                id: 'open-graph',
                name: 'Open Graph',
                description: 'Open a graph from file',
                keywords: ['open', 'load', 'import', 'file'],
                shortcut: 'Ctrl+O',
                action: () => window.openGraphFile && window.openGraphFile()
            },
            {
                id: 'save-graph-hotkey',
                name: 'Save Graph',
                description: 'Save the current graph',
                keywords: ['save', 'store', 'persist'],
                shortcut: 'S',
                action: () => {
                    if (typeof require !== 'undefined') {
                        const { ipcRenderer } = require('electron');
                        ipcRenderer.send('save-current-graph');
                    } else {
                        window.saveGraphToDatabase && window.saveGraphToDatabase();
                    }
                }
            },
            {
                id: 'node-mode',
                name: 'Node Mode',
                description: 'Switch to node creation mode',
                keywords: ['node', 'create', 'add', 'mode'],
                shortcut: 'N',
                action: () => window.setMode && window.setMode('node')
            },
            {
                id: 'edge-mode',
                name: 'Edge Mode',
                description: 'Switch to edge creation mode',
                keywords: ['edge', 'connect', 'link', 'mode'],
                shortcut: 'E',
                action: () => window.setMode && window.setMode('edge')
            },
            {
                id: 'select-mode',
                name: 'Select Mode',
                description: 'Switch to node selection mode',
                keywords: ['select', 'move', 'drag', 'mode'],
                shortcut: 'T',
                action: () => window.setMode && window.setMode('select')
            },
            {
                id: 'search-nodes',
                name: 'Search Nodes',
                description: 'Search for nodes by label',
                keywords: ['search', 'find', 'nodes', 'label'],
                shortcut: 'F',
                action: () => {
                    const searchInput = document.getElementById('node-search');
                    if (searchInput) searchInput.focus();
                }
            },
            {
                id: 'calculate-centralities',
                name: 'Calculate Centralities',
                description: 'Calculate all centrality measures',
                keywords: ['centrality', 'analysis', 'calculate', 'metrics'],
                shortcut: 'C',
                action: () => window.graph && window.graph.calculateCentralities && window.graph.calculateCentralities()
            },
            {
                id: 'manage-layers',
                name: 'Manage Layers',
                description: 'Open layer management dialog',
                keywords: ['layer', 'manage', 'filter', 'organize'],
                shortcut: 'L',
                action: () => window.openLayerDialog && window.openLayerDialog()
            },
            {
                id: 'undo',
                name: 'Undo',
                description: 'Undo the last action',
                keywords: ['undo', 'revert', 'back'],
                shortcut: 'Ctrl+Z',
                action: () => window.undo && window.undo()
            },
            {
                id: 'redo',
                name: 'Redo',
                description: 'Redo the last undone action',
                keywords: ['redo', 'repeat', 'forward'],
                shortcut: 'Ctrl+Shift+Z',
                action: () => window.redo && window.redo()
            },
            {
                id: 'clear-selection',
                name: 'Clear Selection',
                description: 'Clear all selections',
                keywords: ['clear', 'deselect', 'selection'],
                shortcut: 'Escape',
                action: () => {
                    if (window.graph) {
                        window.graph.selectedNode = null;
                        window.graph.selectedEdge = null;
                        window.graph.onSelectionChange && window.graph.onSelectionChange();
                        window.graph.render && window.graph.render();
                    }
                    window.clearNodeSearch && window.clearNodeSearch();
                }
            },
            {
                id: 'delete-selected',
                name: 'Delete Selected',
                description: 'Delete selected node or edge',
                keywords: ['delete', 'remove', 'selected'],
                shortcut: 'Delete',
                action: () => {
                    if (window.graph && window.graph.selectedNode) {
                        window.saveState && window.saveState();
                        window.graph.deleteNode(window.graph.selectedNode.id);
                        window.updateGraphInfo && window.updateGraphInfo();
                        if (window.appState) window.appState.isModified = true;
                    }
                }
            },
            {
                id: 'zoom-in',
                name: 'Zoom In',
                description: 'Zoom in the graph view',
                keywords: ['zoom', 'in', 'magnify'],
                shortcut: 'Ctrl++',
                action: () => {
                    if (window.graph) {
                        window.graph.scale *= 1.2;
                        window.graph.scale = Math.min(5, window.graph.scale);
                        window.graph.render();
                    }
                }
            },
            {
                id: 'zoom-out',
                name: 'Zoom Out',
                description: 'Zoom out the graph view',
                keywords: ['zoom', 'out', 'minify'],
                shortcut: 'Ctrl+-',
                action: () => {
                    if (window.graph) {
                        window.graph.scale *= 0.8;
                        window.graph.scale = Math.max(0.1, window.graph.scale);
                        window.graph.render();
                    }
                }
            },
            {
                id: 'reset-zoom',
                name: 'Reset Zoom',
                description: 'Reset zoom to 100%',
                keywords: ['zoom', 'reset', '100%', 'default'],
                shortcut: 'Ctrl+0',
                action: () => {
                    if (window.graph) {
                        window.graph.scale = 1;
                        window.graph.render();
                    }
                }
            },
            {
                id: 'export-svg',
                name: 'Export as SVG',
                description: 'Export current graph as SVG image',
                keywords: ['export', 'svg', 'image', 'save'],
                action: () => window.exportAsSVG && window.exportAsSVG()
            },
            {
                id: 'toggle-hotkey-mode',
                name: 'Toggle Hotkey Mode',
                description: 'Enter or exit hotkey mode',
                keywords: ['hotkey', 'mode', 'keyboard', 'help'],
                shortcut: 'Alt',
                action: () => window.hotkeyMode && window.hotkeyMode.toggle()
            },
            {
                id: 'create-edge-search',
                name: 'Create Edge via Search',
                description: 'Create edge between nodes using search',
                keywords: ['edge', 'create', 'search', 'connect', 'link'],
                shortcut: 'D',
                action: () => {
                    const createEdgeBtn = document.getElementById('create-edge-search-btn');
                    if (createEdgeBtn) {
                        createEdgeBtn.click();
                    } else if (window.showEdgeSearchDialog) {
                        window.showEdgeSearchDialog();
                    }
                }
            }
        ];
    }

    createPaletteUI() {
        // Create palette container
        this.paletteElement = document.createElement('div');
        this.paletteElement.id = 'command-palette';
        this.paletteElement.className = 'command-palette';
        this.paletteElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            max-width: 90vw;
            max-height: 400px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10000;
            display: none;
            flex-direction: column;
            font-family: Arial, sans-serif;
        `;

        // Create input field
        this.inputElement = document.createElement('input');
        this.inputElement.type = 'text';
        this.inputElement.placeholder = 'Type a command...';
        this.inputElement.style.cssText = `
            padding: 12px 16px;
            border: none;
            border-bottom: 1px solid #eee;
            font-size: 16px;
            outline: none;
            border-radius: 8px 8px 0 0;
            background: #f9f9f9;
        `;

        // Create command list
        this.listElement = document.createElement('div');
        this.listElement.style.cssText = `
            flex: 1;
            overflow-y: auto;
            max-height: 300px;
        `;

        this.paletteElement.appendChild(this.inputElement);
        this.paletteElement.appendChild(this.listElement);
        document.body.appendChild(this.paletteElement);
    }

    bindEvents() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                this.toggle();
            } else if (this.isOpen) {
                this.handlePaletteKeyDown(e);
            }
        });

        // Input events
        this.inputElement.addEventListener('input', () => {
            this.filterCommands();
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.paletteElement.contains(e.target)) {
                this.close();
            }
        });
    }

    handlePaletteKeyDown(e) {
        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                this.close();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.selectNext();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectPrevious();
                break;
            case 'Enter':
                e.preventDefault();
                this.executeSelected();
                break;
            case 'Tab':
                e.preventDefault();
                if (e.shiftKey) {
                    this.selectPrevious();
                } else {
                    this.selectNext();
                }
                break;
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.paletteElement.style.display = 'flex';
        this.inputElement.value = '';
        this.filterCommands();
        this.inputElement.focus();
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.isOpen = false;
        this.paletteElement.style.display = 'none';
        document.body.style.overflow = '';
    }

    filterCommands() {
        const query = this.inputElement.value.toLowerCase().trim();
        
        if (!query) {
            this.filteredCommands = this.commands;
        } else {
            this.filteredCommands = this.commands.filter(cmd => {
                return cmd.name.toLowerCase().includes(query) ||
                       cmd.description.toLowerCase().includes(query) ||
                       cmd.keywords.some(k => k.toLowerCase().includes(query));
            });
        }

        this.selectedIndex = 0;
        this.renderCommands();
    }

    renderCommands() {
        this.listElement.innerHTML = '';

        this.filteredCommands.forEach((cmd, index) => {
            const item = document.createElement('div');
            item.className = 'command-item';
            item.style.cssText = `
                padding: 10px 16px;
                cursor: pointer;
                border-bottom: 1px solid #f0f0f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: background-color 0.2s;
            `;

            if (index === this.selectedIndex) {
                item.style.backgroundColor = '#e3f2fd';
            }

            const content = document.createElement('div');
            content.innerHTML = `
                <div style="font-weight: bold; color: #333;">${cmd.name}</div>
                <div style="font-size: 12px; color: #666; margin-top: 2px;">${cmd.description}</div>
            `;

            const shortcut = document.createElement('div');
            if (cmd.shortcut) {
                shortcut.style.cssText = `
                    font-size: 11px;
                    color: #888;
                    background: #f5f5f5;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-family: monospace;
                `;
                shortcut.textContent = cmd.shortcut;
            }

            item.appendChild(content);
            item.appendChild(shortcut);

            item.addEventListener('click', () => {
                this.selectedIndex = index;
                this.executeSelected();
            });

            item.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.updateSelection();
            });

            this.listElement.appendChild(item);
        });
    }

    updateSelection() {
        const items = this.listElement.querySelectorAll('.command-item');
        items.forEach((item, index) => {
            item.style.backgroundColor = index === this.selectedIndex ? '#e3f2fd' : '';
        });
    }

    selectNext() {
        if (this.filteredCommands.length > 0) {
            this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
            this.updateSelection();
        }
    }

    selectPrevious() {
        if (this.filteredCommands.length > 0) {
            this.selectedIndex = (this.selectedIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
            this.updateSelection();
        }
    }

    executeSelected() {
        if (this.filteredCommands.length > 0) {
            const command = this.filteredCommands[this.selectedIndex];
            this.close();
            command.action();
        }
    }

    // Add new commands dynamically
    addCommand(command) {
        this.commands.push(command);
    }

    // Remove commands by id
    removeCommand(id) {
        this.commands = this.commands.filter(cmd => cmd.id !== id);
    }
}

// Initialize command palette
let commandPalette;

function initializeCommandPalette() {
    if (!commandPalette) {
        commandPalette = new CommandPalette();
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CommandPalette, initializeCommandPalette };
} else {
    window.CommandPalette = CommandPalette;
    window.initializeCommandPalette = initializeCommandPalette;
}