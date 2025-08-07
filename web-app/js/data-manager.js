class DataManager {
    constructor() {
        this.supportedFormats = ['json'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
    }

    // File reading operations
    async readFile(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        if (file.size > this.maxFileSize) {
            throw new Error('File too large. Maximum size is 10MB');
        }

        if (!file.name.endsWith('.json')) {
            throw new Error('Unsupported file format. Please use .json files');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.validateGraphData(data);
                    resolve(data);
                } catch (error) {
                    reject(new Error('Invalid JSON format: ' + error.message));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Error reading file'));
            };
            
            reader.readAsText(file);
        });
    }

    // File writing operations
    async downloadFile(data, filename) {
        try {
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
        } catch (error) {
            throw new Error('Error downloading file: ' + error.message);
        }
    }

    // Data validation
    validateGraphData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format');
        }

        // Validate required fields
        if (!Array.isArray(data.nodes)) {
            throw new Error('Missing or invalid nodes array');
        }

        if (!Array.isArray(data.edges)) {
            throw new Error('Missing or invalid edges array');
        }

        // Validate nodes
        data.nodes.forEach((node, index) => {
            this.validateNode(node, index);
        });

        // Validate edges
        data.edges.forEach((edge, index) => {
            this.validateEdge(edge, index);
        });

        // Validate scale and offset
        if (data.scale !== undefined && typeof data.scale !== 'number') {
            throw new Error('Invalid scale value');
        }

        if (data.offset !== undefined) {
            if (typeof data.offset !== 'object' || 
                typeof data.offset.x !== 'number' || 
                typeof data.offset.y !== 'number') {
                throw new Error('Invalid offset format');
            }
        }
    }

    validateNode(node, index) {
        if (!node || typeof node !== 'object') {
            throw new Error(`Node ${index}: Invalid node format`);
        }

        if (typeof node.id !== 'number' && typeof node.id !== 'string') {
            throw new Error(`Node ${index}: Missing or invalid id`);
        }

        if (typeof node.x !== 'number' || typeof node.y !== 'number') {
            throw new Error(`Node ${index}: Missing or invalid coordinates`);
        }

        if (typeof node.label !== 'string') {
            throw new Error(`Node ${index}: Missing or invalid label`);
        }

        if (typeof node.color !== 'string') {
            throw new Error(`Node ${index}: Missing or invalid color`);
        }

        if (typeof node.radius !== 'number' || node.radius < 1) {
            throw new Error(`Node ${index}: Invalid radius`);
        }
    }

    validateEdge(edge, index) {
        if (!edge || typeof edge !== 'object') {
            throw new Error(`Edge ${index}: Invalid edge format`);
        }

        if (typeof edge.id !== 'number' && typeof edge.id !== 'string') {
            throw new Error(`Edge ${index}: Missing or invalid id`);
        }

        if (typeof edge.from !== 'number' && typeof edge.from !== 'string') {
            throw new Error(`Edge ${index}: Missing or invalid from node id`);
        }

        if (typeof edge.to !== 'number' && typeof edge.to !== 'string') {
            throw new Error(`Edge ${index}: Missing or invalid to node id`);
        }

        if (typeof edge.weight !== 'number' || edge.weight < 0) {
            throw new Error(`Edge ${index}: Invalid weight`);
        }
    }

    // Data transformation
    sanitizeGraphData(data) {
        const sanitized = {
            nodes: [],
            edges: [],
            scale: data.scale || 1,
            offset: data.offset || { x: 0, y: 0 }
        };

        // Sanitize nodes
        sanitized.nodes = data.nodes.map(node => ({
            id: String(node.id),
            x: Number(node.x),
            y: Number(node.y),
            label: String(node.label || 'Node'),
            color: String(node.color || '#3b82f6'),
            radius: Math.max(5, Math.min(50, Number(node.radius) || 20)),
            category: node.category ? String(node.category) : null
        }));

        // Sanitize edges
        sanitized.edges = data.edges.map(edge => ({
            id: String(edge.id),
            from: String(edge.from),
            to: String(edge.to),
            weight: Math.max(0.1, Math.min(30, Number(edge.weight) || 1)),
            category: edge.category ? String(edge.category) : null
        }));

        return sanitized;
    }

    // Export formats
    exportGraph(data, format = 'json') {
        switch (format.toLowerCase()) {
            case 'json':
                return this.exportJSON(data);
            case 'csv-nodes':
                return this.exportNodesCSV(data);
            case 'csv-edges':
                return this.exportEdgesCSV(data);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    exportJSON(data) {
        return {
            format: 'graph-data-v1',
            timestamp: new Date().toISOString(),
            ...this.sanitizeGraphData(data)
        };
    }

    exportNodesCSV(data) {
        const sanitized = this.sanitizeGraphData(data);
        const headers = ['id', 'label', 'x', 'y', 'color', 'radius', 'category'];
        
        const rows = sanitized.nodes.map(node => [
            node.id,
            `"${node.label}"`,
            node.x,
            node.y,
            node.color,
            node.radius,
            node.category || ''
        ]);

        return this.arrayToCSV([headers, ...rows]);
    }

    exportEdgesCSV(data) {
        const sanitized = this.sanitizeGraphData(data);
        const headers = ['id', 'from', 'to', 'weight', 'category'];
        
        const rows = sanitized.edges.map(edge => [
            edge.id,
            edge.from,
            edge.to,
            edge.weight,
            edge.category || ''
        ]);

        return this.arrayToCSV([headers, ...rows]);
    }

    arrayToCSV(array) {
        return array.map(row => row.join(',')).join('\n');
    }

    // Import helpers
    async createSampleData() {
        return {
            format: 'graph-data-v1',
            timestamp: new Date().toISOString(),
            nodes: [
                {
                    id: '1',
                    x: 200,
                    y: 200,
                    label: 'Start',
                    color: '#10b981',
                    radius: 30,
                    category: 'important'
                },
                {
                    id: '2',
                    x: 400,
                    y: 150,
                    label: 'Process A',
                    color: '#3b82f6',
                    radius: 25
                },
                {
                    id: '3',
                    x: 400,
                    y: 250,
                    label: 'Process B',
                    color: '#8b5cf6',
                    radius: 25
                },
                {
                    id: '4',
                    x: 600,
                    y: 200,
                    label: 'End',
                    color: '#ef4444',
                    radius: 30,
                    category: 'important'
                }
            ],
            edges: [
                {
                    id: 'e1',
                    from: '1',
                    to: '2',
                    weight: 2.5
                },
                {
                    id: 'e2',
                    from: '1',
                    to: '3',
                    weight: 1.8
                },
                {
                    id: 'e3',
                    from: '2',
                    to: '4',
                    weight: 3.2
                },
                {
                    id: 'e4',
                    from: '3',
                    to: '4',
                    weight: 2.1
                }
            ],
            scale: 1,
            offset: { x: 0, y: 0 }
        };
    }

    // Storage operations
    async saveToLocalStorage(key, data) {
        try {
            const json = JSON.stringify(data);
            localStorage.setItem(key, json);
            return true;
        } catch (error) {
            console.warn('Could not save to localStorage:', error);
            return false;
        }
    }

    async loadFromLocalStorage(key) {
        try {
            const json = localStorage.getItem(key);
            if (json) {
                const data = JSON.parse(json);
                this.validateGraphData(data);
                return data;
            }
            return null;
        } catch (error) {
            console.warn('Could not load from localStorage:', error);
            return null;
        }
    }

    // Utility methods
    getFileInfo(file) {
        return {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified)
        };
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Error handling
    createError(message, code = 'DATA_ERROR') {
        const error = new Error(message);
        error.code = code;
        return error;
    }

    // Browser compatibility check
    checkBrowserSupport() {
        const features = {
            localStorage: typeof(Storage) !== 'undefined',
            fileAPI: !!(window.File && window.FileReader && window.FileList && window.Blob),
            canvas: !!document.createElement('canvas').getContext,
            json: window.JSON && typeof JSON.parse === 'function'
        };

        const unsupported = Object.entries(features)
            .filter(([feature, supported]) => !supported)
            .map(([feature]) => feature);

        return {
            supported: unsupported.length === 0,
            features,
            unsupported
        };
    }

    // Data statistics
    getGraphStats(data) {
        if (!data || !data.nodes || !data.edges) {
            return null;
        }

        const nodes = data.nodes;
        const edges = data.edges;

        const categories = {
            nodes: new Set(),
            edges: new Set()
        };

        nodes.forEach(node => {
            if (node.category) categories.nodes.add(node.category);
        });

        edges.forEach(edge => {
            if (edge.category) categories.edges.add(edge.category);
        });

        const weights = edges.map(e => e.weight || 1);
        const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;

        return {
            nodes: nodes.length,
            edges: edges.length,
            nodeCategories: categories.nodes.size,
            edgeCategories: categories.edges.size,
            avgWeight: avgWeight,
            minWeight: Math.min(...weights),
            maxWeight: Math.max(...weights),
            fileSize: JSON.stringify(data).length
        };
    }
}