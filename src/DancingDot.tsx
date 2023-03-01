import React, { useEffect, useRef } from 'react';

import { Position, useSyncedPosition } from './SyncedPosition';

import './DancingDot.scss';


/**
 * Clamp a number to the given bounds.
 * @returns The number if it is within the bounds; or the nearest bound.
 */
const clamp = (n: number, min: number, max: number): number => {
  return Math.min(Math.max(n, min), max);
}


/** Interface for various Events including a clientX/Y position. */
interface ClientPosition {
  clientX: number,
  clientY: number
}


/** Calculate offsets from a position and Event. */
const calcOffsets = (position: Position, e: ClientPosition): Position => {
  return {
    x: position.x - 100 * e.clientX / window.innerWidth,
    y: position.y - 100 * e.clientY / window.innerHeight
  };
};


/** Calculate a position from offsets and an Event. */
const calcPosition = (offsets: Position, e: ClientPosition): Position => {
  return {
    x: clamp(100 * e.clientX / window.innerWidth + offsets.x, 0, 100),
    y: clamp(100 * e.clientY / window.innerHeight + offsets.y, 0, 100)
  };
};


/** Props for the DancingDot component. */
export type DancingDotProps = {
  /**
   * The radius of the dot
   * as a percentage of the smaller viewport dimension (vmin).
   */
  radius?: number
}


/**
 * Component showing a draggable dot in the browser viewport.
 */
export default function DancingDot({ radius=5 }: DancingDotProps) {
  // Position of the center of the dot as a percentage of the viewport.
  const [{ status, position }, dispatch] = useSyncedPosition();
  
  // The difference between the dot and mouse positions.
  const offsets = useRef({ x: 0, y: 0 });

  // The ID of the Touch object we're tracking.
  // It's possible for a Touch.identifier to be 0 (e.g. from puppeteer)
  // so use null to mean no touch is currently being tracked.
  const touchId = useRef(null);

  // Update the position when the dot is dragged with the mouse.
  // This is attached to the document to account for lag.
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (touchId.current !== null || status !== 'localControl')
        return;
      const position = calcPosition(offsets.current, e);
      dispatch({ type: 'setPosition', position });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () =>
      document.removeEventListener('mousemove', handleMouseMove);
  }, [dispatch, status])

  // Set CSS classes according to the status.
  let classes = 'dancing-dot';
  if (status === 'localControl') {
    classes += ' local-drag'
  } else if (status === 'remoteControl') {
    classes += ' remote-drag'
  }

  // Convert the center position to CSS left and top.
  const styles = {
    left: `calc(${position.x}vw - ${radius}vmin)`,
    top: `calc(${position.y}vh - ${radius}vmin)`,
    padding: radius + 'vmin',
    borderRadius: radius + 'vmin'
  };


  return (
    // TODO: don't render the dot (0 opacity) until data is retrieved from the db...
    <div className={classes} style={styles} role='main'
      // Begin a mouse drag: update the offsets and drag status.
      onMouseDown={e => {
        if (touchId.current !== null || !status.startsWith('idle')) return;
        offsets.current = calcOffsets(position, e);
        dispatch({ type: 'beginControl' });
      }}

      // End a mouse drag.
      onMouseUp={() => {
        if (touchId.current !== null || status !== 'localControl') return;
        dispatch({ type: 'endControl' });
      }}

      // Start a touch drag: update the offsets and drag status,
      // as well as the ID of the specific touch we're tracking.
      onTouchStart={e => {
        if (touchId.current !== null || !status.startsWith('idle')) return;
        const touch = e.targetTouches.item(0);
        if (!touch) return;
        touchId.current = touch.identifier;
        offsets.current = calcOffsets(position, touch);
        dispatch({ type: 'beginControl' });
      }}

      // Update the position when the dot is dragged by the tracked touch.
      onTouchMove={e => {
        if (touchId.current === null || status !== 'localControl') return;
        const touches = Array.prototype.filter.call(e.targetTouches,
          (t: React.Touch) => t.identifier === touchId.current);
        if (touches.length < 1) return;
        const position = calcPosition(offsets.current, touches[0]);  
        dispatch({ type: 'setPosition', position });
      }}

      // End a touch drag if the tracked touch is no longer present.
      onTouchEnd={e => {
        if (touchId.current === null || status !== 'localControl') return;
        const touches = Array.prototype.filter.call(e.targetTouches,
          (t: React.Touch) => t.identifier === touchId.current);
        if (touches.length > 0) return;
        touchId.current = null;
        dispatch({ type: 'endControl' });
      }}
    ></div>
  );
}
