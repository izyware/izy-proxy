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
  ['log', 'support self loading izymodtask'],
  function(chain) {
    console.log('Get Root Module');
    var mod = izymodtask.getRootModule(__dirname).ldmod(izymodtaskPath);
    chain(['set', 'outcome', typeof(mod.jsonToFlat) ]);
  },
  ['assert.value', 'function'],
  ['outcome', { success: true }]
]);
