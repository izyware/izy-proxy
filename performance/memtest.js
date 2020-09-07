/* izy-loadobject nodejs-require */

var modtask = {};
modtask.test = function() {
  var numHits = 0;
  var config = require('../../configs/izy-proxy/tcpserver');
  modtask.doChain([
    ['net.httprequest', { 
      url: 'http://localhost:' + config.port.http + '/apigateway/:performance/memtest?respond',
      method: 'POST',
      body: JSON.stringify({}),
      resolveErrorAsStatusCode: 900
    }],
    function(chain) {
      chain(['log', chain.get('outcome').status + ' numHits ' + numHits++]);
    },
    ['replay']
  ]);
}

modtask.respond = function() {
  modtask.doChain([
    ['outcome', { success: true }]
  ]);
}

module.exports = modtask;