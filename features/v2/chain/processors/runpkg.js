
var modtask = function(chainItem, cb, $chain) {
    if (!modtask.__chainProcessorConfig) modtask.__chainProcessorConfig = {};
    modtask.verbose = modtask.__chainProcessorConfig.verbose;
    modtask.noReimportIfAlreadyLoaded = modtask.__chainProcessorConfig.noReimportIfAlreadyLoaded;

    var i = 0;
    var str = chainItem[i++] + '';
    if (str.indexOf('//') == 0) {
        var queryObject = chainItem[i++];
        modtask.doLaunchString($chain, str, queryObject, function(Outcome_cbWhenLaunchDone) {
            if (!Outcome_cbWhenLaunchDone.recordOutcome) return cb();
            $chain.set('outcome', Outcome_cbWhenLaunchDone.outcome);
            // backwards compat for legacy APIs using modtask.doChain(['...', queryObject, modtask]) style components
            var containerParam = chainItem[i++];
            if (containerParam) containerParam.outcome = $chain.get('outcome');
            cb();
        });
        return true;
    };
    return false;
};

modtask.verbose = true;
modtask.doLaunchString = function($chain, launchString, payload, cbWhenLaunchDone) {
    var apiGatewayUrls = {
        'inline': 'inline',
        'chain': 'chain',
        'localhost': 'https://localhost/apigateway/:',
        'izyware': 'https://izyware.com/apigateway/:'
    }

    var parsedLaunchString = modtask.parseLaunchString(launchString);
    if (!parsedLaunchString.success) return cbWhenLaunchDone({
        outcome: parsedLaunchString,
        recordOutcome: true
    });
    if (!parsedLaunchString.serviceName) parsedLaunchString.serviceName = 'inline';
    if (!parsedLaunchString.serviceName || !apiGatewayUrls[parsedLaunchString.serviceName]) return cbWhenLaunchDone({
        outcome: {
            reason: 'Cannot find the proper gateway for:' + parsedLaunchString.serviceName
        },
        recordOutcome: true
    });
    var url = apiGatewayUrls[parsedLaunchString.serviceName];
    if (modtask.verbose) {
        console.log('launchString', launchString);
        console.log('url', url);
    }
    if (url == 'inline') {
        return modtask.handlers.inline($chain, cbWhenLaunchDone, parsedLaunchString, payload, false);
    }
    if (url == 'chain') {
        return modtask.handlers.inline($chain, cbWhenLaunchDone, parsedLaunchString, payload, true);
    }
    return modtask.handlers.http(cbWhenLaunchDone, parsedLaunchString, payload, url);
}

modtask.parseLaunchString = function(url) {
    var outcome = {
        success: true
    };
    if (url.length < 2 || url.indexOf('//') != 0) return {
        reason: 'must start with //, e.g. //service/invokeString or ///invokeString'
    };
    url = url.substr(2);
    if (url.length < 1 || url.indexOf('/') < 0) return {
        reason: 'need / before the invokeString i.e. ///invokeString'
    };
    outcome.serviceName = url.split('/')[0];
    outcome.invokeString = url.substr(outcome.serviceName.length + 1);
    return outcome;
}

modtask.handlers = {};
modtask.handlers.inline = function($chain, cbWhenLaunchDone, parsedLaunchString, payload, chainMode) {
    var parsed = modtask.ldmod('kernel/path').parseInvokeString(parsedLaunchString.invokeString);
    var runModule = function() {
        try {
            if (chainMode) {
                $chain.newChain({
                    chainName: parsed.mod,
                    chainItems: modtask.ldmod(parsed.mod),
                    context: $chain.context,
                    chainHandlers: $chain.chainHandlers
                },
                function(outcome) {
                    if (!outcome.success) {
                        cbWhenLaunchDone({
                            recordOutcome: true,
                            outcome: { reason: outcome.reason }
                        });
                    } else {
                        cbWhenLaunchDone({ recordOutcome: false });
                    }
                });
            } else {
                modtask.ldmod(parsed.mod).sp('doChain', $chain.doChain).processQueries(payload, function(outcome) {
                    cbWhenLaunchDone({
                        recordOutcome: true,
                        outcome: outcome
                    });
                });
            }
        } catch (e) {
            return cbWhenLaunchDone({
                recordOutcome: true,
                outcome: {
                    reason: e.message
                }
            });
        }
    }
    
    // If it is already loaded 'inline' (which means either it is being managed by the IDE or someone pulled it in), just run it
    if (modtask.noReimportIfAlreadyLoaded && modtask.ldmod('kernel\\selectors').objectExist(parsed.mod, {}, false)) {
        runModule();
        return;
    }

    $chain.doChain([
        ['frame_importpkgs', [parsed.pkg]],
        ['returnOnFail'],
        runModule
     ]);
}

modtask.handlers.http = function(cbWhenLaunchDone, parsedLaunchString, payload, url) {
    var connectionString = url + parsedLaunchString.invokeString;
    var http = modtask.ldmod('net\\http');
    http.postAsyncHTTPRequest(
      function (_outcome) {
          var outcome = {};
          var obj;
          try {
              outcome = JSON.parse(_outcome);
          } catch (e) {
              outcome = {
                  reason: 'cannot parse response from gateway ' + parsedLaunchString.serviceName
              };
          }
          if (typeof(outcome) != 'object') {
              outcome = {
                  reason: 'non outcome object returned from gateway ' + parsedLaunchString.serviceName
              };
          }
          cbWhenLaunchDone({
              recordOutcome: true,
              outcome: outcome
          });
      },
      connectionString, // url
      JSON.stringify(payload), // postdata
      'text/html', // contenttype
      false, // auth
      // failpush
      function (_outcomeStr) {
          return cbWhenLaunchDone({
              recordOutcome: true,
              outcome: {
                  reason: _outcomeStr
              }
          });
      }
    );
}
