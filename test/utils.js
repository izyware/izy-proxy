var modtask = {};

var localConfigPath = '../../configs/izy-proxy/tcpserver';
var featureModulesPath = 'features/v2/';

modtask.getServerModule = function() {
  return require(__dirname + '/../server');
}

modtask.getServerConfig = function() {
  return require(localConfigPath);
}

modtask.simulateApiCall = function(path, jsonPayload) {
  if (!jsonPayload) jsonPayload = {};
  var handleRequest = modtask.getServerModule().getHandleRequestInterface(modtask.getServerConfig());
  var req = modtask.ldmod('rel:../mock/req')({
    method: 'POST',
    url: '/apigateway/:' + path,
    payload: JSON.stringify(jsonPayload)
  });
  var res = modtask.ldmod('rel:../mock/res')();
  handleRequest(req, res, {});
}

var testOutcome = function(outcome) {
  if (!outcome.success) {
    console.log('Tests failed');
    console.log(outcome.reason);
    console.log(outcome.__callstackStr);
  }
  else console.log('Tests successful');
}

modtask.simulateSocketIO = function(config) {
  var __chainProcessorConfig = require(localConfigPath).__chainProcessorConfig;
  var importProcessor = modtask.ldmod(featureModulesPath + 'chain/processors/import').sp('__chainProcessorConfig', __chainProcessorConfig.import);
  var testmod = config.testmod || '';
  if (!testmod) return testOutcome({ reason: 'bad test mod '});

  importProcessor.ldPath(testmod, function(outcome) {
    if (!outcome.success) return testOutcome({ reason: 'bad test mod: ' + outcome.reason });
    modtask.run_simulateSocketIO(config, outcome.data);
  });
}

modtask.run_simulateSocketIO = function(config, modtest) {
  var path = config.path;
  var verbose = config.verbose || {};
  modtest.processQueries(
    { action: 'socketConfig', config: config },
    function(outcome) {
      if (!outcome.success) return testOutcome(outcome);
      var incomingSocketTestConfig = outcome.data;
      var cfg = {
        verbose: verbose.mock,
        responses: incomingSocketTestConfig.responses
      };
      var testSocket = modtask.ldmod('rel:../mock/socket')(cfg);
      modtask.connectTestSocket(config, testSocket, cfg);
    }
  );
}

modtask.connectTestSocket = function(config, testSocket, testSocketConfig) {
  var path = config.path;
  var verbose = config.verbose || {};
  var shouldConnectOverSocket = config.path && config.port;

  console.log('********************************************');
  if (shouldConnectOverSocket) {
    var pluginCfg = {
      verbose: verbose,
      __chainProcessorConfig: require(localConfigPath).__chainProcessorConfig
    };

    var rootmod = require('../izymodtask/index').getRootModule();
    var socket = testSocket;
    var cfg = { handlerPath: path };
    var session = {
      systemLog: console.log,
      handler: {
        plugin: 'testSocketSystem'
      }
    };
    var chainHandlers = require(__dirname + '/../plugin/socket/handle').getChainHandlers(
      rootmod,
      pluginCfg, session, {});

    console.log('connecting to: ' + config.path + ':' + config.port + ' (tls=' + config.tls + ')');
    var sockets = {};
    rootmod.ldmod(featureModulesPath + 'chain/main').newChain({
      chainName: 'testutil',
      chainAttachedModule: rootmod,
      chainItems: [
        ['socket.connect', { ip: config.path, port: config.port, tls: config.tls, name: 'newSocket' }],
        function(chain) {
          sockets.real = chain.get('outcome').socketId;
          chain([
            ['log', 'connected: ' + sockets.real],
            ['socket.mock', testSocketConfig]
          ]);
        },
        function(chain) {
          sockets.mock = chain.get('outcome').socketId;
          chain(['socket.pipe', { s1: sockets.real, s2: sockets.mock,
            verbose: verbose.pipe
          }]);
        }
      ],
      context: {},
      chainHandlers: chainHandlers
    }, function(outcome) {
      if (!outcome.success) {
        delete outcome.chain;
        return console.log(outcome);
      }
      console.log('piping done successfully.');
    });
  } else {
    var pluginCfg = {
      verbose: verbose,
      __chainProcessorConfig: require(localConfigPath).__chainProcessorConfig
    };
    var handler = {
      plugin: {
        name: 'test'
      }
    };

    var serverRuntime = modtask.getServerModule().instantiateWithConfig(modtask.getServerConfig());
    var socket = testSocket;
    var cfg = { handlerPath: path };
    require(__dirname + '/../plugin/socket/handle').onNewConnection(socket,
      serverRuntime,
      handler,
      cfg, pluginCfg, testOutcome);
  }
}

