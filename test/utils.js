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
  var incomingSocketTestConfig = {
    responses: [
      ['+OK POP3 Server ready\r\n', new Buffer('USER ' + config.user + '\r\n', 'ascii')],
      ['+OK\r\n', new Buffer('PASS ' + config.pass + '\r\n', 'ascii')],
      ['+OK\r\n', new Buffer('LIST\r\n', 'ascii')],
      ['\r\n.\r\n', new Buffer('QUIT\r\n', 'ascii')]
    ]
  }
  setupHandlerMod(
    { chainHandlerMod: 'configs/izy-proxy/context' },
    { handlerPath: path },
    sessionInfo,
    function(outcome) {
    if (!outcome.success) return console.log(outcome.reason);
    outcome.data.processQueries(
      { action: 'newIncoming', socket: modtask.ldmod('rel:../mock/socket')(incomingSocketTestConfig) },
      function(outcome) {
        if (!outcome.success) console.log(outcome.reason);
      },
      {
        session: sessionInfo
      })
  });
}
