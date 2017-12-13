"use strict";

var config = require('../configs/izy-proxy/config');
var httpProxy = require('http-proxy');

var handlers = [];
var modtask = {};
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
    console.log(`WARNING: failed to properly load plug-in *${pluginConfig.name}*: ${JSON.stringify(outcome.reason)}`);
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

function handleRequest(req, res, proxy) {

  if (req.url === '/izyproxystatus') {
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
      if (handler.plugin.canHandle(req)) {
        console.log(req.url, ' => ', handler.config.name);
        return handler.plugin.handle(req, res, {
          req,
          res,
          proxy,
          sendStatus: function(info, msg) {
            return sendStatus(req, res, info, msg);
          }
        });
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
  res.writeHead(info.status, {'Content-Type': 'text/html' });
  info.host = req.headers.host;
  info.url = req.url;
  res.write('<html><head><title>izy-proxy</title></head><body><h1>' + msg + '</h1><h2>'
    + JSON.stringify(info, null, '\t') +
    '</h2></body></html>'
  );
  res.end();
}
