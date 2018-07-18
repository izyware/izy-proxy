"use strict";

module.exports = function (config, pluginName) {
  var name = 'apigateway';
  var basePath = '/' + name + '/';
  return {
    success: true,
    name,
    canHandle: function(req) {
      return req.url.indexOf(basePath) === 0;
    },
    handle: function (req, res, serverObjs) {
      if (serverObjs.acceptAndHandleCORS()) return;

      var removePrefix = function(str, sub) {
        return str.substr(sub.length, str.length - sub.length);
      }

      // For security reasons we virtualize each requests's load into its own root context
      // However, the file system caching (if present) will still allow sharing of context
      var featureModulesPath = 'features/v2/';
      var rootmod = require('izymodtask').getRootModule();
      var pkgmain = rootmod.ldmod(featureModulesPath + 'pkg/main');

      // fill my namespace with usable stuff
      serverObjs[name] = {};
      serverObjs[name].ldPath = pkgmain.ldPath;
      serverObjs[name].decodeBase64Content = function(base64str) {
        return decodeBase64Content(base64str, serverObjs);
      };

      var outcome = {};
      outcome = parseClientRequest(req, config);
      var path = outcome.path;
      path = removePrefix(path, basePath);
      path = decodeURIComponent(path);

      if (config.invokePrefix && path.indexOf(config.invokePrefix) === 0) {
        if (config.invokeAuthorization && serverObjs.req.headers['Authorization'] != config.invokeAuthorization) {
          return serverObjs.sendStatus({
            status: 401,
            subsystem: name
          }, 'invokeAuthorization token was invalid');
        }
        path = removePrefix(path, config.invokePrefix);

        var parsedPath = rootmod.ldmod('kernel/path').parseInvokeString(path);
        serverObjs[name].parsedPath = parsedPath;

        return pkgmain.ldParsedPath(parsedPath, function(outcome) {
          if (outcome.success) {
            try {
              var mod = outcome.data;
              mod.doChain = function(chainItems, cb) {
                if (!cb) {
                  // Optional callback function when the chain is 'returned' or errored. If no errors, outcome.success = true otherwise reason.
                  cb = function() {}
                };
                return rootmod.ldmod(featureModulesPath + 'chain/main').newChain({
                  name: 'apiRoot',
                  chainItems: chainItems,
                  context: mod,
                  chainHandlers: [
                    rootmod.ldmod(featureModulesPath + 'chain/processors/basic'),
                    rootmod.ldmod(featureModulesPath + 'chain/processors/import'),
                    rootmod.ldmod(featureModulesPath + 'chain/processors/runpkg'),
                    // this should define frame_getnode, frame_importpkgs chain handlers
                    // see README file section on how to test this configuration via test/api in a deployed environment
                    rootmod.ldmod(config.chainHandlerMod)
                  ]
                }, cb);
              };

              switch (mod.__apiInterfaceType) {
                case 'jsonio':
                  return rootmod.ldmod('plugin/apigateway/types/' + mod.__apiInterfaceType).handle(serverObjs, mod);
                default:
                  return mod.handle(serverObjs);
              }
            } catch (e) {
              outcome = { reason : e.message };
            }
          }
          return serverObjs.sendStatus({
            status: 500,
            subsystem: name
          }, outcome.reason);
        });
      }

      return streamBase64Content(path, serverObjs);
    }
  };
};

function parseClientRequest(req, config) {
  config = config || {};
  var outcome = {};
  var domain = req.headers.host.split(':')[0];
  var path = req.url.split('?')[0].split('#')[0];
  if (path.indexOf('/') != 0) {
    path = '/' + path;
  }
  outcome.path = path;
  outcome.domain = domain;
  return outcome;
}

var decodeBase64Content = function (base64str, serverObjs) {
  // data:image/jpg;base64,....
  var token = ';base64,';
  var index = base64str.indexOf(token);
  index += token.length;
  var base64Pixels = base64str.substr(index, base64str.length - index);
  // data:image/jpg
  var header = base64str.substr(0, index);
  // image/jpg
  var contentType = header.substr(5, header.length - 5);

  // Node < v6
  var buf = new Buffer(base64Pixels, 'base64');

  /* Node v6.0.0 and beyond
  var buf = Buffer.from(base64Pixels, 'base64');
  */
  serverObjs.res.writeHead(200, serverObjs.getCORSHeaders({'Content-Type': contentType}));
  return serverObjs.res.end(buf, 'binary');
}

var streamBase64Content = function(path, serverObjs)  {
  serverObjs.apigateway.ldPath(path, function (outcome) {
    if (outcome.success) {
      try {
        return decodeBase64Content(outcome.data.getImageUrl(), serverObjs);
      } catch(e) {
        outcome = { reason: e.message };
      }
    }
    return serverObjs.sendStatus({
      status: 500,
      subsystem: 'streamBase64Content'
    }, outcome.reason);
  });
}
