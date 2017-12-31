"use strict";

var config = require('../configs/izy-proxy/config');
var httpProxy = require('http-proxy');



var handlers = [];
var modtask = {};
modtask.logEntries = [];
modtask.maxLogLength = 5;
modtask.serverLog = function(msg, type, plugin) {
  if (!type) type = "WARNING";
  if (!plugin) plugin = { name: '' };
  var item = {
    type,
    ts: new Date(),
    msg,
    plugin: plugin
  }
  modtask.logEntries.unshift(item);
  if (modtask.logEntries.length > modtask.maxLogLength) {
    modtask.logEntries.length = modtask.maxLogLength;
  }
  var msg = '[' + item.ts + '] (' + item.type + ')(' + item.plugin.name + ') ' + item.msg;
  console.log(msg);
}

modtask.loadPlugin = function(pluginConfig, noCaching) {
  var outcome = {};
  var path = `./plugin/${pluginConfig.name}/handle`;
  console.log(`Loading plug-in ${pluginConfig.name}`);
  if (noCaching) {
    // delete require.cache[require.resolve(path)]
    var p;
    for(p in require.cache) {
      delete require.cache[p];
    }
  }
  try {
    outcome = require(path)(pluginConfig, pluginConfig.name, config);
  } catch(e) {
    outcome.reason = e;
  }
  if (!outcome.success) {
    modtask.serverLog(`Failed to properly load plug-in *${pluginConfig.name}*. All plug-in requests will 404. The plug-in error was: ${JSON.stringify(outcome.reason)}`);
    // This is needed so that *handler.plugin.canHandle is not a function* gets avoided
    // Instead all the requests that would have been handled by this plug-in will get a 404 instead
    outcome.canHandle = function() { return false };
  }
  return outcome;
}

modtask.initHandlers = function() {
  var outcome = {};
  var list = config.plugins || [];

  list.push({
    name: 'default'
  });
  var i;
  for(i=0; i < list.length; ++i) {
    if (!list[i].name) {
      console.log(`WARNING: invalid config entry ${i} for plugins. Missing name property`);
      continue;
    }
    handlers.push({
      plugin: modtask.loadPlugin(list[i]),
      config: list[i]
    });
  }
}

module.exports.run = function run() {
  modtask.initHandlers();
  var proxy = httpProxy.createProxyServer({
    proxyTimeout: config.proxy.timeoutInMs,
  })
  .on('error', onError)
  .on('proxyRes', (proxyRes, req, res) => console.log('proxyRes', proxyRes, req, res));

  const requestHandler = function (req, res) {
    handleRequest(req, res, proxy);
  }

  if (config.port.http) {
    require('http').createServer(requestHandler).listen(config.port.http).on('clientError', (err) => console.log('clientError', err));
    console.log('Proxying HTTP on port:' + config.port.http);
  }

  if (config.port.https) {
    const fs = require('fs');

    var options = {
      key: fs.readFileSync('../configs/izy-proxy/certificates/privatekey.pem'),
      cert: fs.readFileSync('../configs/izy-proxy/certificates/certificate.pem')
    };

    require('https').createServer(options, requestHandler).listen(config.port.https);
    console.log('Proxying HTTPS on port:' + config.port.https);
  }
};

function getCORSHeaders(extraHeaders) {
  var ret = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials' : 'true',
    'Access-Control-Allow-Methods' : 'PROPFIND, PROPPATCH, COPY, MOVE, DELETE, MKCOL, LOCK, UNLOCK, PUT, GETLIB, VERSION-CONTROL, CHECKIN, CHECKOUT, UNCHECKOUT, REPORT, UPDATE, CANCELUPLOAD, HEAD, OPTIONS, GET, POST',
    'Access-Control-Allow-Headers' : 'Overwrite, Destination, Content-Type, Depth, User-Agent, X-File-Size, X-Requested-With, If-Modified-Since, X-File-Name, Cache-Control'
  };
  var p;
  for(p in extraHeaders) {
    ret[p] = extraHeaders[p];
  }
  return ret;
}

function acceptAndHandleCORS(req, res) {
  if (req.method.toUpperCase() == 'OPTIONS') {
    res.writeHead(200, getCORSHeaders());
    res.end();
    return true;
  }
  return false;
}

function handleRequest(req, res, proxy) {
  if (req.url === '/izyproxystatus') {
    // If the handler allows CORS, then this can provide a generic shortcut for handling the OPTIONS request method
    if (acceptAndHandleCORS(req, res)) return;
    return sendStatus(req, res, {
      status: 200,
      subsystem: 'server'
    }, 'OK');
  }

  var i, handler;
  for(i=0; i < handlers.length; ++i) {
    try {
      handler = handlers[i];
      if (handler.config.reloadPerRequest) {
        handler.plugin = modtask.loadPlugin(handler.config, true);
      }
      /*** Errors happening in this block will be marked as belonging to the plug-in ***/
      try {
        if (handler.plugin.canHandle(req)) {
          var serverObjs = {
            modtask,
            req,
            res,
            proxy,
            sendStatus: function (info, msg) {
              return sendStatus(req, res, info, msg);
            },
            getCORSHeaders: getCORSHeaders,
            acceptAndHandleCORS: function () {
              return acceptAndHandleCORS(req, res);
            }
          };
          return handler.plugin.handle(req, res, serverObjs);
        }
      } catch(e) {
        modtask.serverLog(e.message, null, handler.plugin);
        return sendStatus(req, res, {
          status: 500,
          plugin: handler.plugin.name
        }, e.message);
      }
    } catch(e) {
      return onError(e.message, req, res);
    }
  }
  onError('no handlers defined', req, res);
}

function onError(err, req, res) {
  console.log('SERVER ERROR: ', err);
  return sendStatus(req, res, {
    status: 500,
    subsystem: 'server'
  }, 'Error servicing the request: '+ err);
}

function sendStatus(req, res, info, msg) {
  msg = msg || '';
  info.headers = info.headers || getCORSHeaders({'Content-Type': 'text/html' });
  res.writeHead(info.status, info.headers);
  info.host = req.headers.host;
  info.url = req.url;
  res.write('<html><head><title>izy-proxy</title></head><body><h1>' + msg + '</h1><h2>'
    + JSON.stringify({
      status: info.status,
      host: info.host,
      url: info.url,
      subsystem: info.subsystem,
      plugin: info.plugin
    }, null, '\t') +
    '</h2></body></html>'
  );
  res.end();
}
