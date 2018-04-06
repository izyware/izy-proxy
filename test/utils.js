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

