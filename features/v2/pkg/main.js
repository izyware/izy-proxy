
// Always import package even if it has already been imported before
function forceImportPackage(pkgPathWithoutColons, cb) {
  importPackageIfNotPresent({
    pkg: pkgPathWithoutColons,
    // importPackageIfNotPresent uses mod to see if package has already been imported
    mod: null
  }, cb);
}

function deportPackage(pkgPathWithoutColons, cb) {
  var modToPkgMap = get_modToPkgMap();
  for(var p in modToPkgMap) {
    if (modToPkgMap[p] == pkgPathWithoutColons) {
      // todo: this needs to be in kernel/extstores/inline/deport
      delete INLINESTORE[p];
      delete modToPkgMap[p];
    }
  }
  cb({ success: true });
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
    return cb( { reason: reason });
  });
}

// The modToPkgMap is used by
// 1) ldmod('kernel/path').toInvokeString
// 2) IDE
// 3) deportPackage
function get_modToPkgMap() {
  var modToPkgMap = modtask.ldmod('kernel/mod').ldonce('kernel/extstores/import').modToPkgMap || {};
  modtask.ldmod('kernel/mod').ldonce('kernel/extstores/import').modToPkgMap = modToPkgMap;
  return modToPkgMap;
}

function importPackageIfNotPresent(query, cb) {
  if (modtask.verbose) console.log('[importPackageIfNotPresent] trying to import', query);
  var outcome = { success:true, reason: [] };

  var pkg = query.pkg;
  var mod = query.mod;

  if (!mod) {
    if (modtask.verbose) console.log('[importPackageIfNotPresent] forcing import');
  } else if (modtask.ldmod('kernel\\selectors').objectExist(mod, {}, false)) {
    if (modtask.verbose)  console.log('[importPackageIfNotPresent] will not load package because I found one of its modules: "' + mod + '"');
    return cb(outcome);
  }

  if (pkg === '') return cb(outcome);
  if (!modtask.modpkgloader) {
    return cb({ reason: 'please define modpkgloader to enable package importing' });
  }

  if (modtask.verbose)  console.log('[importPackageIfNotPresent] package not loaded already so will use "' + modtask.modpkgloader.__myname + '" to load package');

  var modToPkgMap = get_modToPkgMap();
  modtask.modpkgloader.getCloudMod(pkg, {
    loadDeps: true,
    releaseEnabled: true
  }).incrementalLoadPkg(
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
modtask.forceImportPackage = forceImportPackage;
modtask.deportPackage = deportPackage;
modtask.get_modToPkgMap = get_modToPkgMap;

// Manatory for modules that are used in building the bootstrapers or statically linked components
modtask.__$d = ['kernel/path', 'kernel/mod', 'kernel/extstores/import', 'kernel/extstores/inline/import',
  // Backwards compat -- can be fixed when izymodtask reference is replaced with inline bootstrapper
  'kernel\\selectors'
];
