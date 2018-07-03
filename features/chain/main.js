var modtask = {};

function createChainItemProcessor(chainReturnCB, initialChainItemProcessorList, chainProcessorSystem) {
  var chainHandlers = [];
  initialChainItemProcessorList = initialChainItemProcessorList || [];

  var registerChainItemProcessor = function(chainItemProcessorFn) {
    chainHandlers.push(chainItemProcessorFn);
  }

  chainProcessorSystem.registerChainItemProcessor = registerChainItemProcessor;
  chainProcessorSystem.chainReturnCB = chainReturnCB;

  var i;
  for(i=0; i < initialChainItemProcessorList.length; ++i) {
    registerChainItemProcessor(initialChainItemProcessorList[i]);
  }
  var chainItemProcessor = function (chainItem, cb) {
    // ['nop', ..]
    var udt = chainItem.udt;
    var i = 0;
    switch (udt[i++]) {
      case 'registerChainItemProcessor':
        registerChainItemProcessor(udt[i++]);
        return true;
    }

    var i;
    for(i=0; i < chainHandlers.length; ++i) {
      if (chainHandlers[i](chainItem, cb, chainProcessorSystem)) return;
    }
    chainReturnCB({
      reason: 'Could not find a processor for chain item: "' + udt[0] + '". You may need to do ["import", ...] to resolve this issue.'
    });
    return false;
  }
  return chainItemProcessor;
}


modtask.createProcessor = function(chainReturnCB, chainContextObject, initialChainItemProcessorList) {

  var chainProcessorSystem = {};

  if (!chainContextObject) return { reason: 'Please specify a valid chainContextObject' };
  var outcome = modtask.setupChaining(
    createChainItemProcessor(chainReturnCB, initialChainItemProcessorList, chainProcessorSystem),
    chainContextObject
  );
  if (outcome.success) {
    chainProcessorSystem.doChain = outcome.doChain;
    return { success: true, chainProcessorSystem: chainProcessorSystem };
  } else {
    return outcome;
  }
}



modtask.setupChaining = function(processChainItem, chainContext) {
	if (modtask.doTransition) {
		return { reason: 'Already used. please reload ' + modtask.__myname + ' everytime to create a new chain ' };
	} else {
		// rel:transition references modtask.__modtask.doTransition. fix that
		// It also callls processChainItem 'doTransition' 
		modtask.doTransition = processChainItem;
	}

  modtask.moderr = modtask.ldmod('rel:err/bare');
  var ctrl = modtask.ldmod('rel:transition').sp('modcontroller', {
    moddyn: modtask.ldmod('rel:dyn'),
    moderr: modtask.moderr
  });
  if (!chainContext) chainContext = {};
  var doChain = function (_chain, chainReturnCB) {
    ctrl.doChain(_chain,
      chainContext,
      chainContext["__modui"],
      chainReturnCB
    );
  }
	return { success: true, doChain: doChain };
}

