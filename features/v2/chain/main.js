var modtask = {};

modtask.wrapChainReturnCB = function(_chainReturnCB, $chain) {
  var chainReturnCB = function(outcome) {
    if (chainReturnCB.blockFurtherCallbacksToChain) {
      // this could happen for example if there was a failure early that change the execution sequence
      // but some handlers just resolved their callback
      return;
    }
    chainReturnCB.blockFurtherCallbacksToChain = true;

    try {
      if (!outcome.success && !outcome.chain) outcome.chain = $chain;

      //
      // If chain processing was successful (i.e. parser successfully processed everything), report context.outcome ...
      // Not going this would
      //  * require everyone to add a ['return'] to the end of every chain to pump the outcome to the CB which is annoying
      //  * make for a better stacktrace because the place where things failed at would be shown, not ['ROF']
      if (outcome.success) {
        var contextOutcome = $chain.get('outcome');
        if (typeof(contextOutcome) != 'object') contextOutcome = { reason: 'WARNING, returning from a chain that did not have the "outcome" property set.' };
        outcome = contextOutcome;
      }

      $chain.addStackTrace(outcome, {
        module: $chain.chainName,
        chainItem: $chain.chainItemBeingProcessed.chainItem,
        chainindex: $chain.chainItemBeingProcessed.chainindex,
        dynamicEval: $chain.chainItemBeingProcessed.dynamicEval,
        executionContext: 'chainItem'
      });

      if (_chainReturnCB) _chainReturnCB(outcome);
    } catch(e) {
      return console.log('Warning. chain return function threw an exception. Capturing it here to avoid multiple calls. chainName: ', $chain.chainName, ' error: ', e.message);
    }
  }
  return chainReturnCB;
}

modtask.newChain = function(cfg, _chainReturnCB, doNotRun) {
  var chainContext = typeof(cfg.context) == 'object' ?  cfg.context : {};

  // should this be deprecated?
  var $chain = function(chainItems, cb) {
    if (!cb) {
      cb = chainReturnCB;
    };
    return modtask.newChain({
      chainName: $chain.chainName + '.chainRunner (--- this is deprecated ---)',
      chainItems: chainItems,
      context: $chain.context,
      chainHandlers: $chain.chainHandlers
    }, cb);
  };

  var chainReturnCB = modtask.wrapChainReturnCB(_chainReturnCB, $chain);

  var newChainForProcessor = function(processorModule, next, __context, chainItems) {
    return newChainForModule(processorModule, function(outcome) {
      if (!outcome.success) return $chain.chainReturnCB(outcome);
      next();
    }, __context, chainItems);
  }

  var newChainForModule = function(module, cb, __context, chainItems) {
    return $chain.newChain({
      chainName: module.__myname,
      context: __context,
      chainHandlers: $chain.chainHandlers,
      chainAttachedModule: module,
      chainItems: chainItems
    }, cb);
  }

  var propsToAdd = {
    chainName: cfg.chainName || '',
    verbose: {
      logChainItemsBeingProcessed: false
    },

    doChain: function() {
      chainReturnCB({ reason: '$chain.doChain is deprecated. Use newChainForModule/Processor instead' });
    },
    newChainForProcessor: newChainForProcessor,
    newChainForModule: newChainForModule,
    newChain: modtask.newChain,
    chainReturnCB: chainReturnCB,
    addStackTrace: modtask.addStackTrace,
    set: function(key, val) {
      chainContext[key] = val;
    },
    get: function(key) {
      return chainContext[key];
    },
    registerChainItemProcessor: function() { console.log('registerChainItemProcessor_stub'); },
    chainHandlers: cfg.chainHandlers || [],
    chainItems: cfg.chainItems,
    context: chainContext,
    chainAttachedModule: cfg.chainAttachedModule
  };

  $chain.copyKeysToNewContext = function(newContext) {
    var p;
    for (p in propsToAdd) {
      newContext[p] = propsToAdd[p];
    }
  }

  $chain.copyKeysToNewContext($chain);
  create_processChainItemAndRegisterProcessorFunctions($chain);
  var doChain = modtask.ldmod('rel:parser').sp('$chain', $chain).doChain;

  if (doNotRun) {
    return function(chainItems, cb) {
      if (!cb) {
        cb = _chainReturnCB;
      };
      return doChain(chainItems, modtask.wrapChainReturnCB(cb, $chain));
    }
  } else {
    return doChain($chain.chainItems, $chain.chainReturnCB);
  }
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

modtask.addStackTrace = function(outcome, callStackItem) {
  if (!outcome.__callstack) outcome.__callstack = [];
  if (!outcome.__callstackStr) outcome.__callstackStr = '';
  outcome.__callstack.push(callStackItem);
  var pad = function(str, n) {
    while (str.length < n) str += ' ';
    return str;
  }
  outcome.__callstackStr += '\r\n* ' + pad(callStackItem.module, 70) + ' ';
  switch(callStackItem.executionContext) {
    case 'chainHandler' :
      outcome.__callstackStr += ' *CHAIN HANDLER* trying to process ';
      break;
    case 'chainItem':
    default:
      if (callStackItem.dynamicEval) {
        outcome.__callstackStr += ' function at chain index ' + (callStackItem.chainindex * 1 + 1) + ' immediately following';
      } else {
        outcome.__callstackStr += ' chain index ' + callStackItem.chainindex;
      }
      break;
  }
  outcome.__callstackStr += ' [' + callStackItem.chainItem + ']';
}


