/* izy-loadobject nodejs-require */
module.exports = (function() {
   var modtask = {};
   modtask.modstore =  {};
   modtask.verbose = true;
   modtask.install = function(modpkg, modstore, okpush, failpush)
   {
      modtask.modstore = modstore;
      var p;
      var files = [];
      for(p in modpkg['store'])
      {
         var ret = modtask.modstore.addModule(files, p, modpkg.store[p]);
         if (!ret.success)
         {
            failpush( ret );
            return ;
         }
      }
      var commit = (modtask.__modtask.commit == "true");
      var i;
      var msg = (commit ? "Writing" : "Non Commit mode -- would write");
      var success = true;
      var lastoutcome = {};
      for(i=0; i < files.length; ++i)
      {
         if (modtask.verbose) {
            modtask.Log(msg + " " + files[i].path + " [" + Math.round(files[i].raw.length / 1000) + "kB]" );
         }
         if (commit)
            modtask.modstore.writeModule(files[i].path, files[i].raw, function()
               {},
               function(outcome)
               {
                  success = false;
                  lastoutcome = outcome.reason;
               }
            );
      }
      if (success)
         okpush(files);
      else 
         failpush(lastoutcome);
   }
   return modtask;
})();
