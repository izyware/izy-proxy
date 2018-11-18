
function importPackge(pkgPathWithoutColons, cb) {
  importPackageIfNotPresent({
    pkg: pkgPathWithoutColons,
    mod: false
  }, cb);
}

function ldPath(path, cb) {
  var parsed = modtask.ldmod('kernel/path').parseInvokeString(path);
  return ldParsedPath(parsed, cb);
}

function ldParsedPath(parsed, cb) {
  importPackageIfNotPresent({
    pkg: parsed.pkg,
    mod: parsed.mod
  }, function (outcome) {
    if (!outcome.success) return cb(outcome);
    var reason = 'Unknown';
    try {
      return cb({ success: true, data: modtask.ldmod(parsed.mod) });
    } catch (e) {
      reason = e.message;
    }
    return cb( { reason });
  });
}

function importPackageIfNotPresent(query, cb) {
  var outcome = { success:true, reason: [] };

  var pkg = query.pkg;
  var mod = query.mod;

  if (mod && modtask.ldmod('kernel\\selectors').objectExist(mod, {}, false)) {
    return cb(outcome);
  }
  if (pkg === '') return cb(outcome);
  if (!modtask.modpkgloader) {
    return cb({ reason: 'please define modpkgloader to enable package importing' });
  }
  modtask.modpkgloader.getCloudMod(pkg).incrementalLoadPkg(
    // One of these per package :)
    function(pkgName, pkg, pkgString) {
      try {
        modtask.commit = 'true';
        modtask.ldmod('kernel/extstores/import').sp('verbose', modtask.verbose).install(
          pkg,
          modtask.ldmod('kernel/extstores/inline/import'),
          function (ops) {
            if (modtask.verbose) {
              console.log(ops.length + ' modules installed for = ' + pkgName);
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
modtask.verbose = false;
modtask.modpkgloader = null;
modtask.ldPath = ldPath;
modtask.ldParsedPath = ldParsedPath;
modtask.importPackge = importPackge;
