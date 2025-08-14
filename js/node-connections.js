// Node connections overview functionality

// Global variable to track current node
let currentConnectionsNode = null;

// Show node connections overview
function showNodeConnections(nodeId) {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) {
        showNotification('Node not found', 'error');
        return;
    }

    currentConnectionsNode = node;
    const connections = graph.getNodeConnections(nodeId);
    
    // Update dialog title
    const title = document.getElementById('connections-title');
    title.textContent = `Connections: ${node.label}`;
    
    // Render connections
    renderConnections(connections, node);
    
    // Show dialog
    const dialog = document.getElementById('node-connections-dialog');
    dialog.classList.remove('hidden');
}

// Render connections in the dialog
function renderConnections(connections, node) {
    const content = document.getElementById('connections-content');
    
    if (connections.all.length === 0) {
        content.innerHTML = `
            <div class="empty-connections">
                No connections found for this node.
            </div>
        `;
        return;
    }

    let html = `
        <div class="connection-count">
            <strong>${connections.all.length}</strong> connection${connections.all.length !== 1 ? 's' : ''} found
        </div>
    `;

    // Incoming connections
    if (connections.incoming.length > 0) {
        html += `
            <div class="connections-section">
                <h4>
                    <span class="direction-incoming">↓</span> 
                    Incoming (${connections.incoming.length})
                </h4>
                ${connections.incoming.map(conn => renderConnectionItem(conn, node)).join('')}
            </div>
        `;
    }

    // Outgoing connections
    if (connections.outgoing.length > 0) {
        html += `
            <div class="connections-section">
                <h4>
                    <span class="direction-outgoing">↑</span> 
                    Outgoing (${connections.outgoing.length})
                </h4>
                ${connections.outgoing.map(conn => renderConnectionItem(conn, node)).join('')}
            </div>
        `;
    }

    // Bidirectional connections
    if (connections.bidirectional.length > 0) {
        html += `
            <div class="connections-section">
                <h4>
                    <span class="direction-bidirectional">↔</span> 
                    Bidirectional (${connections.bidirectional.length})
                </h4>
                ${connections.bidirectional.map(conn => renderConnectionItem(conn, node)).join('')}
            </div>
        `;
    }

    content.innerHTML = html;

    // Add click handlers for connection items
    addConnectionItemHandlers();
}

// Render individual connection item
function renderConnectionItem(conn, sourceNode) {
    const targetNode = conn.node;
    const edge = conn.edge;
    
    let directionSymbol = '';
    let directionClass = '';
    
    switch (conn.direction) {
        case 'incoming':
            directionSymbol = '←';
            directionClass = 'direction-incoming';
            break;
        case 'outgoing':
            directionSymbol = '→';
            directionClass = 'direction-outgoing';
            break;
        case 'bidirectional':
            directionSymbol = '↔';
            directionClass = 'direction-bidirectional';
            break;
    }

    const chineseLabel = targetNode.chineseLabel ? `<span class="connection-chinese">${targetNode.chineseLabel}</span>` : '';
    const weightBadge = `<span class="connection-weight">${edge.weight}</span>`;
    const categoryBadge = edge.category ? `<span class="connection-category">${edge.category}</span>` : '';

    return `
        <div class="connection-item" 
             data-node-id="${targetNode.id}" 
             data-edge-id="${edge.id}"
             title="Click to highlight this connection">
            <div class="connection-node">
                ${directionSymbol} ${targetNode.label}${chineseLabel}
            </div>
            <div class="connection-edge">
                ${weightBadge}
                ${categoryBadge}
                <span class="connection-direction ${directionClass}">${conn.direction}</span>
            </div>
        </div>
    `;
}

// Add click handlers for connection items
function addConnectionItemHandlers() {
    const items = document.querySelectorAll('.connection-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const nodeId = item.dataset.nodeId;
            const edgeId = item.dataset.edgeId;
            
            // Clear previous highlights
            clearHighlights();
            
            // Highlight the connected node and edge
            highlightConnection(nodeId, edgeId);
            
            // Add visual feedback
            items.forEach(i => i.classList.remove('connection-highlight'));
            item.classList.add('connection-highlight');
        });
    });
}

