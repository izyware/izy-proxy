var queryObject = {
  data: (new Date()).toString()
};

var test = function(cb) {
  require('../../index').newChain([
    ['chain.importProcessor', ':test/assert/chain'],
    ['//inline/:test/runpkg/uriparser'], ['assert.value', { success: true }],
    ['//inline/izy-proxy/test/runpkg:mod_check_context?testAllConditions'],
    ['//inline/:test/runpkg/mod1?method1', queryObject], ['assert.value', { data: queryObject }],
    ['//localhost/:test/runpkg/mod1?method1', queryObject], ['assert.value', { data: queryObject }],
    ['//inline/:test/runpkg/mod1', queryObject], ['assert.value', { data: queryObject }],
    ['//localhost/:test/runpkg/mod1', queryObject], ['assert.value', { data: queryObject }],
    ['//inline/:test/runpkg/mod2', queryObject], ['assert.value', { data: queryObject }],
    ['//localhost/:test/runpkg/mod2', queryObject], ['assert.value', { data: queryObject }]
  ], cb);
}

module.exports = test;