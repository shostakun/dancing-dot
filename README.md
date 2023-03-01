# Dancing Dot Documentation

This project implements a dot that can be dragged around the browser viewport. Its position is synchronized across multiple clients using a Firebase realtime database.

The live demo is at [https://dancing-d-o-t.web.app](https://dancing-d-o-t.web.app).

## Design

The dot is implemented by the `DancingDot` React component located in `src/DancingDot.tsx`. Related styles are located in `src/DancingDot.scss`.

The position is updated in response to mouse events (`mousedown`, `mousemove`, and `mouseup`) or touch events (`touchstart`, `touchmove`, and `touchend`). All positioning is done via CSS in viewport units (`vh`, `vw`, and `vmin`), which allows for arbitrary screen sizes.

Two additional CSS classes, `local-drag` and `remote-drag` are used to indicate when the dot is being dragged locally or remotely, respectively.

### Synchronization

Synchronization is done using a Firebase realtime database. It is implemented as a React custom hook, `useSyncedPositon()`, located in `src/SyncedPosition.tsx`.

Currently, the database is managed locally within the hook, meaning that each `DancingDot` component has its own database listener. If the application were going to contain multiple `DancingDot` components, it would likely be better to use a React context provider to share state across components.

The hook is implemented using `useReducer()`. To manipulate the state, components can `dispatch()` objects of type `SyncedPositionAction` with the following shapes:

1. To begin a drag in response to a `mousedown` or `touchstart`:

        { type: 'beginControl' }

2. To update the position in response to a `mousemove` or `touchmove`:

        {
          type: 'setPosition',
          position: {
            x: 0,
            y: 100
          }
        }
    
    Positions are on the range 0–100, inclusive.

3. To end a drag in response to a `mouseup` or `touchend`:

        { type: 'endControl' }

To apply positions received from remote clients, the hook uses an additional action internally:

    {
      type: 'setState',
      newState: {
        status: 'remoteControl', // or 'idleRemote'
        position: {
          x: 0,
          y: 100
        }
      }
    }

### Database Access

Clients can write to the database in the following circumstances:

- No other client is currently dragging the dot. (The status is `'idleLocal'` or `'idleRemote'`.)
- You are the current client. (The status is `'localControl'`.)
- The current client has gone idle mid-drag for more than 5 seconds. (The status will be returned to `'idleRemote'`.)

The timeout has been implemented because there are several ways a drag could go uncompleted: the client is disconnected from the database, their browser crashes, or they simply move out of their browser window before releasing the mouse.

These conditions are implemented in `useSyncedPosition()` as well as Firebase rules located in `database.rules.json`. In particular, attempts to control the dot while another client is controlling it remotely are rejected both in the hook and in the database.

## Commands

### Development

The following commands are available in the project directory.

To set up your development environment, do:

### `npm install`

To run the development server on [http://localhost:3000](http://localhost:3000) with live reloading, do:

### `npm start`

There is also a (slow) E2E test suite using Jest and Puppeteer. To run the test suite, do:

### `npm test`

The tests will be automatically rerun as you make code changes. The dev server must be running on port 3000 for the tests to run. Note that the tests are currently run against a test path in the database, `dotTest`, rather than the production `dot`.

### Deployment

First make sure you have `firebase-tools` installed and you are logged in with e.g.:

### `npm install -g firebase-tools`
### `firebase login`

Then you can run:

### `npm run deploy`

in the project directory. This will do a production build and push it to Firebase.

To make a production build without deploying, do:

### `npm run build`
