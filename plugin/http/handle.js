"use strict";

var pathToCoreProxyFunctionality = 'features/v2/';
module.exports = function (config, pluginName) {
  var name = 'http';
  var rootmod = require('izymodtask').getRootModule();
  var modHeader = rootmod.ldmod(pathToCoreProxyFunctionality + 'html/headers');
  var cloudServices = [];
  var verbose = config.verbose || { cloudServices: true };

  var syncCloudServiceConfig = function(cb) {
    if (verbose.cloudServices) console.log('syncing cloud service config');
    setupMod(pathToCoreProxyFunctionality + '../../plugin/http/api', config, {}, function (outcome) {
      if (!outcome.success) return cb(outcome);
      var mod = outcome.data;
      mod.processQueries({action: 'load'}, function (outcome) {
        if (!outcome.success) return cb(outcome);
        cloudServices = outcome.data;
        if (verbose.cloudServices) console.log('cloudServices', cloudServices);
        return cb({ success: true });
      })
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
      for(var i = 0; i < cloudServices.length; ++i) {
        if (sessionObjs.parsed.domain == cloudServices[i].domain) {
          sessionObjs.cloudService = cloudServices[i];
          return true;
        }
      }
      return false;
    },
    handle: function (req, res, serverObjs, sessionObjs) {
      setupMod(sessionObjs.cloudService.handlerMod, config, {}, function (outcome) {
        try {
          if (outcome.success) {
            return outcome.data.handle(serverObjs);
          }
        } catch (e) {
          outcome = {reason: e.message};
        }
        return serverObjs.sendStatus({
          status: 500,
          subsystem: name
        }, outcome.reason);
      });
    }
  };
};


var setupMod = function(path, config, session, cb) {
  // One per connection
  var rootmod = require('izymodtask').getRootModule();
  var pkgmain = rootmod.ldmod(pathToCoreProxyFunctionality + 'pkg/main');
  pkgmain.ldPath(path, function(outcome) {
    if (!outcome.success) return cb(outcome);
    try {
      var mod = outcome.data;
      mod.doChain = function(chainItems, cb) {
        if (!cb) {
          // Optional callback function when the chain is 'returned' or errored. If no errors, outcome.success = true otherwise reason.
          cb = function() {}
        };
        return rootmod.ldmod(pathToCoreProxyFunctionality + 'chain/main').newChain({
          name: 'socket',
          chainItems: chainItems,
          context: mod,
          chainHandlers: [
            rootmod.ldmod(pathToCoreProxyFunctionality + 'chain/processors/basic'),
            rootmod.ldmod(pathToCoreProxyFunctionality + 'chain/processors/import'),
            rootmod.ldmod(pathToCoreProxyFunctionality + 'chain/processors/runpkg'),
            // this should define frame_getnode, frame_importpkgs chain handlers
            // see README file section on how to test this configuration via test/api in a deployed environment
            rootmod.ldmod(config.chainHandlerMod),
            // rootmod.ldmod(pathToCoreProxyFunctionality + '../../plugin/socket/chainprocessor').sp('session', session),
          ]
        }, cb);
      };
      return cb( { success: true, data: mod });
    } catch (e) {
      return cb({ reason : e.message });
    }
  });
}