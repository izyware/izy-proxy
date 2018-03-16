
var modtask = 
{ 
   chain : function(chain, sourcemodui, sourcepart, context, action) {
 		modtask.dbg.actionableFailure(
            sourcemodui, 
            sourcepart.__partpath + " (while doing " + context + ") " + 
            Minicore.newLine + "chain: " + modtask.ldmod('encodedecode/js').AAToJscript(chain, true, false, true),
            action
            );   
   },

   ext : function(extmod, itemid, context, action) {
      modtask.dbg.actionableFailure(extmod, " itemid: " + itemid + " (while doing " + context + ")", action);  
   },    

   parts : function(parts, prop, context, action) {
 		modtask.dbg.failure(parts.__partpath + "." + prop + " (while doing " + context + ")", action); 
   },    

   part : function(part, prop, context, action) {
 		modtask.dbg.failure(part.__partpath + (prop ? ("." + prop) : "" ) + " (while doing " + context + ")", action); 
   },   
   
   trans : function(trans, context, action) {
 		modtask.dbg.actionableFailure(
            trans.sourcemodui, 
            trans.sourcepart.__partpath + " (while doing " + context + ") " + 
            Minicore.newLine + "udt: " + modtask.ldmod('encodedecode/js').AAToJscript(trans.udt, true, false, true),
            action
        );
   },

   init : function() {
      modtask.dbg = modtask.ldmod('dbg/verify');
   },

   __$d : ['dbg/verify', 'encodedecode/js']
}

 modtask.handleDynPartException = function(fn, e, callback) {
    var msg = "dyn.parts from function: " + modtask.exceptionToString(e);
    if (Kernel.getBuildInfo() == "opendev")
      modtask.part(fn, false, "dyn.part(s) from function", "Check the part function to see why you are getting " + "'" + modtask.exceptionToString(e) + "'.");
    else {
      modtask.Log("Redirecting exception to part: " + msg);
      callback({"css" : "theme.errortext", "parts" : "text", "what" : msg });
    }
 }
