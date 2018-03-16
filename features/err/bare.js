
var modtask = 
{
   dbg : {
     failure : function(x) {
        modtask.Fail(x);
     }
   },

   chain : function(chain, sourcemodui, sourcepart, context, action) {
      modtask.Fail(action);
   },

   ext : function(extmod, itemid, context, action) {
      modtask.Fail(action);
   },    

   parts : function(parts, prop, context, action) {
      modtask.Fail(action);
   },    

   part : function(part, prop, context, action) {
      modtask.Fail(action);
   },   
   
   trans : function(trans, context, action) {
      modtask.Fail(action);
   }
}

modtask.handleDynPartException = function(fn, e, callback) {
   modtask.Log('dyn.parts from function: " + modtask.exceptionToString(e)');
   callback({ parts : 'text', what : '.' });
}