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

      // todo: consolidate with the monitoring and logging module
      var extraInfoInLogs = true;
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
        if (theMethod.constructor.name === 'AsyncFunction') {
          myMod.sp('newChainAsync', async function(chainItems) {
            return new Promise((resolve, reject) => {
              doChain([
                ['newChain', {
                  chainItems: chainItems
                }],
                function(chain) {
                  var outcome = chain.get('outcome');
                  if (outcome.success) return resolve(outcome);
                  reject({ reason: outcome.reason });
                }
              ]);
            });
          });
          return theMethod(
            queryObject,
            function() { console.log('warning cb is not used. use return instead') },
            context
          ).then(outcomeS => cb(outcomeS ? outcomeS : { success: true })).catch(outcomeF => {
            if (outcomeF instanceof Error) {
              if (extraInfoInLogs) console.log(outcomeF);
              return cb({ reason: outcomeF.toString() });
            } else if (typeof(outcomeF) == 'object') {
              if (outcomeF.message) return cb({ reason: outcomeF.message });
              if (outcomeF.reason) return cb({ reason: outcomeF.reason });
            }
            cb({ reason: String(outcomeF)})
          });
        }
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
