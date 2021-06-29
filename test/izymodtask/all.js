var izymodtaskPath = __dirname + '/../../izymodtask/index';
var izymodtask = require(izymodtaskPath);
var myJsonObject = {
  queryObject: {
    param: { 
      key1: 'val' 
    }
  }
};

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
  ['outcome', { success: true }]
]);
