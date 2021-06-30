var modtask = [
  ['nop'],
  ['set', 'commonkey', 'callee'],
  function(chain) {
    var verbose = false;
    chain([
      (!verbose) ? ['nop'] : ['log', 'making sure that nested chains would still set the outcome at the module level'],
      function(chain) {
        chain([['nop'], ['outcome', chain.get('queryObject')]]);
      }
    ]);
  }
];

modtask.actions = {};

modtask.actions.methodSettingOutcome = function(queryObject, cb, context) {
  modtask.doChain([
    ['set', 'outcome', queryObject]
  ]);
}

modtask.actions.methodCallingCB = function(queryObject, cb, context) {
  return cb(queryObject);
}