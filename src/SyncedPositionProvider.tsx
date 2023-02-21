import { useEffect, useReducer } from 'react';

import { initializeApp } from 'firebase/app';
import { getDatabase, onValue, ref, set } from 'firebase/database';

import { v4 as uuidv4 } from 'uuid';
const client = uuidv4();


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyC_BcVr3HKIhuhB2HDdh806TCj-y7IPocE',
  authDomain: 'dancing-d-o-t.firebaseapp.com',
  projectId: 'dancing-d-o-t',
  storageBucket: 'dancing-d-o-t.appspot.com',
  messagingSenderId: '117744523870',
  appId: '1:117744523870:web:aa6348b66fafa9491fb2cf',
  databaseURL: 'https://dancing-d-o-t-default-rtdb.asia-southeast1.firebasedatabase.app/'
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);
const dotRef = ref(db, 'dot');


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


/** The control status and position. */
export type SyncedPosition = {
  status: 'idle' | 'localControl' | 'remoteControl',
  /** The position as a percentage of the viewport. */
  position: Position
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

/**
 * An action for applying state updates from the database.
 * Not for use from client-side code.
 * @private
 */
type SetStateAction =  {
  type: 'setState',
  newState: SyncedPosition
}

/** Actions for updating the control status or position. */
export type SyncedPositionAction =
  ControlAction | SetPositionAction | SetStateAction;


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

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Get position updates from Firebase.
    const unsubscribe = onValue(dotRef, (snapshot) => {
      // We got an update, so cancel the last timeout.
      clearTimeout(timeoutId);

      const snap = snapshot.val();

      // If the database change is from the current client,
      // don't trigger another update.
      if (snap.client === client) return;

      if (snap.client) {
        timeoutId = setTimeout(() => {
          // It's been more than 5 seconds since we last heard from the remote,
          // so allow local control again.
          dispatch({
            type: 'setState',
            newState: {
              status: 'idle',
              position: snap.position
            }
          })
        }, 5000);
      }

      dispatch({
        type: 'setState',
        // Firebase DataSnapshots are immutable, so OK to use directly as state.
        // TODO: Assume the data in the db is the correct shape.
        newState: {
          status: snap.client ? 'remoteControl' : 'idle',
          position: snap.position
        }
      })
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [dispatch]);

  return [{ status, position }, dispatch];
}


/**
 * Apply updates to the synced position state.
 */
function syncedPositionReducer(
  oldPosition: SyncedPosition,
  action: SyncedPositionAction
): SyncedPosition {
  // If we get new data from the database, use it as the new state.
  if (action.type === 'setState') {
    return action.newState;
  }

  // If the position is being controlled remotely,
  // ignore status updates, without triggering a rerender.
  if (oldPosition.status === 'remoteControl') {
    return oldPosition;
  }

  // Local control is possible.
  if (action.type === 'setPosition' && oldPosition.status === 'localControl') {
    set(dotRef, {
      client,
      timestamp: Date.now(),
      position: action.position
    });
    return {
      status: oldPosition.status,
      position: { ...action.position }
    }
  }

  if (action.type === 'beginControl' && oldPosition.status === 'idle') {
    set(dotRef, {
      client,
      timestamp: Date.now(),
      position: oldPosition.position
    });
    return {
      status: 'localControl',
      position: { ...oldPosition.position }
    }
  }

  if (action.type === 'endControl' && oldPosition.status === 'localControl') {
    set(dotRef, {
      client: '',
      timestamp: Date.now(),
      position: oldPosition.position
    });
    return {
      status: 'idle',
      position: { ...oldPosition.position }
    }
  }

  // Nothing changed, so don't rerender.
  return oldPosition;
}
