
var modtask = function() {};
modtask.getCloudMod = function(pkgname) {
   return {
      incrementalLoadPkg: function(loadpush, okpush, failpush) {
         return modtask.incrementalLoadPkg(pkgname, loadpush, okpush, failpush);
      }
   };
}

modtask.incrementalLoadPkg = function(pkgName, loadpush, okpush, failpush) {
   if (!modtask.auth) {
     return failpush({ reason: 'pkgloader auth token is not specified. You must configure the pkgloader.' });
   }
   return modtask.ldmod(Kernel.getModulePath('http')).callXmlHttpObject(modtask,
     'POST',
     'https://izyware.com/apigateway/:ui/ide:cloudstorage/api',
     // POST data
     JSON.stringify({
        action: 'incrementalLoadPkg',
        pkgName: pkgName,
        // todo, this needs to be passed as HTTP header (cookie, auth header, etc.)
        auth: modtask.auth
     }),
     'application/x-www-form-urlencoded', // contenttype,
     null, // auth,
     // transportsuccessfn,
     function(serializedJSONResponse, p2) {
        try {
           var response = JSON.parse(serializedJSONResponse);
           if (!response.success) return failpush(response);
           if (!response.data) return failpush({ reason: 'invalid response from incrementalLoadPkg'});
           if (response.data.length == 0) return failpush({ reason: 'package not found: "' + pkgName  + '"'});
           var increments = response.data;
           for(var i=0; i < increments.length; ++i) {
              var j = 0;
              loadpush(increments[i][j++], increments[i][j++], increments[i][j++]);
           }
           return okpush();
        } catch(e) {
           failpush({ reason: e.message });
        };
     },
     // transportfailfn
     function(outcome) {
        failpush(outcome);
     }
   );
}

modtask.auth = null;