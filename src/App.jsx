import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LAYERS } from './layers';
import { initScene } from './scene';
import { initHouseScene } from './houseScene';

export default function App() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cardRef = useRef(null);
  const [activeLayer, setActiveLayer] = useState(4);
  const [viewMode, setViewMode] = useState('stack');
  const [selectedObject, setSelectedObject] = useState(null);

  const handleObjectClick = useCallback((layerIndex, objectIndex) => {
    const l = LAYERS[layerIndex];
    setSelectedObject({
      layerIndex,
      objectIndex,
      name: l.objects[objectIndex],
      description: l.objectDescriptions[objectIndex],
      color: l.color,
    });
  }, []);

  const closeOverlay = useCallback(() => {
    setSelectedObject(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    document.fonts.ready.then(() => {
      if (!mounted || !containerRef.current) return;
      const initFn = viewMode === 'stack' ? initScene : initHouseScene;
      const instance = initFn(
        containerRef.current,
        (layer) => {
          if (mounted) setActiveLayer(layer);
        },
        handleObjectClick
      );
      sceneRef.current = instance;
    });

    return () => {
      mounted = false;
      if (sceneRef.current) {
        sceneRef.current.cleanup();
        sceneRef.current = null;
      }
    };
  }, [viewMode, handleObjectClick]);

  // Close overlay on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedObject) {
        setSelectedObject(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject]);

  // Focus trap: focus close button when overlay opens
  useEffect(() => {
    if (selectedObject && cardRef.current) {
      const closeBtn = cardRef.current.querySelector('.artifact-close');
      if (closeBtn) closeBtn.focus();
    }
  }, [selectedObject]);

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
      <div
        ref={containerRef}
        className="canvas-container"
        role="img"
        aria-label="Interactive 3D visualization of The Time Stack"
      />

      <div id="main-content" className="ui-top-left" aria-hidden="true">
        SONI LABS
      </div>

      <h1 className="ui-top-center">The Time Stack</h1>

      <div className="ui-view-toggle" role="group" aria-label="View mode">
        <button
          className={`toggle-btn ${viewMode === 'stack' ? 'active' : ''}`}
          style={viewMode === 'stack' ? { borderColor: layer.color, color: layer.color } : undefined}
          onClick={() => setViewMode('stack')}
          aria-pressed={viewMode === 'stack'}
        >
          Stack
        </button>
        <button
          className={`toggle-btn ${viewMode === 'house' ? 'active' : ''}`}
          style={viewMode === 'house' ? { borderColor: layer.color, color: layer.color } : undefined}
          onClick={() => setViewMode('house')}
          aria-pressed={viewMode === 'house'}
        >
          House
        </button>
      </div>

      <nav className="ui-right-rail" aria-label="Layer navigation">
        {reversedLayers.map((l, i) => {
          const realIndex = LAYERS.length - 1 - i;
          const isActive = realIndex === activeLayer;
          return (
            <button
              key={realIndex}
              className={`rail-item ${isActive ? 'active' : ''}`}
              onClick={() => handleRailClick(realIndex)}
              aria-label={`${l.period}${isActive ? ' (current)' : ''}`}
              aria-current={isActive ? 'true' : undefined}
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
            </button>
          );
        })}
      </nav>

      <div className="ui-depth-line" aria-hidden="true">
        <div
          className="depth-dot"
          style={{
            top: `${10 + (4 - activeLayer) * 20}%`,
            backgroundColor: layer.color,
            boxShadow: `0 0 8px ${layer.color}`,
          }}
        />
      </div>

      <div
        className="ui-bottom-left"
        key={`${viewMode}-${activeLayer}`}
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        <div className="info-rule" style={{ backgroundColor: layer.color }} aria-hidden="true" />
        <div className="info-content">
          <h2 className="info-era">{layer.name}</h2>
          <p className="info-quote" style={{ color: layer.color }}>
            {layer.quote}
          </p>
          <p className="info-detail">{layer.detail}</p>
        </div>
      </div>

      <div className="ui-bottom-right" aria-hidden="true">{hints}</div>

      {selectedObject && (
        <div className="artifact-overlay" onClick={closeOverlay}>
          <div
            className="artifact-card"
            ref={cardRef}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={`Details about ${selectedObject.name}`}
            aria-modal="true"
          >
            <button
              className="artifact-close"
              onClick={closeOverlay}
              aria-label="Close"
            >
              &times;
            </button>
            <div
              className="artifact-accent"
              style={{ backgroundColor: selectedObject.color }}
            />
            <h3
              className="artifact-name"
              style={{ color: selectedObject.color }}
            >
              {selectedObject.name}
            </h3>
            <p className="artifact-desc">{selectedObject.description}</p>
            <p className="artifact-layer">
              {LAYERS[selectedObject.layerIndex].name} &middot; {LAYERS[selectedObject.layerIndex].period}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
