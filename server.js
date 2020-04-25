"use strict";

function initModtask(config) {
  var handlers = [];
  var modtask = {};
  modtask.logEntries = [];
  modtask.maxLogLength = 1000;
  modtask.verbose = config.verbose || {
      WARNING: false,
      INFO: false,
      ERROR: true
    };
  modtask.serverLog = function (msg, type, plugin) {
    if (!type) type = "WARNING";
    if (!plugin) plugin = {name: ''};
    var item = {
      type,
      ts: new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
      msg,
      plugin: plugin
    }
    modtask.logEntries.unshift(item);
    if (modtask.logEntries.length > modtask.maxLogLength) {
      modtask.logEntries.length = modtask.maxLogLength;
    }
    var msg = '[' + item.ts + '] (' + item.type + ')(' + item.plugin.name + ') ' + item.msg;
    if (modtask.verbose[type]) console.log(msg);
  }

  modtask.loadPlugin = function (pluginConfig, noCaching) {
    var outcome = {};
    var path = `./plugin/${pluginConfig.name}/handle`;
    modtask.serverLog(`Loading plug-in ${pluginConfig.name}`, 'INFO');
    if (noCaching) {
      // delete require.cache[require.resolve(path)]
      var p;
      for (p in require.cache) {
        delete require.cache[p];
      }
    }
    try {
      outcome = require(path)(pluginConfig, pluginConfig.name, config);
    } catch (e) {
      outcome.reason = e.message;
    }
    if (!outcome.success) {
      var reason = outcome.reason;
      if (typeof(reason) != 'string' && typeof(reason.toString) == 'function') reason = reason.toString();
      modtask.serverLog(`Failed to properly load plug-in *${pluginConfig.name}*. All plug-in requests will 404. The plug-in error was: ${reason}`);
      // This is needed so that *handler.plugin.canHandle is not a function* gets avoided
      // Instead all the requests that would have been handled by this plug-in will get a 404 instead
      outcome.canHandle = function () { return false };
    }
    return outcome;
  }

  modtask.initHandlers = function () {
    var outcome = {};
    var list = config.plugins || [];

    list.push({
      name: 'default'
    });
    var i;
    for (i = 0; i < list.length; ++i) {
      if (!list[i].name) {
        modtask.serverLog(`WARNING: invalid config entry ${i} for plugins. Missing name property`);
        continue;
      }
      var item = {
        plugin: modtask.loadPlugin(list[i]),
        config: list[i]
      };
      if (item.plugin.success) {
        handlers.push(item);
      }
    }
  }

  modtask.initCustomHandlers = function () {
    var i, handler;
    for (i = 0; i < handlers.length; ++i) {
      try {
        handler = handlers[i];
        if (handler.config.customRequestHandler) {
          modtask.serverLog(`initCustomHandler: ${handler.config.name}`, 'INFO');
          handler.plugin.initCustomHandler(modtask, handler);
        }
      } catch (e) {
        modtask.serverLog(e.message, 'ERROR', handler.plugin);
      }
    }
  }

  modtask.initHttpHandlers = function () {
    if (!config.port) {
      config.port = {};
    }
    ;

    const requestHandlerHttp = function (req, res) {
      handleRequest(req, res, 'http', config);
    }

    const requestHandlerHttps = function (req, res) {
      handleRequest(req, res, 'https', config);
    }

    if (config.port.http) {
      require('http').createServer(requestHandlerHttp).listen(config.port.http).on('clientError', function (err) {
        console.log('clientError', err)
      });
      modtask.serverLog('izy-proxy HTTP on port:' + config.port.http, 'INFO');
    }

    if (config.port.https) {
      const fs = require('fs');
      var sslConfig = config.sslConfig || {
        privatekeyPath: '../configs/izy-proxy/certificates/privatekey.pem',
        certificatePath: '../configs/izy-proxy/certificates/certificate.pem'
      };

      var options = {
        key: fs.readFileSync(sslConfig.privatekeyPath),
        cert: fs.readFileSync(sslConfig.certificatePath)
      };

      require('https').createServer(options, requestHandlerHttps).listen(config.port.https);
      modtask.serverLog('izy-proxy HTTPS on port:' + config.port.https, 'INFO');
    }
  }

  function getCORSHeaders(extraHeaders) {
    var ret = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'PROPFIND, PROPPATCH, COPY, MOVE, DELETE, MKCOL, LOCK, UNLOCK, PUT, GETLIB, VERSION-CONTROL, CHECKIN, CHECKOUT, UNCHECKOUT, REPORT, UPDATE, CANCELUPLOAD, HEAD, OPTIONS, GET, POST',
      'Access-Control-Allow-Headers': 'Overwrite, Destination, Content-Type, Depth, User-Agent, X-File-Size, X-Requested-With, If-Modified-Since, X-File-Name, Cache-Control, Authorization'
    };
    var p;
    for (p in extraHeaders) {
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

  function handleRequest(req, res, scheme, config) {
    if (config.disallow && config.disallow.userAgents && req.headers['user-agent']) {
      var i;
      var requestAgent = req.headers['user-agent'];
      var list = config.disallow.userAgents;
      for (i = 0; i < list.length; ++i) {
        var agent = list[i];
        if (requestAgent.indexOf(agent) >= 0) {
          modtask.serverLog('disallowUserAgents ' + requestAgent, 'INFO');
          return sendStatus(req, res, {
            status: 404,
            subsystem: 'server'
          }, 'The requested resource can not be found. Please try again later.');
        }
      }
    }

    if (req.url.toLowerCase() === '/robots.txt') {
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8'
      });
      res.write('User-agent: *\r\nDisallow:\r\n\r\n');
      return res.end();
    }

    if (req.url === '/izyproxystatus') {
      // If the handler allows CORS, then this can provide a generic shortcut for handling the OPTIONS request method
      if (acceptAndHandleCORS(req, res)) return;
      return sendStatus(req, res, {
        status: 200,
        subsystem: 'server'
      }, 'OK, version=3.0');
    }

    var i, handler;
    for (i = 0; i < handlers.length; ++i) {
      try {
        handler = handlers[i];
        if (handler.config.customRequestHandler) continue;
        if (handler.config.reloadPerRequest) {
          handler.plugin = modtask.loadPlugin(handler.config, true);
        }
        /*** Errors happening in this block will be marked as belonging to the plug-in ***/
        try {
          /* sessionObjects may be shared across:
           1) canHandle and handle
           or
           2) different plug-ins
           */
          var sessionObjects = {
            scheme
          };
          var serverObjs = (function (_plugin) {
            return {
              modtask,
              req,
              res,
              serverLog: function (msg, type) {
                modtask.serverLog(msg, type, _plugin);
              },
              sendStatus: function (info, msg) {
                return sendStatus(req, res, info, msg);
              },
              getCORSHeaders: getCORSHeaders,
              acceptAndHandleCORS: function () {
                return acceptAndHandleCORS(req, res);
              }
            }
          })(handler.plugin);
          if (handler.plugin.canHandle(req, sessionObjects, serverObjs)) {
            modtask.serverLog('Handling ' + req.url, 'INFO', handler.plugin);
            return handler.plugin.handle(req, res, serverObjs, sessionObjects);
          }
        } catch (e) {
          modtask.serverLog(e.message, 'ERROR', handler.plugin);
          return sendStatus(req, res, {
            status: 500,
            plugin: handler.plugin.name
          }, e.message);
        }
      } catch (e) {
        return onError(e.message, req, res);
      }
    }
    onError('no handlers defined', req, res);
  }

  function onError(err, req, res) {
    modtask.serverLog(err, 'ERROR');
    return sendStatus(req, res, {
      status: 500,
      subsystem: 'server'
    }, err);
  }

  function sendStatus(req, res, info, msg) {
    msg = msg || '';
    info.headers = info.headers || getCORSHeaders({'Content-Type': 'text/html; charset=utf-8'});
    res.writeHead(info.status, info.headers);
    info.host = req.headers.host;
    info.url = req.url;
    res.write('<html><head><title>izy-proxy</title></head><body>\n\n<h1>' + msg + '</h1>\n\n<h2>'
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


  module.exports.modtask = modtask;
  modtask.handleRequest= handleRequest;

  return modtask;
};

module.exports.instantiateWithConfig = function(config) {
  return initModtask(config);
}

module.exports.run = function run(config) {
  var modtask = initModtask(config);
  modtask.serverLog(`Run`, 'INFO');
  modtask.initHandlers();
  modtask.initCustomHandlers();
  modtask.initHttpHandlers();
};

module.exports.getHandleRequestInterface = function (config) {
  var modtask = initModtask(config);
  modtask.initHandlers();
  return function (req, res, method, _config) {
    return modtask.handleRequest(req, res, method, _config || config);
  };
}
