'use client'

import { useState, useEffect, useRef } from 'react'
import clsx from 'clsx'
import { CheckCircle, RefreshCw, Timer, Play, Pause, Settings, Volume2, Trash2 } from 'lucide-react'

// Estilos CSS inyectados (Simplificados y adaptados a la marca)
const timerStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
  .led-font { font-family: 'Orbitron', monospace; letter-spacing: 2px; }
  .digital-screen { background: #111827; box-shadow: inset 0 0 20px rgba(0,0,0,0.8); position: relative; overflow: hidden; }
  .digital-screen::before { content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03)); background-size: 100% 4px, 4px 100%; pointer-events: none; }
  .glow-green { color: #4ade80; text-shadow: 0 0 10px rgba(74, 222, 128, 0.5); }
  .glow-red { color: #f87171; text-shadow: 0 0 15px rgba(248, 113, 113, 0.8); }
  @keyframes alert-blink { 0%, 100% { border-color: #ef4444; background-color: #fef2f2; } 50% { border-color: #e5e7eb; background-color: #ffffff; } }
  .is-finished { animation: alert-blink 0.5s infinite; border-width: 2px; }
`

interface Channel {
  id: number;
  label: string;
  timeLeft: number;
  initialTime: number;
  isRunning: boolean;
  isSetting: boolean;
  soundType: 'high' | 'mid' | 'low';
}

export default function TemporizadoresPro() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null)
  const intervals = useRef<{ [key: number]: NodeJS.Timeout }>({})

  useEffect(() => {
    const saved = localStorage.getItem('cal8c_config')
    if (saved) {
      const parsed = JSON.parse(saved)
      setChannels(parsed.map((ch: any) => ({ ...ch, isRunning: false, timeLeft: ch.initialTime })))
    } else {
      setChannels(Array.from({ length: 8 }, (_, i) => ({
        id: i + 1, label: '', timeLeft: 0, initialTime: 0, isRunning: false, isSetting: true, soundType: 'high'
      })))
    }
  }, [])

  const saveToMemory = (newChannels: Channel[]) => {
    const dataToSave = newChannels.map(ch => ({
      id: ch.id, label: ch.label, initialTime: ch.initialTime, soundType: ch.soundType, isSetting: ch.isSetting
    }))
    localStorage.setItem('cal8c_config', JSON.stringify(dataToSave))
  }

  const initAudio = () => {
    if (!audioCtx) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      setAudioCtx(ctx)
      playBeep(ctx, 1000, 0.1, 0.2)
    }
  }

  const playBeep = (ctx: AudioContext, frequency = 2500, duration = 0.2, volume = 0.8) => {
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + duration)
  }

  const onFinish = (id: number, type: string) => {
    if (!audioCtx) return
    let freq = 2500
    if (type === 'mid') freq = 1200
    if (type === 'low') freq = 600
    for(let i = 0; i < 5; i++) {
      setTimeout(() => playBeep(audioCtx, freq, 0.15, 0.9), i * 250)
    }
  }

  const toggleChannel = (id: number) => {
    initAudio()
    setChannels(prev => prev.map(ch => {
      if (ch.id === id) {
        if (ch.isSetting) return ch
        if (ch.timeLeft === 0 && !ch.isSetting) return { ...ch, timeLeft: ch.initialTime }
        
        if (ch.isRunning) {
          clearInterval(intervals.current[id])
          return { ...ch, isRunning: false }
        } else {
          if (ch.timeLeft > 0) {
            intervals.current[id] = setInterval(() => tick(id), 1000)
            return { ...ch, isRunning: true }
          }
        }
      }
      return ch
    }))
  }

  const tick = (id: number) => {
    setChannels(prev => prev.map(ch => {
      if (ch.id === id) {
        const newTime = ch.timeLeft - 1
        if (newTime <= 0) {
          clearInterval(intervals.current[id])
          onFinish(id, ch.soundType)
          return { ...ch, timeLeft: 0, isRunning: false }
        }
        return { ...ch, timeLeft: newTime }
      }
      return ch
    }))
  }

  const resetChannel = (id: number) => {
    initAudio()
    clearInterval(intervals.current[id])
    setChannels(prev => prev.map(ch => ch.id === id ? { ...ch, isRunning: false, timeLeft: ch.initialTime } : ch))
  }

  const toggleConfig = (id: number) => {
    initAudio()
    clearInterval(intervals.current[id])
    setChannels(prev => prev.map(ch => ch.id === id ? { ...ch, isSetting: true, isRunning: false } : ch))
  }

  const saveTime = (id: number, label: string, h: number, m: number, s: number, soundType: any) => {
    initAudio()
    const totalSecs = (h * 3600) + (m * 60) + s
    setChannels(prev => {
      const newCh = prev.map(ch => ch.id === id ? { ...ch, label: label.toUpperCase(), initialTime: totalSecs, timeLeft: totalSecs, isSetting: false, soundType } : ch)
      saveToMemory(newCh)
      return newCh
    })
  }

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0')
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  if (channels.length === 0) return <div className="h-screen bg-gray-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin" /></div>

  return (
    <div className="bg-gray-50 text-gray-800 min-h-screen flex flex-col p-4 sm:p-6" onClick={initAudio}>
      <style>{timerStyles}</style>
      
      <div className="max-w-[1400px] w-full mx-auto bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* CABECERA GLOTONES */}
        <div className="bg-purple-800 px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Timer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight">Estación de Control</h1>
              <p className="text-[10px] font-bold text-purple-200 uppercase tracking-widest mt-0.5">Glotones 593 • Cronómetros</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!audioCtx && (
              <button className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black animate-pulse shadow-md transition-colors">
                <Volume2 className="w-4 h-4" /> ACTIVAR SONIDO
              </button>
            )}
            <button onClick={() => { if(confirm('¿Borrar configuración de tiempos?')) { localStorage.removeItem('cal8c_config'); window.location.reload() } }} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors">
              <Trash2 className="w-4 h-4" /> Resetear Panel
            </button>
          </div>
        </div>

        {/* GRID DE CANALES */}
        <div className="p-6 bg-gray-50/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {channels.map(ch => (
            <div key={ch.id} className={clsx("bg-white rounded-2xl border transition-all shadow-sm flex flex-col p-4", ch.timeLeft === 0 && !ch.isSetting ? "is-finished" : "border-gray-200 hover:border-purple-300 hover:shadow-md")}>
              
              <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">CANAL {ch.id}</span>
                  <p className="text-gray-800 font-black text-sm uppercase truncate max-w-[140px] leading-tight mt-0.5">
                    {ch.label || 'DISPONIBLE'}
                  </p>
                </div>
                <div className={clsx("w-3.5 h-3.5 rounded-full shadow-inner", ch.isRunning ? 'bg-green-500 animate-pulse' : ch.timeLeft === 0 && !ch.isSetting ? 'bg-red-500' : 'bg-gray-200')}></div>
              </div>

              {/* PANTALLA DIGITAL */}
              <div className="digital-screen h-20 rounded-xl flex items-center justify-center mb-4">
                <div className={clsx("led-font transition-colors w-full px-2 flex justify-center text-center", ch.isSetting ? "" : "text-4xl font-bold", ch.timeLeft === 0 && !ch.isSetting ? 'glow-red' : 'glow-green')}>
                  {ch.isSetting ? (
                    <ConfigPanel ch={ch} onSave={saveTime} />
                  ) : formatTime(ch.timeLeft)}
                </div>
              </div>

              {/* CONTROLES */}
              <div className="grid grid-cols-3 gap-2 mt-auto">
                <button onClick={() => toggleChannel(ch.id)} className={clsx("p-3 rounded-xl flex justify-center items-center transition-all active:scale-95 shadow-sm font-black", ch.timeLeft === 0 && !ch.isSetting ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-purple-100 text-purple-700 hover:bg-purple-200")}>
                  {ch.timeLeft === 0 && !ch.isSetting ? <CheckCircle className="w-5 h-5" /> : (ch.isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />)}
                </button>
                <button onClick={() => resetChannel(ch.id)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-3 rounded-xl flex justify-center items-center transition-all active:scale-95 shadow-sm">
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button onClick={() => toggleConfig(ch.id)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-3 rounded-xl flex justify-center items-center transition-all active:scale-95 shadow-sm">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  )
}

function ConfigPanel({ ch, onSave }: any) {
  const [label, setLabel] = useState(ch.label)
  const [h, setH] = useState(Math.floor(ch.initialTime/3600))
  const [m, setM] = useState(Math.floor((ch.initialTime%3600)/60))
  const [s, setS] = useState(ch.initialTime%60)
  const [snd, setSnd] = useState(ch.soundType || 'high')

  return (
    <div className="flex flex-col gap-2 w-full px-2 py-1.5 font-sans z-10 relative">
      <input 
        type="text" 
        value={label} 
        onChange={e => setLabel(e.target.value)} 
        placeholder="PRODUCTO (EJ: PAPAS)" 
        className="w-full bg-black/60 text-green-400 border border-gray-600 rounded p-1 text-[11px] font-black uppercase outline-none focus:border-green-500 placeholder-green-900/50 text-center shadow-inner" 
      />
      
      <div className="flex gap-1 items-center justify-center font-bold">
        <input 
          type="number" 
          value={h.toString()} 
          onChange={e => setH(Number(e.target.value))} 
          className="w-10 bg-black/60 border border-gray-600 text-green-400 text-center rounded p-1 text-sm outline-none focus:border-green-500 shadow-inner" 
          min="0" 
        />
        <span className="text-gray-500 text-xs font-black">:</span>
        <input 
          type="number" 
          value={m.toString()} 
          onChange={e => setM(Number(e.target.value))} 
          className="w-10 bg-black/60 border border-gray-600 text-green-400 text-center rounded p-1 text-sm outline-none focus:border-green-500 shadow-inner" 
          min="0" max="59" 
        />
        <span className="text-gray-500 text-xs font-black">:</span>
        <input 
          type="number" 
          value={s.toString()} 
          onChange={e => setS(Number(e.target.value))} 
          className="w-10 bg-black/60 border border-gray-600 text-green-400 text-center rounded p-1 text-sm outline-none focus:border-green-500 shadow-inner" 
          min="0" max="59" 
        />
        <button 
          onClick={() => onSave(ch.id, label, h, m, s, snd)} 
          className="ml-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-black transition-colors shadow-md border border-green-600"
        >
          ✓
        </button>
      </div>

      <select 
        value={snd} 
        onChange={e => setSnd(e.target.value)} 
        className="w-full bg-black/60 border border-gray-600 text-gray-300 text-[10px] font-bold uppercase rounded p-1 outline-none focus:border-purple-500 text-center cursor-pointer shadow-inner"
      >
        <option value="high">Campana Aguda</option>
        <option value="mid">Alerta Media</option>
        <option value="low">Zumbador Grave</option>
      </select>
    </div>
  )
}