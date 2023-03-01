import { deleteApp, initializeApp } from 'firebase/app';
import { get, getDatabase, ref, serverTimestamp, set } from 'firebase/database';
import _ from 'lodash';
// Note that jest-puppeteer injects browser, page, and context as globals.


/** Get a puppeteer page with the app loaded from the test server. */
const getPage = async () => {
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/?db=test');
  await page.setViewport({ width: 100, height: 100 });
  // Uncomment to get console output from the page.
  // page.on('console', ms => {
  //   console.log('page console: ', ms.text())
  // });
  return page;
};


/** Call a function until its return value is truthy.
 * 
 * @param testFn The function to call. It may be async or return a Promise.
 * It's final return value will be returned.
 * @param timeoutMs When to give up. Defaults to 1000ms.
 */
const pollUntilTrue = async (testFn, timeoutMs=1000) => {
  const endTime = Date.now() + timeoutMs;
  let result;
  while (!(result = await testFn())) {
    if (Date.now() >= endTime) {
      return result;
    }
  }
  return result;
};


const radius = 5;
const width = 2 * radius + 4
/** Bounding box assuming 100x100 viewport, 5vmin radius, and 2px border. */
const startBoundingBox = {
  x: -radius,
  y: -radius,
  width,
  height: width
};


/** Drag an element a given distance.
 * 
 * @param page The puppeteer page on which to drag.
 * @param from The bounding box before the drag.
 * @param x The horizontal distance to move.
 * @param y The vertical distance to move.
 * @param leaveHanging If true, the drag is not ended with a mouseup event.
 */
const dragBy = async (page, from, x, y, leaveHanging=false) => {
  const endBoundingBox = {...from};
  endBoundingBox.x += x;
  endBoundingBox.y += y;

  const mouse = page.mouse;
  await mouse.move(from.x + radius, from.y + radius);
  await mouse.down();
  await mouse.move(endBoundingBox.x + radius, endBoundingBox.y + radius);

  if (!leaveHanging)
    await mouse.up();

  return endBoundingBox;
};


/** Check if two db data objects are the same, excluding the timestamp. */
const dbDataIsEqual = (a, b) => {
  return a.client === b.client &&
    a.status === b.status &&
    a.position.x === b.position.x &&
    a.position.y === b.position.y
};


/** Reference to the test db path.
 * Set in beforeEach(); reset to null in afterEach().
*/
let dotRef = null;

/** Reference to the firebase app.
 * Set in beforeEach(); deleted and reset to null in afterEach().
*/
let firebaseApp = null;


/** Put the database in a known state. */
beforeEach(async () => {
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
  firebaseApp = initializeApp(firebaseConfig);
  const db = getDatabase(firebaseApp);
  dotRef = ref(db, 'v2/dotTest');

  // Set and check the state.
  const initialData = {
    client: 'testsuite',
    status: 'idle',
    timestamp: serverTimestamp(),
    position: { x: 0, y: 0 }
  };
  await set(dotRef, initialData);
  if (!(await pollUntilTrue(async () =>
    dbDataIsEqual(await (await get(dotRef)).val(), initialData)))) {
      throw Error('Failed to set DB to initial data!');
  }
});


/** Clean up the database references to isolate the tests. */
afterEach(async () => {
  await deleteApp(firebaseApp);
  dotRef = null;
  firebaseApp = null;
});


/** Returns true if a client other than the test suite has set the db status to idle. */
const clientReleasedControl = async () => {
  const snap = await get(dotRef);
  const data = await snap.val();
  return data.status === 'idle' && data.client !== 'testsuite';
};


it('renders an element', async () => {
  const pageA = await getPage();
  const dotA = await pageA.$('.dancing-dot');

  // Make sure there's a dot in the right place.
  expect(dotA).toBeTruthy();
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), startBoundingBox))).toBeTruthy();

  await pageA.close();
});


it('can be dragged with the mouse', async () => {
  const pageA = await getPage();
  const dotA = await pageA.$('.dancing-dot');
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), startBoundingBox))).toBeTruthy();

  // Drag the dot and make sure the position changes.
  const endBoundingBox = await dragBy(pageA, startBoundingBox, 50, 50);
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), endBoundingBox))).toBeTruthy();

  // Make sure the state returns to idle after the drag.
  expect(await pollUntilTrue(clientReleasedControl)).toBeTruthy();

  await pageA.close();
});


