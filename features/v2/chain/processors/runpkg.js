
var modtask = function(chainItem, cb, currentChainBeingProcessed) {
    var str = chainItem[0] + '';
    if (str.indexOf('//') == 0) {
        var i = 1;
        var queryObject = chainItem[1];
        modtask.doLaunchString(currentChainBeingProcessed, str, queryObject, function(outcome) {
            currentChainBeingProcessed.context.outcome = outcome;
            cb();
        });
        return true;
    };
    return false;
};

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

modtask.doLaunchString = function(currentChainBeingProcessed, launchString, payload, cb) {
    var apiGatewayUrls = {
        'inline': 'inline',
        'localhost': 'https://localhost/apigateway/:',
        'izyware': 'https://izyware.com/apigateway/:'
    }

    var parsedLaunchString = modtask.parseLaunchString(launchString);
    if (!parsedLaunchString.success) return cb(parsedLaunchString);
    if (!parsedLaunchString.serviceName) parsedLaunchString.serviceName = 'inline';
    if (!parsedLaunchString.serviceName || !apiGatewayUrls[parsedLaunchString.serviceName]) return cb({
        reason: 'Cannot find the proper gateway for:' + parsedLaunchString.serviceName
    });
    var url = apiGatewayUrls[parsedLaunchString.serviceName];
    if (url == 'inline') {
        return modtask.handlers.inline(currentChainBeingProcessed, cb, parsedLaunchString, payload);
    }
    return modtask.handlers.http(cb, parsedLaunchString, payload, url);
}

modtask.handlers = {};
modtask.handlers.inline = function(currentChainBeingProcessed, cb, parsedLaunchString, payload) {
    var parsed = modtask.ldmod('kernel/path').parseInvokeString(parsedLaunchString.invokeString);
    var runModule = function() {
        try {
            var mod = modtask.ldmod(parsed.mod).sp('doChain', currentChainBeingProcessed.doChain).processQueries(payload, cb);
        } catch (e) {
            return cb({
                reason: e.message
            });
        }
    }
    // If it is already loaded 'inline' (which means either it is being managed by the IDE or someone pulled it in), just run it
    if (modtask.ldmod('kernel\\selectors').objectExist(parsed.mod, {}, false)) {
        runModule();
        return;
    }

    cb({ reason: 'import_module_disabled_for_inline_pkgruns. Enable this after doChain and callback handling has been fixed.'});
    /*
    * change this to doChain([['frame_importpkgs', ..] ...]])
    // Not found, so import first
    modtask.importPkgs([parsed.pkg], function(outcome) {
        if (!outcome.success) return cb(outcome);
        runModule();
    });*/
}

modtask.handlers.http = function(cb, parsedLaunchString, payload, url) {
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
          cb(outcome);
      },
      connectionString, // url
      JSON.stringify(payload), // postdata
      'text/html', // contenttype
      false, // auth
      // failpush
      function (_outcomeStr) {
          return cb({
              reason: _outcomeStr
          });
      }
    );
}
