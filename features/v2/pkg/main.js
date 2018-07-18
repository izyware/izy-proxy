
function ldPath(path, cb) {
  var parsed = modtask.ldmod('kernel/path').parseInvokeString(path);
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
      return cb({ success: true, data: modtask.ldmod(parsed.mod), rootmod: modtask });
    } catch (e) {
      reason = e.message;
    }
    return cb( { reason });
  });
}

function loadPackageIfNotPresent(query, cb) {
  var outcome = { success:true, reason: [] };

  var pkg = query.pkg;
  var mod = query.mod;

  if (modtask.ldmod('kernel\\selectors').objectExist(mod, {}, false)) {
    return cb(outcome);
  }
  if (pkg === '') return cb(outcome);

  // This should be present in path and has the correct credentials for loading the bits
  var pkgloader = modtask.ldmod('pkgloader');

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
              // console.log(ops.length + " modules installed for = " + pkgName);
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

var modtask = function() {}
modtask.ldPath = ldPath;
modtask.ldParsedPath = ldParsedPath;
