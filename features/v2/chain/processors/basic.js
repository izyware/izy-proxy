var modtask = function(chainItem, cb, $chain) {
  var i = 0;
  var params = {};
  params.action = chainItem[i++];
  switch (params.action) {
    case 'returnOnFail':
    case 'return':
      var outcome = $chain.get('outcome') || { reason: 'asked to return from a chain that does not have the outcome object defined. please use [set, outcome, ...] to fix this issue.' };
      if (outcome.success && params.action == 'returnOnFail') {
        cb();
        return true;
      }
      // we wont call the cb function here.
      $chain.chainReturnCB(outcome);
      return true;
    case 'log':
      console.log('[' + $chain.chainName + '] ' + chainItem[i++]);
      cb();
      return true;
    case 'newChain':
      params.chainConfig = chainItem[i++];
      var chainConfig = {
        chainName: $chain.chainName + '.' + params.chainConfig.chainName,
        chainItems: params.chainConfig.chainItems,
        context: params.chainConfig.context || $chain.context,
        chainHandlers: params.chainConfig.chainHandlers || $chain.chainHandlers
      };
      $chain.newChain(chainConfig, function(outcome) {
        $chain.set('outcome', outcome);
        cb();
      });
      return true;
    case 'set':
      $chain.set(chainItem[i++], chainItem[i++]);
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