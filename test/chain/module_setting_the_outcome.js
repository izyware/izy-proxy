var modtask = [
  ['nop'],
  ['set', 'commonkey', 'callee'],
  function(chain) {
    chain([
      ['log', 'making sure that nested chains would still set the outcome at the module level'],
      function(chain) {
        chain([['nop'], ['outcome', chain.get('queryObject')]]);
      }
    ]);
  }
];

modtask.actions = {};

modtask.actions.testMethodToCall = function(queryObject, cb, context) {
  modtask.doChain([
    ['set', 'outcome', queryObject]
  ]);
}
