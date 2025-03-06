const { BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');
const Store = require('electron-store');

// Create a store for persistent configuration
const store = new Store({
  defaults: {
    autoSync: false,
    watchFolders: [],
  },
});

class BridgeService {
  constructor(window) {
    this.mainWindow = window;
    this.watchers = [];
    this.isProcessing = false;
    
    this.setupIPC();
    this.initializeWatchers();
  }

  /**
   * Set up IPC communication between renderer and main process
   */
  setupIPC() {
    // Handle project configuration updates
    ipcMain.on('update-config', (_, config) => {
      for (const [key, value] of Object.entries(config)) {
        store.set(key, value);
      }
      
      // Reinitialize watchers if watch folders changed
      if (config.watchFolders) {
        this.initializeWatchers();
      }
      
      this.sendToRenderer('config-updated', store.store);
    });

    // Handle manual sync request
    // Sync projects handler
    ipcMain.handle('sync-projects', async () => {
      try {
        const aeProjectPath = store.get('aeProjectPath');
        const resolveProjectPath = store.get('resolveProjectPath');
        
        if (!aeProjectPath || !resolveProjectPath) {
          throw new Error('Both project paths must be selected');
        }

        try {
          await this.syncProjects();
        } catch (error) {
          this.sendToRenderer('sync-error', { error: error.message });
        }
        return { success: true, timestamp: new Date().toISOString() };
      } catch (error) {
        console.error('Sync error:', error);
        this.sendToRenderer('sync-error', { error: error.message });
        return { success: false, error: error.message };
      }
    });

    // Handle AE project selection
    ipcMain.handle('select-ae-project', async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'After Effects Projects', extensions: ['aep'] }]
      });
      return { success: !canceled, path: canceled ? '' : filePaths[0] };
    });

    // Handle Resolve project selection
    ipcMain.handle('select-resolve-project', async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'DaVinci Resolve Projects', extensions: ['drp'] }]
      });
      return { success: !canceled, path: canceled ? '' : filePaths[0] };
    });
  }

  /**
   * Initialize file watchers for After Effects project files
   */
  initializeWatchers() {
    // Close any existing watchers
    this.watchers.forEach(watcher => watcher.close());
    this.watchers = [];
    
    const watchFolders = store.get('watchFolders', []);
    const aeProjectPath = store.get('aeProjectPath');
    
    if (aeProjectPath) {
      // Watch the AE project file for changes
      const watcher = chokidar.watch(aeProjectPath, {
        persistent: true,
        ignoreInitial: true,
      });
      
      watcher.on('change', async (path) => {
        console.log(`AE project file changed: ${path}`);
        if (store.get('autoSync') && !this.isProcessing) {
          try {
            await this.syncProjects();
          } catch (error) {
            this.sendToRenderer('sync-error', { error: error.message });
          }
        } else {
          this.sendToRenderer('project-changed', { path, type: 'ae' });
        }
      });
      
      this.watchers.push(watcher);
    }
    
    // Watch additional folders if specified
    if (watchFolders.length > 0) {
      const folderWatcher = chokidar.watch(watchFolders, {
        persistent: true,
        ignoreInitial: true,
      });
      
      folderWatcher.on('change', (path) => {
        console.log(`File changed in watch folder: ${path}`);
        this.sendToRenderer('file-changed', { path });
      });
      
      this.watchers.push(folderWatcher);
    }
  }

  /**
   * Synchronize After Effects project with DaVinci Resolve
   */
  async syncProjects() {
    if (this.isProcessing) {
      console.log('Sync already in progress, skipping');
      return;
    }
    
    this.isProcessing = true;
    this.sendToRenderer('sync-started');
    
    try {
      const aeProjectPath = store.get('aeProjectPath');
      const resolveProjectPath = store.get('resolveProjectPath');
      
      if (!aeProjectPath || !resolveProjectPath) {
        throw new Error('Project paths not configured');
      }
      
      // 1. Extract composition data from After Effects
      const compositions = await this.extractAECompositions(aeProjectPath);
      
      // 2. Convert AE compositions to Fusion nodes
      const fusionNodes = this.convertToFusionNodes(compositions);
      
      // 3. Update DaVinci Resolve project
      await this.updateResolveProject(resolveProjectPath, fusionNodes);
      
      // 4. Update last sync time
      store.set('lastSyncTime', new Date().toISOString());
      
      return true;
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Extract composition data from After Effects project file
   * Note: This is a placeholder. In a real implementation, this would use
   * After Effects scripting API or parse AE project files.
   */
  async extractAECompositions(projectPath) {
    // This is a mock implementation
    // In a real app, this would use AE's scripting API or parse AE project files
    console.log(`Extracting compositions from ${projectPath}`);
    
    // Return mock data for now
    return [
      {
        id: 'comp1',
        name: 'Main Composition',
        width: 1920,
        height: 1080,
        duration: 10,
        frameRate: 24,
        layers: [
          {
            id: 'layer1',
            name: 'Background',
            type: 'solid',
            properties: {
              color: '#ff0000',
              opacity: 100,
            },
            inPoint: 0,
            outPoint: 10,
            startTime: 0,
          },
          {
            id: 'layer2',
            name: 'Text Layer',
            type: 'text',
            properties: {
              text: 'Hello World',
              font: 'Arial',
              fontSize: 72,
              position: [960, 540],
            },
            effects: [
              {
                name: 'Glow',
                properties: {
                  radius: 20,
                  intensity: 2,
                },
              },
            ],
            inPoint: 1,
            outPoint: 8,
            startTime: 1,
          },
        ],
      },
    ];
  }

  /**
   * Convert After Effects compositions to Fusion nodes
   */
  convertToFusionNodes(compositions) {
    const result = {};
    
    compositions.forEach(comp => {
      const nodes = [];
      let nodeIndex = 0;
      
      // Create a background node for the composition
      nodes.push({
        id: `background_${comp.id}`,
        name: 'Background',
        type: 'Background',
        inputs: {
          Width: comp.width,
          Height: comp.height,
          Depth: 1,
          TopLeftRed: 0,
          TopLeftGreen: 0,
          TopLeftBlue: 0,
          TopLeftAlpha: 1,
        },
        position: { x: 0, y: 0 },
      });
      
      // Process each layer and convert to appropriate Fusion nodes
      comp.layers.forEach(layer => {
        nodeIndex += 1;
        
        switch (layer.type) {
          case 'solid': {
            // Convert solid layer to a background node with color
            const colorParts = layer.properties.color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
            if (colorParts) {
              const [_, r, g, b] = colorParts;
              const red = parseInt(r, 16) / 255;
              const green = parseInt(g, 16) / 255;
              const blue = parseInt(b, 16) / 255;
              
              nodes.push({
                id: `solid_${layer.id}`,
                name: layer.name,
                type: 'Background',
                inputs: {
                  Width: comp.width,
                  Height: comp.height,
                  Depth: 1,
                  TopLeftRed: red,
                  TopLeftGreen: green,
                  TopLeftBlue: blue,
                  TopLeftAlpha: layer.properties.opacity / 100,
                },
                position: { x: nodeIndex * 200, y: 0 },
              });
            }
            break;
          }
          
          case 'text': {
            // Convert text layer to a Text+ node
            nodes.push({
              id: `text_${layer.id}`,
              name: layer.name,
              type: 'Text+',
              inputs: {
                StyledText: layer.properties.text,
                Font: layer.properties.font,
                Size: layer.properties.fontSize,
                Position: layer.properties.position,
              },
              position: { x: nodeIndex * 200, y: 100 },
            });
            
            // Process effects if any
            if (layer.effects && layer.effects.length > 0) {
              layer.effects.forEach((effect, effectIndex) => {
                if (effect.name === 'Glow') {
                  nodes.push({
                    id: `glow_${layer.id}_${effectIndex}`,
                    name: `${layer.name} Glow`,
                    type: 'Glow',
                    inputs: {
                      Radius: effect.properties.radius,
                      Brightness: effect.properties.intensity,
                      Input: `text_${layer.id}`,
                    },
                    position: { x: nodeIndex * 200, y: 200 + effectIndex * 100 },
                  });
                }
              });
            }
            break;
          }
          
          // Add more layer type conversions as needed
          default:
            console.log(`Unsupported layer type: ${layer.type}`);
        }
      });
      
      // Create a merge node to combine all layers if there are multiple nodes
      if (nodes.length > 1) {
        nodes.push({
          id: `merge_${comp.id}`,
          name: 'Merge',
          type: 'Merge',
          inputs: {
            Background: nodes[0].id,
            Foreground: nodes[nodes.length - 2].id,
          },
          position: { x: (nodeIndex + 1) * 200, y: 300 },
        });
      }
      
      result[comp.name] = nodes;
    });
    
    return result;
  }

  /**
   * Update DaVinci Resolve project with Fusion nodes
   * Note: This is a placeholder. In a real implementation, this would use
   * DaVinci Resolve's API to update the project.
   */
  async updateResolveProject(projectPath, fusionNodes) {
    // This is a mock implementation
    // In a real app, this would use DaVinci Resolve's API
    console.log(`Updating Resolve project at ${projectPath}`);
    console.log('Fusion nodes to create:', JSON.stringify(fusionNodes, null, 2));
    
    // In a real implementation, we would:
    // 1. Connect to DaVinci Resolve via its API
    // 2. Open the specified project
    // 3. Create or update Fusion compositions based on our converted nodes
    // 4. Save the project
    
    return true;
  }

  /**
   * Send a message to the renderer process
   */
  sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * Clean up resources when the service is no longer needed
   */
  dispose() {
    this.watchers.forEach(watcher => watcher.close());
    this.watchers = [];
    this.mainWindow = null;
  }
}

module.exports = BridgeService;