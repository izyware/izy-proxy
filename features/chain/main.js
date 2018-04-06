var modtask = {};
modtask.setupChaining = function(processChainItem, chainDone, chainContext) {
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
  if (!chainDone) chainDone  = function () {};
  if (!chainContext) chainContext = {};
  var doChain = function (_chain, callback) {
    if (!callback) callback = chainDone;
    ctrl.doChain(_chain,
      chainContext,
      chainContext["__modui"],
      callback,
      null // chain params
    );
  }
	return { success: true, doChain: doChain };
}

