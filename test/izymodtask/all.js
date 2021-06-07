var izymodtask = require('../../izymodtask/index');
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
  ['outcome', { success: true }]
]);
