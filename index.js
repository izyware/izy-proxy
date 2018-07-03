
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

function setupNewContextAndDoChain(chain, chainReturnCB, chainContextObject) {
  try {
    var _modtaskModule = require('izymodtask').getRootModule();
    var chainFeaturePath = 'features/chain';

    if (!chainContextObject) chainContextObject = _modtaskModule;
    var outcome = _modtaskModule.ldmod(chainFeaturePath + '/main').createProcessor(chainReturnCB,
      chainContextObject,
      [
        _modtaskModule.ldmod(chainFeaturePath + '/processors/basic'),
        _modtaskModule.ldmod(chainFeaturePath + '/processors/import'),
        _modtaskModule.ldmod(chainFeaturePath + '/processors/runpkg')
      ]);
    if (!outcome.success) return chainReturnCB(outcome);
    return outcome.chainProcessorSystem.doChain(chain, chainReturnCB);
  } catch(e) {
    console.log('internal error: ', e);
  }
}

module.exports = {
  doChain: setupNewContextAndDoChain
}