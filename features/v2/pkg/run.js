var modtask = function() {}

modtask.runJSONIOModuleInlineWithChainFeature = function(myMod, methodToCall, queryObject, context, chainHandlers, cb) {
  var chainMain = modtask.ldmod('rel:../chain/main');
  if (!methodToCall) methodToCall = 'processQueries';
  var wrapError = function(reason) {
    var outcome = { reason: reason };
    chainMain.addStackTrace(outcome, {
      module: moduleName,
      chainItem: [],
      chainindex: 1,
      executionContext: 'chainHandler'
    });
    return cb(outcome);
  };

  try {
    var moduleName = myMod.__myname;
    var theMethod = myMod[methodToCall];
    if (!theMethod) {
      if (typeof(myMod.actions) == 'object') {
        theMethod = myMod.actions[methodToCall];
      }
    };

    if (!theMethod && methodToCall != 'processQueries') {
      return wrapError('"' + moduleName + '" does not implement method: ' + methodToCall);
    }

    if (theMethod) {
      var doChain = chainMain.newChain({
        chainName: moduleName,
        chainItems: [],
        context: {},
        chainHandlers: chainHandlers,
        chainAttachedModule: myMod
      }, cb, true);

      myMod.sp('doChain', doChain);
      return theMethod(
        queryObject,
        cb,
        context
      );
    } else {
      return chainMain.newChain({
        chainName: moduleName,
        chainItems: myMod,
        context: {
          queryObject: queryObject,
          context: context
        },
        chainHandlers: chainHandlers,
        chainAttachedModule: myMod
      }, cb);
    }
  } catch (e) {
    return wrapError(e.message);
  }
}
