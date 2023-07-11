
function testV3(testCB) {
  var verbose = false;
  var lineLogged = '';
  const monitoringConfig = { 
    testEventKey: true,
    monitoringIngestionService: queryObject => lineLogged = queryObject.line
  };
  const service = {
    invokeString: '//inline/izy-proxy/test/chain/servicemodule'
  }
  var callStackLength = 5;
  var chainContext = {};
  var chainItems = [
    (!verbose) ? ['nop'] : ['log', 'Settings chain property should write into the chainContext object'],
    ['set', 'property1', 'value1'], (chain) => chain((!verbose) ? ['nop'] : ['log', chainContext.property1]),

    (!verbose) ? ['nop'] : ['log', 'test callstack feature'],
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
        if (outcome.__callstack.length != callStackLength) return testCB({
          reason: 'expected __callstack of length ' + callStackLength + ' but got ' + outcome.__callstack.length
        });
        chain(['continue']);
      });
    },

    (!verbose) ? ['nop'] : ['log', 'nonexitent launch on chain will catch and exit'],
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
          return testCB({ reason: 'expected module_that_does_not_exist to generate non-success outcome.' });
        };
        chain(['continue']);
      });
    },

    (!verbose) ? ['nop'] : ['log', 'methodCallContextObjectsProvidedByChain and monitoringConfig'],
    chain => chain(['newChain', {
      context: {
        methodCallContextObjectsProvidedByChain: { 
          service,
          monitoringConfig,
          myVariable: 'test'
        },
        monitoringConfig
      },
      chainItems: [
        chain => chain([service.invokeString + '?setupInstance'])
      ]
    }]),
    chain => {
      const outcome = chain.get('outcome');
      if (!outcome.success) return testCB(outcome);
      if (lineLogged != '[//inline/izy-proxy/t] {.. }(izy-proxy/test/chain/servicemodule?setupInstance)  test') return testCB({
        reason: 'invalid lineLogged: "' + lineLogged + '"'
      });
      chain(['continue']);
    },
    (!verbose) ? ['nop'] : ['log', '/// launch pattern should fail even if the module path is valid'],
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
          return testCB({ reason: 'expected /// to fail' });
        };
        chain(['continue']);
      });
    },

    (!verbose) ? ['nop'] : ['log', 'bad url should fail'],
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
          return testCB({ reason: 'expected bad url to generate non-success outcome.' });
        };
        chain(['continue']);
      });
    },

    (!verbose) ? ['nop'] : ['log', 'only outcome key should be copied back and the rest should remain isolated'],
    ['set', 'commonkey', 'caller'],
    ['//inline/izy-proxy/test/chain/module_setting_the_outcome', {
      success: true,
      reason: 'just testing'
    }],
    function(chain) {
      if (!chain.get('outcome').success || chain.get('outcome').reason != 'just testing') 
        return testCB({ reason: 'module_setting_the_outcome is expected to set the outcome' });
      if (chain.get('commonkey') != 'caller') 
        return testCB({ reason: 'commonkey should remain isolated' });
      return chain(['set', 'outcome', { success: true }]);
    },

    ['//inline/izy-proxy/test/chain:module_setting_the_outcome?methodSettingOutcome', {
      success: true
    }],
    function(chain) {
      if (!chain.get('outcome').success) 
        return testCB({ reason: 'module_setting_the_outcome?methodSettingOutcome is expected to set the outcome' });
      chain(['continue']);
    },

    ['//inline/izy-proxy/test/chain:module_setting_the_outcome?methodCallingCB', {
      success: true
    }],
    function(chain) {
      if (!chain.get('outcome').success) 
        return testCB({ reason: 'module_setting_the_outcome?methodCallingCB is expected to set the outcome' });
      chain(['continue']);
    },

    (!verbose) ? ['nop'] : ['log', 'test getter/setter'],
    ['set', 'testKey', 'testValue'],
    ($chain) => {
      if ($chain.get('testKey') != 'testValue') {
        return testCB({ reason: 'set/getValue failed' });
      } else {
        $chain(['continue']);
      }
    },

    (!verbose) ? ['nop'] : ['log', 'delay and replay loop'],
    function(chain) {
      var startts = (new Date()).getTime();
      var i = 0;
      var sleepTime = 200;
      var totalTime = 1000;
      chain.newChain({
        chainName: 'fakeModule',
        context: {},
        chainHandlers: chain.chainHandlers,
        chainAttachedModule: { __myname: 'fakeModule'},
        chainItems: [
          ['nop'],
          function(chain) {
            if (i++ < totalTime / sleepTime) {
              chain((!verbose) ? ['nop'] : ['log', 'sleep for ' + sleepTime + ', iteration ' + i]);
            } else {
              chain([
                ['set', 'outcome', { success: true }],
                ['return']
              ]);
            }
          },
          ['delay', sleepTime],
          (!verbose) ? ['nop'] : ['log', 'after delay'],
          ['replay']
        ]
      }, function(outcome) {
        if (outcome.success) {
          if ((new Date()).getTime() - startts < totalTime) {
            outcome = { reason: 'exitted sooner than expected' };
          }
        }
        if (!outcome.success) return testCB(outcome);
        chain(['continue']);
      });
    },
    (!verbose) ? ['nop'] : ['log', 'test delay'],
    ['delay', 500],
    (!verbose) ? ['nop'] : ['log', 'after delay'],
    function(chain) {
      var importArrCfgTest = 'import' + new Date().getTime();
      require('../../index').newChain({
        chainItems: [
          [`//inline/inline:inline?inline`, {}]
        ],
        __chainProcessorConfig: { import: [importArrCfgTest, importArrCfgTest, importArrCfgTest] }
      }, function(outcome) {
        if (outcome.success) return testCB({ reason: 'expected to fail' });
        if (outcome.reason.indexOf('not exist: ' + importArrCfgTest) == -1) return testCB({ reason: 'expected processing of importarr' });
        chain(['continue']);
      });
    }
  ];

  require('../../index').newChain({
    chainItems: chainItems,
    context: chainContext,
    __chainProcessorConfig: {},
  }, testCB);
}

function test(cb) {
  var finalOutcome = null;
  testV3(function(outcome) {
    finalOutcome = outcome;
  });

  var startTime = (new Date()).getTime();
  var delta = function() { return (new Date()).getTime() - startTime; };
  var maxDelay = 5;
  function monitor() {
    if (delta() < maxDelay * 1000) {
      if (!finalOutcome) return setTimeout(monitor, 1000);
      cb(finalOutcome);
    } else {
      cb({ reason: 'timeout' });
    }
  };
  monitor();
}

module.exports = test;
