/* izy-loadobject nodejs-require */
module.exports = (function() {
  var modtask = () => {};

  modtask.setupInstance = (queryObject, cb, context) => {
    const { datastreamMonitor } = modtask;
    datastreamMonitor.log({ key: 'testEventKey', msg: {
      data: context.myVariable
    }});
    // nested newChain 
    modtask.doChain([
      ['newChain', {
        context: {
          detectModuleReuseAcrossChains: 'error'
        },
        chainItems: [
          ['//inline/?callFromNestedNewChain', { expectedBehavior: 'non-copy' }]
        ]
      }],
      chain => {
        const outcome = chain.get('outcome');
        if (!outcome.success) return cb(outcome);
        chain(['continue']);
      },
      ['newChain', {
        context: 'copy',
        chainItems: [
          ['//inline/?callFromNestedNewChain', { expectedBehavior: 'copy' }]
        ]
      }],
      chain => {
        const outcome = chain.get('outcome');
        if (!outcome.success) return cb(outcome);
        chain(['continue']);
      },
      ['outcome', { success: true, randomProperty: 'randomPropertyValue' }]
    ]);
  };

  modtask.callFromNestedNewChain = async (queryObject, cb, context) => {
    switch(queryObject.expectedBehavior) {
      case 'copy':
        if (context.myVariable) return { success: true }; else return { reason: 'did not copy but should have' };
        break;
      default:
        if (!context.myVariable) return { success: true }; else return { reason: 'did  copy but should not have' };
        break;
    }
  }

  modtask.canBeInstantiatedAcrossChainContexts = true;

  return modtask;
})();
