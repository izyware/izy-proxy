var queryObject = {
  data: (new Date()).toString()
};

var test = function(cb) {
  require('../../index').newChain({
    chainItems: [
      ['chain.importProcessor', ':test/assert/chain'],
      ['//inline/:test/runpkg/uriparser'], ['assert.value', { success: true }],
      function(chain) {
        chain.newChain({
          chainHandlers: chain.chainHandlers,
          chainAttachedModule: {},
          chainItems: [
            ['//inline/nonexistent:nonexistent?nonexistent&custompackageloader=@@url']
          ]
        }, function(outcome) {
          if (outcome.reason != 'pkgloader auth token is not specified. You must configure the pkgloader.') {
            return chain(['outcome', { reason: 'expected auth failure but got: ' + outcome.reason }]);
          }
          chain(['continue']);
        });
      },
      function(chain) {
        chain.newChain({
          chainHandlers: chain.chainHandlers,
          chainAttachedModule: {},
          chainItems: [
            ['//inline/nonexistent:nonexistent?nonexistent']
          ]
        }, function(outcome) {
          if (outcome.reason != 'please define modpkgloader to enable package importing for nonexistent') {
            return chain(['outcome', { reason: 'expected setup failure but got: ' + outcome.reason }]);
          }
          chain(['continue']);
        });
      },
      ['//inline/izy-proxy/test/runpkg:mod_check_context?testAllConditions'],
      ['//inline/:test/runpkg/mod1?method1', queryObject], ['assert.value', { data: queryObject }],
      ['//localhost/:test/runpkg/mod1?method1', queryObject], ['assert.value', { data: queryObject }],
      ['//inline/:test/runpkg/mod1', queryObject], ['assert.value', { data: queryObject }],
      ['//localhost/:test/runpkg/mod1', queryObject], ['assert.value', { data: queryObject }],
      ['//inline/:test/runpkg/mod2', queryObject], ['assert.value', { data: queryObject }],
      ['//localhost/:test/runpkg/mod2', queryObject], ['assert.value', { data: queryObject }],
      ['http://localhost:80/apigateway/::test/runpkg/mod2', queryObject], ['assert.value', { data: queryObject }]
    ],
    __chainProcessorConfig: {
      __moduleSearchPaths: []
    }
  }, cb);
}

module.exports = test;