// Highlight a specific connection
function highlightConnection(nodeId, edgeId) {
    // Highlight the connected node
    const node = graph.nodes.find(n => n.id === nodeId);
    if (node) {
        node.highlighted = true;
    }
    
    // Highlight the edge (select it)
    const edge = graph.edges.find(e => e.id === edgeId);
    if (edge) {
        graph.selectedEdge = edge;
    }
    
    // Update selection info
    graph.onSelectionChange();
    graph.render();
}

// Clear all highlights
function clearHighlights() {
    graph.nodes.forEach(node => {
        node.highlighted = false;
    });
    graph.selectedEdge = null;
}

// Close connections dialog
function closeNodeConnections() {
    const dialog = document.getElementById('node-connections-dialog');
    dialog.classList.add('hidden');
    
    // Clear highlights when closing
    clearHighlights();
    graph.render();
}

// Highlight all connections
function highlightAllConnections() {
    if (!currentConnectionsNode) return;
    
    const connections = graph.getNodeConnections(currentConnectionsNode.id);
    
    // Clear previous highlights
    clearHighlights();
    
    // Highlight all connected nodes
    connections.all.forEach(conn => {
        conn.node.highlighted = true;
    });
    
    // Always highlight the source node too
    currentConnectionsNode.highlighted = true;
    
    graph.render();
    
    // Show notification
    showNotification(`Highlighted ${connections.all.length} connections`, 'success');
}

// Focus view on the current node
function focusOnNode() {
    if (!currentConnectionsNode) return;
    
    const canvasRect = graph.canvas.getBoundingClientRect();
    graph.offset.x = canvasRect.width / 2 - currentConnectionsNode.x * graph.scale;
    graph.offset.y = canvasRect.height / 2 - currentConnectionsNode.y * graph.scale;
    
    graph.render();
    
    // Close dialog after focusing
    closeNodeConnections();
    showNotification(`Focused on ${currentConnectionsNode.label}`, 'success');
}

// Add connections button to node context menu
function addConnectionsToNodeDialog() {
    // This will be called from the existing node dialog
    const nodeDialog = document.getElementById('node-dialog');
    const existingButtons = nodeDialog.querySelector('.dialog-buttons');
    
    // Add connections button if it doesn't exist
    if (!document.getElementById('node-connections-btn')) {
        const connectionsBtn = document.createElement('button');
        connectionsBtn.id = 'node-connections-btn';
        connectionsBtn.textContent = 'Connections';
        connectionsBtn.className = 'tool-btn';
        connectionsBtn.style.marginRight = '8px';
        connectionsBtn.onclick = () => {
            const nodeId = window.currentEditingNodeId;
            if (nodeId) {
                closeNodeDialog();
                showNodeConnections(nodeId);
            }
        };
        
        // Insert after node-ok button
        const okBtn = existingButtons.querySelector('#node-ok');
        okBtn.insertAdjacentElement('afterend', connectionsBtn);
    }
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    // Set color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#28a745';
            break;
        case 'error':
            notification.style.backgroundColor = '#dc3545';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ffc107';
            notification.style.color = '#000';
            break;
        default:
            notification.style.backgroundColor = '#007bff';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Close node dialog helper
function closeNodeDialog() {
    const dialog = document.getElementById('node-dialog');
    dialog.classList.add('hidden');
}

// Event listeners for connections dialog
document.addEventListener('DOMContentLoaded', () => {
    // Close buttons
    document.getElementById('connections-close').addEventListener('click', closeNodeConnections);
    document.getElementById('connections-close-btn').addEventListener('click', closeNodeConnections);
    
    // Action buttons
    document.getElementById('connections-highlight-all').addEventListener('click', highlightAllConnections);
    document.getElementById('connections-focus').addEventListener('click', focusOnNode);
    
    // Close on outside click
    document.getElementById('node-connections-dialog').addEventListener('click', (e) => {
        if (e.target.id === 'node-connections-dialog') {
            closeNodeConnections();
        }
    });
    
    // Add connections button to node dialog
    addConnectionsToNodeDialog();
});

// Export functions for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showNodeConnections,
        closeNodeConnections,
        highlightAllConnections,
        focusOnNode
    };
} else {
    // Make available globally
    Object.assign(window, {
        showNodeConnections,
        closeNodeConnections,
        highlightAllConnections,
        focusOnNode
    });
}