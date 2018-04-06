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
      // fill my namespace with usable stuff
      serverObjs[name] = {};
      serverObjs[name].ldPath = ldPath;
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
        var parsedPath = parseInvokeString(path);
        serverObjs[name].parsedPath = parsedPath;

        return ldParsedPath(parsedPath, function(outcome) {
          if (outcome.success) {
            try {
              var mod = outcome.data;
              var rootmod = outcome.rootmod;
              // This will configure the transition handlers per path's package and app permissions
              outcome = setupChainingForContext(mod, config,
                // unhandledChainItem
                function (outcome) {
                  return serverObjs.sendStatus({
                    status: 500,
                    subsystem: mod.__myname
                  }, outcome.reason);
                }
                , outcome.rootmod);
              if (outcome.success) {
                mod.doChain = outcome.doChain;
                switch (mod.__apiInterfaceType) {
                  case 'jsonio':
                    return rootmod.ldmod('plugin/apigateway/types/' + mod.__apiInterfaceType).handle(serverObjs, mod);
                  default:
                    return mod.handle(serverObjs);
                }
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

function parseInvokeString(path) {
  var pkg = path.split(':');
  var mod, params = '';
  if (pkg.length) {
    mod = pkg[0] + '/' + pkg[1];
    pkg = pkg[0];
    params = path.substr(mod.length+1);
  } else {
    pkg = '';
    mod = path;
    params = '';
  }
  return { path, pkg, mod, params };
}

function ldPath(path, cb) {
  var parsed = parseInvokeString(path);
  return ldParsedPath(parsed, cb);
}

function ldParsedPath(parsed, cb) {
  loadPackageIfNotPresent({
    pkg: parsed.pkg,
    mod: parsed.mod
  }, function (outcome) {
    if (!outcome.success) return cb(outcome);
    var reason = 'Unknown';
    try {
      return cb({ success: true, data: outcome.rootmod.ldmod(parsed.mod), rootmod: outcome.rootmod });
    } catch (e) {
      reason = e.message;
    }
    return cb( { reason });
  });
}

function loadPackageIfNotPresent(query, cb) {
  // For security reasons we virtualize each requests's load into its own root context
  // However, the file system caching (if present) will still allow sharing of context
  var rootmod = require('izymodtask').getRootModule();
  var outcome = { success:true, reason: [],  rootmod };

  var pkg = query.pkg;
  var mod = query.mod;

  if (rootmod.ldmod('kernel\\selectors').objectExist(mod, {}, false)) {
    return cb(outcome);
  }
  if (pkg === '') return cb(outcome);
  var pkgloader = rootmod.ldmod('pkgloader');
  var modtask = rootmod;

  pkgloader.getCloudMod(pkg).incrementalLoadPkg(
    // One of these per package :)
    function(pkgName, pkg, pkgString) {
      try {
        modtask.commit = "true";
        modtask.verbose = false;
        modtask.ldmod('kernel/extstores/import').sp('verbose', modtask.verbose).install(
          pkg,
          modtask.ldmod('kernel/extstores/inline/import'),
          function (ops) {
            if (modtask.verbose) {
              console.log(ops.length + " modules installed for = " + pkgName);
            }
          },
          function (outcome) {
            outcome.reason.push(outcome.reason);
            outcome.success = false;
          }
        );
      } catch(e) {
        return cb({ reason: e.message });
      }
    }, function() {
      cb(outcome);
    },
    cb
  );
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

function createChainItemProcessor(rootmod, config, unhandledChainItem) {
  var chainHandlers = [];
  var registerChainItemProcessor = function(chainItemProcessor) {
    chainHandlers.push(chainItemProcessor);
  }

  /* Register contenxt chain item processor */
  try {
    if (config.chainHandlerMod) {
      registerChainItemProcessor(rootmod.ldmod(config.chainHandlerMod).doTransition);
    }
  } catch(e) {
    console.log('Cannot ldmod config.chainHandlerMod: "' + config.chainHandlerMod  + '". Some chains may not be available for the module in privilaged context.');
  }

  var chainItemProcessor = function (chainItem, cb) {
    // ['nop', ..]
    var udt = chainItem.udt;
    switch (udt[0]) {
      case 'nop':
        cb(chainItem);
        return true;
      case 'registerChainItemProcessor':
        registerChainItemProcessor(udt[1]);
        cb(chainItem);
        return true;
    }
    var i;
    for(i=0; i < chainHandlers.length; ++i) {
      if (chainHandlers[i](chainItem, cb)) return;
    }
    unhandledChainItem({
      reason: 'Unhandled chainItem: ' + udt[0]
    });
    return false;
  }
  return chainItemProcessor;
}

function setupChainingForContext(chainContextMod, config, unhandledChainItem, rootmod) {
  rootmod = rootmod || require('izymodtask').getRootModule();
  var outcome = rootmod.ldmod('features/chain/main').setupChaining(
    createChainItemProcessor(rootmod, config, unhandledChainItem),
    // Chain Done
    function() {},
    chainContextMod);
  if (outcome.success) {
    // This is always available in case any of the modules (i.e. context modules) need to make doChain available to others
    rootmod.doChain = outcome.doChain;
  }
  return outcome;
}

