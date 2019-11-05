"use strict";

var featureModulesPath = 'features/v2/';

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
modtask.onNewConnection = function(socket, serverRuntime, handler, cfg, pluginCfg, cb) {
  var rootmod = require('izymodtask').getRootModule();
  var dt = rootmod.ldmod('core/datetime');
  if (!cb) {
    cb = function(outcome) {
      if (!outcome.success) {
        serverRuntime.serverLog(outcome.reason, 'ERROR', handler.plugin);
        if (socket) {
          socket.end();
          socket.destroy();
        }
      }
    }
  };
  
  var session = {
    verbose: pluginCfg.verbose,
    sessionId: 'sess_' + cfg.handlerPath + '_' + modtask.connectionCounter++,
    startTime: dt.getDateTime(),
    handler: handler,
    systemLog: serverRuntime.serverLog
  };

  var chainHandlers = module.exports.getChainHandlers(
    rootmod,
    pluginCfg,
    session, {
      newIncoming: socket
    }
  );
  var importProcessor = chainHandlers[0];
  setupHandlerMod(importProcessor, pluginCfg, cfg, session, function(outcome) {
    if (!outcome.success) return cb(outcome);
    var mod = outcome.data;
    rootmod.ldmod(featureModulesPath + 'pkg/run').runJSONIOModuleInlineWithChainFeature(
      mod,
      'newIncoming',
      { socketId: 'newIncoming' },
      { session: session },
      chainHandlers,
      cb);
  });
};

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

var setupHandlerMod = function(importProcessor, config, portCfg, session, cb) {
  // One per connection
  importProcessor.ldPath(portCfg.handlerPath, function(outcome) {
    if (!outcome.success) return cb(outcome);
    try {
      var mod = outcome.data;
      return cb( { success: true, data: mod });
    } catch (e) {
      return cb({ reason : e.message });
    }
  });
}

module.exports.onNewConnection = modtask.onNewConnection;

module.exports.getChainHandlers = function(rootmod, pluginCfg, session, sockets) {
  var ret = [
    rootmod.ldmod(featureModulesPath + 'chain/processors/import').sp('__chainProcessorConfig', pluginCfg.__chainProcessorConfig.import),
    rootmod.ldmod(featureModulesPath + 'chain/processors/basic'),
    rootmod.ldmod(featureModulesPath + 'chain/processors/izynode').sp('__chainProcessorConfig', pluginCfg.__chainProcessorConfig.izynode),
    rootmod.ldmod(featureModulesPath + 'chain/processors/runpkg').sp('__chainProcessorConfig', pluginCfg.__chainProcessorConfig.runpkg),
    rootmod.ldmod(featureModulesPath + '../../plugin/socket/chainprocessor').sp('__chainProcessorConfig', {
      session: session,
      sockets: sockets
    })
  ];
  return ret;
}
