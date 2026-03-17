import { useEffect, useRef, useCallback } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './game/constants';
import { createEngineState, updateEngine, startGame, EngineState } from './game/engine';
import { render, renderTitleScreen, renderGameOver } from './game/renderer';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<EngineState>(createEngineState());
  const rafRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sync keys into state
    stateRef.current = { ...stateRef.current, keys: keysRef.current };

    // Update
    stateRef.current = updateEngine(stateRef.current);

    // Render
    const state = stateRef.current;
    if (state.game.phase === 'title') {
      renderTitleScreen(ctx, state.game.frameCount, state.game.highScore);
    } else if (state.game.phase === 'gameOver') {
      render(ctx, state);
      renderGameOver(ctx, state);
    } else {
      render(ctx, state);
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current = new Set(keysRef.current);
      keysRef.current.add(e.code);

      // Prevent page scroll
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      // Title screen: start game
      if (e.code === 'Space' || e.code === 'Enter') {
        const s = stateRef.current;
        if (s.game.phase === 'title' || s.game.phase === 'gameOver') {
          stateRef.current = startGame(s);
        }
        if (s.game.phase === 'paused') {
          stateRef.current = { ...s, game: { ...s.game, phase: 'playing' } };
        }
      }

      // Pause
      if (e.code === 'Escape' || e.code === 'KeyP') {
        const s = stateRef.current;
        if (s.game.phase === 'playing') {
          stateRef.current = { ...s, game: { ...s.game, phase: 'paused' } };
        } else if (s.game.phase === 'paused') {
          stateRef.current = { ...s, game: { ...s.game, phase: 'playing' } };
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current = new Set(keysRef.current);
      keysRef.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [gameLoop]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <div className="relative" style={{ imageRendering: 'pixelated' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            display: 'block',
            imageRendering: 'pixelated',
            border: '3px solid #FFD700',
            boxShadow: '0 0 30px #FFD700, 0 0 60px rgba(255,165,0,0.4)',
          }}
        />
      </div>

      {/* Mobile controls */}
      <div className="mt-4 flex flex-col items-center gap-2 select-none">
        <div className="flex gap-2">
          <button
            className="w-14 h-14 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white text-2xl rounded-lg border border-gray-500 flex items-center justify-center"
            onPointerDown={() => keysRef.current.add('ArrowUp')}
            onPointerUp={() => keysRef.current.delete('ArrowUp')}
            onPointerLeave={() => keysRef.current.delete('ArrowUp')}
          >▲</button>
        </div>
        <div className="flex gap-2">
          <button
            className="w-14 h-14 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white text-2xl rounded-lg border border-gray-500 flex items-center justify-center"
            onPointerDown={() => keysRef.current.add('ArrowLeft')}
            onPointerUp={() => keysRef.current.delete('ArrowLeft')}
            onPointerLeave={() => keysRef.current.delete('ArrowLeft')}
          >◄</button>
          <button
            className="w-14 h-14 bg-orange-500 hover:bg-orange-400 active:bg-orange-300 text-white text-xl font-bold rounded-lg border border-orange-400 flex items-center justify-center"
            onPointerDown={() => {
              keysRef.current.add('Space');
              const s = stateRef.current;
              if (s.game.phase === 'title' || s.game.phase === 'gameOver') {
                stateRef.current = startGame(s);
              }
            }}
            onPointerUp={() => keysRef.current.delete('Space')}
            onPointerLeave={() => keysRef.current.delete('Space')}
          >💨</button>
          <button
            className="w-14 h-14 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white text-2xl rounded-lg border border-gray-500 flex items-center justify-center"
            onPointerDown={() => keysRef.current.add('ArrowRight')}
            onPointerUp={() => keysRef.current.delete('ArrowRight')}
            onPointerLeave={() => keysRef.current.delete('ArrowRight')}
          >►</button>
        </div>
        <div className="flex gap-2">
          <button
            className="w-14 h-14 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white text-2xl rounded-lg border border-gray-500 flex items-center justify-center"
            onPointerDown={() => keysRef.current.add('ArrowDown')}
            onPointerUp={() => keysRef.current.delete('ArrowDown')}
            onPointerLeave={() => keysRef.current.delete('ArrowDown')}
          >▼</button>
        </div>
      </div>

      <div className="mt-3 text-gray-500 text-xs text-center">
        <span className="text-gray-400 font-bold">ARROWS/WASD</span> to move &amp; dig &nbsp;|&nbsp;
        <span className="text-orange-400 font-bold">SPACE</span> to pump &nbsp;|&nbsp;
        <span className="text-gray-400 font-bold">P/ESC</span> to pause
      </div>
    </div>
  );
}