it('can be dragged by touch', async () => {
  const pageA = await getPage();
  const dotA = await pageA.$('.dancing-dot');
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), startBoundingBox))).toBeTruthy();

  // Drag the dot.
  const dist = 50;
  const endBoundingBox = {...startBoundingBox};
  endBoundingBox.x += dist;
  endBoundingBox.y += dist;

  const touchscreen = pageA.touchscreen;
  await touchscreen.touchStart(0, 0);
  await touchscreen.touchMove(dist, dist);
  await touchscreen.touchEnd();

  // Make sure the position has changed.
  expect(await pollUntilTrue(async () => 
    _.isEqual(await dotA.boundingBox(), endBoundingBox))).toBeTruthy();

  // Make sure the state returns to idle after the drag.
  expect(await pollUntilTrue(clientReleasedControl)).toBeTruthy();

  await pageA.close();
});


it('synchronizes across two browser windows', async () => {
  // Get two pages.
  const pageA = await getPage();
  const dotA = await pageA.$('.dancing-dot');
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), startBoundingBox))).toBeTruthy();

  const pageB = await getPage();
  const dotB = await pageB.$('.dancing-dot');
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotB.boundingBox(), startBoundingBox))).toBeTruthy();

  // Drag on pageA, and test the result on both.
  const midBoundingBox = await dragBy(pageA, startBoundingBox, 50, 50);
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), midBoundingBox))).toBeTruthy();
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotB.boundingBox(), midBoundingBox))).toBeTruthy();

  // Make sure the state returns to idle after the drag.
  expect(await pollUntilTrue(clientReleasedControl)).toBeTruthy();

  // Drag on pageB, and test the result on both.
  const endBoundingBox = await dragBy(pageB, midBoundingBox, 49, 49);
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotB.boundingBox(), endBoundingBox))).toBeTruthy();
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), endBoundingBox))).toBeTruthy();

  // Make sure the state returns to idle after the drag.
  expect(await pollUntilTrue(clientReleasedControl)).toBeTruthy();

  await pageA.close();
  await pageB.close();
});


it('picks up the initial position', async () => {
  // Get the first page.
  const pageA = await getPage();
  const dotA = await pageA.$('.dancing-dot');
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), startBoundingBox))).toBeTruthy();

  // Drag on pageA, and test the result.
  let endBoundingBox = await dragBy(pageA, startBoundingBox, 50, 50);
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), endBoundingBox))).toBeTruthy();

  // Get a new page, and make sure it picks up the position from the first drag.
  const pageB = await getPage();
  const dotB = await pageB.$('.dancing-dot');
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotB.boundingBox(), endBoundingBox))).toBeTruthy();

  // Make sure the state returns to idle after the drag.
  expect(await pollUntilTrue(clientReleasedControl)).toBeTruthy();

  await pageA.close();
  await pageB.close();
});


it('cannot be dragged during remote control', async () => {
  // Get two pages.
  const pageA = await getPage();
  const dotA = await pageA.$('.dancing-dot');
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), startBoundingBox))).toBeTruthy();

  const pageB = await getPage();
  const dotB = await pageB.$('.dancing-dot');
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotB.boundingBox(), startBoundingBox))).toBeTruthy();

  // Drag on pageA, and test the result on both.
  // However, don't release the mouse.
  const midBoundingBox = await dragBy(pageA, startBoundingBox, 50, 50, true);
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), midBoundingBox))).toBeTruthy();
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotB.boundingBox(), midBoundingBox))).toBeTruthy();

  // Drag on pageB, and test the result on both.
  // Make sure the position DOESN'T change.
  const endBoundingBox = await dragBy(pageB, midBoundingBox, 49, 49);
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotB.boundingBox(), endBoundingBox))).toBeFalsy();
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), endBoundingBox))).toBeFalsy();

  // Wait 5 seconds...
  await new Promise((resolve) => {
    setTimeout(resolve, 5000);
  });

  // ...and try again.
  await dragBy(pageB, midBoundingBox, 49, 49);
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotB.boundingBox(), endBoundingBox))).toBeTruthy();
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), endBoundingBox))).toBeTruthy();

  // Make sure the state returns to idle after the drag.
  expect(await pollUntilTrue(clientReleasedControl)).toBeTruthy();

  await pageA.close();
  await pageB.close();
}, 11000);
