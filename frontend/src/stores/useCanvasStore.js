import { create } from 'zustand'

const useCanvasStore = create((set) => ({
  // State
  activeTool: 'pen', // 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'select' | 'pan'
  color: '#18170F',
  strokeWidth: 2,
  isDrawing: false,
  canUndo: false,
  canRedo: false,

  // Tool actions
  setTool: (tool) => set({ activeTool: tool }),

  setColor: (newColor) => set({ color: newColor }),

  setStrokeWidth: (width) => set({ strokeWidth: width }),

  setIsDrawing: (drawing) => set({ isDrawing: drawing }),

  // Undo/Redo state
  setCanUndo: (can) => set({ canUndo: can }),

  setCanRedo: (can) => set({ canRedo: can }),

  // Reset to defaults
  resetCanvas: () => set({
    activeTool: 'pen',
    color: '#18170F',
    strokeWidth: 2,
    isDrawing: false,
    canUndo: false,
    canRedo: false,
  }),
}))

export default useCanvasStore
