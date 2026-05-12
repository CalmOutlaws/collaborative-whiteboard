'use client'

import { useDraw } from '@/hooks/useDraw'
import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { DrawLineProps } from '@/types/canvas'

// Connect to our Day 1 standalone server
const socket = io('http://localhost:3001')

export default function Whiteboard() {
  const [color, setColor] = useState<string>('#000')
  
  const { canvasRef, onMouseDown } = useDraw(createLine)

  function createLine({ ctx, currentPoint, prevPoint }: any) {
    // 1. Draw locally for zero-latency feel
    drawLine({ ctx, currentPoint, prevPoint, color })
    
    // 2. Emit to others
    socket.emit('draw-line', { prevPoint, currentPoint, color })
  }

  // Effect to listen for incoming drawings from other users
  useEffect(() => {
  const ctx = canvasRef.current?.getContext('2d')

  socket.on('draw-line', ({ prevPoint, currentPoint, color }: DrawLineProps) => {
    if (!ctx) return
    drawLine({ ctx, currentPoint, prevPoint, color })
  })

  socket.on('clear', () => {
    ctx?.clearRect(0, 0, canvasRef.current?.width || 0, canvasRef.current?.height || 0)
  })

  return () => {
    socket.off('draw-line')
    socket.off('clear')
  }
}, [canvasRef])

  // Professional drawing function with smooth line caps
  function drawLine({ ctx, currentPoint, prevPoint, color }: any) {
    const startPoint = prevPoint ?? currentPoint
    ctx.beginPath()
    ctx.lineWidth = 5
    ctx.strokeStyle = color
    ctx.moveTo(startPoint.x, startPoint.y)
    ctx.lineTo(currentPoint.x, currentPoint.y)
    ctx.stroke()
    ctx.fillStyle = color
    ctx.circle // Optional: adds smoothness
    ctx.closePath()
  }

  return (
    <div className='flex flex-col items-center justify-center h-screen bg-slate-900'>
      <div className='mb-4 flex gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-2xl'>
        <input 
          type='color' 
          value={color} 
          onChange={(e) => setColor(e.target.value)} 
          className='w-10 h-10 rounded cursor-pointer'
        />
        <button 
          onClick={() => socket.emit('clear')}
          className='px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition'
        >
          Clear Board
        </button>
      </div>
      <canvas
        onMouseDown={onMouseDown}
        ref={canvasRef}
        width={800}
        height={600}
        className='bg-white rounded-lg shadow-inner border-4 border-slate-800'
      />
    </div>
  )
}