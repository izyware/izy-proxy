
function importPackge(pkgPathWithoutColons, cb) {
  importPackageIfNotPresent({
    pkg: pkgPathWithoutColons,
    mod: pkgPathWithoutColons + '/package'
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
  if (modtask.verbose) console.log('[importPackageIfNotPresent] trying to import', query);
  var outcome = { success:true, reason: [] };

  var pkg = query.pkg;
  var mod = query.mod;

  if (mod && modtask.ldmod('kernel\\selectors').objectExist(mod, {}, false)) {
    if (modtask.verbose)  console.log('[importPackageIfNotPresent] will not load package because I found one of its modules: "' + mod + '"');
    return cb(outcome);
  }
  if (pkg === '') return cb(outcome);
  if (!modtask.modpkgloader) {
    return cb({ reason: 'please define modpkgloader to enable package importing' });
  }

  if (modtask.verbose)  console.log('[importPackageIfNotPresent] package not loaded already so will use "' + modtask.modpkgloader.__myname + '" to load package');

  // The modToPkgMap is used by
  // 1) ldmod('kernel/path').toInvokeString
  // 2) IDE
  var modToPkgMap = modtask.ldmod('kernel/mod').ldonce('kernel/extstores/import').modToPkgMap || {};
  modtask.ldmod('kernel/mod').ldonce('kernel/extstores/import').modToPkgMap = modToPkgMap;

  modtask.modpkgloader.getCloudMod(pkg).incrementalLoadPkg(
    // One of these per package :)
    function(pkgName, pkg, pkgString) {
      try {
        modtask.commit = 'true';
        modtask.ldmod('kernel/extstores/import').sp('verbose', modtask.verbose).install(
          pkg,
          modtask.ldmod('kernel/extstores/inline/import'),
          function (ops) {
            var i;
            for(i=0; i < ops.length; ++i) {
              if (ops[i].path.indexOf(pkgName) == 0) {
                modToPkgMap[ops[i].path] = pkgName;
              }
            }

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
