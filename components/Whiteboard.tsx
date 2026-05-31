// components/Whiteboard.tsx
'use client'

import { useDraw } from '@/hooks/useDraw'
import { useEffect, useState, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { DrawLineProps } from '@/types/canvas'
import { Paintbrush, Eraser, Trash2, Sliders, Users, Download,
         RotateCcw, RotateCw, Zap, Circle, Square, Text,
         Image, Loader, LayoutGrid, MessageCircle,
         Settings, EyeOff, Eye, RefreshCw } from 'lucide-react'

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
  const [canvasBg, setCanvasBg] = useState<string>('#0f172a') // Canvas background color
  const [showGrid, setShowGrid] = useState<boolean>(false)
  const [selectedTool, setSelectedTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle' | 'text' | 'image'>('pen')
  const [isDrawingShape, setIsDrawingShape] = useState<boolean>(false)
  const [shapeStart, setShapeStart] = useState<{x: number, y: number} | null>(null)
  const [textInput, setTextInput] = useState<string>('')
  const [textPosition, setTextPosition] = useState<{x: number, y: number} | null>(null)
  const [showTextInput, setShowTextInput] = useState<boolean>(false)
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false)
  const [userName, setUserName] = useState<string>(`User${Math.floor(Math.random()*1000)}`)
  const [roomId, setRoomId] = useState<string>('')
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [eyeDisabled, setEyeDisabled] = useState<boolean>(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number>(0)
  const { onMouseDown } = useDraw(createLine)

  // Socket.io connection
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    // Listen for incoming draw events
    socket.on('draw-line', ({ prevPoint, currentPoint, color, width }: any) => {
      drawLine({ ctx, currentPoint, prevPoint, color, width })
    })

    socket.on('draw-shape', (shape: any) => {
      drawShape(ctx, shape)
    })

    socket.on('draw-text', (textData: any) => {
      drawText(ctx, textData)
    })

    socket.on('canvas-history', (history: any[]) => {
      setLoadingHistory(true)
      // Clear canvas first
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Draw background
      drawBackground(ctx, canvas.width, canvas.height)
      // Draw history
      history.forEach((line: any) => {
        if (line.type === 'line') {
          drawLine({ ctx, currentPoint: line.currentPoint, prevPoint: line.prevPoint, color: line.color, width: line.width })
        } else if (line.type === 'shape') {
          drawShape(ctx, line)
        } else if (line.type === 'text') {
          drawText(ctx, line)
        }
      })
      setLoadingHistory(false)
    })

    socket.on('clear', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawBackground(ctx, canvas.width, canvas.height)
    })

    socket.on('user-count', (count: number) => {
      setActiveUsers(count)
    })

    socket.on('user-joined', (user: any) => {
      // Show temporary notification (simplified)
      console.log(`User joined: ${user.name}`)
    })

    // Listen for connection counts from server metrics
    socket.on('user-count', (count: number) => {
      setActiveUsers(count)
    })

    return () => {
      socket.off('draw-line')
      socket.off('draw-shape')
      socket.off('draw-text')
      socket.off('canvas-history')
      socket.off('clear')
      socket.off('user-count')
      socket.off('user-joined')
    }
  }, [canvasRef])

  // Resize canvas on window resize
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Set canvas size to parent container size with some padding
      const container = canvas.parentElement
      if (container) {
        const { width, height } = container.getBoundingClientRect()
        // Minimum size constraints
        canvas.width = Math.max(width - 40, 800)
        canvas.height = Math.max(height - 40, 500)

        // Redraw background and existing content
        const ctx = canvas.getContext('2d')
        if (ctx) {
          drawBackground(ctx, canvas.width, canvas.height)
          // Note: We don't redraw existing content here to avoid complexity
          // In a production app, we would redraw from history
        }
      }
    }

    // Initial resize
    resizeCanvas()

    // Add resize listener
    window.addEventListener('resize', resizeCanvas)

    // Cleanup
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  // Draw background with optional grid
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Fill background
    ctx.fillStyle = canvasBg
    ctx.fillRect(0, 0, width, height)

    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 0.5
      const gridSize = 20

      // Vertical lines
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }

      // Horizontal lines
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
    }
  }, [canvasBg, showGrid])

  // Draw line function
  function createLine({ ctx, currentPoint, prevPoint }: any) {
    const activeColor = isEraser ? canvasBg : color
    const activeWidth = isEraser ? lineWidth * 4 : lineWidth

    drawLine({ ctx, currentPoint, prevPoint, color: activeColor, width: activeWidth })
    socket.emit('draw-line', { prevPoint, currentPoint, color: activeColor, width: activeWidth })
  }

  function drawLine({ ctx, currentPoint, prevPoint, color, width }: any) {
    const startPoint = prevPoint ?? currentPoint
    ctx.beginPath()
    ctx.lineWidth = width
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(startPoint.x, startPoint.y)
    ctx.lineTo(currentPoint.x, currentPoint.y)
    ctx.stroke()
    ctx.closePath()
  }

  // Draw shape function
  function drawShape(ctx: CanvasRenderingContext2D, shape: any) {
    ctx.beginPath()
    ctx.strokeStyle = shape.color
    ctx.lineWidth = shape.width

    if (shape.type === 'rectangle') {
      const width = shape.endPoint.x - shape.startPoint.x
      const height = shape.endPoint.y - shape.startPoint.y
      ctx.strokeRect(shape.startPoint.x, shape.startPoint.y, width, height)
    } else if (shape.type === 'circle') {
      const radius = Math.sqrt(
        Math.pow(shape.endPoint.x - shape.startPoint.x, 2) +
        Math.pow(shape.endPoint.y - shape.startPoint.y, 2)
      )
      ctx.ellipse(
        shape.startPoint.x,
        shape.startPoint.y,
        radius,
        radius,
        0,
        0,
        2 * Math.PI
      )
    }

    ctx.stroke()
    ctx.closePath()
  }

  // Draw text function
  function drawText(ctx: CanvasRenderingContext2D, textData: any) {
    ctx.font = '20px Arial'
    ctx.fillStyle = textData.color
    ctx.fillText(textData.text, textData.x, textData.y)
  }

  // Handle mouse down for shapes
  const handleShapeDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const startPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }

    setShapeStart(startPoint)
    setIsDrawingShape(true)
  }

  // Handle mouse up for shapes
  const handleShapeUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingShape || !shapeStart) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const endPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }

    const shape = {
      type: selectedTool,
      startPoint,
      endPoint,
      color,
      width: lineWidth
    }

    // Draw locally
    const ctx = canvas.getContext('2d')
    if (ctx) {
      drawShape(ctx, shape)
    }

    // Emit to server
    socket.emit('draw-shape', shape)

    // Reset
    setIsDrawingShape(false)
    setShapeStart(null)
  }

  // Handle mouse down for text
  const handleTextDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }

    setTextPosition(position)
    setShowTextInput(true)
    // Focus the input (we'll need a ref for the input)
  }

  // Handle text input submit
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim() || !textPosition) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (ctx) {
      drawText(ctx, {
        text: textInput,
        x: textPosition.x,
        y: textPosition.y,
        color
      })
    }

    // Emit to server
    socket.emit('draw-text', {
      text: textInput,
      x: textPosition.x,
      y: textPosition.y,
      color
    })

    // Reset
    setTextInput('')
    setShowTextInput(false)
    setTextPosition(null)
  }

  // Clear canvas with confirmation
  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the entire whiteboard? This action cannot be undone.')) {
      socket.emit('clear')
    }
  }

  // Toggle settings panel
  const toggleSettings = () => setShowSettings(!showSettings)

  // Toggle eye (hide/show user count)
  const toggleEye = () => setEyeDisabled(!eyeDisabled)

  return (
    <div className='relative w-screen h-screen bg-[#090d16] flex items-center justify-center overflow-hidden font-sans select-none'>

      {/* Settings Panel */}
      {showSettings && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center'>
          <div className='bg-slate-900/80 backdrop-blur-md p-8 rounded-2xl border border-slate-800/80 shadow-2xl w-96 max-w-full'>
            <h2 className='text-xl font-bold text-white mb-6'>Whiteboard Settings</h2>

            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <span className='text-slate-300'>Background Color</span>
                <input
                  type='color'
                  value={canvasBg}
                  onChange={(e) => setCanvasBg(e.target.value)}
                  className='w-16 h-10 rounded-lg border border-slate-700'
                />
              </div>

              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <input
                    id='grid-toggle'
                    type='checkbox'
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className='h-4 w-4 text-sky-500 bg-slate-700 border-slate-600 rounded focus:ring-sky-500'
                  />
                </div>
                <label htmlFor='grid-toggle' className='ml-3 text-slate-300'>
                  Show Grid
                </label>
              </div>

              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <input
                    id='name-input'
                    type='text'
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder='Enter your name'
                    className='w-full px-3 py-2 rounded-lg bg-slate-800 text-white border border-slate-700 focus:border-sky-500 focus:ring-sky-500'
                  />
                </div>
              </div>

              <div className='flex items-center'>
                <div className='flex-shrink-0'>
                  <input
                    id='room-input'
                    type='text'
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder='Room ID (optional)'
                    className='w-full px-3 py-2 rounded-lg bg-slate-800 text-white border border-slate-700 focus:border-sky-500 focus:ring-sky-500'
                  />
                </div>
              </div>
            </div>

            <div className='mt-6 flex justify-end space-x-3'>
              <button
                onClick={() => setShowSettings(false)}
                className='px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all duration-200'
              >
                Cancel
              </button>
              <button
                onClick={toggleSettings}
                className='px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-all duration-200'
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Text Input */}
      {showTextInput && textPosition && (
        <div className='absolute left-[calc(${textPosition.x}px)] top-[calc(${textPosition.y}px)] z-50'>
          <form onSubmit={handleTextSubmit} className='bg-slate-900/80 backdrop-blur-md p-3 rounded-lg border border-slate-800/80'>
            <input
              type='text'
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder='Enter text...'
              className='w-64 px-3 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg focus:border-sky-500 focus:ring-sky-500'
              autoFocus
            />
            <button
              type='submit'
              className='mt-2 px-3 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-all duration-200'
            >
              Add Text
            </button>
          </form>
        </div>
      )}

      {/* Floating Toolbar */}
      <div className='absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-800/80 shadow-2xl transition-all duration-300 hover:border-slate-700/50'>

        {/* Presence Badge */}
        {!eyeDisabled && (
          <div className='flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20 text-xs font-semibold tracking-wide animate-pulse'>
            <Users size={14} />
            <span>{activeUsers} ONLINE</span>
          </div>
        )}

        {/* Tool Toggles */}
        <div className='flex items-center gap-2 border-l border-r border-slate-800 px-4'>
          {/* Pen Tool */}
          <button
            onClick={() => setSelectedTool('pen')}
            className={`p-2 rounded-xl transition-all duration-200 ${selectedTool === 'pen' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Pen"
          >
            <Paintbrush size={18} />
          </button>

          {/* Eraser Tool */}
          <button
            onClick={() => setSelectedTool('eraser')}
            className={`p-2 rounded-xl transition-all duration-200 ${selectedTool === 'eraser' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Eraser"
          >
            <Eraser size={18} />
          </button>

          {/* Rectangle Tool */}
          <button
            onClick={() => setSelectedTool('rectangle')}
            className={`p-2 rounded-xl transition-all duration-200 ${selectedTool === 'rectangle' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Rectangle"
          >
            <Square size={18} />
          </button>

          {/* Circle Tool */}
          <button
            onClick={() => setSelectedTool('circle')}
            className={`p-2 rounded-xl transition-all duration-200 ${selectedTool === 'circle' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Circle"
          >
            <Circle size={18} />
          </button>

          {/* Text Tool */}
          <button
            onClick={() => setSelectedTool('text')}
            className={`p-2 rounded-xl transition-all duration-200 ${selectedTool === 'text' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Text"
          >
            <Text size={18} />
          </button>

          {/* Image Tool (placeholder) */}
          <button
            onClick={() => setSelectedTool('image')}
            className={`p-2 rounded-xl transition-all duration-200 ${selectedTool === 'image' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            title="Image"
          >
            <Image size={18} />
          </button>
        </div>

        {/* Color Palette */}
        {(selectedTool === 'pen' || selectedTool === 'rectangle' || selectedTool === 'circle') && !isEraser && (
          <div className='flex items-center gap-2.5 border-r border-slate-800 pr-4'>
            {['#38bdf8', '#f43f5e', '#10b981', '#fbbf24', '#ffffff', '#8b5cf6', '#ec4899', '#f97316'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all duration-200 transform hover:scale-110 ${color === c ? 'border-white scale-105' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <div className='relative w-6 h-6 rounded-full overflow-hidden border border-slate-700 hover:scale-110 transition-transform'>
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
            min={1}
            max={50}
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className='w-24 accent-sky-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer'
          />
          <span className='text-xs font-mono w-5'>{(lineWidth)}px</span>
        </div>

        {/* Utilities Layer */}
        <div className='flex items-center gap-2'>
          {/* Download */}
          <button
            onClick={() => {
              const canvas = canvasRef.current
              if (!canvas) return
              const image = canvas.toDataURL('image/png')
              const link = document.createElement('a')
              link.download = `collabboard-${userName}-${Date.now()}.png`
              link.href = image
              link.click()
            }}
            className='p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all duration-200'
            title="Export Board as PNG"
          >
            <Download size={18} />
          </button>

          {/* Clear */}
          <button
            onClick={handleClear}
            className='p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all duration-200 flex items-center gap-1.5 group'
            title="Clear Whiteboard"
          >
            <Trash2 size={16} className='group-hover:rotate-6 transition-transform' />
            <span className='text-xs font-semibold pr-0.5'>Clear</span>
          </button>

          {/* Settings */}
          <button
            onClick={toggleSettings}
            className='p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all duration-200'
            title="Settings"
          >
            <Settings size={18} />
          </button>

          {/* Eye (Hide/Show User Count) */}
          <button
            onClick={toggleEye}
            className={`p-2 bg-slate-800 hover:bg-slate-700 ${eyeDisabled ? 'text-rose-400' : 'text-slate-300'} hover:text-white rounded-xl transition-all duration-200`}
            title={eyeDisabled ? 'Show User Count' : 'Hide User Count'}
          >
            {eyeDisabled ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>

          {/* Loading Indicator */}
          {loadingHistory && (
            <div className='flex items-center gap-2'>
              <Loader size={18} className='text-sky-400 animate-spin' />
              <span className='text-xs text-slate-300'>Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className='absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-slate-400'>
        <span>⌘Z Undo | ⌘Y Redo | Space Pan | ←→↑↓ Nudge</span>
      </div>

      {/* Frame Canvas */}
      <div className='relative w-full h-full'>
        <canvas
          onMouseDown={selectedTool === 'pen' || selectedTool === 'eraser' ? onMouseDown : selectedTool === 'rectangle' || selectedTool === 'circle' ? handleShapeDown : handleTextDown}
          onMouseUp={selectedTool === 'rectangle' || selectedTool === 'circle' ? handleShapeUp : undefined}
          ref={canvasRef}
          className='bg-[var(--canvas-bg)] rounded-3xl shadow-[0_0_60px_-15px_rgba(0,0,0,0.8)] border border-slate-900/50 cursor-crosshair touch-none'
          style={{ --canvas-bg: canvasBg }}
        />

        {/* Temporary shape preview */}
        {isDrawingShape && shapeStart && (
          <div className='absolute inset-0 pointer-events-none'>
            <canvas
              width={1400}
              height={850}
              className='absolute inset-0 bg-transparent'
              ref={canvasRef} // We'll use a separate ref for preview in reality
            />
          </div>
        )}
      </div>
    </div>
  )
}