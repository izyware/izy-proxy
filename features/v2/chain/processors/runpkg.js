/* izy-loadobject nodejs-require */
module.exports = (function() {
    var modtask = function(chainItem, cb, $chain) {
        if (!modtask.__chainProcessorConfig) modtask.__chainProcessorConfig = {};
        modtask.dontDefaultToHttpWhenServiceNameUnrecognized = modtask.__chainProcessorConfig.dontDefaultToHttpWhenServiceNameUnrecognized;
        modtask.verbose = modtask.__chainProcessorConfig.verbose;
        modtask.sessionMod = modtask.__chainProcessorConfig.sessionMod || 'rel:../../session/main';
        if (typeof(modtask.sessionMod) == 'string') {
            modtask.sessionMod = modtask.ldmod(modtask.sessionMod);
        };

        modtask._modToPkgMap = modtask.__chainProcessorConfig.modToPkgMap || {};

        var i = 0;
        var str = chainItem[i++] + '';
        if (str.indexOf('//') == 0) {
            var queryObject = chainItem[i++];
            var destinationObj = chainItem[i++] || $chain.chainAttachedModule || $chain.context;
            modtask.doLaunchString($chain, str, {
                queryObject: queryObject,
                destinationObj: destinationObj
            }, function(Outcome_whenSuccesful) {
                $chain.set('outcome', Outcome_whenSuccesful);
                // backwards compat for legacy APIs using ['...', queryObject, modtask] style components
                if (destinationObj) destinationObj.outcome = $chain.get('outcome');
                cb();
            });
            return true;
        };
        switch(str) {
            case 'net.httprequest':
                var request = chainItem[i++];
                var verbose = request.verbose || {};
                if (verbose.logRequest) console.log('request', request);
                modtask.ldmod('rel:../../http').universalHTTP().sendRequest(request, function(outcome) {
                    if (verbose.logResponse) console.log('response', outcome);
                    if (!outcome.success) return $chain.chainReturnCB(outcome);
                    $chain.set('outcome', outcome);
                    cb();
                });
                return true;
                break;
            case 'runpkg.setSession':
                var session = chainItem[i++];
                modtask.sessionMod.set(session);
                cb();
                return true;
                break;
        }
        return false;
    };

    modtask.verbose = true;

    modtask.doLaunchString = function($chain, launchString, payload, cbWhenLaunchSuccessful) {
        var apiGatewayUrls = {
            'inline': 'inline',
            'localhost': 'http://localhost/apigateway/:',
            'izyware': 'https://izyware.com/apigateway/:'
        }

        var parsedLaunchString = modtask.parseLaunchString(launchString, payload);

        if (!parsedLaunchString.success) return modtask.exitChainWithMyStackTrace($chain, parsedLaunchString.reason);
        if (!parsedLaunchString.serviceName) return modtask.exitChainWithMyStackTrace($chain, '/// launch string is ambigous, did you mean //inline/?');
        var url = apiGatewayUrls[parsedLaunchString.serviceName];
        if (!url) {
            if (modtask.dontDefaultToHttpWhenServiceNameUnrecognized) {
                return modtask.exitChainWithMyStackTrace($chain,
                'Cannot find the proper gateway for:' + parsedLaunchString.serviceName
                );
            }
            url = 'https://' + parsedLaunchString.serviceName + '/apigateway/:';
        }
        var queryObject = payload.queryObject;
        if (modtask.verbose) {
            console.log('[runpkg(url,launchString)]: ', url, launchString);
        }
        if (url == 'inline') {
            return modtask.handlers.inline($chain, cbWhenLaunchSuccessful, parsedLaunchString, queryObject);
        }

        return modtask.handlers.http($chain, cbWhenLaunchSuccessful, parsedLaunchString, queryObject, url);
    }

    modtask.parseLaunchString = function(url, payload) {
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
        // If it is ['//izyware.com/rel:modname', {}, mod] the rel:modname should be determined based on mod
        if (outcome.invokeString.indexOf('rel:') == 0) {
            var destinationObj = payload.destinationObj || {};
            if (!destinationObj.ldmod) return {
                reason: 'rel: specified in the invokeString, but the context is not a module. (' + outcome.invokeString + ')'
            };
            var modname = outcome.invokeString;
            var callParams = '';
            if (modname.indexOf('?') > 0) {
                modname = modname.split('?');
                callParams = '?' + modname[1];
                modname = modname[0];
            }

            if (outcome.serviceName == 'inline') {
                // We dont really need a full package name for inline
                outcome.invokeString = destinationObj.ldmod('kernel/path').rel(modname.substr(4, modname.length-4));
            } else {
                var _outcome = destinationObj.ldmod('kernel/path').toInvokeString(modname, modtask._modToPkgMap);
                if (!_outcome.success) return _outcome;
                outcome.invokeString = _outcome.data;
            }
            outcome.invokeString = outcome.invokeString + callParams;
        };

        return outcome;
    }

    modtask.exitChainWithMyStackTrace = function($chain, reason) {
        var outcome = { reason: reason };
        $chain.addStackTrace(outcome, {
            module: modtask.__myname,
            chainItem: $chain.chainItemBeingProcessed.chainItem,
            chainindex: $chain.chainItemBeingProcessed.chainindex,
            executionContext: 'chainHandler'
        });
        return $chain.chainReturnCB(outcome);
    }

    modtask.handlers = {};

    modtask.handlers.inline = function($chain, cbWhenLaunchSuccessful, parsedLaunchString, queryObject) {
        var parsed = {};
        var doNotLoadPackage = false;
        var forcepackagereload = false;
        var custompackageloader = false;

        var methodOutcome = modtask.ldmod('rel:../../pkg/run').parseMethodOptionsFromInvokeString(parsedLaunchString.invokeString);
        var methodCallOptionsObj = methodOutcome.methodCallOptionsObj;
        parsedLaunchString.invokeString = methodOutcome.invokeString;

        if (methodCallOptionsObj.forcepackagereload) {
            forcepackagereload = true;
        }

        if (methodCallOptionsObj.custompackageloader) {
            custompackageloader = methodCallOptionsObj.custompackageloader;
        }

        if (parsedLaunchString.invokeString == '') {
            doNotLoadPackage = true;
            parsed = {
                mod: $chain.chainAttachedModule.__myname
            };
        } else {
            parsed = modtask.ldmod('kernel/path').parseInvokeString(parsedLaunchString.invokeString);
        }

        // If no package specified (//inline/direct/nocolon/module), just try running it
        if (parsed.pkg == '') doNotLoadPackage = true;

        var runModule = function(moduleName) {
            var context = { session: modtask.sessionMod.get() };
            try {
                var myMod = modtask.ldmod(moduleName);
                if (typeof(queryObject) == 'undefined' || queryObject == null) {
                    queryObject = {};
                }
                queryObject = queryObject ? JSON.parse(JSON.stringify(queryObject)) : queryObject;
                modtask.ldmod('rel:../../pkg/run').runJSONIOModuleInlineWithChainFeature(
                myMod,
                methodOutcome,
                queryObject,
                context,
                $chain.chainHandlers,
                function(outcome) {
                    if (!outcome.success) return $chain.chainReturnCB(outcome);
                    cbWhenLaunchSuccessful(outcome);
                });
            } catch (e) {
                return modtask.exitChainWithMyStackTrace($chain, e.message);
            }
        }

        if (modtask.verbose) console.log('[runpkg,inline]', {
            forcepackagereload: forcepackagereload,
            custompackageloader: custompackageloader,
            doNotLoadPackage: doNotLoadPackage,
            parsed: parsed
        });

        // If it is already loaded 'inline' (which means either it is being managed by the IDE or someone pulled it in), just run it
        if (!forcepackagereload && modtask.ldmod('kernel\\selectors').objectExist(parsed.mod, {}, false)) {
            return runModule(parsed.mod);
        }

        if (doNotLoadPackage) {
            return runModule(parsed.mod);
        }

        $chain.newChainForProcessor(modtask, function() {
            runModule(parsed.mod);
        }, {},[
            forcepackagereload ? ['chain.deportpkgs', [parsed.pkg]] : ['nop'],
            ['frame_importpkgs', [parsed.pkg], custompackageloader],
            ['set', 'outcome', { success: true }]
        ]);
    }

    modtask.handlers.http = function($chain, cbWhenLaunchSuccessful, parsedLaunchString, queryObject, url) {
        var connectionString = url + parsedLaunchString.invokeString;

        /* when //service/?method */
        var methodOutcome = modtask.ldmod('rel:../../pkg/run').parseMethodOptionsFromInvokeString(parsedLaunchString.invokeString);
        if (methodOutcome.invokeString == '') {
            var modname = $chain.chainAttachedModule.__myname;
            var _outcome = modtask.ldmod('kernel/path').toInvokeString(modname, modtask._modToPkgMap);
            if (!_outcome.success) return modtask.exitChainWithMyStackTrace($chain, _outcome.reason);
            connectionString = url + _outcome.data + '?' + methodOutcome.methodToCall;
        }

        var headers = {};
        headers['content-type'] = 'application/x-www-form-urlencoded; charset=utf-8';
        var authorization = null;
        try {
            authorization = 'Bearer ' + modtask.sessionMod.get().authorizationToken;
        } catch (e) {}
        if (authorization) headers['authorization'] = authorization;

        if (typeof(queryObject) == 'undefined' || queryObject == null) {
            queryObject = {};
        }
        var bodyStr = '';
        try {
            bodyStr = JSON.stringify(queryObject);
            if (!bodyStr) bodyStr = JSON.stringify({});
        } catch(e) {
            return modtask.exitChainWithMyStackTrace($chain, { reason: 'Invalid queryObject parameter: ' + e.message });
        }

        modtask.ldmod('rel:../../http').universalHTTP().sendRequest({
            method: 'POST',
            url: connectionString,
            headers: headers,
            body: bodyStr
        },
        function(_outcome) {
            var outcome = {};
            // Becuase we use JSON/IO it will always be 200 (no 201, etc.)
            if (_outcome.status != 200) {
                outcome = {
                    success: false,
                    reason: _outcome.responseText || _outcome.reason,
                    status: _outcome.status
                };
                if (outcome.status == 0 || outcome.reason == '') {
                    outcome.reason = 'Can not establish a network connection to ' + url;
                }
                return modtask.exitChainWithMyStackTrace($chain, outcome.reason);
            }

            var obj;
            try {
                outcome = JSON.parse(_outcome.responseText);
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
            if (!outcome.success) return modtask.exitChainWithMyStackTrace($chain, outcome.reason)
            return cbWhenLaunchSuccessful(outcome);
        });
    }

    modtask.__$d = ['rel:../../pkg/run'];
    return modtask;
})();