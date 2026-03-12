import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { LAYERS } from './layers';
import { initScene } from './scene';
import { initHouseScene } from './houseScene';
import { createArtifactViewer } from './artifactViewer';
import { recordDiscovery, getDiscoveryState, TOTAL_ARTIFACTS } from './discoveries';

export default function App() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cardRef = useRef(null);
  const viewerContainerRef = useRef(null);
  const viewerRef = useRef(null);
  const overlayRef = useRef(null);
  const particleBurstRef = useRef(null);
  const [activeLayer, setActiveLayer] = useState(4);
  const [viewMode, setViewMode] = useState('stack');
  const [selectedObject, setSelectedObject] = useState(null);
  const [discoveryResult, setDiscoveryResult] = useState(null);
  const [discoveryState, setDiscoveryState] = useState(() => getDiscoveryState());
  const [showAchievement, setShowAchievement] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  // Refresh discovery state on mount
  useEffect(() => {
    setDiscoveryState(getDiscoveryState());
  }, []);

  const handleObjectClick = useCallback((layerIndex, objectIndex) => {
    const l = LAYERS[layerIndex];
    const result = recordDiscovery(layerIndex, objectIndex);

    setSelectedObject({
      layerIndex,
      objectIndex,
      name: l.objects[objectIndex],
      description: l.objectDescriptions[objectIndex],
      color: l.color,
    });
    setDiscoveryResult(result);
    setDiscoveryState(getDiscoveryState());

    // Show achievement toast after a delay
    if (result.newAchievement) {
      setTimeout(() => {
        setShowAchievement(result.newAchievement);
        setTimeout(() => setShowAchievement(null), 3500);
      }, 1200);
    }
  }, []);

  const closeOverlay = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);

    // GSAP close animation
    const tl = gsap.timeline({
      onComplete: () => {
        // Clean up viewer
        if (viewerRef.current) {
          viewerRef.current.cleanup();
          viewerRef.current = null;
        }
        setSelectedObject(null);
        setDiscoveryResult(null);
        setIsClosing(false);
      },
    });

    if (cardRef.current) {
      tl.to(cardRef.current, {
        scale: 0.85,
        opacity: 0,
        y: 30,
        duration: 0.35,
        ease: 'power2.in',
      });
    }
    if (overlayRef.current) {
      tl.to(
        overlayRef.current,
        {
          opacity: 0,
          duration: 0.25,
          ease: 'power2.in',
        },
        '-=0.15'
      );
    }
  }, [isClosing]);

  // GSAP open animation + create viewer when overlay appears
  useEffect(() => {
    if (!selectedObject || !cardRef.current || !overlayRef.current) return;

    // Reset transforms for GSAP
    gsap.set(overlayRef.current, { opacity: 0 });
    gsap.set(cardRef.current, { scale: 0.6, opacity: 0, y: 60 });

    const tl = gsap.timeline();

    // Backdrop fade in
    tl.to(overlayRef.current, {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
    });

    // Card entrance — spring-like
    tl.to(
      cardRef.current,
      {
        scale: 1,
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'back.out(1.7)',
      },
      '-=0.1'
    );

    // Staggered text reveals
    const textEls = cardRef.current.querySelectorAll(
      '.artifact-name, .artifact-desc, .artifact-layer, .artifact-xp'
    );
    if (textEls.length > 0) {
      gsap.set(textEls, { opacity: 0, y: 15 });
      tl.to(
        textEls,
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.08,
          ease: 'power2.out',
        },
        '-=0.3'
      );
    }

    // Create the 3D viewer after the card is mostly visible
    tl.call(() => {
      if (viewerContainerRef.current && !viewerRef.current) {
        viewerRef.current = createArtifactViewer(
          viewerContainerRef.current,
          selectedObject.layerIndex,
          selectedObject.objectIndex,
          selectedObject.color
        );
        // Animate viewer canvas entrance
        const canvas = viewerContainerRef.current.querySelector('canvas');
        if (canvas) {
          gsap.fromTo(
            canvas,
            { scale: 0.3, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.4)' }
          );
        }
      }
    }, null, '-=0.2');

    // New discovery burst
    if (discoveryResult && discoveryResult.isNew && particleBurstRef.current) {
      tl.call(() => {
        spawnParticleBurst(particleBurstRef.current, selectedObject.color);
      }, null, '-=0.3');
    }

    return () => {
      tl.kill();
    };
  }, [selectedObject]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up viewer on unmount
  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        viewerRef.current.cleanup();
        viewerRef.current = null;
      }
    };
  }, []);

  // Close overlay on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedObject && !isClosing) {
        closeOverlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, isClosing, closeOverlay]);

  // Focus trap: focus close button when overlay opens
  useEffect(() => {
    if (selectedObject && cardRef.current) {
      setTimeout(() => {
        const closeBtn = cardRef.current?.querySelector('.artifact-close');
        if (closeBtn) closeBtn.focus();
      }, 400);
    }
  }, [selectedObject]);

  // Initialize Three.js scene
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

  const progressPercent = Math.round(discoveryState.progress * 100);

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

      {/* Discovery progress HUD */}
      <div className="discovery-hud" aria-label="Discovery progress">
        <div className="discovery-progress-bar">
          <div
            className="discovery-progress-fill"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: layer.color,
              boxShadow: `0 0 8px ${layer.color}`,
            }}
          />
        </div>
        <div className="discovery-stats">
          <span className="discovery-count">
            {discoveryState.totalDiscovered}/{TOTAL_ARTIFACTS}
          </span>
          <span className="discovery-xp">{discoveryState.totalXP} XP</span>
        </div>
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

      {/* Artifact overlay with GSAP animation */}
      {selectedObject && (
        <div
          className="artifact-overlay"
          ref={overlayRef}
          onClick={() => !isClosing && closeOverlay()}
        >
          <div ref={particleBurstRef} className="particle-burst-container" />
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

            {/* New discovery badge */}
            {discoveryResult && discoveryResult.isNew && (
              <div className="discovery-badge" style={{ color: selectedObject.color }}>
                NEW DISCOVERY!
              </div>
            )}

            {/* 3D shape viewer */}
            <div
              className="artifact-viewer"
              ref={viewerContainerRef}
            />

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
            <div className="artifact-footer">
              <p className="artifact-layer">
                {LAYERS[selectedObject.layerIndex].name} &middot; {LAYERS[selectedObject.layerIndex].period}
              </p>
              {discoveryResult && discoveryResult.isNew && (
                <p className="artifact-xp" style={{ color: selectedObject.color }}>
                  +100 XP
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Achievement toast */}
      {showAchievement && (
        <div className="achievement-toast">
          <div className="achievement-icon">&#9734;</div>
          <div className="achievement-text">
            <div className="achievement-label">Achievement Unlocked</div>
            <div className="achievement-name">{showAchievement.name}</div>
            <div className="achievement-desc">{showAchievement.desc}</div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Spawn CSS particle burst on new discovery.
 * Creates DOM elements that fly outward and fade.
 */
function spawnParticleBurst(container, color) {
  const count = 20;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'burst-particle';
    particle.style.backgroundColor = color;
    container.appendChild(particle);

    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const distance = 80 + Math.random() * 120;
    const size = 3 + Math.random() * 5;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;

    gsap.fromTo(
      particle,
      {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
      },
      {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        scale: 0,
        opacity: 0,
        duration: 0.8 + Math.random() * 0.4,
        ease: 'power2.out',
        onComplete: () => particle.remove(),
      }
    );
  }
}
