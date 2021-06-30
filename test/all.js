var errFunction = function(outcome) {
  if (!outcome.success) {
    console.log('\r\n************************************ ERRROR *********************************************');
    console.log(outcome.reason);
    console.log('--- CallStack ---');
    console.log(outcome.__callstackStr);
    console.log('*********************************************************************************');
  }
};

var allChainTests = './chain/all.js';
var mode = process.argv[2] || 'core';
var mods = [allChainTests, './izymodtask/all.js'];
if (mode == 'all') {
  mods.push('./api/all.js');
  mods.push('./runpkg/all.js');
} else if (mode == 'core') {

} else {
  mods = [mode]
}

var testByChains = function(_mods) {
  var actions = [];
  for(var _i=0; _i < _mods.length; ++_i) {
    (function(i) {
      actions.push(['log', testPrefix + 'testing: ' + _mods[i]]);
      actions.push(function(chain) {
        require(_mods[i])(function(outcome) {
          if (!outcome.success) return chain(['outcome', outcome]);
          chain(['continue']);
        });
      });
    })(_i);
  }
  actions.push(['outcome', { success: true }]);
  require('../index').newChain(actions, function(outcome) {
    if (!outcome.success) return errFunction(outcome);
    console.log(testPrefix + 'ALL TESTS PASSED');
  });
}


var testPrefix = '[test] ';
console.log(testPrefix + 'mods: ' + mods.join(','));

if (mods[0] == allChainTests) {
  console.log(testPrefix + 'testing: chain/all (mandatory)');
  require('./chain/all.js')(function(outcome) {
      if (!outcome.success) return errFunction(outcome);
      testByChains(mods.slice(1));
  });
} else {
  testByChains(mods);
}