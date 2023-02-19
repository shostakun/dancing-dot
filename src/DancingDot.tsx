import React, { useEffect } from 'react';
import { useRef } from 'react';

import { useSyncedPosition } from './SyncedPositionProvider';

import './DancingDot.scss';


/**
 * Clamp a number to the given bounds.
 * @returns The number if it is within the bounds; or the nearest bound.
 */
const clamp = (n: number, min: number, max: number): number => {
  return Math.min(Math.max(n, min), max);
}


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
export default function DancingDot({ radius=5 }) {
  // Position of the center of the dot as a percentage of the viewport.
  const [{ status, position }, dispatch] = useSyncedPosition();
  // Whether or not the dot is being dragged in the local browser.
  const localDrag = status === 'localControl';
  // The difference between the dot and mouse positions.
  const offsets = useRef({ x: 0, y: 0 });

  // Update the position when the dot is dragged.
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!localDrag)
        return;

      const position = {
        x: clamp(100 * e.clientX / window.innerWidth + offsets.current.x, 0, 100),
        y: clamp(100 * e.clientY / window.innerHeight + offsets.current.y, 0, 100)
      };

      dispatch({ type: 'setPosition', position });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () =>
      document.removeEventListener('mousemove', handleMouseMove);
  }, [dispatch, localDrag])

  const classes = 'dancing-dot' + (localDrag ? ' local-drag' : '');

  // Convert the center position to CSS left and top.
  const styles = {
    left: `calc(${position.x}vw - ${radius}vmin)`,
    top: `calc(${position.y}vh - ${radius}vmin)`,
    padding: radius + 'vmin',
    borderRadius: radius + 'vmin'
  };

  return (
    <div className={classes} style={styles}
      // Begin the drag: update the offsets and drag status.
      onMouseDown={e => {
        offsets.current = {
          x: position.x - 100 * e.clientX / window.innerWidth,
          y: position.y - 100 * e.clientY / window.innerHeight
        };
        dispatch({ type: 'beginControl' });
      }}
      // End the drag.
      onMouseUp={() => dispatch({ type: 'endControl' })}
    ></div>
  );
}
