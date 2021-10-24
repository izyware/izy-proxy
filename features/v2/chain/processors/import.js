/* izy-loadobject nodejs-require */
module.exports = function() {
  var modtask = function(chainItem, cb, $chain) {
    if (!modtask.__chainProcessorConfig) modtask.__chainProcessorConfig = {};
    var i = 0;
    var params = {};
    params.action = modtask.extractPrefix(chainItem[i++]);
    switch (params.action) {
      case '__chainProcessorConfig':
        var __chainProcessorConfig = chainItem[i++];
        if (typeof(__chainProcessorConfig) != 'object') return $chain.chainReturnCB({ reason: '__chainProcessorConfig must be an object'});
        modtask.__chainProcessorConfig = __chainProcessorConfig;
        $chain.set('outcome', { success: true });
        cb();
        return true;
        break;
      case 'moduleSearchPathAdd':
        var moduleSearchPath = chainItem[i++];
        if (typeof(moduleSearchPath) == 'string') {
          modtask.__Kernel.rootModule.usermodule.__moduleSearchPaths.push(moduleSearchPath);
        }
        $chain.set('outcome', { success: true, data: modtask.__Kernel.rootModule.usermodule.__moduleSearchPaths });
        cb();
        return true;
        break;
      case 'ldPath':
      case 'ldpath':
        modtask.ldPath(chainItem[i++], function(outcome) {
          if (!outcome.success) return $chain.chainReturnCB(outcome);
          $chain.set('outcome', outcome);
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
        modtask.importPkgs(chainItem[i++], chainItem[i++], function(outcome) {
          if (!outcome.success) return $chain.chainReturnCB(outcome);
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
    var all = ['chain.', 'frame_', 'import.'];
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

  modtask.importPkgs = function(pkgs, custompackageloader, cb) {
    if (typeof(pkgs) != 'object' || pkgs.length != 1) {
      return cb({ reason: 'importpkgs only accepts and array of length 1' });
    }
    modtask.__importCache = modtask.__importCache || {};
    var pkgName = pkgs[0];
    if (modtask.__chainProcessorConfig.cacheImportedPackagesInMemory && modtask.__importCache[pkgName]) {
      if (modtask.__chainProcessorConfig.verbose) console.log('[chain.importPkgs] cash hit: ' + pkgName);
      return cb({
        success: true
      });
    }
    if (modtask.__chainProcessorConfig.verbose) console.log('[chain.importPkgs] cash miss: ' + pkgName);
    try {
      modtask.ldPkgMan(custompackageloader).forceImportPackage(pkgName, function(outcome) {
        if (outcome.success) modtask.__importCache[pkgName] = true;
        cb(outcome);
      });
    } catch (e) {
      var outcome = { reason: 'Cannot importPkgs: "' + pkgName + '": ' + e.message };
      if (modtask.__chainProcessorConfig.verbose) console.log('[chain.importPkgs] error: ' + outcome.reason);
      cb(outcome);
    }
  }

  modtask.ldPkgMan = function(custompackageloader) {
    var cfg = modtask.__chainProcessorConfig;
    if (custompackageloader) {
      if (custompackageloader.indexOf('@') > -1) {
        cfg = custompackageloader.split('@');
      } else {
        cfg = [null, null, custompackageloader];
      }
    };

    if (Array.isArray(cfg)) {
      cfg = {
        pkgloadermodconfig: {
          auth: cfg[0],
          url: cfg[2]
        },
        pkgloadermodname: cfg[1] || 'samples/pkgloader/izycloud'
      };
    } else {
      if (typeof(cfg) != 'object') cfg = {};
    }

    var modpkgloader = null;
    if (cfg.pkgloadermodname) {
      if (!cfg.pkgloadermodconfig) cfg.pkgloadermodconfig = {};
      modpkgloader = modtask.ldmod(cfg.pkgloadermodname);
      var p;
      for (var p in cfg.pkgloadermodconfig) {
        modpkgloader.sp(p, cfg.pkgloadermodconfig[p]);
      }
    }
    return modtask.ldmod('rel:../../pkg/main').sp('verbose', cfg.verbose).sp('modpkgloader', modpkgloader);
  }

  modtask.__chainProcessorConfig = {
    verbose: false
  };

  modtask.importConfigureAndRegisterProcessor = function(chainItemProcessor, __chainProcessorConfig, $chain, cb) {
    switch(typeof(chainItemProcessor)) {
      case 'string':
        try {
          var modname = chainItemProcessor;
          if (modname.indexOf('rel:') == 0) {
            var destinationObj = $chain.chainAttachedModule || {};
            if (!destinationObj.ldmod) return cb({
                reason: 'rel: specified in the chain.importProcessor, but the context is not a module. (' + modname + ')'
            });
            modname = destinationObj.ldmod('kernel/path').rel(modname.substr(4, modname.length-4));
          }
          modtask.ldPkgMan().ldPath(modname, function(outcome) {
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

  // Manatory for modules that are used in building the bootstrapers or statically linked components
  modtask.__$d = ['rel:../../pkg/main'];

  return modtask;
};

module.exports.forcemodulereload = true;
