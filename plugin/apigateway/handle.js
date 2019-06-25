"use strict";

var featureModulesPath = 'features/v2/';

module.exports = function (config, pluginName) {
  var name = 'apigateway';
  var basePath = '/' + name + '/';
  return {
    success: true,
    name,
    canHandle: function(req) {
      return req.url.indexOf(basePath) === 0;
    },
    handle: function (req, res, serverObjs) {
      if (serverObjs.acceptAndHandleCORS()) return;

      var removePrefix = function(str, sub) {
        return str.substr(sub.length, str.length - sub.length);
      }

      // For security reasons we virtualize each requests's load into its own root context
      // However, the file system caching (if present) will still allow sharing of context
      var rootmod = require('izymodtask').getRootModule();
      var importProcessor = rootmod.ldmod(featureModulesPath + 'chain/processors/import').sp('__chainProcessorConfig', config.__chainProcessorConfig.import);
      // fill my namespace with usable stuff
      serverObjs[name] = {};
      serverObjs[name].ldPath = importProcessor.ldPath;
      serverObjs[name].decodeBase64Content = function(base64str) {
        return decodeBase64Content(base64str, serverObjs);
      };

      var outcome = {};
      outcome = parseClientRequest(req, config);
      var path = outcome.path;
      path = removePrefix(path, basePath);
      path = decodeURIComponent(path);

      if (config.invokePrefix && path.indexOf(config.invokePrefix) === 0) {

        var chainHandlers = [
          rootmod.ldmod(featureModulesPath + 'chain/processors/basic'),
          rootmod.ldmod(featureModulesPath + 'chain/processors/izynode').sp('__chainProcessorConfig', config.__chainProcessorConfig.izynode),
          importProcessor,
          rootmod.ldmod(featureModulesPath + 'chain/processors/runpkg')
        ];

        path = removePrefix(path, config.invokePrefix);
        return setupApiModule(path, importProcessor, config, rootmod, serverObjs, function(outcome) {
          if (outcome.success) {
            try {
              var mod = outcome.data;
              switch (mod.__apiInterfaceType) {
                case 'jsonio':
                  return rootmod.ldmod('plugin/apigateway/types/' + mod.__apiInterfaceType).handle(serverObjs, mod, chainHandlers);
                default:
                  mod.doChain = function (chainItems, _cb) {
                    if (!_cb) {
                       _cb = function (outcome) {
                         return serverObjs.sendStatus({
                           status: 500,
                           subsystem: name
                         }, mod.__myname + ' did not specify a callback for chain');
                       }
                    };
                    return rootmod.ldmod(featureModulesPath + 'chain/main').newChain({
                      chainName: mod.__myname,
                      chainAttachedModule: mod,
                      chainItems: chainItems,
                      context: mod,
                      chainHandlers: chainHandlers
                    }, _cb);
                  };
                  return mod.handle(serverObjs);
              }
            } catch (e) {
              outcome = { reason: e.message };
            }
          };
          return serverObjs.sendStatus({
            status: 500,
            subsystem: name
          }, outcome.reason);
        });
      }
      return streamBase64Content(path, serverObjs);
    }
  };
};

function setupApiModule(path, importProcessor, config, rootmod, serverObjs, cb) {
  return importProcessor.ldPath(path, function(outcome) {
    if (!outcome.success) return cb(outcome);
    try {
      var mod = outcome.data;
      var req = serverObjs.req;
      rootmod.ldmod('features/v2/auth/localfs').resolveAuthorization(req.headers['authorization'], function(outcome) {
        if (outcome.success) {
          rootmod.ldmod('features/v2/session/main').set(outcome.data);
        }
        return cb({ success: true, data: mod });
      });
    } catch (e) {
      return cb({ reason: e.message });
    }
  });
}

function parseClientRequest(req, config) {
  config = config || {};
  var outcome = {};
  var domain = req.headers.host.split(':')[0];
  var path = req.url.split('?')[0].split('#')[0];
  if (path.indexOf('/') != 0) {
    path = '/' + path;
  }
  outcome.path = path;
  outcome.domain = domain;
  return outcome;
}

var decodeBase64Content = function (base64str, serverObjs) {
  // data:image/jpg;base64,....
  var token = ';base64,';
  var index = base64str.indexOf(token);
  index += token.length;
  var base64Pixels = base64str.substr(index, base64str.length - index);
  // data:image/jpg
  var header = base64str.substr(0, index);
  // image/jpg
  var contentType = header.substr(5, header.length - 5);

  // Node < v6
  var buf = new Buffer(base64Pixels, 'base64');

  /* Node v6.0.0 and beyond
  var buf = Buffer.from(base64Pixels, 'base64');
  */
  serverObjs.res.writeHead(200, serverObjs.getCORSHeaders({'Content-Type': contentType}));
  return serverObjs.res.end(buf, 'binary');
}

var streamBase64Content = function(path, serverObjs)  {
  serverObjs.apigateway.ldPath(path, function (outcome) {
    if (outcome.success) {
      try {
        return decodeBase64Content(outcome.data.getImageUrl(), serverObjs);
      } catch(e) {
        outcome = { reason: e.message };
      }
    }
    return serverObjs.sendStatus({
      status: 500,
      subsystem: 'streamBase64Content'
    }, outcome.reason);
  });
}
