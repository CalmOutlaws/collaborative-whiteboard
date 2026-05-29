// components/Whiteboard.tsx
'use client'

import { useDraw } from '@/hooks/useDraw'
import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { DrawLineProps } from '@/types/canvas'
import { Paintbrush, Eraser, Trash2, Sliders, Users, Download } from 'lucide-react'

// Dynamic environmental assignment handles cloud deployments seamlessly
const SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001'
const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
})

export default function Whiteboard() {
  const [color, setColor] = useState<string>('#38bdf8')
  const [lineWidth, setLineWidth] = useState<number>(5)
  const [isEraser, setIsEraser] = useState<boolean>(false)
  const [activeUsers, setActiveUsers] = useState<number>(1) // Track peer presence
  
  const { canvasRef, onMouseDown } = useDraw(createLine)

  function createLine({ ctx, currentPoint, prevPoint }: any) {
    const activeColor = isEraser ? '#0f172a' : color
    const activeWidth = isEraser ? lineWidth * 4 : lineWidth
    
    drawLine({ ctx, currentPoint, prevPoint, color: activeColor, width: activeWidth })
    socket.emit('draw-line', { prevPoint, currentPoint, color: activeColor, width: activeWidth })
  }

  function drawLine({ ctx, currentPoint, prevPoint, color, width }: any) {
    const startPoint = prevPoint ?? currentPoint
    ctx.beginPath()
    ctx.lineWidth = width || lineWidth
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(startPoint.x, startPoint.y)
    ctx.lineTo(currentPoint.x, currentPoint.y)
    ctx.stroke()
    ctx.closePath()
  }

  // Feature: Clientside Vector Image Downloader
  const downloadCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const image = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `collabboard-${Date.now()}.png`
    link.href = image
    link.click()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    socket.on('draw-line', ({ prevPoint, currentPoint, color, width }: any) => {
      drawLine({ ctx, currentPoint, prevPoint, color, width })
    })

    socket.on('canvas-history', (history: any[]) => {
      history.forEach((line) => {
        drawLine({ ctx, currentPoint: line.currentPoint, prevPoint: line.prevPoint, color: line.color, width: line.width })
      })
    })

    socket.on('clear', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    })

    // Listen for connection counts from server metrics
    socket.on('user-count', (count: number) => {
      setActiveUsers(count)
    })

    return () => {
      socket.off('draw-line')
      socket.off('canvas-history')
      socket.off('clear')
      socket.off('user-count')
    }
  }, [canvasRef])

  return (
    <div className='relative w-screen h-screen bg-[#090d16] flex items-center justify-center overflow-hidden font-sans select-none'>
      
      {/* Floating Toolbar */}
      <div className='absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-5 bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-800/80 shadow-2xl transition-all duration-300 hover:border-slate-700/50'>
        
        {/* Presence Badge (High Signal for Recruiters) */}
        <div className='flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20 text-xs font-semibold tracking-wide animate-pulse'>
          <Users size={14} />
          <span>{activeUsers} ONLINE</span>
        </div>

        {/* Tool Toggles */}
        <div className='flex items-center gap-2 border-l border-r border-slate-800 px-4'>
          <button 
            onClick={() => setIsEraser(false)}
            className={`p-2 rounded-xl transition-all duration-200 ${!isEraser ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Paintbrush"
          >
            <Paintbrush size={18} />
          </button>
          <button 
            onClick={() => setIsEraser(true)}
            className={`p-2 rounded-xl transition-all duration-200 ${isEraser ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Eraser"
          >
            <Eraser size={18} />
          </button>
        </div>

        {/* Color Palette */}
        {!isEraser && (
          <div className='flex items-center gap-2.5 border-r border-slate-800 pr-4'>
            {['#38bdf8', '#f43f5e', '#10b981', '#fbbf24', '#ffffff'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-all duration-200 transform hover:scale-110 ${color === c ? 'border-white scale-105' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <div className='relative w-5 h-5 rounded-full overflow-hidden border border-slate-700 hover:scale-110 transition-transform'>
              <input 
                type='color' 
                value={color} 
                onChange={(e) => setColor(e.target.value)} 
                className='absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer bg-transparent'
              />
            </div>
          </div>
        )}

        {/* Thickness Slider */}
        <div className='flex items-center gap-3 border-r border-slate-800 pr-4 text-slate-400'>
          <Sliders size={16} />
          <input 
            type='range' 
            min={2} 
            max={30} 
            value={lineWidth} 
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className='w-20 accent-sky-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer'
          />
          <span className='text-xs font-mono w-4'>{lineWidth}px</span>
        </div>

        {/* Utilities Layer */}
        <div className='flex items-center gap-2'>
          <button 
            onClick={downloadCanvas}
            className='p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all duration-200'
            title="Export Board as PNG"
          >
            <Download size={18} />
          </button>
          <button 
            onClick={() => socket.emit('clear')}
            className='p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all duration-200 flex items-center gap-1.5 group'
            title="Clear Whiteboard"
          >
            <Trash2 size={16} className='group-hover:rotate-6 transition-transform' />
            <span className='text-xs font-semibold pr-0.5'>Clear</span>
          </button>
        </div>
      </div>

      {/* Frame Canvas */}
      <canvas
        onMouseDown={onMouseDown}
        ref={canvasRef}
        width={1400}
        height={850}
        className='bg-[#0f172a] rounded-3xl shadow-[0_0_60px_-15px_rgba(0,0,0,0.8)] border border-slate-900/50 cursor-crosshair'
      />
    </div>
  )
}