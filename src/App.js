import React from 'react';

import DancingDot from './DancingDot.tsx';

import './App.css';

function App() {
  return (
    <div className='App'>
      <DancingDot />
      <div className='instructions'>
        <ol>
          <li>Open this page in <a href={window.location.href} onClick={() => window.open(window.location.href)}>another browser window</a>.</li>
          <li>Drag the dot around and see what happens!</li>
        </ol>
      </div>
    </div>
  );
}

export default App;
