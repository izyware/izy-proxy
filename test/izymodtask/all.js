var izymodtaskPath = __dirname + '/../../izymodtask/index';
var forcemodulereloadPath = __dirname + '/../../features/v2/chain/parser';
var izymodtask = require(izymodtaskPath);
var myJsonObject = {
  queryObject: {
    param: { 
      key1: 'val' 
    }
  }
};

var test = function(cb) {
  require('../../index').newChain([
    ['chain.importProcessor', ':test/assert/chain'],
    ['set', 'outcome', izymodtask.flatToJSON({ 'queryObject.param.key1' : 'val' })],
    ['assert.value', myJsonObject],
    ['set', 'outcome', izymodtask.jsonToFlat(myJsonObject)],
    ['assert.value', { 'queryObject.param.key1': 'val' }],
    function(chain) {
      var mod = izymodtask.getRootModule(__dirname).ldmod(izymodtaskPath);
      chain(['set', 'outcome', typeof(mod.jsonToFlat) ]);
    },
    function(chain) {
      var mod = izymodtask.getRootModule(__dirname).ldmod(izymodtaskPath);
      chain(['set', 'outcome', { Kernel: typeof(mod.__Kernel), INLINESTORE: typeof(mod.__Kernel.INLINESTORE) } ]);
    },
    ['assert.value', { Kernel: 'object', INLINESTORE: 'object' }],

    function(chain) {
      var root = izymodtask.getRootModule(__dirname);
      var mod = root.ldmod(izymodtaskPath);
      mod.__testProperty = 1;
      mod = root.ldmod(izymodtaskPath);
      chain(['set', 'outcome', { __testProperty: mod.__testProperty } ]);
    },
    ['assert.value', {
      __contextName__: 'setting property on non forcemodulereload should stick',
      __testProperty: 1
    }],

    function(chain) {
      var root = izymodtask.getRootModule(__dirname);
      var mod = root.ldmod(forcemodulereloadPath);
      mod.__testProperty = 1;
      mod = root.ldmod(forcemodulereloadPath);
      chain(['set', 'outcome', { __testProperty: mod.__testProperty } ]);
    },
    ['assert.value', {
      __contextName__: 'setting property on forcemodulereload should not',
      __testProperty: undefined
    }],

    ['outcome', { success: true }]
  ], cb);
};

module.exports = test;
