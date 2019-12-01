
function testV3() {
  var callStackLength = 5;
  var chainContext = {};
  var chainItems = [
    ['log', 'Settings chain property should write into the chainContext object'],
    ['set', 'property1', 'value1'], (chain) => chain(['log', chainContext.property1]),

    ['log', 'test callstack feature'],
    function(chain) {
      chain.newChain({
        chainName: 'fakeModule',
        context: {},
        chainHandlers: chain.chainHandlers,
        chainAttachedModule: { __myname: 'fakeModule'},
        chainItems: [
          ['//inline/izy-proxy/test/chain/nestedfailures', { counter: callStackLength - 2 }]
        ]
      }, function(outcome) {
        if (outcome.__callstack.length != callStackLength) return chain(['outcome', {
          reason: 'expected __callstack of length ' + callStackLength + ' but got ' + outcome.__callstack.length
        }]);
        chain(['continue']);
      });
    },

    ['log', 'nonexitent launch on chain will catch and exit'],
    ['set', 'outcome', { success: true }],
    function(chain) {
      chain.newChain({
        chainName: 'fakeModule',
        context: {},
        chainHandlers: chain.chainHandlers,
        chainAttachedModule: { __myname: 'fakeModule'},
        chainItems: [
          ['//inline/izy-proxy/test/module_that_does_not_exist'],
          // chain should exit before getting to this
          ['set', 'outcome', { success: true }]
        ]
      }, function(outcome) {
        if (outcome.success) {
          return chain([
            ['set', 'outcome', { reason: 'expected module_that_does_not_exist to generate non-success outcome.' }],
            ['return']
          ]);
        };
        chain(['continue']);
      });
    },

    ['log', '/// launch pattern should fail even if the module path is valid'],
    ['set', 'outcome', { success: true }],
    function(chain) {
      chain.newChain({
        chainName: 'fakeModule',
        context: {},
        chainHandlers: chain.chainHandlers,
        chainAttachedModule: { __myname: 'fakeModule'},
        chainItems: [
          ['///izy-proxy/test/chain/module_setting_the_outcome', {
            success: true,
            reason: 'just testing'
          }]
        ]
      }, function(outcome) {
        if (outcome.success) {
          return chain([
            ['set', 'outcome', { reason: 'expected /// to fail' }],
            ['return']
          ]);
        };
        chain(['continue']);
      });
    },

    ['log', 'bad url should fail'],
    function(chain) {
      chain.newChain({
        chainName: 'fakeModule',
        context: {},
        chainHandlers: chain.chainHandlers,
        chainAttachedModule: { __myname: 'fakeModule'},
        chainItems: [
          ['//badaddr/izy-proxy/test/module_that_does_not_exist'],
          // chain should exit before getting to this
          ['set', 'outcome', { success: true }]
        ]
      }, function(outcome) {
        if (outcome.success) {
          return chain([
            ['set', 'outcome', { reason: 'expected bad url to generate non-success outcome.' }],
            ['return']
          ]);
        };
        chain(['continue']);
      });
    },

    ['log', 'only outcome key should be copied back and the rest should remain isolated'],
    ['set', 'commonkey', 'caller'],
    ['//inline/izy-proxy/test/chain/module_setting_the_outcome', {
      success: true,
      reason: 'just testing'
    }],
    function(chain) {
      if (!chain.get('outcome').success || chain.get('outcome').reason != 'just testing') return chain(['outcome', { reason: 'module_setting_the_outcome is expected to set the outcome' }]);
      if (chain.get('commonkey') != 'caller') return chain(['outcome', { reason: 'commonkey should remain isolated' }]);
      return chain(['set', 'outcome', { success: true }]);
    },

    ['//inline/izy-proxy/test/chain:module_setting_the_outcome?testMethodToCall', {
      success: true
    }],

    ['log', 'test getter/setter'],
    ['set', 'testKey', 'testValue'],
    ($chain) => {
      if ($chain.get('testKey') != 'testValue') {
        $chain.set('outcome', { reason: 'set/getValue failed' });
        $chain(['return']);
      } else {
        $chain(['continue']);
      }
    },

    ['log', 'test delay'],
    ['delay', 500],
    ['log', 'after delay']
  ];

  require('../../index').newChain({
    chainItems: chainItems,
    context: chainContext,
    __chainProcessorConfig: {},
  }, function (outcome) {
    if (outcome.success) return console.log('* All items ran successfully');
    console.log('\r\n************************************ ERRROR *********************************************');
    console.log(outcome.reason);
    console.log('--- CallStack ---');
    console.log(outcome.__callstackStr);
    console.log('*********************************************************************************');
  });
}

testV3();