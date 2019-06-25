"use strict";

var featureModulesPath = 'features/v2/';
module.exports = function (config, pluginName) {
  var name = 'http';
  var healthcheckpath = '/7fe2de1a5c919314f6f5dcfeb94a91ec4195d200';
  var rootmod = require('izymodtask').getRootModule();
  var modHeader = rootmod.ldmod(featureModulesPath + 'html/headers');
  var cloudServices = [];
  var verbose = config.verbose || { cloudServices: false };

  var getImportProcessor = function(_rootmod) {
    return _rootmod.ldmod(featureModulesPath + 'chain/processors/import').sp(
      '__chainProcessorConfig', config.__chainProcessorConfig.import);
  }

  var getChainHandlers = function(_rootmod) {
    return [_rootmod.ldmod(featureModulesPath + 'chain/processors/basic'),
      _rootmod.ldmod(featureModulesPath + 'chain/processors/izynode').sp('__chainProcessorConfig', config.__chainProcessorConfig.izynode),
      getImportProcessor(_rootmod),
      _rootmod.ldmod(featureModulesPath + 'chain/processors/runpkg')
    ];
  };

  var syncCloudServiceConfig = function(cb) {
    if (verbose.cloudServices) console.log('syncing cloud service config');
    rootmod.ldmod(featureModulesPath + 'chain/main').newChain({
      chainName: 'httphandle',
      chainAttachedModule: rootmod,
      chainItems: [
        '//inline/' + featureModulesPath + '../../plugin/http/api?load', {}
      ],
      context: {},
      chainHandlers: getChainHandlers(rootmod)
    }, function(outcome) {
      if (!outcome.success) {
        if (verbose.cloudServices) {
          console.log(outcome.reason, outcome.__callstackStr);
        }
        return cb(outcome);
      }
      cloudServices = outcome.data;
      if (verbose.cloudServices) console.log('cloudServices', cloudServices);
      return cb({ success: true });
    });
  };

  var fn = function() {
    syncCloudServiceConfig(function() {
      if (config.reloadInterval) {
        setTimeout(fn, config.reloadInterval*1000);
      }
    });
  }
  fn();

  return {
    success: true,
    name,
    canHandle: function(req, sessionObjs) {
      sessionObjs = sessionObjs || {};
      sessionObjs.parsed = modHeader.parseClientRequest(req, config);
      if (sessionObjs.parsed.path == healthcheckpath) return true;
      for(var i = 0; i < cloudServices.length; ++i) {
        var matched = false;
        var dm1 = cloudServices[i].domain, dm2 = sessionObjs.parsed.domain;
        if (dm1.indexOf('*.') == 0) {
          dm1 = dm1.substr(1);
          matched = (dm2.indexOf(dm1) == dm2.length - dm1.length);
        } else {
          matched = (dm1 == dm2);
        }
        if (matched) {
          sessionObjs.cloudService = cloudServices[i];
          return true;
        }
      }
      return false;
    },
    handle: function (req, res, serverObjs, sessionObjs) {
      if (sessionObjs.parsed.path == healthcheckpath) {
        return serverObjs.sendStatus({
          status: 200,
          subsystem: name
        }, 'Total HTTP services: ' + cloudServices.length);
      }
      try {
        var _rootmod = require('izymodtask').getRootModule();
        getImportProcessor(_rootmod).ldPath(sessionObjs.cloudService.handlerMod, function(outcome) {
          try {
            if (outcome.success) {
              var mod = outcome.data;
              mod.doChain = function (chainItems, _cb) {
                if (!_cb) {
                  _cb = function (outcome) {
                    return serverObjs.sendStatus({
                      status: 500,
                      subsystem: name
                    }, mod.__myname + ' did not specify a callback for chain');
                  }
                };
                return _rootmod.ldmod(featureModulesPath + 'chain/main').newChain({
                  chainName: mod.__myname,
                  chainAttachedModule: mod,
                  chainItems: chainItems,
                  context: mod,
                  chainHandlers: getChainHandlers(_rootmod)
                }, _cb);
              };
              return mod.handle(serverObjs);
            }
          } catch (e) {
            outcome = {reason: e.message};
          }
          return serverObjs.sendStatus({
            status: 500,
            subsystem: name
          }, outcome.reason);
        });
      } catch(e) {
        return serverObjs.sendStatus({
          status: 500,
          subsystem: name
        }, e.message);
      }
    }
  };
};
