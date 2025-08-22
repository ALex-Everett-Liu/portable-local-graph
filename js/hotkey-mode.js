// Hotkey Mode Module
class HotkeyMode {
  constructor() {
    this.isActive = false;
    this.indicator = null;
    this.hotkeys = new Map();
    this.setupIndicator();
    this.registerHotkeys();
    this.bindEvents();
  }

  setupIndicator() {
    // Create hotkey mode indicator
    this.indicator = document.createElement("div");
    this.indicator.id = "hotkey-mode-indicator";
    this.indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 123, 255, 0.9);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10001;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            display: none;
            animation: fadeIn 0.2s ease-in;
        `;

    const style = document.createElement("style");
    style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .hotkey-hint {
                position: fixed;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 5px 8px;
                border-radius: 3px;
                font-size: 12px;
                z-index: 10002;
                pointer-events: none;
                transition: opacity 0.2s;
            }
        `;
    document.head.appendChild(style);
    document.body.appendChild(this.indicator);
  }

  registerHotkeys() {
    // Single key hotkeys (only active in hotkey mode)
    this.hotkeys.set("n", {
      name: "Node Mode",
      action: () => window.setMode && window.setMode("node"),
    });

    this.hotkeys.set("e", {
      name: "Edge Mode",
      action: () => window.setMode && window.setMode("edge"),
    });

    this.hotkeys.set("t", {
      name: "Select Mode",
      action: () => window.setMode && window.setMode("select"),
    });

    this.hotkeys.set("f", {
      name: "Search Nodes",
      action: () => {
        const searchInput = document.getElementById("node-search");
        if (searchInput) searchInput.focus();
      },
    });

    this.hotkeys.set("c", {
      name: "Calculate Centralities",
      action: () =>
        window.graph &&
        window.graph.calculateCentralities &&
        window.graph.calculateCentralities(),
    });

    this.hotkeys.set("l", {
      name: "Manage Layers",
      action: () => {
        // console.log("L key pressed - opening layer dialog");
        if (window.openLayerDialog) {
          window.openLayerDialog();
        } else {
          // Fallback: click the button directly
          const btn = document.getElementById("manage-layers-btn");
          if (btn) btn.click();
        }
      },
    });

    this.hotkeys.set("g", {
      name: "New Graph",
      action: () => window.newGraph && window.newGraph(),
    });

    this.hotkeys.set("s", {
      name: "Save Graph",
      action: () => {
        console.log("=== SAVE HOTKEY TRIGGERED ===");
        console.log("Key pressed: S");
        console.log("Hotkey mode active:", this.isActive);
        console.log("typeof require:", typeof require);

        const saveBtn = document.getElementById("save-btn");
        console.log("save-btn element found:", !!saveBtn);

        if (saveBtn) {
          console.log("Clicking save button directly...");
          saveBtn.click();
        } else {
          console.log("save-btn not found, trying alternative methods...");

          if (typeof require !== "undefined") {
            console.log("Using Electron IPC...");
            const { ipcRenderer } = require("electron");
            ipcRenderer.send("save-current-graph");
          } else {
            console.log("Using web save method...");
            if (window.saveGraphToDatabase) {
              console.log("Calling saveGraphToDatabase...");
              window.saveGraphToDatabase();
            } else {
              console.log("ERROR: saveGraphToDatabase not found!");
              console.log(
                "Available window functions:",
                Object.keys(window).filter((k) =>
                  k.toLowerCase().includes("save"),
                ),
              );
            }
          }
        }
        console.log("=== SAVE HOTKEY COMPLETED ===");
      },
    });

    this.hotkeys.set("o", {
      name: "Open Graph",
      action: () => window.openGraphFile && window.openGraphFile(),
    });

    this.hotkeys.set("z", {
      name: "Undo",
      action: () => window.undo && window.undo(),
    });

    this.hotkeys.set("y", {
      name: "Redo",
      action: () => window.redo && window.redo(),
    });

    this.hotkeys.set("d", {
      name: "Delete Selected",
      action: () => {
        if (window.graph && window.graph.selectedNode) {
          window.saveState && window.saveState();
          window.graph.deleteNode(window.graph.selectedNode.id);
          window.updateGraphInfo && window.updateGraphInfo();
          if (window.appState) window.appState.isModified = true;
        }
      },
    });

    this.hotkeys.set("x", {
      name: "Clear Selection",
      action: () => {
        if (window.graph) {
          window.graph.selectedNode = null;
          window.graph.selectedEdge = null;
          window.graph.onSelectionChange && window.graph.onSelectionChange();
          window.graph.render && window.graph.render();
        }
        window.clearNodeSearch && window.clearNodeSearch();
      },
    });

    this.hotkeys.set("i", {
      name: "Zoom In",
      action: () => {
        if (window.graph) {
          window.graph.scale *= 1.2;
          window.graph.scale = Math.min(5, window.graph.scale);
          window.graph.render();
        }
      },
    });

    this.hotkeys.set("u", {
      name: "Zoom Out",
      action: () => {
        if (window.graph) {
          window.graph.scale *= 0.8;
          window.graph.scale = Math.max(0.1, window.graph.scale);
          window.graph.render();
        }
      },
    });

    this.hotkeys.set("0", {
      name: "Reset Zoom",
      action: () => {
        if (window.graph) {
          window.graph.scale = 1;
          window.graph.render();
        }
      },
    });

    this.hotkeys.set("h", {
      name: "Show Help",
      action: () => this.showHelp(),
    });

    this.hotkeys.set("p", {
      name: "Command Palette",
      action: () => window.commandPalette && window.commandPalette.toggle(),
    });

    this.hotkeys.set("d", {
      name: "Create Edge Search",
      action: () => {
        const createEdgeBtn = document.getElementById("create-edge-search-btn");
        if (createEdgeBtn) {
          createEdgeBtn.click();
        } else if (window.showEdgeSearchDialog) {
          window.showEdgeSearchDialog();
        }
      },
    });
  }

  bindEvents() {
    document.addEventListener("keydown", (e) => {
      console.log("=== KEY PRESSED ===");
      console.log("Key:", e.key, "Code:", e.code);
      console.log(
        "Alt:",
        e.altKey,
        "Ctrl:",
        e.ctrlKey,
        "Shift:",
        e.shiftKey,
        "Meta:",
        e.metaKey,
      );
      console.log("Hotkey mode active:", this.isActive);
      console.log("Target:", e.target.tagName);

      // Handle Escape to exit hotkey mode
      if (e.key === "Escape" && this.isActive) {
        console.log("Escape pressed - deactivating hotkey mode");
        e.preventDefault();
        this.deactivate();
        return;
      }

      // Toggle hotkey mode with Alt key
      if (e.key === "Alt" && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        console.log("Alt pressed - toggling hotkey mode");
        e.preventDefault();
        this.toggle();
        return;
      }

      // Handle hotkey mode keys (only when active)
      if (this.isActive) {
        console.log("Hotkey mode active, processing key:", e.key);
        e.preventDefault();

        const key = e.key.toLowerCase();
        const hotkey = this.hotkeys.get(key);

        if (hotkey) {
          console.log("Executing hotkey:", key, "-", hotkey.name);
          hotkey.action();
          this.deactivate(); // Auto-deactivate after action
        } else if (key === "?") {
          console.log("Showing help");
          this.showHelp();
        } else {
          console.log("No hotkey found for:", key);
        }
      }
    });

    window.addEventListener("blur", () => {
      if (this.isActive) {
        this.deactivate();
      }
    });
  }

  toggle() {
    console.log("=== TOGGLE HOTKEY MODE ===");
    console.log("Current state:", this.isActive);
    console.log("Will change to:", !this.isActive);

    if (this.isActive) {
      this.deactivate();
    } else {
      this.activate();
    }
    console.log("New state:", this.isActive);
  }

  activate() {
    console.log("=== ACTIVATING HOTKEY MODE ===");
    this.isActive = true;
    this.indicator.style.display = "block";
    this.indicator.innerHTML = `
            Hotkey Mode Active
            <div style="font-size: 12px; margin-top: 2px; opacity: 0.8;">Press ESC to exit</div>
        `;
    console.log("Indicator shown, calling showHotkeyHints...");
    this.showHotkeyHints();
    console.log("Hotkey mode ACTIVATED");
  }

  deactivate() {
    console.log("=== DEACTIVATING HOTKEY MODE ===");
    this.isActive = false;
    this.indicator.style.display = "none";
    this.hideHotkeyHints();
    console.log("Hotkey mode DEACTIVATED");
  }

  showHotkeyHints() {
    // Create temporary hints for buttons
    const buttons = document.querySelectorAll("button[data-hotkey]");
    buttons.forEach((btn) => {
      if (!btn.dataset.hotkeyHint) {
        const hint = document.createElement("div");
        hint.className = "hotkey-hint";
        hint.textContent = btn.dataset.hotkey;
        hint.style.top = `${btn.getBoundingClientRect().top - 25}px`;
        hint.style.left = `${btn.getBoundingClientRect().left}px`;
        btn.dataset.hotkeyHint = hint;
        document.body.appendChild(hint);
      }
    });

    // Also show key hints
    this.showKeyHints();
  }

  hideHotkeyHints() {
    // Remove all hotkey hints
    const hints = document.querySelectorAll(".hotkey-hint");
    hints.forEach((hint) => hint.remove());

    // Remove help panel
    const helpPanel = document.getElementById("hotkey-help-panel");
    if (helpPanel) {
      helpPanel.remove();
    }

    // Clear button hints
    const buttons = document.querySelectorAll("button[data-hotkey]");
    buttons.forEach((btn) => delete btn.dataset.hotkeyHint);
  }

  showKeyHints() {
    // Create a floating help panel
    const helpPanel = document.createElement("div");
    helpPanel.id = "hotkey-help-panel";
    helpPanel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10002;
            max-width: 300px;
        `;

    helpPanel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px;">Hotkey Mode</div>
            <div>N - Node Mode</div>
            <div>E - Edge Mode</div>
            <div>T - Select Mode</div>
            <div>F - Focus Search</div>
            <div>R - Clear Search</div>
            <div>C - Calculate Centralities</div>
            <div>L - Manage Layers</div>
            <div>G - New Graph</div>
            <div>S - Save Graph</div>
            <div>O - Open Graph</div>
            <div>Z - Undo</div>
            <div>Y - Redo</div>
            <div>D - Create Edge via Search</div>
            <div>Delete - Delete Selected</div>
            <div>X - Clear Selection</div>
            <div>I - Zoom In</div>
            <div>U - Zoom Out</div>
            <div>0 - Reset Zoom</div>
            <div>P - Command Palette</div>
            <div>? - Show This Help</div>
            <div>ESC - Exit Hotkey Mode</div>
        `;

    document.body.appendChild(helpPanel);
  }

  showHelp() {
    this.showKeyHints();
  }

  // Add hotkey hints to existing buttons
  addButtonHints() {
    console.log("=== ADDING BUTTON HINTS ===");
    const buttonMappings = {
      "new-graph-btn": "G",
      "save-btn": "S",
      "load-btn": "O",
      "node-mode": "N",
      "edge-mode": "E",
      "select-mode": "T",
      "clear-search-btn": "R",
      "node-search": "F",
      "calculate-centrality-btn": "C",
      "manage-layers-btn": "L",
      "create-edge-search-btn": "D",
    };

    // Check all buttons
    Object.entries(buttonMappings).forEach(([id, hotkey]) => {
      const button = document.getElementById(id);
      console.log(`Button ${id}:`, !!button, "Hotkey:", hotkey);
      if (button) {
        button.setAttribute("data-hotkey", hotkey);
      } else {
        console.error(`Button ${id} NOT FOUND!`);
      }
    });

    // Also check for save-btn specifically
    const saveBtn = document.getElementById("save-btn");
    console.log("save-btn direct check:", saveBtn);
    console.log("All buttons found:", document.querySelectorAll("button"));

    Object.entries(buttonMappings).forEach(([id, hotkey]) => {
      const button = document.getElementById(id);
      if (button) {
        button.setAttribute("data-hotkey", hotkey);
      }
    });
  }
}

// Initialize hotkey mode
let hotkeyMode;

function initializeHotkeyMode() {
  if (!hotkeyMode) {
    hotkeyMode = new HotkeyMode();
    // Add hints to buttons after DOM is loaded
    setTimeout(() => {
      hotkeyMode.addButtonHints();
    }, 100);
  }
}

// Export for module system
if (typeof module !== "undefined" && module.exports) {
  module.exports = { HotkeyMode, initializeHotkeyMode };
} else {
  window.HotkeyMode = HotkeyMode;
  window.initializeHotkeyMode = initializeHotkeyMode;
}
