import React, { useEffect } from 'react';
import { useRef, useState } from 'react';

import './DancingDot.scss';


/**
 * Clamp a number to the given bounds.
 * @returns The number if it is within the bounds; or the nearest bound.
 */
const clamp = (n: number, min: number, max: number): number => {
  return Math.min(Math.max(n, min), max);
}


/**
 * Component showing a draggable dot in the browser viewport.
 */
export default function DancingDot({ radius=5 }) {
  // Whether or not the dot is being dragged in the local browser.
  const [localDrag, setLocalDrag] = useState(false);
  // Position of the center of the dot as a percentage of the viewport.
  const [position, setPosition] = useState({ x: 0, y: 0 });
  // The difference between the dot and mouse positions.
  const offsets = useRef({ x: 0, y: 0 });

  // Update the position when the dot is dragged.
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!localDrag)
        return;

      const newPos = {
        x: clamp(100 * e.clientX / window.innerWidth + offsets.current.x, 0, 100),
        y: clamp(100 * e.clientY / window.innerHeight + offsets.current.y, 0, 100)
      };
      console.log(newPos);

      setPosition(newPos);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () =>
      document.removeEventListener('mousemove', handleMouseMove);
  }, [localDrag])

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
      // Begin the drag: update the offsets and drag flag.
      onMouseDown={e => {
        offsets.current = {
          x: position.x - 100 * e.clientX / window.innerWidth,
          y: position.y - 100 * e.clientY / window.innerHeight
        };
        setLocalDrag(true);
      }}
      // End the drag.
      onMouseUp={() => setLocalDrag(false)}
    ></div>
  );
}
