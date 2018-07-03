var modtask = function(chainItem, cb, chainProcessorSystem) {
  // chainItem.udt = ['nop', p2, ...]
  // chainItem.chainContext = chainContext
  // return value:
  //    true if processed (regardless of failure or success) -- communicate that via chainContext.outcome
  //    false if not handled and need to continue
  // For the handled items, the chain will block until cb() is called
  var udt = chainItem.udt;
  var i = 0;
  var params = {};
  params.action = udt[i++];
  switch (params.action) {
    case 'returnOnFail':
    case 'return':
      var outcome = { reason: 'asked to return from a chain that does not have the outcome object defined. please use [set, outcome, ...] to fix this issue.' };
      if (chainItem.chainContext.outcome && typeof(chainItem.chainContext.outcome) == 'object') {
        outcome = chainItem.chainContext.outcome;
        if (outcome.success && params.action == 'returnOnFail') {
          cb(chainItem);
          return true;
        }
      }
      // we wont call the cb function here.
      chainProcessorSystem.chainReturnCB(outcome);
      return true;
    case 'log':
      params.msg = udt[i++];
      console.log(params.msg);
      cb(chainItem);
      return true;
    case 'set':
      params.key = udt[i++];
      params.val = udt[i++];
      chainItem.chainContext[params.key] = params.val;
      cb(chainItem);
      return true;
    case 'continue':
    case 'nop':
      cb(chainItem);
      return true;
    case 'sysview':
      require('izymodtask').getRootModule().ldmod('s_root').cmdlineverbs.sysview();
      cb(chainItem);
      return true;
  }
  return false;
}
