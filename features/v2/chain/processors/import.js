var modtask = function(chainItem, cb, $chain) {
  var registerChainItemProcessor = function(chainItemProcessor, cb) {
    switch(typeof(chainItemProcessor)) {
      case 'string':
        try {
          var featureModulesPath = 'features/v2/';
          var pkgmain = modtask.ldmod(featureModulesPath + 'pkg/main');
          pkgmain.ldPath(chainItemProcessor, function(outcome) {
            if (!outcome.success) return cb(outcome);
            var mod = outcome.data;
            // doTransition is for backwards compat
            $chain.registerChainItemProcessor(mod.doTransition ? mod.doTransition : mod);
            return cb({ success: true });
          });
        } catch (e) {
          cb({ reason: 'Cannot register chainHandlerMod: "' + chainItemProcessor + '": ' + e.message });
        }
        return ;
    }
    return cb({ reason: 'Invalid chainItemProcessor for registerChainItemProcessor' });
  }
  var i = 0;
  var params = {};
  params.action = chainItem[i++];
  var prefix = 'chain.';
  if (params.action.indexOf(prefix) != 0) return false;
  params.action = params.action.substr(prefix.length);
  switch (params.action) {
    case 'importProcessor':
      registerChainItemProcessor(chainItem[i++], function(outcome) {
        $chain.set('outcome', outcome);
        cb();
      });
      return true;
  }
  return false;
}

