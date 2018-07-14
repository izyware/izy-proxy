var modtask = {};

modtask.newChain = function(cfg, _chainReturnCB) {
  var chainReturnCB = function(outcome) {
    try {
      if (!outcome.success && !outcome.chain) outcome.chain = currentChainBeingProcessed;
      if (_chainReturnCB) _chainReturnCB(outcome);
    } catch(e) {
      console.log('Warning. chain return function threw an exception. Capturing it here to avoid multiple calls.');
    }
  }
  var chainContext = typeof(cfg.context) == 'object' ?  cfg.context : {};
  var currentChainBeingProcessed = {
    name: cfg.name || 'noname',
    verbose: {
      logChainItemsBeingProcessed: false
    },
    // doChain is used in features/v2/chain/processors/runpkg.js
    doChain: function(chain, cb) {
      return modtask.newChain({ context: cfg.context, chain: chain }, cb);
    },
    newChain: modtask.newChain,
    chainReturnCB: chainReturnCB,

    registerChainItemProcessor: function() { console.log('registerChainItemProcessor_stub'); },
    chainHandlers: cfg.chainHandlers || [],
    chain: cfg.chain,
    context: chainContext
  };
  // This will add the 'registerChainItemProcessor' to the currentChainBeingProcessed and update chainHandlers if necceessary
  // Will also add processChainItem
  create_processChainItemAndRegisterProcessorFunctions(currentChainBeingProcessed);
  var parser = modtask.ldmod('rel:parser').sp('currentChainBeingProcessed', currentChainBeingProcessed);
  return parser.doChain(
    currentChainBeingProcessed.chain,
    currentChainBeingProcessed.chainReturnCB
  );
}

function create_processChainItemAndRegisterProcessorFunctions(currentChainBeingProcessed) {
  currentChainBeingProcessed.chainHandlers = currentChainBeingProcessed.chainHandlers || [];
  var registerChainItemProcessor = function(chainItemProcessorFn) {
    currentChainBeingProcessed.chainHandlers.push(chainItemProcessorFn);
  }
  currentChainBeingProcessed.registerChainItemProcessor = registerChainItemProcessor;
  var processChainItem = function (chainItem, cb) {
    // ['nop', ..]
    var i = 0;
    switch (chainItem[i++]) {
      case 'registerChainItemProcessor':
        currentChainBeingProcessed.registerChainItemProcessor(chainItem[i++]);
        return true;
    }

    var i;
    for(i=0; i < currentChainBeingProcessed.chainHandlers.length; ++i) {
      if (currentChainBeingProcessed.verbose.logChainItemsBeingProcessed) {
        console.log('******************** processing chain item ******************************');
        console.log(chainItem);
      }
      try {
        if (currentChainBeingProcessed.chainHandlers[i](chainItem, cb, currentChainBeingProcessed)) return;
      } catch(e) {
        return currentChainBeingProcessed.chainReturnCB({
          reason: 'a chainHandler crashed. This means that there is a poorly designed chain handler registered. The error is: ' + e.message + '. The module for the chain handler is: ' + currentChainBeingProcessed.chainHandlers[i].__myname,
          chain: currentChainBeingProcessed
        });
      }
    }
    currentChainBeingProcessed.chainReturnCB({
      reason: 'Could not find a processor for: "' + chainItem[0] + '". You may need to do ["import", ...] to resolve this issue.',
      chain: currentChainBeingProcessed
    });
    return false;
  }
  currentChainBeingProcessed.processChainItem = processChainItem;
}


