import { createSignal } from 'solid-js'
import solidLogo from './assets/solid.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const handleAeProjectSelect = async () => {
    const result = await window.electron.ipcRenderer.invoke('select-ae-project');
    if (result.success) setAeProjectPath(result.path);
  };

  const handleResolveProjectSelect = async () => {
    const result = await window.electron.ipcRenderer.invoke('select-resolve-project');
    if (result.success) setResolveProjectPath(result.path);
  };

  const syncNow = async () => {
    try {
      await window.electron.ipcRenderer.invoke('sync-projects');
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };
  const [isAutoSync, setIsAutoSync] = createSignal(false)
  const [aeProjectPath, setAeProjectPath] = createSignal('')
  const [resolveProjectPath, setResolveProjectPath] = createSignal('')

  return (
    <div class="min-h-screen bg-gray-900 text-white">
      <div class="flex h-screen">
        {/* Sidebar */}
        <aside class="w-64 bg-gray-800 p-4">
          <h1 class="text-xl font-bold mb-6">Rembrant</h1>
          <nav class="space-y-2">
            <a href="#" class="block px-4 py-2 rounded hover:bg-gray-700">Dashboard</a>
            <a href="#" class="block px-4 py-2 rounded hover:bg-gray-700">Projects</a>
            <a href="#" class="block px-4 py-2 rounded hover:bg-gray-700">Settings</a>
          </nav>
        </aside>

        {/* Main Content */}
        <main class="flex-1 p-8">
          <div class="max-w-4xl mx-auto">
            <h2 class="text-2xl font-bold mb-6">Project Configuration</h2>
            
            {/* Project Paths */}
            <div class="space-y-6 mb-8">
              <div class="bg-gray-800 p-6 rounded-lg">
                <h3 class="text-lg font-semibold mb-4">After Effects Project</h3>
                <div class="flex gap-4">
                  <input
                    type="text"
                    value={aeProjectPath()}
                    class="flex-1 bg-gray-700 rounded px-4 py-2"
                    placeholder="Select AE project file"
                    readOnly
                  />
                  <button 
                    class="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
                    onClick={handleResolveProjectSelect}
                  >
                    Browse
                  </button>
                </div>
              </div>

              <div class="bg-gray-800 p-6 rounded-lg">
                <h3 class="text-lg font-semibold mb-4">DaVinci Resolve Project</h3>
                <div class="flex gap-4">
                  <input
                    type="text"
                    value={resolveProjectPath()}
                    class="flex-1 bg-gray-700 rounded px-4 py-2"
                    placeholder="Select Resolve project file"
                    readOnly
                  />
                  <button 
                    class="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
                    onClick={handleResolveProjectSelect}
                  >
                    Browse
                  </button>
                </div>
              </div>
            </div>

            {/* Sync Controls */}
            <div class="bg-gray-800 p-6 rounded-lg">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-4">
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      class="sr-only peer"
                      checked={isAutoSync()}
                      onChange={(e) => setIsAutoSync(e.target.checked)}
                    />
                    <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span class="ms-3">Auto Sync</span>
                  </label>
                </div>
                <button 
                  class="bg-blue-600 px-6 py-2 rounded-lg hover:bg-blue-700"
                  onClick={syncNow}
                >
                  Sync Now
                </button>
              </div>
              <div class="text-sm text-gray-400">
                Last synced: Never
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
