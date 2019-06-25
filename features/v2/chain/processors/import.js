var modtask = function(chainItem, cb, $chain) {
  if (!modtask.__chainProcessorConfig) modtask.__chainProcessorConfig = {};
  modtask.cacheImportedPackagesInMemory = modtask.__chainProcessorConfig.cacheImportedPackagesInMemory;
  var i = 0;
  var params = {};
  params.action = modtask.extractPrefix(chainItem[i++]);
  switch (params.action) {
    case 'ldPath':
    case 'ldpath':
      modtask.ldPath(chainItem[i++], function(outcome) {
        if (!outcome.success) return $chain.chainReturnCB(outcome);
        cb();
      });
      return true;
      break;
    case 'deportPkgs':
    case 'deportpkgs':
      modtask.deportPkgs(chainItem[i++], function(outcome) {
        if (!outcome.success) return $chain.chainReturnCB(outcome);
        cb();
      });
      return true;
      break;
    case 'importPkgs':
    case 'importpkgs':
      modtask.importPkgs(chainItem[i++], function() {
        // hmm always returning success?
        cb();
      });
      return true;
      break;
    case 'importProcessor':
      modtask.importConfigureAndRegisterProcessor(chainItem[i++], chainItem[i++], $chain, function(outcome) {
        if (!outcome.success) return $chain.chainReturnCB(outcome);
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
modtask.deportPkgs = function(pkgs, cb) {
  modtask.__importCache = modtask.__importCache || {};
  var pkgName = pkgs[0];
  try {
    modtask.ldPkgMan().deportPackage(pkgName, function(outcome) {
      if (!outcome.success) return cb(outcome);
      delete modtask.__importCache[pkgName];
      if (modtask.__chainProcessorConfig.verbose) console.log('[chain.deportPkgs]: ' + pkgName);
      cb({ success: true });
    });
  } catch (e) {
      cb({ reason: 'Cannot deportPkgs: "' + pkgName + '": ' + e.message });
  }
  return true;
}

modtask.importPkgs = function(pkgs, cb) {
  modtask.__importCache = modtask.__importCache || {};
  var pkgName = pkgs[0];
  if (modtask.cacheImportedPackagesInMemory && modtask.__importCache[pkgName]) {
    if (modtask.__chainProcessorConfig.verbose) console.log('[chain.importPkgs] cash hit: ' + pkgName);
    return cb({
      success: true
    });
  }
  if (modtask.__chainProcessorConfig.verbose) console.log('[chain.importPkgs] cash miss: ' + pkgName);
  try {
    modtask.ldPkgMan().forceImportPackage(pkgName, function(outcome) {
      if (outcome.success) modtask.__importCache[pkgName] = true;
      cb(outcome);
    });
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

modtask.importConfigureAndRegisterProcessor = function(chainItemProcessor, __chainProcessorConfig, $chain, cb) {
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
  return cb({ reason: 'Invalid chainItemProcessor for importConfigureAndRegisterProcessor' });
}