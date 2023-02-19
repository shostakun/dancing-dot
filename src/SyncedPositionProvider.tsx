import { useReducer } from 'react';

/**
 * Provide a synchronized position.
 * 
 * A context provider is overkill in this example because the data is only
 * accessed in one place in the element tree. However, we can assume in a
 * real app it'd be used more than one place. It also gives us a convenient
 * place to cache the data without resorting to a module-level variable.
 */
export function SyncedPositionProvider() {
  return null;
}


/** A 2D coordinate. */
export type Position = {
  x: number, // TODO: Can I limit this to a range?
  y: number
};


/** An action to begin or end local control. */
type ControlAction = {
  type: 'beginControl' | 'endControl'
};

/** An action to set the position during local control. */
type SetPositionAction = {
  type: 'setPosition',
  /** The position as a percentage of the viewport. */
  position: Position
}

/** Actions for updating the control status or position. */
export type SyncedPositionAction = ControlAction | SetPositionAction;


/** The control status and position. */
export type SyncedPosition = {
  status: 'idle' | 'localControl' | 'remoteControl',
  /** The position as a percentage of the viewport. */
  position: Position
};


/**
 * Custom hook to access the synchronized position.
 * This hook may only be used in a child of a SyncedPositionProvider.
 */
export function useSyncedPosition(
): [SyncedPosition, (action: SyncedPositionAction) => void] {
  const [{ status, position }, dispatch] = useReducer(syncedPositionReducer, {
    status: 'idle',
    position: { x: 0, y: 0 }
  });
  return [{ status, position }, dispatch];
}


function syncedPositionReducer(
  oldPosition: SyncedPosition,
  action: SyncedPositionAction
): SyncedPosition {
  // If the position is being controlled remotely,
  // ignore status updates, without triggering a rerender.
  if (oldPosition.status === 'remoteControl') {
    return oldPosition;
  }

  // Local control is possible.
  if (action.type === 'setPosition' && oldPosition.status === 'localControl') {
    return {
      status: oldPosition.status,
      position: { ...action.position }
    }
  }

  if (action.type === 'beginControl' && oldPosition.status === 'idle') {
    return {
      status: 'localControl',
      position: { ...oldPosition.position }
    }
  }

  if (action.type === 'endControl' && oldPosition.status === 'localControl') {
    return {
      status: 'idle',
      position: { ...oldPosition.position }
    }
  }

  // Nothing changed, so don't rerender.
  return oldPosition;
}
