/* izy-loadobject nodejs-require */
module.exports = (function() {
  var modtask = function() {}
  modtask.runJSONIOModuleInlineWithChainFeature = function(myMod, methodToCall, queryObject, context, chainHandlers, cb) {
    var chainMain = modtask.ldmod('rel:../chain/main');
    var methodCallOptionsObj = {};
    if (typeof(methodToCall) == 'object') {
      methodCallOptionsObj = methodToCall.methodCallOptionsObj;
      methodToCall = methodToCall.methodToCall;
    }
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
        if (methodCallOptionsObj.methodnotfoundstatus) {
          return cb({ success: true, status: methodCallOptionsObj.methodnotfoundstatus });
        }
        return wrapError('"' + moduleName + '" does not implement method: ' + methodToCall);
      }

      var doChain = chainMain.newChain({
        chainName: moduleName,
        chainItems: [],
        context: {
          queryObject: queryObject,
          context: context
        },
        chainHandlers: chainHandlers,
        chainAttachedModule: myMod
      }, cb, true);
      myMod.sp('doChain', doChain);

      if (theMethod) {
        return theMethod(
          queryObject,
          cb,
          context
        );
      } else {
        doChain(myMod, cb);
      }
    } catch (e) {
      return wrapError(e.message);
    }
  }

  modtask.parseMethodOptionsFromInvokeString = function(invokeString) {
    var methodToCall = '';
    var methodCallOptions = '';
    var methodCallOptionsObj = {};

    if (invokeString.indexOf('?') > -1) {
      var options = invokeString.split('?');
      invokeString = options[0];
      methodToCall = options[1] + '';
    };

    if (methodToCall.indexOf('&') > -1) {
      var options = methodToCall.split('&');
      methodToCall = options[0];
      options.shift();
      methodCallOptions = options.join('&');
      for (var i=0; i < options.length; ++i) {
        var option = options[i];
        if (option.indexOf('=') >= 0) {
          option = option.split('=');
          methodCallOptionsObj[option[0]] = option[1];
        }
      }
    }
    return {
      invokeString: invokeString,
      methodToCall: methodToCall,
      methodCallOptions: methodCallOptions,
      methodCallOptionsObj: methodCallOptionsObj
    };
  }
  return modtask;
})();
