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
      var removePrefix = function(str, sub) {
        return str.substr(sub.length, str.length - sub.length);
      }
      // fill my namespace with usable stuff
      serverObjs[name] = {};
      serverObjs[name].ldPath = ldPath;

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
        return ldPath(path, function(outcome) {
          if (outcome.success) {
            try {
              return outcome.data.handle(serverObjs);
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

function ldPath(path, cb) {
  var pkg = path.split(':');
  var mod = path.replace(':', '/');
  if (pkg.length) {
    pkg = pkg[0];
  } else {
    pkg = '';
  }
  loadPackageIfNotPresent({pkg, mod}, function (outcome) {
    if (!outcome.success) return cb(outcome);
    var reason = 'Unknown';
    try {
      return cb({ success: true, data: outcome.rootmod.ldmod(mod) });
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
  serverObjs.res.writeHead(200, {'Content-Type': contentType});
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
