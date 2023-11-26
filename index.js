const { eventLoopUtilization } = require('node:perf_hooks').performance;
const { monitorEventLoopDelay } = require('node:perf_hooks');
const debug = require('debug')('drachtio:under-pressure');

/**
 * This middleware works by intercepting imcoming SIP message leverages
 * the Node.js event loop mechanism and monitors key performance indicators
 * like the event loop delay, heap memory usage, and RSS bytes.
 *
 * @param {opts.resolution} Optional perf_hooks resolution
 * @param {opts.sampleInterval} Optional  js event loop fetch interval
 * @param {opts.maxEventLoopDelay} js event loop delay threshold
 * @param {opts.maxHeapUsedBytes} js max js heap used bytes threshold
 * @param {opts.maxRssBytes} js max js RSS bytes threshold
 * @param {opts.maxEventLoopUtilization} js event loop utilization threshold
 * @param {opts.sipStatusCode} Optional  SIP response error code
 * @param {opts.sipReasonPhrase} Optional SIP response error message
 * @param {opts.sipCustomHeaders} Optional  SIP response headers
 * @returns {function(req, res, next)} a drachtio srf middleware function
 */
module.exports = (opts) => {
  const resolution = opts.resolution || 10;
  const sampleInterval = opts.sampleInterval || 1000;
  const maxEventLoopDelay = opts.maxEventLoopDelay || 0;
  const maxHeapUsedBytes = opts.maxHeapUsedBytes || 0;
  const maxRssBytes = opts.maxRssBytes || 0;
  const maxEventLoopUtilization = opts.maxEventLoopUtilization || 0;
  const sipStatusCode = opts.sipStatusCode || 503;
  const sipReasonPhrase = opts.sipReasonPhrase || 'Service Unavailable';
  const sipCustomHeaders = opts.sipCustomHeaders || {};

  let histogram;
  let heapUsed = 0;
  let rssBytes = 0;
  let eventLoopDelay = 0;
  let elu;
  let lastCheck;
  let eventLoopUtilized = 0;

  if (monitorEventLoopDelay) {
    histogram = monitorEventLoopDelay({ resolution });
    histogram.enable();
  } else {
    lastCheck = now();
  }

  if (eventLoopUtilization) {
    elu = eventLoopUtilization();
  }

  const timer = setInterval(() => {
    const mem = process.memoryUsage();
    heapUsed = mem.heapUsed;
    rssBytes = mem.rss;

    updateEventLoopDelay();
    updateEventLoopUtilization();
    debug(`heapUsed: ${heapUsed}, rssBytes: ${rssBytes}, eventLoopDelay: 
 ${eventLoopDelay}, eventLoopUtilized: ${eventLoopUtilized}`);
  }, sampleInterval);
  // clean timer automatically
  timer.unref();

  function now() {
    const ts = process.hrtime();
    return (ts[0] * 1e3) + (ts[1] / 1e6);
  }

  function updateEventLoopDelay() {
    if (histogram) {
      eventLoopDelay = Math.max(0, histogram.mean / 1e6 - resolution);
      if (Number.isNaN(eventLoopDelay)) eventLoopDelay = Infinity;
      histogram.reset();
    } else {
      const toCheck = now();
      eventLoopDelay = Math.max(0, toCheck - lastCheck - sampleInterval);
      lastCheck = toCheck;
    }
  }

  function updateEventLoopUtilization() {
    if (elu) {
      eventLoopUtilized = eventLoopUtilization(elu).utilization;
    } else {
      eventLoopUtilized = 0;
    }
  }

  function isUnderPressure() {
    if (maxEventLoopDelay > 0 && eventLoopDelay > maxEventLoopDelay) {
      return true;
    }

    if (maxHeapUsedBytes > 0 && heapUsed > maxHeapUsedBytes) {
      return true;
    }

    if (maxRssBytes > 0 && rssBytes > maxRssBytes) {
      return true;
    }

    if (maxEventLoopUtilization && eventLoopUtilized > maxEventLoopUtilization) {
      return true;
    }

    return false;
  }

  return function(req, res, next) {
    if (isUnderPressure()) {
      res.send(sipStatusCode, sipReasonPhrase, {headers: sipCustomHeaders});
      return req.srf.endSession(req);
    } else {
      next();
    }
  };
};
