
var modtask = 
{
   decoratePushFN: function(pushfn, chainContext) {
      pushfn.chainContext = chainContext;
      // Backward compat
      pushfn.sourcepart = chainContext;
      pushfn.outcome = chainContext.outcome || { reason: 'WARNING: set outcome for context internally since it didnot have one already'};
   },

   getRendered : function(part) {
      if (typeof(part.itemid) != "string" && typeof(part.dyncpartpointer) == "function")
         return part.dyncpartpointer.dyncpartpointer; 
      else 
         return part; 
   },

   udtchain : function(fn, chainContext, sourcemodui, callback) {
      var pushfn = function(items) { callback(items); };
      modtask.decoratePushFN(pushfn, chainContext);
      try {
         fn(pushfn, chainContext);
      } catch(e) {
         modtask.__modtask.moderr.dbg.failure(
            "dynamic function run error:" + modtask.exceptionToString(e)
         ); 
      }  
   }, 

   udt : function(dynamicItemToBeEvaled, chainContext, callback) {
      var pushfn = function(data) {
         callback({
            success: true,
            data: data
         });
      };
      modtask.decoratePushFN(pushfn, chainContext);
      try {
         dynamicItemToBeEvaled(pushfn, chainContext);
      } catch(e) {
         callback({
            reason: e.message + ' when dynamicItemToBeEvaled = ' + dynamicItemToBeEvaled.toString()
         });
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