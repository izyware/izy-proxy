/* izy-loadobject nodejs-require */
module.exports = (function() {
  var modtask = function() {}
  modtask.runJSONIOModuleInlineWithChainFeature = function(myMod, methodToCall, queryObject, methodCallContextObject, chainHandlers, cb, $launcherChain) {
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

      var launcherChainContext = {}; 
      if ($launcherChain && $launcherChain.context) launcherChainContext = $launcherChain.context;

      var methodCallContextObjectsProvidedByChain = launcherChainContext.methodCallContextObjectsProvidedByChain;
      if (methodCallContextObjectsProvidedByChain) {
        for(var p in methodCallContextObjectsProvidedByChain) {
          methodCallContextObject[p] = methodCallContextObjectsProvidedByChain[p];
        }
      }

      var monitoringConfig = launcherChainContext.monitoringConfig;
      if (monitoringConfig) {
        var service = {};
        if (methodCallContextObjectsProvidedByChain) service = methodCallContextObjectsProvidedByChain.service || {};
        myMod.datastreamMonitor = myMod.ldmod('lib/monitoring').createForMethodCallLogging(monitoringConfig, {
            module: moduleName,
            method: methodToCall,
            service: service
        });
        myMod.storeLib = myMod.ldmod('lib/globals');
        myMod.storeLib.setupGlobals();
      };

      var newChainContext = {};
      if ($launcherChain) {
        newChainContext = $launcherChain.generateChainContextWhenNewChainForModule('copy');
      }
      // ----------------------- start buggy region
      // the following mixes up method call object with chain context. probably a bug 
      newChainContext.queryObject = queryObject;
      newChainContext.context = methodCallContextObject;
      // ----------------------- end buggy region

      // todo: consolidate with the monitoring and logging module
      var extraInfoInLogs = true;
      var doChain = chainMain.newChain({
        chainName: moduleName,
        chainItems: [],
        context: newChainContext,
        chainHandlers: chainHandlers,
        chainAttachedModule: myMod
      }, cb, true);

      var detectModuleReuseAcrossChains = newChainContext.detectModuleReuseAcrossChains;
      if (detectModuleReuseAcrossChains) {
        // error, warning
        var moduleReuseDetectionBehavior = detectModuleReuseAcrossChains;
        if (myMod.doChain && !myMod.canBeInstantiatedAcrossChainContexts) {
          var reason = myMod.__myname + ' module is not marked for canBeInstantiatedAcrossChainContexts. Either mark it as such or set forcemodulereload.';
          switch(moduleReuseDetectionBehavior) {
            case 'error':
              return cb({ reason });
              break;
            case 'warning':
              console.log('[WARNING] ', reason);
              break;
          }
        }
      }
      myMod.sp('doChain', doChain);
      if (theMethod) {
        if (theMethod.constructor.name === 'AsyncFunction') {
          if (modtask.__Kernel.monitoringConfig && modtask.__Kernel.monitoringConfig.warnAsyncDoChainUsage) {
            myMod.sp('doChain', x => {
              console.log(`[warnAsyncDoChainUsage]: you are using doChain inside the async function: \r\n${theMethod.toString()}.`);
              console.log(`[warnAsyncDoChainUsage]: consider using "await newChainAsync" instead`);
              return doChain(x);
            });
          }
          myMod.sp('newChainAsync', async function(chainItems) {
            return new Promise((resolve, reject) => {
              doChain([
                ['newChain', {
                  context: 'copy',
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
            methodCallContextObject
          ).then(outcomeS => {
            if (!outcomeS) outcomeS = { success: true };
            if (typeof(outcomeS) != 'object') {
              outcomeS = { success: true, data: outcomeS };
            };
            cb(outcomeS);
          }).catch(outcomeF => {
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
          methodCallContextObject
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
