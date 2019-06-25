
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
            function(subChainToProcess, newIndex) {
               if (!newIndex && newIndex != 0) newIndex = index+1;
               if (subChainToProcess.length > 0) {
                  modtask.doChain(subChainToProcess, function(outcome) {
                     if (!outcome.success) return chainReturnCB(outcome);
                     modtask.chainParse(chain, newIndex, chainReturnCB);
                  });
               } else {
                  modtask.chainParse(chain, newIndex, chainReturnCB);
               }
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

      var subChainToProcess = [];
      switch (modtask.modcore.realTypeOf(chainItem[0])) {
         case "string" : 
            break;
         case "array" : 
            if (chainItem.length > 1)
               subChainToProcess = chainItem.slice(1, chainItem.length);
            chainItem = chainItem[0];
            break;
         default:
            return chainReturnCB({ reason: "chainItem[0] must be a string." });
            break;
      }
      modtask.setCallStackCurrentChainItem(chainItem, chainindex);
      if (chainItem[0] == 'replay') {
         return setTimeout(function() {
            processChainItemCallback(subChainToProcess, 0);
         }, 100);
      }
      modtask.$chain.processChainItem(chainItem , function() {
         processChainItemCallback(subChainToProcess);
      });
   }
}

modtask.setCallstackDynamicFlag = function(dynamicEval) {
   if (!modtask.$chain.chainItemBeingProcessed) {
      // Chain beings with a dynamic element
      modtask.setCallStackCurrentChainItem('Dynamic', 0);
   }
   modtask.$chain.chainItemBeingProcessed.dynamicEval = dynamicEval;
}

modtask.setCallStackCurrentChainItem = function(chainItem, chainindex) {
   modtask.$chain.chainItemBeingProcessed = {
      chainItem: chainItem,
      chainindex: chainindex
   };
}

modtask.evalDynamicItem = function(dynamicItemToBeEvaled, callback) {
   var chainContext = modtask.$chain.context;
   modtask.setCallstackDynamicFlag(true);
   var pushfn = function(data) {
      modtask.setCallstackDynamicFlag(false);
      callback({
         success: true,
         data: data
      });
   };
   modtask.$chain.copyKeysToNewContext(pushfn);
   try {
      dynamicItemToBeEvaled(pushfn, chainContext);
   } catch(e) {
      callback({
         reason: e.message + ' when evalDynamicItem. See callstack for details'
      });
   }
};