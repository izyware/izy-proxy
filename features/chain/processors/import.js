var modtask = function(chainItem, cb, chainProcessorSystem) {

  var registerChainItemProcessor = function(chainItemProcessor, cb) {
    switch(typeof(chainItemProcessor)) {
      case 'string':
        try {
          var mod = modtask.ldmod(chainItemProcessor);
          // doTransition is for backwards compat
          chainProcessorSystem.registerChainItemProcessor(mod.doTransition ? mod.doTransition : mod);
          return cb({ success: true });
        } catch (e) {
          cb({ reason: 'Cannot register chainHandlerMod: "' + chainItemProcessor + '": ' + e.message });
        }
        return ;
    }
    return cb({ reason: 'Invalid chainItemProcessor for registerChainItemProcessor' });
  }


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
  var prefix = 'chain.';
  if (params.action.indexOf(prefix) != 0) return false;
  params.action = params.action.substr(prefix.length);
  switch (params.action) {
    case 'importProcessor':
      registerChainItemProcessor(udt[i++], function(outcome) {
        var chainContext = udt[i++] || chainItem.chainContext;
        chainContext.outcome = outcome;
        cb(chainItem);
      });
      return true;
  }
  return false;
}

