# DRACHTIO MW UNDER PRESSURE
This middleware works by intercepting and inspecting incoming SIP requests. It leverages the Node.js event loop mechanism and monitors key performance indicators like the event loop delay, heap memory usage, and RSS bytes. If any of these values exceed predefined thresholds (indicating high server load), the middleware can choose to reject the incoming SIP request to maintain system stability.

# How to Use

```js
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
```