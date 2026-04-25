import { useEffect, useRef, useState } from 'react';
import './index.css';

const TOWER_TYPES = {
  1: { id: 1, name: 'Rapid Circle', cost: 50, range: 150, damage: 100, cooldown: 500, color: '#00ffcc', beam: '#ffff00' },
  2: { id: 2, name: 'Heavy Triangle', cost: 100, range: 200, damage: 350, cooldown: 1500, color: '#33ff33', beam: '#33ff33' }
};

export default function App() {
  const canvasRef = useRef(null);

  // React State for the UI
  const [uiState, setUiState] = useState({ wave: 1, lives: 10, money: 150, status: 'PLAYING', selectedTower: 1 });

  // Refs for the fast-moving game engine data
  const gameState = useRef({
    enemies: [],
    towers: [],
    path: [
      { x: 0, y: 150 }, { x: 500, y: 150 }, { x: 500, y: 450 }, { x: 1000, y: 450 }
    ],
    wave: 1,
    lives: 10,
    money: 150,
    status: 'PLAYING',
    enemiesSpawnedThisWave: 0,
    enemiesPerWave: 10,
    lastSpawnTime: 0,
    waveIntermissionTimer: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = (timestamp) => {
      // 1. Clear the screen
      ctx.fillStyle = '#050b14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (gameState.current.status === 'GAME_OVER') {
        ctx.fillStyle = '#ff3366';
        ctx.font = 'bold 50px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SYSTEM COMPROMISED', canvas.width / 2, canvas.height / 2);
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // 2. Draw the Path
      ctx.beginPath();
      ctx.moveTo(gameState.current.path[0].x, gameState.current.path[0].y);
      for (let i = 1; i < gameState.current.path.length; i++) {
        ctx.lineTo(gameState.current.path[i].x, gameState.current.path[i].y);
      }
      ctx.strokeStyle = 'rgba(77, 166, 255, 0.2)';
      ctx.lineWidth = 40;
      ctx.stroke();

      // 3. Wave Management
      if (gameState.current.status === 'PLAYING') {
        const spawnDelay = Math.max(200, 1000 - (gameState.current.wave * 50));
        const enemySpeed = 1.5 + (gameState.current.wave * 0.2);
        const enemyHp = 100 * Math.pow(1.2, gameState.current.wave - 1);

        if (gameState.current.enemiesSpawnedThisWave < gameState.current.enemiesPerWave) {
          if (timestamp - gameState.current.lastSpawnTime > spawnDelay) {
            gameState.current.enemies.push({
              x: gameState.current.path[0].x,
              y: gameState.current.path[0].y,
              targetWaypoint: 1,
              speed: enemySpeed,
              hp: enemyHp,
              maxHp: enemyHp
            });
            gameState.current.enemiesSpawnedThisWave++;
            gameState.current.lastSpawnTime = timestamp;
          }
        } else if (gameState.current.enemies.length === 0) {
          gameState.current.status = 'WAITING';
          gameState.current.waveIntermissionTimer = timestamp;
        }
      } else if (gameState.current.status === 'WAITING') {
        ctx.fillStyle = '#4da6ff';
        ctx.font = 'bold 30px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`WAVE ${gameState.current.wave} CLEARED. PREPARING...`, canvas.width / 2, 50);

        if (timestamp - gameState.current.waveIntermissionTimer > 3000) {
          gameState.current.wave++;
          gameState.current.enemiesSpawnedThisWave = 0;
          gameState.current.enemiesPerWave = 10 + (gameState.current.wave * 2);
          gameState.current.status = 'PLAYING';
          setUiState(prev => ({ ...prev, wave: gameState.current.wave, status: 'PLAYING' }));
        }
      }

      // 4. Update and Draw Enemies
      for (let i = gameState.current.enemies.length - 1; i >= 0; i--) {
        let enemy = gameState.current.enemies[i];
        let target = gameState.current.path[enemy.targetWaypoint];

        let dx = target.x - enemy.x;
        let dy = target.y - enemy.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < enemy.speed) {
          enemy.targetWaypoint++;
          if (enemy.targetWaypoint >= gameState.current.path.length) {
            gameState.current.enemies.splice(i, 1);
            gameState.current.lives--;
            setUiState(prev => ({ ...prev, lives: gameState.current.lives }));

            if (gameState.current.lives <= 0) {
              gameState.current.status = 'GAME_OVER';
              setUiState(prev => ({ ...prev, status: 'GAME_OVER' }));
            }
            continue;
          }
        } else {
          enemy.x += (dx / dist) * enemy.speed;
          enemy.y += (dy / dist) * enemy.speed;
        }

        // Draw Enemy
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#ff3366';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff3366';
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw HP Bar
        ctx.fillStyle = '#333';
        ctx.fillRect(enemy.x - 10, enemy.y - 18, 20, 4);
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(enemy.x - 10, enemy.y - 18, 20 * (enemy.hp / enemy.maxHp), 4);
      }

      // 5. Update and Draw Towers
      gameState.current.towers.forEach(tower => {
        const stats = TOWER_TYPES[tower.type];

        // Draw Tower Shape based on type
        ctx.beginPath();
        if (tower.type === 1) {
          ctx.arc(tower.x, tower.y, 20, 0, Math.PI * 2);
        } else if (tower.type === 2) {
          ctx.moveTo(tower.x, tower.y - 20);
          ctx.lineTo(tower.x + 20, tower.y + 15);
          ctx.lineTo(tower.x - 20, tower.y + 15);
          ctx.closePath();
        }

        ctx.strokeStyle = stats.color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = stats.color;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Combat Logic
        for (let i = 0; i < gameState.current.enemies.length; i++) {
          let enemy = gameState.current.enemies[i];
          let dist = Math.sqrt(Math.pow(enemy.x - tower.x, 2) + Math.pow(enemy.y - tower.y, 2));

          if (dist < stats.range && timestamp - tower.lastShot > stats.cooldown) {
            // Draw Laser
            ctx.beginPath();
            ctx.moveTo(tower.x, tower.y);
            ctx.lineTo(enemy.x, enemy.y);
            ctx.strokeStyle = stats.beam;
            ctx.lineWidth = tower.type === 2 ? 4 : 2; // Triangle has thicker beam
            ctx.stroke();

            enemy.hp -= stats.damage;
            tower.lastShot = timestamp;

            if (enemy.hp <= 0) {
              gameState.current.enemies.splice(i, 1);
              gameState.current.money += 10; // EARN MONEY
              setUiState(prev => ({ ...prev, money: gameState.current.money }));
            }
            break;
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render(performance.now());
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Handle building towers
  const handleCanvasClick = (e) => {
    if (gameState.current.status !== 'PLAYING' && gameState.current.status !== 'WAITING') return;

    const selectedStats = TOWER_TYPES[uiState.selectedTower];

    if (gameState.current.money >= selectedStats.cost) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      gameState.current.money -= selectedStats.cost;
      setUiState(prev => ({ ...prev, money: gameState.current.money }));

      gameState.current.towers.push({
        x: x,
        y: y,
        type: uiState.selectedTower,
        lastShot: 0
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px', fontFamily: 'monospace', backgroundColor: '#050b14', minHeight: '100vh', color: '#00ffcc' }}>
      <h1 style={{ textShadow: '0 0 10px #00ffcc', letterSpacing: '3px', margin: '0' }}>CYBER DEFENSE OS</h1>

      {/* Top HUD */}
      <div style={{ display: 'flex', gap: '40px', margin: '20px 0', fontSize: '20px', fontWeight: 'bold' }}>
        <div style={{ color: '#4da6ff' }}>WAVE: {uiState.wave}</div>
        <div style={{ color: '#ffcc00' }}>CREDITS: ${uiState.money}</div>
        <div style={{ color: '#ff3366' }}>INTEGRITY: {uiState.lives} / 10</div>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onClick={handleCanvasClick}
        style={{
          border: '2px solid #4da6ff',
          boxShadow: uiState.status === 'GAME_OVER' ? '0 0 40px #ff3366' : '0 0 20px rgba(77, 166, 255, 0.3)',
          cursor: 'crosshair',
          backgroundColor: '#000000'
        }}
      />

      {/* Bottom Toolbar */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        {Object.values(TOWER_TYPES).map(tower => (
          <button
            key={tower.id}
            onClick={() => setUiState(prev => ({ ...prev, selectedTower: tower.id }))}
            style={{
              padding: '10px 20px',
              backgroundColor: uiState.selectedTower === tower.id ? 'rgba(0, 255, 204, 0.2)' : 'transparent',
              border: `2px solid ${tower.color}`,
              color: tower.color,
              fontFamily: 'monospace',
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow: uiState.selectedTower === tower.id ? `0 0 10px ${tower.color}` : 'none'
            }}
          >
            {tower.name} (${tower.cost})
          </button>
        ))}
      </div>
      <p style={{ color: '#4da6ff', marginTop: '10px' }}>Select a tower below, then click the grid to deploy.</p>
    </div>
  );
}