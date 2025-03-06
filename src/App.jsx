import { createSignal } from 'solid-js';

function App() {
  const [count, setCount] = createSignal(0);

  return (
    <div class="container">
      <header>
        <h1>Rembrant</h1>
        <p>Connect your apps seamlessly</p>
      </header>
      
      <main>
        <div class="card">
          <button onClick={() => setCount(count() + 1)}>
            Count: {count()}
          </button>
          <p>
            Edit <code>src/App.jsx</code> and save to test HMR
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;