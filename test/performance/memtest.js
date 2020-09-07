/* izy-loadobject nodejs-require */

var modtask = {};
modtask.test = function() {
  var numHits = 0;
  var config = require('../../../configs/izy-proxy/tcpserver');
  modtask.doChain([
    ['net.httprequest', { 
      url: 'http://localhost:' + config.port.http + '/apigateway/:test/performance/memtest?respond',
      method: 'POST',
      body: JSON.stringify({}),
      resolveErrorAsStatusCode: 900
    }],
    function(chain) {
      var outcome = chain.get('outcome');
      chain(['log', `${numHits++}, ${outcome.status} ${outcome.responseText}`]);
    },
    ['replay']
  ]);
}

modtask.respond = function() {
  modtask.doChain([
    ['outcome', { success: true, data: process.__masterMetrics }]
  ]);
}

module.exports = modtask;