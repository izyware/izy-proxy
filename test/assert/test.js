var test = function(cb) {
  var testObj = { 
    a: { success: true },
    b: { status: 202, reason: 'i will do it' },
    events: { 
      'w.a': 1,
      'c.g': 6
    },
    xhrs: [],
    idtoken: '03acdab81062b406',
  };
  require('../../index').newChain({
    chainItems: [
      ['chain.importProcessor', ':test/assert/chain'],
      ['set', 'outcome', testObj],
      ['assert.value', {
        __verbose__: {
          testCondition: false,
          testeeObj: false
        },
        __operators__: {
          idtoken: 'same length',
        },
        idtoken: '54ce0ab0717cc26c',
        a: { success: true },
        b: {
          __operators__: {
            status: 'equal',
            reason: 'contain'
          },
          status: 202,
          reason: 'will'
        },
        events: {
          'c.g' : 1,
          __operators__: {
            'c.g': 'greater than'
          }
        }
      }],
    ],
    __chainProcessorConfig: {
      __moduleSearchPaths: []
    }
  }, cb);
}

module.exports = test;
