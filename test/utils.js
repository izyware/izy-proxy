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

modtask.simulateSocketIO = function(config) {
  var path = config.path;
  var verbose = config.verbose || {};
  var testmod = config.testmod;
  
  var testOutcome = function(outcome) {
    if (!outcome.success) console.log('Tests failed: "' + outcome.reason + '"');
    else console.log('Tests successful');
  }

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
  console.log('********************************************');

  setupHandlerMod(
    { chainHandlerMod: 'configs/izy-proxy/context' },
    { handlerPath: path },
    sessionInfo,
    function(outcome) {
      if (!outcome.success) return testOutcome(outcome);
      var mod = outcome.data;
      modtask.ldmod(testmod).processQueries(
        { action: 'socketConfig', config: config },
        function(outcome) {
          if (!outcome.success) return testOutcome(outcome);
          var incomingSocketTestConfig = outcome.data;
          var testSocket = modtask.ldmod('rel:../mock/socket')(incomingSocketTestConfig);
          mod.processQueries(
            { action: 'newIncoming', socket: testSocket },
            testOutcome,
            {
              session: sessionInfo
            }
          );
        }
      );
  });
}
