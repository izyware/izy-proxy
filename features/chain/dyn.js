
var modtask = 
{
   getRendered : function(part) {
      if (typeof(part.itemid) != "string" && typeof(part.dyncpartpointer) == "function")
         return part.dyncpartpointer.dyncpartpointer; 
      else 
         return part; 
   },

   udtchain : function(fn, sourcepart, sourcemodui, callback, chainparams) {
      var pushfn = function(items) { callback(items); };
      pushfn.sourcepart = sourcepart;  
      pushfn["chainparams"] = chainparams; 
      try {
         fn(pushfn);
      } catch(e) {
         modtask.__modtask.moderr.dbg.failure(
            "dynamic function run error:" + modtask.exceptionToString(e)
         ); 
      }  
   }, 

   udt : function(fn, sourcepart, sourcemodui, chainindex, callback, chainreturn) {
      var pushfn = function(items) { callback(items); };
      pushfn.sourcepart = sourcepart; 
      pushfn.chainreturn = chainreturn; 
      try {
         fn(pushfn); 
      } catch(e) {
         modtask.__modtask.moderr.dbg.failure(
            "udt error:" + modtask.exceptionToString(e)
         );  
      }  
   },

   part : function(fn, callback) {
      try {
         fn(function(items) {
               callback(items); 
         });
      } catch(e) {
         modtask.__modtask.moderr.handleDynPartException(fn, e, callback);
      } 
   },

   parts : function(fn, callback) {
      try {
         fn(function(items) {
               callback(items);
         });
      } catch(e) {
         modtask.__modtask.moderr.handleDynPartException(fn, e, callback);
      } 
   }   
}