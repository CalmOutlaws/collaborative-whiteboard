// components/Whiteboard.tsx
'use client'

import { useDraw } from '@/hooks/useDraw'
import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { DrawLineProps } from '@/types/canvas'

const socket = io('http://localhost:3001')

export default function Whiteboard() {
  const [color, setColor] = useState<string>('#000')
  const { canvasRef, onMouseDown } = useDraw(createLine)

  function createLine({ ctx, currentPoint, prevPoint }: any) {
    drawLine({ ctx, currentPoint, prevPoint, color })
    socket.emit('draw-line', { prevPoint, currentPoint, color })
  }

  // Abstracted structural drawing function
  function drawLine({ ctx, currentPoint, prevPoint, color }: any) {
    const startPoint = prevPoint ?? currentPoint
    ctx.beginPath()
    ctx.lineWidth = 5
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(startPoint.x, startPoint.y)
    ctx.lineTo(currentPoint.x, currentPoint.y)
    ctx.stroke()
    ctx.closePath()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    // Receive real-time lines from other peers
    socket.on('draw-line', ({ prevPoint, currentPoint, color }: DrawLineProps) => {
      drawLine({ ctx, currentPoint, prevPoint, color })
    })

    // Catch full historical logs upon entry or refresh
    socket.on('canvas-history', (history: DrawLineProps[]) => {
      history.forEach((line) => {
        drawLine({ ctx, currentPoint: line.currentPoint, prevPoint: line.prevPoint, color: line.color })
      })
    })

    // Synchronized clean slate action
    socket.on('clear', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    })

    return () => {
      socket.off('draw-line')
      socket.off('canvas-history')
      socket.off('clear')
    }
  }, [canvasRef])

  return (
    <div className='flex flex-col items-center justify-center h-screen bg-slate-950'>
      <div className='mb-4 flex gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-2xl z-10'>
        <input 
          type='color' 
          value={color} 
          onChange={(e) => setColor(e.target.value)} 
          className='w-10 h-10 rounded cursor-pointer border border-slate-700 bg-transparent'
        />
        <button 
          onClick={() => socket.emit('clear')}
          className='px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow transition-all duration-200'
        >
          Clear Board
        </button>
      </div>
      <canvas
        onMouseDown={onMouseDown}
        ref={canvasRef}
        width={1000}
        height={700}
        className='bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 cursor-crosshair'
      />
    </div>
  )
}