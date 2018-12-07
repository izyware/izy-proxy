var modtask = function(chainItem, cb, $chain) {
  if (!modtask.__chainProcessorConfig) modtask.__chainProcessorConfig = {};
  modtask.cacheImportedPackagesInMemory = modtask.__chainProcessorConfig.cacheImportedPackagesInMemory;

  var registerChainItemProcessor = function(chainItemProcessor, __chainProcessorConfig, cb) {
    switch(typeof(chainItemProcessor)) {
      case 'string':
        try {
          modtask.ldPkgMan().ldPath(chainItemProcessor, function(outcome) {
            if (!outcome.success) return cb(outcome);
            var mod = outcome.data;
            mod.__chainProcessorConfig = __chainProcessorConfig || {};
            // doTransition is for backwards compat
            $chain.registerChainItemProcessor(mod.doTransition ? mod.doTransition : mod);
            return cb({ success: true });
          });
        } catch (e) {
          cb({ reason: 'Cannot register chainItemProcessor: "' + chainItemProcessor + '": ' + e.message });
        }
        return ;
    }
    return cb({ reason: 'Invalid chainItemProcessor for registerChainItemProcessor' });
  }
  var i = 0;
  var params = {};
  params.action = modtask.extractPrefix(chainItem[i++]);
  switch (params.action) {
    case 'ldPath':
    case 'ldpath':
      modtask.ldPath(chainItem[i++], function(outcome) {
        $chain.set('outcome', outcome);
        cb();
      });
      return true;
      break;
    case 'importPkgs':
    case 'importpkgs':
      modtask.importPkgs(chainItem[i++], function() {
        $chain.set('outcome', {
          success: true
        });
        cb();
      });
      return true;
      break;
    case 'importProcessor':
      registerChainItemProcessor(chainItem[i++], chainItem[i++], function(outcome) {
        $chain.set('outcome', outcome);
        cb();
      });
      return true;
  }
  return false;
}

modtask.extractPrefix = function(str) {
  var all = ['chain.', 'frame_'];
  for(var i=0; i < all.length; ++i) {
    var prefix = all[i];
    if (str.indexOf(prefix) == 0) {
      return str.substr(prefix.length);
    }
  }
  return str;
}

modtask.ldPath = function(path, cb) {
  try {
    modtask.ldPkgMan().ldPath(path, cb);
  } catch (e) {
    cb({ reason: 'Cannot ldPath: "' + path + '": ' + e.message });
  }
}

modtask.cacheImportedPackagesInMemory = false;
modtask.importPkgs = function(pkgs, cb) {
  modtask.__importCache = modtask.__importCache || {};
  var pkgName = pkgs[0];
  if (modtask.cacheImportedPackagesInMemory && modtask.__importCache[pkgName]) {
    console.log('WARNING (importPkgs), using the cache version for: ' + pkgName);
    return cb({
      success: true
    });
  };
  try {
    modtask.ldPkgMan().importPackge(pkgName, cb);
  } catch (e) {
    cb({ reason: 'Cannot importPkgs: "' + pkgName + '": ' + e.message });
  }
}

modtask.ldPkgMan = function() {
  var cfg = modtask.__chainProcessorConfig || {};
  if (!cfg.pkgloadermodname) {
    throw new Error('processors.import cannot find a package loader. you must specify a pkgloader in the configuration');
  }
  if (!cfg.pkgloadermodconfig) cfg.pkgloadermodconfig = {};
  var modpkgloader = modtask.ldmod(cfg.pkgloadermodname);

  var p;
  for(var p in cfg.pkgloadermodconfig) {
    modpkgloader.sp(p, cfg.pkgloadermodconfig[p]);
  }
  var featureModulesPath = 'features/v2/';
  return modtask.ldmod(featureModulesPath + 'pkg/main').sp('verbose', modtask.__chainProcessorConfig.verbose).sp('modpkgloader', modpkgloader);
}

modtask.__chainProcessorConfig = {
  verbose: false
};
