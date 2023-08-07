
function newChain(cfg, chainReturnCB) {
  var featureModulesPath = 'rel:features/v2/';
  if (!chainReturnCB) chainReturnCB = function(outcome) {
    if (!outcome.success) {
      delete outcome.success;
      console.log('\nChain run was not successful\n');
      console.log('************************ REASON ************************');
      console.log('* ', outcome.reason);
      console.log('*********************************************************');
      console.log('\n');
      console.log('************************ CallStack *********************');
      console.log(outcome.__callstackStr);
      console.log('*********************************************************');
      console.log('\n');
      return;
    }
    delete outcome.success;
    delete outcome.__callstackStr;
    delete outcome.__callstack;
    console.log(outcome);
  }

  // Is it an array?
  if (typeof(cfg.length) == 'number') {
    cfg = {
      __chainProcessorConfig: {
        'import': {
          // ['importpkgs'] behavior. caches per chain instance
          cacheImportedPackagesInMemory: true,
          pkgloadermodname: 'samples/pkgloader/izycloud',
          pkgloadermodconfig: {
            auth: null
          },
          verbose: false
        }
      },
      chainItems: cfg,
      context: {}
    }
  }

  var callerContextModule = cfg.callerContextModule || module.parent;
  var __chainProcessorConfig = cfg.__chainProcessorConfig || {};
  try {
    var __moduleSearchPaths = __chainProcessorConfig.__moduleSearchPaths || [];
    var _modtaskModule = require('./izymodtask/index').getRootModule(__dirname, __moduleSearchPaths, cfg.forceRequireOnLoadFromFile);
    var chainAttachedModule = {
      __myname: callerContextModule.filename.replace(/\.js$/, '')
    };
    _modtaskModule.__Kernel.inheritFromModtask(_modtaskModule, chainAttachedModule);
    _modtaskModule.__Kernel.postLoadModule(_modtaskModule, chainAttachedModule, true /* dontcallinit */);
    _modtaskModule.ldmod(featureModulesPath + 'chain/main').newChain({
      chainName: callerContextModule.filename,
      chainAttachedModule: chainAttachedModule,
      chainItems: cfg.chainItems || [],
      context: cfg.context || {},
      chainHandlers: [
        _modtaskModule.ldmod(featureModulesPath + 'chain/processors/basic'),
        _modtaskModule.ldmod(featureModulesPath + 'chain/processors/izynode').sp('__chainProcessorConfig', __chainProcessorConfig.izynode),
        _modtaskModule.ldmod(featureModulesPath + 'chain/processors/import').sp('__chainProcessorConfig', __chainProcessorConfig.import),
        _modtaskModule.ldmod(featureModulesPath + 'chain/processors/runpkg').sp('__chainProcessorConfig', __chainProcessorConfig.runpkg),
        _modtaskModule.ldmod('rel:service').sp('__chainProcessorConfig', __chainProcessorConfig.service)
      ]
    }, chainReturnCB);
  } catch(e) {
    var outcome = { reason: e.message };
    if (e.stack) {
      outcome.__callstackStr = String(e.stack);
    }
    chainReturnCB(outcome);
  }
}

module.exports = function(moduleToAttach) {
  if (!moduleToAttach) moduleToAttach = module.parent;
  return {
    basePath: __dirname,
    newChain: newChain,
    series: function(chainItems, cb) {
      if (moduleToAttach.doChain) {
        return moduleToAttach.doChain([
          ['newChain', {
            chainItems: chainItems
          }],
          function(chain) {
            var outcome = chain.get('outcome');
            return cb(outcome);
          }
        ]);
      };
      return newChain({
        chainItems: chainItems,
        forceRequireOnLoadFromFile: true,
        __chainProcessorConfig: {},
        callerContextModule: moduleToAttach
      }, cb);
    }
  };
};

module.exports.basePath = __dirname;
module.exports.newChain = newChain;
module.exports.series = function(chainItems, cb) {
  return newChain({
    chainItems: chainItems,
    forceRequireOnLoadFromFile: true,
    __chainProcessorConfig: {},
    callerContextModule: module.parent
  }, cb);
};
