import { useEffect, useRef, useState } from 'react';
import './index.css';

const TOWER_TYPES = {
  1: { id: 1, name: 'Rapid Circle', cost: 10, range: 120, damage: 60, cooldown: 400, color: '#00ffcc', beam: '#ffff00', type: 'dmg' },
  2: { id: 2, name: 'Heavy Triangle', cost: 25, range: 180, damage: 180, cooldown: 1000, color: '#33ff33', beam: '#33ff33', type: 'dmg' },
  3: { id: 3, name: 'Sniper Square', cost: 50, range: 280, damage: 500, cooldown: 2000, color: '#ff33cc', beam: '#ff33cc', type: 'dmg' },
  4: { id: 4, name: 'Stasis Hex', cost: 75, range: 150, damage: 0, cooldown: 2500, color: '#00ccff', beam: 'rgba(0, 204, 255, 0.5)', type: 'slow' }
};

export default function App() {
  const canvasRef = useRef(null);
  const [uiState, setUiState] = useState({ wave: 1, lives: 10, money: 35, status: 'PLAYING', selectedTower: 1, selectedPlacedTowerId: null });

  const gameState = useRef({
    enemies: [], towers: [], particles: [],
    path: [{ x: 0, y: 150 }, { x: 500, y: 150 }, { x: 500, y: 450 }, { x: 1000, y: 450 }],
    wave: 1, lives: 10, money: 35, status: 'PLAYING',
    enemiesSpawnedThisWave: 0, enemiesPerWave: 10, lastSpawnTime: 0, waveIntermissionTimer: 0, waveBonusGiven: false,
    mousePos: { x: -1000, y: -1000 }
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
                x: gameState.current.path[0].x, y: gameState.current.path[0].y,
                targetWaypoint: 1, speed: isBossWave ? 0.5 : baseEnemySpeed,
                hp: isBossWave ? baseEnemyHp * 20 : baseEnemyHp, maxHp: isBossWave ? baseEnemyHp * 20 : baseEnemyHp,
                isBoss: isBossWave, slowTimer: 0
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

      for (let i = gameState.current.particles.length - 1; i >= 0; i--) {
        let p = gameState.current.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) {
          gameState.current.particles.splice(i, 1);
        } else {
          ctx.fillStyle = `rgba(${p.color}, ${p.life})`;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
      }

      for (let i = gameState.current.enemies.length - 1; i >= 0; i--) {
        let enemy = gameState.current.enemies[i];
        let target = gameState.current.path[enemy.targetWaypoint];
        let dx = target.x - enemy.x;
        let dy = target.y - enemy.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        let currentSpeed = enemy.speed;
        if (timestamp - enemy.slowTimer < 1500) {
            currentSpeed *= 0.4;
        }

        if (dist < currentSpeed) {
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
          enemy.x += (dx / dist) * currentSpeed;
          enemy.y += (dy / dist) * currentSpeed;
        }

        ctx.beginPath();
        if (enemy.isBoss) {
            ctx.moveTo(enemy.x, enemy.y - 25);
            ctx.lineTo(enemy.x + 25, enemy.y);
            ctx.lineTo(enemy.x, enemy.y + 25);
            ctx.lineTo(enemy.x - 25, enemy.y);
            ctx.closePath();
            ctx.fillStyle = timestamp - enemy.slowTimer < 1500 ? '#00ccff' : '#b366ff';
            ctx.shadowColor = timestamp - enemy.slowTimer < 1500 ? '#00ccff' : '#b366ff';
        } else {
            ctx.arc(enemy.x, enemy.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = timestamp - enemy.slowTimer < 1500 ? '#00ccff' : '#ff3366';
            ctx.shadowColor = timestamp - enemy.slowTimer < 1500 ? '#00ccff' : '#ff3366';
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
        if (uiState.selectedPlacedTowerId === tower.id) {
          ctx.beginPath();
          ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 204, 0, 0.05)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 204, 0, 0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(tower.x, tower.y, 25, 0, Math.PI * 2);
          ctx.strokeStyle = '#ffcc00';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

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
        } else if (tower.type === 4) {
          for(let j=0; j<6; j++) {
            let angle = (Math.PI / 3) * j;
            let px = tower.x + 15 * Math.cos(angle);
            let py = tower.y + 15 * Math.sin(angle);
            if(j===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
          }
          ctx.closePath();
        }

        ctx.strokeStyle = tower.level > 1 ? '#ffffff' : tower.color;
        ctx.lineWidth = tower.level > 1 ? 4 : 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = tower.level > 1 ? '#ffffff' : tower.color;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.font = '10px monospace';
        ctx.fillStyle = '#ffffff';
        let displayStr = `Lv${tower.level}`;
        if (tower.mechType === 'dmg') {
            displayStr += ` [${tower.targetingMode[0].toUpperCase()}]`;
        }
        ctx.fillText(displayStr, tower.x - 18, tower.y - 22);

        if (timestamp - tower.lastShot > tower.cooldown) {
            let fired = false;

            if (tower.mechType === 'slow') {
                let hitAny = false;
                for (let i = 0; i < gameState.current.enemies.length; i++) {
                    let enemy = gameState.current.enemies[i];
                    let dist = Math.sqrt(Math.pow(enemy.x - tower.x, 2) + Math.pow(enemy.y - tower.y, 2));
                    if (dist < tower.range) {
                        enemy.slowTimer = timestamp;
                        hitAny = true;
                    }
                }
                if (hitAny) {
                    ctx.beginPath();
                    ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
                    ctx.fillStyle = tower.beam;
                    ctx.fill();
                    fired = true;
                }
            } else {
                let validTargets = [];
                for (let i = 0; i < gameState.current.enemies.length; i++) {
                    let enemy = gameState.current.enemies[i];
                    let dist = Math.sqrt(Math.pow(enemy.x - tower.x, 2) + Math.pow(enemy.y - tower.y, 2));
                    if (dist < tower.range) {
                        validTargets.push({ enemy, index: i });
                    }
                }

                if (validTargets.length > 0) {
                    let target;
                    if (tower.targetingMode === 'first') {
                        target = validTargets[0];
                    } else if (tower.targetingMode === 'last') {
                        target = validTargets[validTargets.length - 1];
                    } else if (tower.targetingMode === 'strongest') {
                        target = validTargets.reduce((prev, curr) => (prev.enemy.hp > curr.enemy.hp) ? prev : curr);
                    } else if (tower.targetingMode === 'weakest') {
                        target = validTargets.reduce((prev, curr) => (prev.enemy.hp < curr.enemy.hp) ? prev : curr);
                    }

                    ctx.beginPath();
                    ctx.moveTo(tower.x, tower.y);
                    ctx.lineTo(target.enemy.x, target.enemy.y);
                    ctx.strokeStyle = tower.level > 1 ? '#ffffff' : tower.beam;
                    ctx.lineWidth = tower.type === 3 ? 5 : (tower.type === 2 ? 3 : 2);
                    ctx.stroke();

                    target.enemy.hp -= tower.damage;
                    fired = true;

                    if (target.enemy.hp <= 0) {
                        for(let p=0; p<15; p++){
                            gameState.current.particles.push({
                                x: target.enemy.x, y: target.enemy.y,
                                vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
                                life: 1, size: Math.random() * 4 + 2,
                                color: target.enemy.isBoss ? '179, 102, 255' : '255, 51, 102'
                            });
                        }
                        gameState.current.enemies.splice(target.index, 1);
                        gameState.current.money += target.enemy.isBoss ? 25 : 1;
                        setUiState(prev => ({ ...prev, money: gameState.current.money }));
                    }
                }
            }
            if (fired) tower.lastShot = timestamp;
        }
      });

      if (uiState.selectedTower && !uiState.selectedPlacedTowerId && gameState.current.status !== 'GAME_OVER' && gameState.current.mousePos.x > 0) {
        const stats = TOWER_TYPES[uiState.selectedTower];
        let hoveringExisting = false;

        for (let i = 0; i < gameState.current.towers.length; i++) {
          let t = gameState.current.towers[i];
          if (Math.sqrt(Math.pow(t.x - gameState.current.mousePos.x, 2) + Math.pow(t.y - gameState.current.mousePos.y, 2)) < 20) {
            hoveringExisting = true;
            break;
          }
        }

        if (!hoveringExisting) {
            ctx.beginPath();
            ctx.arc(gameState.current.mousePos.x, gameState.current.mousePos.y, stats.range, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${stats.color === '#00ffcc' ? '0,255,204' : stats.color === '#33ff33' ? '51,255,51' : stats.color === '#ff33cc' ? '255,51,204' : '0,204,255'}, 0.1)`;
            ctx.fill();
            ctx.strokeStyle = stats.color;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render(performance.now());
    return () => cancelAnimationFrame(animationFrameId);
  }, [uiState.selectedTower, uiState.selectedPlacedTowerId]);

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    gameState.current.mousePos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseLeave = () => {
    gameState.current.mousePos = { x: -1000, y: -1000 };
  };

  const handleCanvasClick = (e) => {
    if (gameState.current.status !== 'PLAYING' && gameState.current.status !== 'WAITING') return;
    const x = gameState.current.mousePos.x;
    const y = gameState.current.mousePos.y;

    for (let i = 0; i < gameState.current.towers.length; i++) {
      let t = gameState.current.towers[i];
      let dist = Math.sqrt(Math.pow(t.x - x, 2) + Math.pow(t.y - y, 2));
      if (dist < 20) {
        setUiState(prev => ({ ...prev, selectedPlacedTowerId: t.id }));
        return;
      }
    }

    setUiState(prev => ({ ...prev, selectedPlacedTowerId: null }));

    const selectedStats = TOWER_TYPES[uiState.selectedTower];
    if (gameState.current.money >= selectedStats.cost) {
      gameState.current.money -= selectedStats.cost;
      setUiState(prev => ({ ...prev, money: gameState.current.money }));
      gameState.current.towers.push({
        id: Date.now() + Math.random(),
        x: x, y: y, type: uiState.selectedTower, lastShot: 0, level: 1,
        damage: selectedStats.damage, range: selectedStats.range, cooldown: selectedStats.cooldown,
        color: selectedStats.color, beam: selectedStats.beam, cost: selectedStats.cost, mechType: selectedStats.type,
        targetingMode: 'first'
      });
    }
  };

  const handleUpgrade = () => {
    const tower = gameState.current.towers.find(t => t.id === uiState.selectedPlacedTowerId);
    if (tower) {
      let upgradeCost = tower.cost * 2;
      if (gameState.current.money >= upgradeCost) {
        gameState.current.money -= upgradeCost;
        tower.level += 1;
        tower.damage *= 2;
        tower.range *= 1.2;
        setUiState(prev => ({ ...prev, money: gameState.current.money }));
      }
    }
  };

  const handleCycleTargeting = () => {
    const tower = gameState.current.towers.find(t => t.id === uiState.selectedPlacedTowerId);
    if (tower && tower.mechType === 'dmg') {
      const modes = ['first', 'last', 'strongest', 'weakest'];
      const nextIndex = (modes.indexOf(tower.targetingMode) + 1) % modes.length;
      tower.targetingMode = modes[nextIndex];
      setUiState(prev => ({ ...prev }));
    }
  };

  const activeTower = gameState.current.towers.find(t => t.id === uiState.selectedPlacedTowerId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px', fontFamily: 'monospace', backgroundColor: '#050b14', minHeight: '100vh', color: '#00ffcc' }}>
      <h1 style={{ textShadow: '0 0 10px #00ffcc', letterSpacing: '3px', margin: '10px 0' }}>CYBER DEFENSE OS</h1>
      <div style={{ display: 'flex', gap: '40px', marginBottom: '15px', fontSize: '20px', fontWeight: 'bold' }}>
        <div style={{ color: uiState.wave % 5 === 0 ? '#b366ff' : '#4da6ff' }}>WAVE: {uiState.wave}</div>
        <div style={{ color: '#ffcc00' }}>COINS: {uiState.money}</div>
        <div style={{ color: '#ff3366' }}>INTEGRITY: {uiState.lives} / 10</div>
      </div>
      <canvas ref={canvasRef} width={800} height={500} onClick={handleCanvasClick} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} style={{ border: `2px solid ${uiState.wave % 5 === 0 ? '#b366ff' : '#4da6ff'}`, boxShadow: uiState.status === 'GAME_OVER' ? '0 0 40px #ff3366' : `0 0 20px ${uiState.wave % 5 === 0 ? 'rgba(179, 102, 255, 0.3)' : 'rgba(77, 166, 255, 0.3)'}`, cursor: 'crosshair', backgroundColor: '#000000', transition: 'all 0.5s' }} />

      {uiState.selectedPlacedTowerId && activeTower ? (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ffcc00', backgroundColor: '#0a1526', borderRadius: '5px', width: '770px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#ffcc00', letterSpacing: '2px' }}>TOWER OVERRIDE</h3>
              <div style={{ color: '#aaa', fontSize: '14px' }}>Lv{activeTower.level} {TOWER_TYPES[activeTower.type].name} | Dmg: {activeTower.damage}</div>
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
              {activeTower.mechType === 'dmg' && (
                <button onClick={handleCycleTargeting} style={{ padding: '10px 20px', backgroundColor: 'rgba(255, 204, 0, 0.2)', border: '2px solid #ffcc00', color: '#ffcc00', fontFamily: 'monospace', fontSize: '16px', cursor: 'pointer', boxShadow: '0 0 10px #ffcc00' }}>
                  TARGET: {activeTower.targetingMode.toUpperCase()}
                </button>
              )}
              <button onClick={handleUpgrade} disabled={uiState.money < activeTower.cost * 2} style={{ padding: '10px 20px', backgroundColor: uiState.money >= activeTower.cost * 2 ? 'rgba(255, 255, 255, 0.2)' : '#050b14', border: `2px solid ${uiState.money >= activeTower.cost * 2 ? '#ffffff' : '#333'}`, color: uiState.money >= activeTower.cost * 2 ? '#ffffff' : '#555', fontFamily: 'monospace', fontSize: '16px', cursor: uiState.money >= activeTower.cost * 2 ? 'pointer' : 'not-allowed' }}>
                UPGRADE ({activeTower.cost * 2} COINS)
              </button>
              <button onClick={() => setUiState(prev => ({ ...prev, selectedPlacedTowerId: null }))} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '2px solid #ff3366', color: '#ff3366', fontFamily: 'monospace', fontSize: '16px', cursor: 'pointer' }}>
                DESELECT
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #4da6ff', backgroundColor: '#0a1526', borderRadius: '5px', width: '770px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#fff', textAlign: 'center', letterSpacing: '2px' }}>-- SYSTEM SHOP --</h3>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {Object.values(TOWER_TYPES).map(tower => {
              const canAfford = uiState.money >= tower.cost;
              return (
                <button key={tower.id} onClick={() => setUiState(prev => ({ ...prev, selectedTower: tower.id }))} style={{ padding: '8px 15px', backgroundColor: uiState.selectedTower === tower.id ? `rgba(${tower.color === '#00ffcc' ? '0,255,204' : tower.color === '#33ff33' ? '51,255,51' : tower.color === '#ff33cc' ? '255,51,204' : '0,204,255'}, 0.2)` : '#050b14', border: `2px solid ${canAfford ? tower.color : '#333'}`, color: canAfford ? tower.color : '#555', fontFamily: 'monospace', fontSize: '14px', cursor: canAfford ? 'pointer' : 'not-allowed', boxShadow: uiState.selectedTower === tower.id ? `0 0 15px ${tower.color}` : 'none', transition: 'all 0.2s' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{tower.name}</div>
                  <div style={{ color: '#ffcc00' }}>Cost: {tower.cost}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '5px' }}>{tower.type === 'slow' ? 'EMP Burst' : `Dmg: ${tower.damage} | Rng: ${tower.range}`}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
}