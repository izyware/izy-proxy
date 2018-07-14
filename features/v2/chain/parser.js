
var modtask = {
   init : function() {
      modtask.modcore = modtask.ldmod("core\\core");
   },

   doChain : function(chain, chainReturnCB) {
      if (!chain) return chainReturnCB({ reason: "doChain.invalid.chain" });
      var i;
      switch(modtask.modcore.realTypeOf(chain)) {
         case "function" :
            return modtask.evalDynamicItem(
              chain,
              function(outcome) {
                 if (outcome.success) {
                    modtask.doChain(outcome.data, chainReturnCB);
                 } else {
                    return chainReturnCB(outcome);
                 }
              }
            );
            break;
         case "array" :
            var i;
            if (chain.length > 0 && typeof(chain[0]) == "string") {
               chain = [chain];
            } else {
               for(i=0; i < chain.length; ++i) {
                  switch(modtask.modcore.realTypeOf(chain[i])) {
                    case "array":
                    case "function" :                     
                       break;
                    default:
                      return chainReturnCB({ reason: "Set chain element[" + i + "] to a UDT array. Currently it is '" + modtask.modcore.realTypeOf(chain[i]) + "'" });
                  }
               } 
            }
            chain = chain.slice(0); // clone it since we are changing the object 
            modtask.chainParse(chain, 0, chainReturnCB);
            break;
         default:
            return chainReturnCB({ reason: "chains can only be arrays or functions" });
      }
   },


   chainParse: function(chain, index, chainReturnCB) {
      if (chain.length <= index) {
         chainReturnCB({ success: true, reason: 'chain done, total items: ' + (index-1) });
      } else {
         modtask.doChainItem(
           chain[index],
           index,
           chainReturnCB,
           // processChainItemCallback
           function(additionalChainItems) {
              if (additionalChainItems.length > 0) {
                 chain.splice.apply(chain, [index+1, 0].concat(additionalChainItems));
              }
              modtask.chainParse(chain, index+1, chainReturnCB);
           },
           // Dont eval
           false
         );
      }
   },

   doChainItem : function(chainItem, chainindex, chainReturnCB, processChainItemCallback, donteval) {
      if (!donteval) {
         if (typeof(chainItem) == "function") {
            modtask.evalDynamicItem(
              chainItem,
               function(outcome) {
                  if (outcome.success) {
                     modtask.doChainItem(outcome.data, chainindex, chainReturnCB, processChainItemCallback, true);
                  } else {
                     return chainReturnCB(outcome);
                  }
               }
            ); 
            return ; 
         }
      }
      
      if (chainItem.length == 0) {
         return chainReturnCB({ reason: "chainItem cannot be an empty array. Please remove it." });
      }

      var additionalChainItems = [];
      switch (modtask.modcore.realTypeOf(chainItem[0])) {
         case "string" : 
            break;
         case "array" : 
            if (chainItem.length > 1)
               additionalChainItems = chainItem.slice(1, chainItem.length);
            chainItem = chainItem[0];
            break;
         default:
            return chainReturnCB({ reason: "chainItem[0] must be a string." });
            break;
      }
      modtask.currentChainBeingProcessed.chainItemBeingProcessed = chainItem;
      modtask.currentChainBeingProcessed.processChainItem(chainItem , function() {
         processChainItemCallback(additionalChainItems);
      });
   }
}

modtask.evalDynamicItem = function(dynamicItemToBeEvaled, callback) {
   var chainContext = modtask.currentChainBeingProcessed.context;
   var pushfn = function(data) {
      callback({
         success: true,
         data: data
      });
   };
   pushfn.chainContext = chainContext;
   pushfn.outcome = chainContext.outcome || { reason: 'WARNING: set outcome for context internally since it didnot have one already'};
   try {
      dynamicItemToBeEvaled(pushfn, chainContext);
   } catch(e) {
      callback({
         reason: e.message + ' when dynamicItemToBeEvaled = ' + dynamicItemToBeEvaled.toString()
      });
   }
};