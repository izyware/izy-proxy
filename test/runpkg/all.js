var queryObject = {
  data: (new Date()).toString()
};

require('../../index').newChain([
  ['chain.importProcessor', ':test/assert/chain'],
  ['//inline/izy-proxy/test/runpkg:mod_check_context?testAllConditions'],
  ['//inline/:test/runpkg/mod1?method1', queryObject], ['assert.value', { data: queryObject }],
  ['//localhost/:test/runpkg/mod1?method1', queryObject], ['assert.value', { data: queryObject }],
  ['//inline/:test/runpkg/mod1', queryObject], ['assert.value', { data: queryObject }],
  ['//localhost/:test/runpkg/mod1', queryObject], ['assert.value', { data: queryObject }],
  ['//inline/:test/runpkg/mod2', queryObject], ['assert.value', { data: queryObject }],
  ['//localhost/:test/runpkg/mod2', queryObject], ['assert.value', { data: queryObject }],
  ['log', '*** all tests ran succesfully ***']
]);