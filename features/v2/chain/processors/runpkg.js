
var modtask = function(chainItem, cb, $chain) {
    if (!modtask.__chainProcessorConfig) modtask.__chainProcessorConfig = {};
    modtask.dontDefaultToHttpWhenServiceNameUnrecognized = modtask.__chainProcessorConfig.dontDefaultToHttpWhenServiceNameUnrecognized;
    modtask.verbose = modtask.__chainProcessorConfig.verbose;
    modtask.sessionMod = modtask.__chainProcessorConfig.sessionMod || 'features/v2/session/main';
    if (typeof(modtask.sessionMod) == 'string') {
        modtask.sessionMod = modtask.ldmod(modtask.sessionMod);
    };

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
    return false;
};

modtask.verbose = true;

modtask.doLaunchString = function($chain, launchString, payload, cbWhenLaunchDone) {
    var apiGatewayUrls = {
        'inline': 'inline',
        'localhost': 'http://localhost/apigateway/:',
        'izyware': 'https://izyware.com/apigateway/:'
    }

    var parsedLaunchString = modtask.parseLaunchString(launchString, payload);
    if (!parsedLaunchString.success) return modtask.exitChainWithMyStackTrace($chain, parsedLaunchString.reason);
    if (!parsedLaunchString.serviceName) parsedLaunchString.serviceName = 'inline';
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
        return modtask.handlers.inline($chain, cbWhenLaunchDone, parsedLaunchString, queryObject, false);
    }

    return modtask.handlers.http($chain, cbWhenLaunchDone, parsedLaunchString, queryObject, url);
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
        var modname = outcome.invokeString

        if (outcome.serviceName == 'inline') {
            // We dont really need a full package name for inline
            outcome.invokeString = destinationObj.ldmod('kernel/path').rel(modname.substr(4, modname.length-4));
        } else {
            var _outcome = destinationObj.ldmod('kernel/path').toInvokeString(modname);
            if (!_outcome.success) return _outcome;
            outcome.invokeString = _outcome.data;
        }
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

modtask.handlers.inline = function($chain, cbWhenLaunchDone, parsedLaunchString, queryObject) {
    var parsed = {};
    var doNotLoadPackage = false;
    var forcepackagereload = false;
    var methodToCall = '';
    var methodCallOptions = '';

    if (parsedLaunchString.invokeString.indexOf('?') > -1) {
        var options = parsedLaunchString.invokeString.split('?');
        parsedLaunchString.invokeString = options[0];
        methodToCall = options[1] + '';
    };

    if (methodToCall.indexOf('&') > -1) {
        var options = methodToCall.split('&');
        methodToCall = options[0];
        methodCallOptions = options[1] + '';
        if (methodCallOptions.indexOf('forcepackagereload') == 0) {
            forcepackagereload = true;
        }
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
            queryObject = queryObject ? JSON.parse(JSON.stringify(queryObject)) : queryObject;
            modtask.ldmod('rel:../../pkg/run').runJSONIOModuleInlineWithChainFeature(
              myMod,
              methodToCall,
              queryObject,
              context,
              $chain.chainHandlers,
              function(outcome) {
                if (!outcome.success) return $chain.chainReturnCB(outcome);
                cbWhenLaunchDone(outcome);
            });
        } catch (e) {
            return modtask.exitChainWithMyStackTrace($chain, e.message);
        }
    }

    if (modtask.verbose) console.log('[runpkg,inline]', {
        forcepackagereload: forcepackagereload,
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
        ['frame_importpkgs', [parsed.pkg]],
        ['set', 'outcome', { success: true }]
    ]);
}

modtask.handlers.http = function($chain, cbWhenLaunchDone, parsedLaunchString, payload, url) {
    var connectionString = url + parsedLaunchString.invokeString;

    var headers = {};
    headers['Content-type'] = 'application/x-www-form-urlencoded';
    var authorization = null;
    try {
        authorization = 'Bearer ' + modtask.sessionMod.get().authorizationToken;
    } catch (e) {}
    if (authorization) headers['authorization'] = authorization;

    modtask.universalHTTP().sendRequest({
          method: 'POST',
          url: connectionString,
          headers: headers,
          body: JSON.stringify(payload)
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
          return cbWhenLaunchDone(outcome);
      });
}

modtask.universalHTTP = function() {
    function requestByXmlHttp(cb, url, method, headers, body, req) {
        req.open(method, url, true);
        var p;
        for (p in headers) {
            req.setRequestHeader(p, headers[p]);
        }
        req.onreadystatechange = function() {
            if (req.readyState != 4) return;
            cb({
                success: true,
                responseText: req.responseText,
                status: req.status
            });
        }
        if (req.readyState == 4) return cb({
            success: true,
            responseText: req.responseText,
            status: req.status
        });
        req.send(body);
    }

    function sendRequest(_options, cb) {
        var url = _options.url;
        var method = _options.method;
        var body = _options.body;
        var headers = _options.headers || {};
        if (!method) {
            method = (body) ? 'POST' : 'GET';
        }

        var req = createXMLHTTPObject();
        if (req) return requestByXmlHttp(cb, url, method, headers, body, req);
        requestByNode(cb, url, method, headers, body);
    };

    function requestByNode(cb, url, method, headers, body) {
        try {
            method = method.toUpperCase();
            var modurl = require('url');
            parts = modurl.parse(url, true);
            var options = {
                host: parts.host,
                path: parts.path,
                method: method,
                headers: headers
            };

            if (method == 'POST' || method == 'PUT') {
                options.headers['Content-length'] = body.length;
            };

            var nodeHttp = require((parts.protocol == 'https:' ? 'https' : 'http'));

            var ret = '';
            var req = nodeHttp.request(options,
              function(response) {
                  var str = ''
                  response.on('data', function (chunk) {
                      str += chunk;
                  });
                  response.on('end', function () {
                      cb({
                          success: true,
                          responseText: str,
                          status: response.statusCode
                      });
                  });
              }
            );

            req.on('error', function(err) {
                cb({ reason: 'http request error: ' + err + ', host: ' + parts.host });
            });

            if (method == 'POST' || method == 'PUT') {
                req.write(body);
            } else {
                // Nothing more to do for GET
            }
            req.end();
        } catch(e) {
            return cb({ reason: 'Error: ' + e.message + ', host: ' + parts.host });
        }
    }

    function createXMLHTTPObject() {
        var XMLHttpFactories = [
            function() {
                return new XMLHttpRequest()
            },
            function() {
                return new ActiveXObject('Msxml2.XMLHTTP')
            },
            function() {
                return new ActiveXObject('Msxml3.XMLHTTP')
            },
            function() {
                return new ActiveXObject('Microsoft.XMLHTTP')
            }
        ];
        var xmlhttp = false;
        for (var i = 0; i < XMLHttpFactories.length; i++) {
            try {
                xmlhttp = XMLHttpFactories[i]();
            } catch (e) {
                continue;
            }
            break;
        }
        return xmlhttp;
    };

    return {
        sendRequest: sendRequest
    };
}
