import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LAYERS } from './layers';
import { initScene } from './scene';
import { initHouseScene } from './houseScene';

export default function App() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const [activeLayer, setActiveLayer] = useState(4);
  const [viewMode, setViewMode] = useState('stack');

  useEffect(() => {
    let mounted = true;

    document.fonts.ready.then(() => {
      if (!mounted || !containerRef.current) return;
      const initFn = viewMode === 'stack' ? initScene : initHouseScene;
      const instance = initFn(containerRef.current, (layer) => {
        if (mounted) setActiveLayer(layer);
      });
      sceneRef.current = instance;
    });

    return () => {
      mounted = false;
      if (sceneRef.current) {
        sceneRef.current.cleanup();
        sceneRef.current = null;
      }
    };
  }, [viewMode]);

  const handleRailClick = useCallback((index) => {
    if (sceneRef.current && sceneRef.current.scrollToLayer) {
      sceneRef.current.scrollToLayer(index);
    }
  }, []);

  const layer = LAYERS[activeLayer];
  const reversedLayers = [...LAYERS].reverse();

  const hints = viewMode === 'stack'
    ? 'Scroll to dig / Drag to orbit / +\u2212 to zoom'
    : 'Scroll to walk / Drag to look / +\u2212 to zoom';

  return (
    <>
      <div ref={containerRef} className="canvas-container" />

      <div className="ui-top-left">SONI LABS</div>

      <div className="ui-top-center">The Time Stack</div>

      <div className="ui-view-toggle">
        <button
          className={`toggle-btn ${viewMode === 'stack' ? 'active' : ''}`}
          style={viewMode === 'stack' ? { borderColor: layer.color, color: layer.color } : undefined}
          onClick={() => setViewMode('stack')}
        >
          Stack
        </button>
        <button
          className={`toggle-btn ${viewMode === 'house' ? 'active' : ''}`}
          style={viewMode === 'house' ? { borderColor: layer.color, color: layer.color } : undefined}
          onClick={() => setViewMode('house')}
        >
          House
        </button>
      </div>

      <div className="ui-right-rail">
        {reversedLayers.map((l, i) => {
          const realIndex = LAYERS.length - 1 - i;
          const isActive = realIndex === activeLayer;
          return (
            <div
              key={realIndex}
              className={`rail-item ${isActive ? 'active' : ''}`}
              onClick={() => handleRailClick(realIndex)}
            >
              <span
                className="rail-dash"
                style={{
                  width: isActive ? 28 : 8,
                  backgroundColor: isActive ? layer.color : 'rgba(255,255,255,0.22)',
                }}
              />
              <span
                className="rail-label"
                style={{
                  color: isActive ? layer.color : 'rgba(255,255,255,0.22)',
                }}
              >
                {l.period}
              </span>
            </div>
          );
        })}
      </div>

      <div className="ui-depth-line">
        <div
          className="depth-dot"
          style={{
            top: `${10 + (4 - activeLayer) * 20}%`,
            backgroundColor: layer.color,
            boxShadow: `0 0 8px ${layer.color}`,
          }}
        />
      </div>

      <div className="ui-bottom-left" key={`${viewMode}-${activeLayer}`}>
        <div className="info-rule" style={{ backgroundColor: layer.color }} />
        <div className="info-content">
          <h2 className="info-era">{layer.name}</h2>
          <p className="info-quote" style={{ color: layer.color }}>
            {layer.quote}
          </p>
          <p className="info-detail">{layer.detail}</p>
        </div>
      </div>

      <div className="ui-bottom-right">{hints}</div>
    </>
  );
}
