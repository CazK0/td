import { useEffect, useRef } from 'react';
import './index.css';

export default function App() {
  const canvasRef = useRef(null);

  const gameState = useRef({
    enemies: [],
    towers: [],
    lastSpawn: 0,
    path: [
      { x: 0, y: 150 },
      { x: 500, y: 150 },
      { x: 500, y: 450 },
      { x: 1000, y: 450 }
    ]
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = (timestamp) => {
      // Clear the screen
      ctx.fillStyle = '#050b14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the Path
      ctx.beginPath();
      ctx.moveTo(gameState.current.path[0].x, gameState.current.path[0].y);
      for (let i = 1; i < gameState.current.path.length; i++) {
        ctx.lineTo(gameState.current.path[i].x, gameState.current.path[i].y);
      }
      ctx.strokeStyle = 'rgba(77, 166, 255, 0.2)';
      ctx.lineWidth = 40;
      ctx.stroke();

      // Spawn Enemies (1 every second)
      if (timestamp - gameState.current.lastSpawn > 1000) {
        gameState.current.enemies.push({
          x: gameState.current.path[0].x,
          y: gameState.current.path[0].y,
          targetWaypoint: 1,
          speed: 2,
          hp: 100
        });
        gameState.current.lastSpawn = timestamp;
      }

      // Update and Draw Enemies
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
            continue;
          }
        } else {
          enemy.x += (dx / dist) * enemy.speed;
          enemy.y += (dy / dist) * enemy.speed;
        }

        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#ff3366';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff3366';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Update and Draw Towers
      gameState.current.towers.forEach(tower => {
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 20, 0, Math.PI * 2);
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffcc';
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Shoot nearest enemy
        for (let i = 0; i < gameState.current.enemies.length; i++) {
          let enemy = gameState.current.enemies[i];
          let dist = Math.sqrt(Math.pow(enemy.x - tower.x, 2) + Math.pow(enemy.y - tower.y, 2));

          if (dist < tower.range && timestamp - tower.lastShot > tower.cooldown) {
            ctx.beginPath();
            ctx.moveTo(tower.x, tower.y);
            ctx.lineTo(enemy.x, enemy.y);
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.stroke();

            enemy.hp -= tower.damage;
            if (enemy.hp <= 0) {
              gameState.current.enemies.splice(i, 1);
            }
            tower.lastShot = timestamp;
            break;
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render(performance.now());
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    gameState.current.towers.push({
      x: x,
      y: y,
      range: 150,
      damage: 100,
      cooldown: 500,
      lastShot: 0
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px', fontFamily: 'monospace', backgroundColor: '#050b14', minHeight: '100vh', color: '#00ffcc' }}>
      <h1 style={{ textShadow: '0 0 10px #00ffcc', letterSpacing: '3px' }}>CYBER DEFENSE OS</h1>
      <p style={{ color: '#4da6ff', marginBottom: '20px' }}>Click anywhere to deploy Tier 1 Firewall Rings.</p>

      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onClick={handleCanvasClick}
        style={{
          border: '2px solid #4da6ff',
          boxShadow: '0 0 20px rgba(77, 166, 255, 0.3)',
          cursor: 'crosshair',
          backgroundColor: '#000000'
        }}
      />
    </div>
  );
}