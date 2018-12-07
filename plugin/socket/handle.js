"use strict";

var modtask = {};
modtask.createServer = function(serverRuntime, handler, cfg, pluginCfg, cb) {
  var net = require('net');
  try {
    var server = net.createServer(function(socket) {
      modtask.onNewConnection(socket, serverRuntime, handler, cfg, pluginCfg);
    });
    server.on('error', (err) => {
      return cb({reason: err, data: cfg.port});
    });
    // Hmm, not working ?
    server.listen(cfg.port, function (err) {
      if (err) return cb({reason: err, data: cfg.port});
      cb({success: true, data: cfg.port});
    });
  } catch(e) {
    cb({reason: err, data: cfg.port});
  }
}

modtask.connectionCounter  = 0;
modtask.onNewConnection = function(socket, serverRuntime, handler, cfg, pluginCfg) {
  var rootmod = require('izymodtask').getRootModule();
  var dt = rootmod.ldmod('core/datetime');

  var session = {
    verbose: pluginCfg.verbose,
    sessionId: modtask.connectionCounter++,
    startTime: dt.getDateTime(),
    handler: handler,
    systemLog: serverRuntime.serverLog
  };

  setupHandlerMod(pluginCfg, cfg, session, function(outcome) {
    if (!outcome.success) {
      serverRuntime.serverLog(outcome.reason, 'ERROR', handler.plugin);
      if (socket) socket.end();
      return ;
    };
    var mod = outcome.data;
    return mod.processQueries({ action: 'newIncoming', socket: socket }, function(outcome) {
      if (!outcome.success) {
        serverRuntime.serverLog(outcome.reason, 'ERROR', handler.plugin);
        if (socket) {
          socket.end();
          socket.destroy();
        }
        return;
      };
    }, { session: session });
  });
}

module.exports = function (config, pluginName) {
  var name = 'socket';
  return {
    success: true,
    name,
    initCustomHandler: function(serverRuntime, handler) {
      var ports = config.items || [];
      var i;
      for(i=0; i < ports.length; ++i) {
        modtask.createServer(serverRuntime, handler, ports[i], config, function(outcome) {
          if (outcome.success) {
            serverRuntime.serverLog(`Listening on port ${outcome.data}`, 'INFO', handler.plugin);
          } else {
            serverRuntime.serverLog(outcome.reason, 'ERROR', handler.plugin);
          }
        });
      }
    }
  };
};

var setupHandlerMod = function(config, portCfg, session, cb) {
  // One per connection
  var rootmod = require('izymodtask').getRootModule();
  var featureModulesPath = 'features/v2/';
  var pkgmain = rootmod.ldmod(featureModulesPath + 'pkg/main');

  pkgmain.ldPath(portCfg.handlerPath, function(outcome) {
    if (!outcome.success) return cb(outcome);
    try {
      var mod = outcome.data;
      mod.doChain = function(chainItems, cb) {
        if (!cb) {
          // Optional callback function when the chain is 'returned' or errored. If no errors, outcome.success = true otherwise reason.
          cb = function() {}
        };
        return rootmod.ldmod(featureModulesPath + 'chain/main').newChain({
          name: 'socket',
          chainItems: chainItems,
          context: mod,
          chainHandlers: [
            rootmod.ldmod(featureModulesPath + 'chain/processors/basic'),
            rootmod.ldmod(featureModulesPath + 'chain/processors/izynode').sp('__chainProcessorConfig', config.__chainProcessorConfig.izynode),
            rootmod.ldmod(featureModulesPath + 'chain/processors/import').sp('__chainProcessorConfig', config.__chainProcessorConfig.import),
            rootmod.ldmod(featureModulesPath + 'chain/processors/runpkg'),
            rootmod.ldmod(featureModulesPath + '../../plugin/socket/chainprocessor').sp('session', session),
          ]
        }, cb);
      };
      return cb( { success: true, data: mod });
    } catch (e) {
      return cb({ reason : e.message });
    }
  });
}

module.exports.setupHandlerMod = setupHandlerMod;