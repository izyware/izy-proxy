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
      var rootmod = require('../../izymodtask/index').getRootModule();
      var importProcessor = rootmod.ldmod(featureModulesPath + 'chain/processors/import').sp('__chainProcessorConfig', config.__chainProcessorConfig.import);
      // fill my namespace with usable stuff
      serverObjs[name] = {};
      serverObjs[name].ldPath = importProcessor.ldPath;

      var outcome = {};
      outcome = parseClientRequest(req, config);
      var path = outcome.path;
      path = removePrefix(path, basePath);
      path = decodeURIComponent(path);

      var methodOutcome = rootmod.ldmod(featureModulesPath + 'pkg/run').parseMethodOptionsFromInvokeString(path);
      var methodToCall = methodOutcome.methodToCall;
      var methodCallOptions = methodOutcome.methodCallOptions;
      path = methodOutcome.invokeString;

      if (config.invokePrefix && path.indexOf(config.invokePrefix) === 0) {
        path = removePrefix(path, config.invokePrefix);

        var chainHandlers = [
          rootmod.ldmod(featureModulesPath + 'chain/processors/basic'),
          rootmod.ldmod(featureModulesPath + 'chain/processors/izynode').sp('__chainProcessorConfig', config.__chainProcessorConfig.izynode),
          importProcessor,
          rootmod.ldmod(featureModulesPath + 'chain/processors/runpkg')
        ];

        return setupApiModule(path, importProcessor, config, rootmod, serverObjs, function(outcome) {
          if (outcome.success) {
            try {
              var mod = outcome.data;
              if (mod.handle) {
                return rootmod.ldmod('plugin/apigateway/types/rawhttp').handle(rootmod, serverObjs, mod, chainHandlers);
              } else {
                return rootmod.ldmod('plugin/apigateway/types/jsonio').handle(
                  serverObjs, mod, chainHandlers, methodToCall);
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
      return serverObjs.sendStatus({
        status: 404,
        subsystem: name
      }, 'api endpoint');
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
  var path = req.url;
  if (path.indexOf('/') != 0) {
    path = '/' + path;
  }
  outcome.path = path;
  outcome.domain = domain;
  return outcome;
}
