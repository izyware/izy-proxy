var modtask = function(chainItem, cb, currentChainBeingProcessed) {
  var i = 0;
  var params = {};
  params.action = chainItem[i++];
  switch (params.action) {
    case 'returnOnFail':
    case 'return':
      var outcome = { reason: 'asked to return from a chain that does not have the outcome object defined. please use [set, outcome, ...] to fix this issue.' };
      if (currentChainBeingProcessed.context.outcome && typeof(currentChainBeingProcessed.context.outcome) == 'object') {
        outcome = currentChainBeingProcessed.context.outcome;
        if (outcome.success && params.action == 'returnOnFail') {
          cb();
          return true;
        }
      }
      // we wont call the cb function here.
      currentChainBeingProcessed.chainReturnCB(outcome);
      return true;
    case 'log':
      params.msg = chainItem[i++];
      console.log(params.msg);
      cb();
      return true;
    case 'newChain':
      params.chainConfig = chainItem[i++];
      var chainConfig = {
        name: currentChainBeingProcessed.name + '.' + params.chainConfig.name,
        chain: params.chainConfig.chain,
        context: params.chainConfig.context || currentChainBeingProcessed.context,
        chainHandlers: params.chainConfig.chainHandlers || currentChainBeingProcessed.chainHandlers
      };
      currentChainBeingProcessed.newChain(chainConfig, function(outcome) {
        currentChainBeingProcessed.context.outcome = outcome;
        cb();
      });
      return true;
    case 'set':
      params.key = chainItem[i++];
      params.val = chainItem[i++];
      currentChainBeingProcessed.context[params.key] = params.val;
      cb();
      return true;
    case 'continue':
    case 'nop':
      cb();
      return true;
    case 'sysview':
      require('izymodtask').getRootModule().ldmod('s_root').cmdlineverbs.sysview();
      cb();
      return true;
  }
  return false;
}
