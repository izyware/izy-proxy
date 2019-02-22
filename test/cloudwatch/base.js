var modtask = function(chain) {
  var query = chain.get('config').query || {};
  var state = {
    url: 'http://localhost/'
  }

  var url = '';
  var rel = modtask.ldmod('kernel/path').rel;
  var progress = 1;
  chain([
    ['log', 'running tests ....'],
    ['task.progress', progress++],
    ['chain.importProcessor', 'components/net/http:chain'],
    ['chain.importProcessor', 'izy-proxy/test/assert:chain'],

    function(chain) {
      url = state.url + '';
      chain(['net.httprequest', {
        url: url
      }]);
    },
    function(chain) {
      chain(['assert.value', {
        __verbose__: {
          // testCondition: true
        },
        __contextName__: 'izy-proxy circus plugin ' + url,
        __operators__: {
          success: 'equal',
          status: 'equal',
          body: 'contain'
        },
        success: true,
        status: 200,
        body: 'this-domain-is-connected-to-izyware'
      }]);
    },
    ['ROF'],

    function(chain) {
      url = state.url + '7fe2de1a5c919314f6f5dcfeb94a91ec4195d200';
      chain(['net.httprequest', {
        url: url
      }]);
    },
    function(chain) {
      chain(['assert.value', {
        __verbose__: {
          // testCondition: true
        },
        __contextName__: 'izy-proxy HTTP plug-in ' + url,
        __operators__: {
          success: 'equal',
          status: 'equal',
          body: 'contain'
        },
        success: true,
        status: 200,
        body: 'Total HTTP services: '
      }]);
    },
    ['ROF'],


    function(chain) {
      url = state.url + 'apigateway/:ui/ide:cloudstorage/api';
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
    ['ROF'],

    function(chain) {
      url = state.url + 'izyproxystatus';
      return chain(['net.httprequest', {
        url: url
      }]);
    },
    function(chain) {
      chain(['assert.value', {
        __contextName__: 'izy-proxy core server status ' + url,
        __operators__: {
          success: 'equal',
          status: 'equal'
          // reason: 'contain'
        },
        success: true,
        status: 200
      }]);
    },
    ['ROF'],
    ['task.outcome', { success: true, reason : 'total tests ' + progress}]
  ]);
}