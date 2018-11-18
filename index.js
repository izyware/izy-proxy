
function createChainItemProcessor(finalCb, previousChainItemProcessor) {
  var chainHandlers = [];

  var registerChainItemProcessor = function(chainItemProcessorFn) {
    chainHandlers.push(chainItemProcessorFn);
  }

  //registerChainItemProcessor(chainItemProcessor.basic);
  // if (previousChainItemProcessor) registerChainItemProcessor(previousChainItemProcessor);
  var chainItemProcessor = function (chainItem, cb) {
    // ['nop', ..]
    var udt = chainItem.udt;
    var i = 0;
    switch (udt[i++]) {
      case 'return':
        var outcome = { reason: 'returned from a chain that does not have the outcome object defined. please use [set, outcome, ...] to fix this issue.' };
        if (chainItem.chainContext.outcome && typeof(chainItem.chainContext.outcome) == 'object') {
          outcome = chainItem.chainContext.outcome;
        }
        // we wont call the cb function here.
        return finalCb(outcome);
        return true;
      case 'registerChainItemProcessor':
        registerChainItemProcessor(udt[i++]);
        return true;
    }
    var i;
    for(i=0; i < chainHandlers.length; ++i) {
      if (chainHandlers[i](chainItem, cb)) return;
    }
    finalCb({
      reason: 'Could not find a processor for chain item: "' + udt[0] + '". You may need to do ["import", fn|string] to resolve this issue.'
    });
    return false;
  }
  return chainItemProcessor;
}

function newChain(chainItems, chainReturnCB, context) {
  var featureModulesPath = 'features/v2/';
  if (!chainReturnCB) chainReturnCB = console.log;
  try {
    var _modtaskModule = require('izymodtask').getRootModule();
    if (!context) context = {};
    _modtaskModule.ldmod(featureModulesPath + 'chain/main').newChain({
      chainName: 'root',
      chainItems: chainItems,
      context: context,
      chainHandlers: [
        _modtaskModule.ldmod(featureModulesPath + 'chain/processors/basic'),
        _modtaskModule.ldmod(featureModulesPath + 'chain/processors/izynode').sp('__chainProcessorConfig', context.izynode),
        _modtaskModule.ldmod(featureModulesPath + 'chain/processors/import').sp('__chainProcessorConfig', context.import),
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