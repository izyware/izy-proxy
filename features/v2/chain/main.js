var modtask = {};

modtask.newChain = function(cfg, _chainReturnCB) {
  var chainReturnCB = function(outcome) {
    if (chainReturnCB.blockFurtherCallbacksToChain) {
      // this could happen for example if there was a failure early that change the execution sequence
      // but some handlers just resolved their callback
      return;
    }
    chainReturnCB.blockFurtherCallbacksToChain = true;

    try {
      if (!outcome.success && !outcome.chain) outcome.chain = $chain;
      if (_chainReturnCB) _chainReturnCB(outcome);
    } catch(e) {
      return console.log('Warning. chain return function threw an exception. Capturing it here to avoid multiple calls. chainName: ', $chain.chainName);
    }
  }
  var chainContext = typeof(cfg.context) == 'object' ?  cfg.context : {};

  // doChain can be used to run chains in the same context as the caller i.e. features/v2/chain/processors/runpkg.js, taskrunner, etc.
  // If cb is provided it will be called, otherwise the caller's callback will be launched
  var $chain = function(chainItems, cb) {
    if (!cb) {
      cb = chainReturnCB;
    };
    return modtask.newChain({
      chainName: $chain.chainName + '.doChain',
      chainItems: chainItems,
      context: $chain.context,
      chainHandlers: $chain.chainHandlers
    }, cb);
  };

  var propsToAdd = {
    chainName: cfg.chainName || '',
    verbose: {
      logChainItemsBeingProcessed: false
    },
    // doChain can be used to run chains in the same context as the caller i.e. features/v2/chain/processors/runpkg.js, taskrunner, etc.
    doChain: $chain,
    newChain: modtask.newChain,
    chainReturnCB: chainReturnCB,
    set: function(key, val) {
      chainContext[key] = val;
    },
    get: function(key) {
      return chainContext[key];
    },
    registerChainItemProcessor: function() { console.log('registerChainItemProcessor_stub'); },
    chainHandlers: cfg.chainHandlers || [],
    chainItems: cfg.chainItems,
    context: chainContext
  };

  $chain.copyKeysToNewContext = function(newContext) {
    var p;
    for (p in propsToAdd) {
      newContext[p] = propsToAdd[p];
    }
  }

  $chain.copyKeysToNewContext($chain);

  // This will add the 'registerChainItemProcessor' to the $chain and update chainHandlers if necceessary
  // Will also add processChainItem
  create_processChainItemAndRegisterProcessorFunctions($chain);
  var parser = modtask.ldmod('rel:parser').sp('$chain', $chain);
  return parser.doChain(
    $chain.chainItems,
    $chain.chainReturnCB
  );
}

function create_processChainItemAndRegisterProcessorFunctions($chain) {
  $chain.chainHandlers = $chain.chainHandlers || [];
  var registerChainItemProcessor = function(chainItemProcessorFn) {
    $chain.chainHandlers.push(chainItemProcessorFn);
  }
  $chain.registerChainItemProcessor = registerChainItemProcessor;
  var processChainItem = function (chainItem, cb) {
    // ['nop', ..]
    var i = 0;
    switch (chainItem[i++]) {
      case 'registerChainItemProcessor':
        $chain.registerChainItemProcessor(chainItem[i++]);
        cb({ success: true });
        return true;
    }

    var i;
    for(i=0; i < $chain.chainHandlers.length; ++i) {
      if ($chain.verbose.logChainItemsBeingProcessed) {
        console.log('******************** processing chain item ******************************');
        console.log(chainItem);
      }
      try {
        var itemProcessedCallback = (function() {
          var fn = function(outcome) {
            if (fn.shouldNotBeCalled) {
              return $chain.chainReturnCB({ reason: 'rogue chain handler detected, calling the callback when it should not be.' });
            }
            fn.shouldNotBeCalled = true;
            // for backwards compatibility, only catch errors when { reason: ... } is passed
            // legacy implementations may send outcome as null or send an array, etc.
            if (typeof(outcome) == 'object' && !outcome.success && typeof(outcome.reason) == 'string') {
              return $chain.chainReturnCB(outcome);
            }
            cb();
          };
          return fn;
        })();

        if ($chain.chainHandlers[i](chainItem, itemProcessedCallback, $chain)) {
          return;
        } else {
          // mark this to catch rouge processors
          itemProcessedCallback.shouldNotBeCalled = true;
        }
      } catch(e) {
        return $chain.chainReturnCB({
          reason: 'a chainHandler crashed. This means that there is a poorly designed chain handler registered. The error is: ' + e.message + '. The module for the chain handler is: ' + $chain.chainHandlers[i].__myname,
          chain: $chain
        });
      }
    }
    $chain.chainReturnCB({
      reason: 'Could not find a processor for: "' + chainItem[0] + '". You may need to do ["import", ...] to resolve this issue.',
      chain: $chain
    });
    return false;
  }
  $chain.processChainItem = processChainItem;
}


