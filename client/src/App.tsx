import { useEffect, useRef, useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import { ConsumerMainCanvas } from './consumer/ConsumerMainCanvas'
import { RenderTask, RenderTaskOptions } from './raymarcher/Render'
import { DistRenderConsumer, DistRenderConsumerState } from './consumer/DistRenderConsumer'
import { useInterval } from './Util'
import { ProducerMainCanvas } from './producer/ProducerMainCanvas'
import { render } from 'react-dom'
import { ProducerRoot } from './producer/ProducerRoot'
import { ConsumerRoot } from './consumer/ConsumerRoot'

function App() {
  
    const isProducer = (new URLSearchParams(window.location.search)).get("producer") !== null; 

    // UI
  return (
    <div className="App">
        {isProducer
        ?
        <ProducerRoot></ProducerRoot>
        :
        <ConsumerRoot></ConsumerRoot>}
    </div>
  )
}

export default App
