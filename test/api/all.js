var queryObject = {
  data: (new Date()).toString()
};

require('../../index').newChain([
  ['chain.importProcessor', ':test/assert/chain'],
  ['chain.importProcessor', 'components/net/http:chain'],

  ['net.httprequest', { url: 'http://localhost/apigateway/:test/api/errorincb' }],
  ['assert.value', {
    __contextName__: 'error in cb should return 500',
    status: 500,
    body: 'test/api/errorincb',
    __operators__: {
      body: 'contain'
    }
  }],

  ['net.httprequest', { url: 'http://localhost/apigateway/:test/api/errorinchainitem' }],
  ['assert.value', {
    __contextName__: 'error in chain item is up to the cb for handling',
    status: 200,
    body: '"reason"',
    __operators__: {
      body: 'contain'
    }
  }],

  ['net.httprequest', { url: 'http://localhost/apigateway/:test/api/regular' }],
  ['assert.value', {
    __contextName__: 'regular raw api should return 200',
    status: 200,
    body: '"success":true',
    __operators__: {
      body: 'contain'
    }
  }],

  ['log', '*** all tests ran succesfully ***']
]);