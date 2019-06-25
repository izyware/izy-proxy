
function newChain(cfg, chainReturnCB) {
  var featureModulesPath = 'features/v2/';
  if (!chainReturnCB) chainReturnCB = console.log;
  try {
    var _modtaskModule = require('izymodtask').getRootModule();
    _modtaskModule.ldmod(featureModulesPath + 'chain/main').newChain({
      chainName: module.parent.filename,
      chainItems: cfg.chainItems || [],
      context: cfg.context || {},
      chainHandlers: [
        _modtaskModule.ldmod(featureModulesPath + 'chain/processors/basic'),
        _modtaskModule.ldmod(featureModulesPath + 'chain/processors/izynode').sp('__chainProcessorConfig', cfg.__chainProcessorConfig.izynode),
        _modtaskModule.ldmod(featureModulesPath + 'chain/processors/import').sp('__chainProcessorConfig', cfg.__chainProcessorConfig.import),
        _modtaskModule.ldmod(featureModulesPath + 'chain/processors/runpkg')
      ]
    }, chainReturnCB);
  } catch(e) {
    chainReturnCB( { reason: e.message });
  }
}

module.exports = {
  newChain: newChain
}