// import "expect-puppeteer";
// import expect from 'expect-puppeteer';

// Note that jest-puppeteer injects browser, page, and context as globals.

import _ from 'lodash';


const getPage = async () => {
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.setViewport({ width: 100, height: 100 });
  return page;
};


/** Bounding box assuming 100x100 viewport, 5vmin radius, and 2px border. */
const startPosition = { x: -5, y: -5, width: 14, height: 14 };


const pollUntilTrue = async (testFn, timeoutMs=500) => {
  const endTime = Date.now() + timeoutMs;
  let result;
  while (!(result = await testFn())) {
    if (Date.now() >= endTime) {
      return false;
    }
  }
  return result;
};


it('renders an element', async () => {
  const pageA = await getPage();
  const dotA = await pageA.$('.dancing-dot');
  expect(dotA).toBeTruthy();
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), startPosition))).toBeTruthy();
});


it('can be dragged with the mouse', async () => {
  const pageA = await getPage();
  const dotA = await pageA.$('.dancing-dot');
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), startPosition))).toBeTruthy();

  const dist = 50;
  const endPosition = {...startPosition};
  endPosition.x += dist;
  endPosition.y += dist;

  const mouse = pageA.mouse;
  await mouse.move(0, 0);
  await mouse.down();
  await mouse.move(dist, dist);
  await mouse.up();

  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), endPosition))).toBeTruthy();
});


it('can be dragged by touch', async () => {
  const pageA = await getPage();
  const dotA = await pageA.$('.dancing-dot');
  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), startPosition))).toBeTruthy();

  const dist = 50;
  const endPosition = {...startPosition};
  endPosition.x += dist;
  endPosition.y += dist;

  const touchscreen = pageA.touchscreen;
  await touchscreen.touchStart(0, 0);
  await touchscreen.touchMove(dist, dist);
  await touchscreen.touchEnd();

  expect(await pollUntilTrue(async () =>
    _.isEqual(await dotA.boundingBox(), endPosition))).toBeTruthy();
});


it('synchronizes across two browser windows', async () => {
  // Get two browser pages pointing to the local dev server.
  const pageA = await getPage();
  const pageB = await getPage();

  const dotA = await pageA.$('.dancing-dot');
  const dotB = await pageB.$('.dancing-dot');

  console.log(await dotA.boundingBox());

  expect(dotA).toBeTruthy();
  expect(dotB).toBeTruthy();
});
