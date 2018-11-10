var modtask = {};
modtask.simulateApiCall = function(path, jsonPayload) {
  if (!jsonPayload) jsonPayload = {};
  var handleRequest = require(__dirname + '/../../server').getHandleRequestInterface();
  var req = modtask.ldmod('rel:../mock/req')({
    method: 'POST',
    url: '/apigateway/:' + path,
    payload: JSON.stringify(jsonPayload)
  });
  var res = modtask.ldmod('rel:../mock/res')();
  handleRequest(req, res, {});
}

var testOutcome = function(outcome) {
  if (!outcome.success) console.log('Tests failed: "' + outcome.reason + '"');
  else console.log('Tests successful');
}

modtask.simulateSocketIO = function(config) {
  var pathToCoreProxyFunctionality = 'features/v2/';
  var pkgmain = modtask.ldmod(pathToCoreProxyFunctionality + 'pkg/main');
  var testmod = config.testmod || '';
  if (!testmod) return testOutcome({ reason: 'bad test mod '});

  pkgmain.ldPath(testmod, function(outcome) {
    if (!outcome.success) return testOutcome({ reason: 'bad test mod '});
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
      var testSocket = modtask.ldmod('rel:../mock/socket')({
        verbose: verbose.mock,
        responses: incomingSocketTestConfig.responses
      });
      modtask.connectTestSocket(config, testSocket);
    }
  );
}

modtask.streamSocketUI = function(s1, s2, verbose) {
  var pipe = function(evtName, fnName) {
    console.log('pipe', evtName, '->', fnName);
    s1.on(evtName, function(p1, p2, p3) {
      if (verbose.ondata && evtName == 'data') console.log('recieved from remote socket', JSON.stringify(p1.toString()));
      s2[fnName](p1, p2, p3);
    });
    s2.on(evtName, function(p1, p2, p3) {
      if (verbose.writes && fnName == 'write') console.log('sending to remote socket', JSON.stringify(p1.toString()));
      s1[fnName](p1, p2, p3);
    });
  }

  pipe('data', 'write');
  pipe('close', 'close');
  pipe('error', 'close');
  pipe('end', 'destroy');
}

modtask.connectTestSocket = function(config, testSocket) {
  var path = config.path;
  var verbose = config.verbose || {};
  var shouldConnectOverSocket = config.path && config.port;

  console.log('********************************************');
  if (shouldConnectOverSocket) {
    console.log('connecting to: ' + config.path + ':' + config.port);
    if (config.tls) {
      const tls = require('tls');
      var stream = tls.connect(config.port, config.path);
      stream.once('secureConnect', function () {
        modtask.streamSocketUI(stream, testSocket, verbose);
      });
    } else {
      var net = require('net');
      var stream = new net.Socket();
      stream.connect(config.port, config.path);
      stream.once('connect', function () {
        modtask.streamSocketUI(stream, testSocket, verbose);
      });
    };
  } else {
    var setupHandlerMod = require(__dirname + '/../../plugin/socket/handle').setupHandlerMod;
    var sessionInfo = {
      verbose: verbose,
      sessionId: 'sessionid',
      startTime: modtask.ldmod('core/datetime').getDateTime(),
      handler: {
        plugin: {
          name: 'test'
        }
      },
      systemLog: require('../../server').modtask.serverLog
    };
    setupHandlerMod(
      {chainHandlerMod: 'configs/izy-proxy/context'},
      {handlerPath: path},
      sessionInfo,
      function (outcome) {
        if (!outcome.success) return testOutcome(outcome);
        var mod = outcome.data;
        mod.processQueries(
          {action: 'newIncoming', socket: testSocket},
          testOutcome,
          {
            session: sessionInfo
          }
        );
      });
  }
}

