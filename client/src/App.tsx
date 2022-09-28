import { useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import { MainCanvas } from './MainCanvas'
import { DistRenderPanel } from './distributed-rendering/DistRenderPanel'

function App() {

  return (
    <div className="App">
        <MainCanvas></MainCanvas>
        <DistRenderPanel></DistRenderPanel>
    </div>
  )
}

export default App
