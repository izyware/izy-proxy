var modtask = function(chain) {
  var taskToRun = chain.get('queryObject');
  var progress = 1;
  chain([
    ['chain.importProcessor', 'apps/tasks/api:task_chain', taskToRun],
    ['log', 'running tests ....'],
    ['task.progress', progress++],

    ['chain.importProcessor', 'components/net/http:chain'],
    ['chain.importProcessor', 'izy-proxy/test/assert:chain'],

    ['task.progress', progress++],

    function(chain) {
      url = 'http://izyware.com/' + 'apigateway/:ui/ide:cloudstorage/api';
      chain(['net.httprequest', {
        url: url,
        method: 'POST',
        body: JSON.stringify({
          action: 'incrementalLoadPkg',
          pkgName: 'izy-proxy/test/assert',
          auth: 'invalid_auth_token'
        }),
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        }
      }]);
    },
    function(chain) {
      chain(['assert.value', {
        __verbose__: {
          // testCondition: true
        },
        __contextName__: 'izy-proxy API plug-in ' + url,
        __operators__: {
          success: 'equal',
          status: 'equal',
          body: 'contain'
        },
        success: true,
        status: 200,
        body: 'Authorization failure'
      }]);
    },
    ['set', 'outcome', { success: true, reason : 'total tests ' + progress}]
  ]);
}