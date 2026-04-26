import { useEffect, useRef, useState } from 'react';
import './index.css';

const TOWER_TYPES = {
  1: { id: 1, name: 'Rapid Circle', cost: 10, range: 120, damage: 60, cooldown: 400, color: '#00ffcc', beam: '#ffff00' },
  2: { id: 2, name: 'Heavy Triangle', cost: 25, range: 180, damage: 180, cooldown: 1000, color: '#33ff33', beam: '#33ff33' },
  3: { id: 3, name: 'Sniper Square', cost: 50, range: 280, damage: 500, cooldown: 2000, color: '#ff33cc', beam: '#ff33cc' }
};

export default function App() {
  const canvasRef = useRef(null);
  const [uiState, setUiState] = useState({ wave: 1, lives: 10, money: 15, status: 'PLAYING', selectedTower: 1 });
  const gameState = useRef({
    enemies: [], towers: [], path: [{ x: 0, y: 150 }, { x: 500, y: 150 }, { x: 500, y: 450 }, { x: 1000, y: 450 }],
    wave: 1, lives: 10, money: 15, status: 'PLAYING', enemiesSpawnedThisWave: 0, enemiesPerWave: 10, lastSpawnTime: 0, waveIntermissionTimer: 0, waveBonusGiven: false
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = (timestamp) => {
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

      ctx.beginPath();
      ctx.moveTo(gameState.current.path[0].x, gameState.current.path[0].y);
      for (let i = 1; i < gameState.current.path.length; i++) {
        ctx.lineTo(gameState.current.path[i].x, gameState.current.path[i].y);
      }
      ctx.strokeStyle = 'rgba(77, 166, 255, 0.15)';
      ctx.lineWidth = 40;
      ctx.stroke();

      const isBossWave = gameState.current.wave % 5 === 0;

      if (gameState.current.status === 'PLAYING') {
        const spawnDelay = Math.max(200, 1000 - (gameState.current.wave * 50));
        const baseEnemySpeed = 1.5 + (gameState.current.wave * 0.2);
        const baseEnemyHp = 100 * Math.pow(1.2, gameState.current.wave - 1);

        gameState.current.enemiesPerWave = isBossWave ? 1 : 10 + (gameState.current.wave * 2);

        if (gameState.current.enemiesSpawnedThisWave < gameState.current.enemiesPerWave) {
          if (timestamp - gameState.current.lastSpawnTime > (isBossWave ? 1000 : spawnDelay)) {
            gameState.current.enemies.push({
                x: gameState.current.path[0].x,
                y: gameState.current.path[0].y,
                targetWaypoint: 1,
                speed: isBossWave ? 0.5 : baseEnemySpeed,
                hp: isBossWave ? baseEnemyHp * 20 : baseEnemyHp,
                maxHp: isBossWave ? baseEnemyHp * 20 : baseEnemyHp,
                isBoss: isBossWave
            });
            gameState.current.enemiesSpawnedThisWave++;
            gameState.current.lastSpawnTime = timestamp;
          }
        } else if (gameState.current.enemies.length === 0) {
          gameState.current.status = 'WAITING';
          gameState.current.waveIntermissionTimer = timestamp;
          gameState.current.waveBonusGiven = false;
        }
      } else if (gameState.current.status === 'WAITING') {
        const waveBonus = gameState.current.wave * 5;
        if (!gameState.current.waveBonusGiven) {
          gameState.current.money += waveBonus;
          setUiState(prev => ({ ...prev, money: gameState.current.money }));
          gameState.current.waveBonusGiven = true;
        }
        ctx.fillStyle = isBossWave ? '#b366ff' : '#4da6ff';
        ctx.font = 'bold 30px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(isBossWave ? `BOSS DEFEATED` : `WAVE ${gameState.current.wave} CLEARED`, canvas.width / 2, 50);
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`ROUND BONUS: +${waveBonus} COINS`, canvas.width / 2, 85);

        if (timestamp - gameState.current.waveIntermissionTimer > 4000) {
          gameState.current.wave++;
          gameState.current.enemiesSpawnedThisWave = 0;
          gameState.current.status = 'PLAYING';
          setUiState(prev => ({ ...prev, wave: gameState.current.wave, status: 'PLAYING' }));
        }
      }

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
            gameState.current.lives -= enemy.isBoss ? 5 : 1;
            setUiState(prev => ({ ...prev, lives: Math.max(0, gameState.current.lives) }));
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

        ctx.beginPath();
        if (enemy.isBoss) {
            ctx.moveTo(enemy.x, enemy.y - 25);
            ctx.lineTo(enemy.x + 25, enemy.y);
            ctx.lineTo(enemy.x, enemy.y + 25);
            ctx.lineTo(enemy.x - 25, enemy.y);
            ctx.closePath();
            ctx.fillStyle = '#b366ff';
            ctx.shadowColor = '#b366ff';
        } else {
            ctx.arc(enemy.x, enemy.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#ff3366';
            ctx.shadowColor = '#ff3366';
        }

        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#333';
        ctx.fillRect(enemy.x - (enemy.isBoss ? 20 : 10), enemy.y - (enemy.isBoss ? 35 : 18), enemy.isBoss ? 40 : 20, 4);
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(enemy.x - (enemy.isBoss ? 20 : 10), enemy.y - (enemy.isBoss ? 35 : 18), (enemy.isBoss ? 40 : 20) * (enemy.hp / enemy.maxHp), 4);
      }

      gameState.current.towers.forEach(tower => {
        ctx.beginPath();
        if (tower.type === 1) {
          ctx.arc(tower.x, tower.y, 15, 0, Math.PI * 2);
        } else if (tower.type === 2) {
          ctx.moveTo(tower.x, tower.y - 18);
          ctx.lineTo(tower.x + 18, tower.y + 12);
          ctx.lineTo(tower.x - 18, tower.y + 12);
          ctx.closePath();
        } else if (tower.type === 3) {
          ctx.rect(tower.x - 15, tower.y - 15, 30, 30);
        }
        ctx.strokeStyle = tower.level > 1 ? '#ffffff' : tower.color;
        ctx.lineWidth = tower.level > 1 ? 4 : 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = tower.level > 1 ? '#ffffff' : tower.color;
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (tower.level > 1) {
            ctx.font = '12px monospace';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`Lv${tower.level}`, tower.x - 12, tower.y - 22);
        }

        for (let i = 0; i < gameState.current.enemies.length; i++) {
          let enemy = gameState.current.enemies[i];
          let dist = Math.sqrt(Math.pow(enemy.x - tower.x, 2) + Math.pow(enemy.y - tower.y, 2));
          if (dist < tower.range && timestamp - tower.lastShot > tower.cooldown) {
            ctx.beginPath();
            ctx.moveTo(tower.x, tower.y);
            ctx.lineTo(enemy.x, enemy.y);
            ctx.strokeStyle = tower.level > 1 ? '#ffffff' : tower.beam;
            ctx.lineWidth = tower.type === 3 ? 5 : (tower.type === 2 ? 3 : 2);
            ctx.stroke();
            enemy.hp -= tower.damage;
            tower.lastShot = timestamp;
            if (enemy.hp <= 0) {
              gameState.current.enemies.splice(i, 1);
              gameState.current.money += enemy.isBoss ? 25 : 1;
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

  const handleCanvasClick = (e) => {
    if (gameState.current.status !== 'PLAYING' && gameState.current.status !== 'WAITING') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = 0; i < gameState.current.towers.length; i++) {
      let t = gameState.current.towers[i];
      let dist = Math.sqrt(Math.pow(t.x - x, 2) + Math.pow(t.y - y, 2));
      if (dist < 20) {
        let upgradeCost = t.cost * 2;
        if (gameState.current.money >= upgradeCost) {
          gameState.current.money -= upgradeCost;
          t.level += 1;
          t.damage *= 2;
          t.range *= 1.2;
          setUiState(prev => ({ ...prev, money: gameState.current.money }));
        }
        return;
      }
    }

    const selectedStats = TOWER_TYPES[uiState.selectedTower];
    if (gameState.current.money >= selectedStats.cost) {
      gameState.current.money -= selectedStats.cost;
      setUiState(prev => ({ ...prev, money: gameState.current.money }));
      gameState.current.towers.push({
        x: x, y: y, type: uiState.selectedTower, lastShot: 0,
        level: 1, damage: selectedStats.damage, range: selectedStats.range,
        cooldown: selectedStats.cooldown, color: selectedStats.color, beam: selectedStats.beam, cost: selectedStats.cost
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px', fontFamily: 'monospace', backgroundColor: '#050b14', minHeight: '100vh', color: '#00ffcc' }}>
      <h1 style={{ textShadow: '0 0 10px #00ffcc', letterSpacing: '3px', margin: '10px 0' }}>CYBER DEFENSE OS</h1>
      <div style={{ display: 'flex', gap: '40px', marginBottom: '15px', fontSize: '20px', fontWeight: 'bold' }}>
        <div style={{ color: uiState.wave % 5 === 0 ? '#b366ff' : '#4da6ff' }}>WAVE: {uiState.wave}</div>
        <div style={{ color: '#ffcc00' }}>COINS: {uiState.money}</div>
        <div style={{ color: '#ff3366' }}>INTEGRITY: {uiState.lives} / 10</div>
      </div>
      <canvas ref={canvasRef} width={800} height={500} onClick={handleCanvasClick} style={{ border: `2px solid ${uiState.wave % 5 === 0 ? '#b366ff' : '#4da6ff'}`, boxShadow: uiState.status === 'GAME_OVER' ? '0 0 40px #ff3366' : `0 0 20px ${uiState.wave % 5 === 0 ? 'rgba(179, 102, 255, 0.3)' : 'rgba(77, 166, 255, 0.3)'}`, cursor: 'crosshair', backgroundColor: '#000000', transition: 'all 0.5s' }} />
      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #4da6ff', backgroundColor: '#0a1526', borderRadius: '5px', width: '770px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#fff', textAlign: 'center', letterSpacing: '2px' }}>-- SYSTEM SHOP --</h3>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {Object.values(TOWER_TYPES).map(tower => {
            const canAfford = uiState.money >= tower.cost;
            return (
              <button key={tower.id} onClick={() => setUiState(prev => ({ ...prev, selectedTower: tower.id }))} style={{ padding: '10px 20px', backgroundColor: uiState.selectedTower === tower.id ? `rgba(${tower.color === '#00ffcc' ? '0,255,204' : tower.color === '#33ff33' ? '51,255,51' : '255,51,204'}, 0.2)` : '#050b14', border: `2px solid ${canAfford ? tower.color : '#333'}`, color: canAfford ? tower.color : '#555', fontFamily: 'monospace', fontSize: '16px', cursor: canAfford ? 'pointer' : 'not-allowed', boxShadow: uiState.selectedTower === tower.id ? `0 0 15px ${tower.color}` : 'none', transition: 'all 0.2s' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{tower.name}</div>
                <div style={{ color: '#ffcc00' }}>Cost: {tower.cost} Coins</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>Dmg: {tower.damage} | Rng: {tower.range}</div>
              </button>
            )
          })}
        </div>
        <p style={{textAlign: 'center', color: '#aaa', fontSize: '12px', marginTop: '15px'}}>Click an existing tower on the grid to UPGRADE it (Costs 2x Base Price. Doubles Damage & increases Range. Turns White).</p>
      </div>
    </div>
  );
}