
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
  var __chainProcessorConfig = cfg.__chainProcessorConfig || {};
  try {
    var __moduleSearchPaths = __chainProcessorConfig.__moduleSearchPaths || [];
    var _modtaskModule = require('./izymodtask/index').getRootModule(__dirname, __moduleSearchPaths);
    _modtaskModule.ldmod(featureModulesPath + 'chain/main').newChain({
      chainName: module.parent.filename,
      chainItems: cfg.chainItems || [],
      context: cfg.context || {},
      chainHandlers: [
        _modtaskModule.ldmod(featureModulesPath + 'chain/processors/basic'),
        _modtaskModule.ldmod(featureModulesPath + 'chain/processors/izynode').sp('__chainProcessorConfig', __chainProcessorConfig.izynode),
        _modtaskModule.ldmod(featureModulesPath + 'chain/processors/import').sp('__chainProcessorConfig', __chainProcessorConfig.import),
        _modtaskModule.ldmod(featureModulesPath + 'chain/processors/runpkg').sp('__chainProcessorConfig', __chainProcessorConfig.runpkg)
      ]
    }, chainReturnCB);
  } catch(e) {
    chainReturnCB( { reason: e.message });
  }
}

module.exports = {
  newChain: newChain,
  basePath: __dirname
}
