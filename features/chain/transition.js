
var modtask = 
{
   sourcepart : false,
   sourcemodui : false,
   modcontroller : false,

   init : function()
   {
      modtask.modcore = modtask.ldmod("core\\core");
   },

   doChain : function(chain, chainContext, sourcemodui, chainReturnCB)
   {
      if (!chain) modtask.Fail("doChain.invalid.chain");
      var i;
      switch(modtask.modcore.realTypeOf(chain))
      {
         case "function" :
            modtask.modcontroller.moddyn.udtchain(
               chain,
              chainContext, sourcemodui,
               function(_chain) { modtask.doChain(_chain, chainContext, sourcemodui, chainReturnCB); }
            ); 
            return ;
            break;
         case "array" :
            var i;
            if (chain.length > 0 && typeof(chain[0]) == "string")
            {
               chain = [chain];
            }
            else 
            {
               for(i=0; i < chain.length; ++i)
               {
                  switch(modtask.modcore.realTypeOf(chain[i]))
                  {
                    case "array":
                    case "function" :                     
                       break;
                    default:
                       modtask.modcontroller.moderr.chain(chain, 
                           sourcemodui,
                         chainContext,
                           "doChain", 
                           "Set chain element[" + i + "] to a UDT array. Currently it is '" + modtask.modcore.realTypeOf(chain[i]) + "'"
                           );   
                  }
               } 
            }
            chain = chain.slice(0); // clone it since we are changing the object 
            modtask.chainParse(chain, 0, chainContext, sourcemodui, chainReturnCB);
            break; 
         default:
            modtask.modcontroller.moderr.chain(chain, sourcemodui,  chainContext,
                  "doChain", 
                  "chains can only be arrays or functions");
      } 
   },


   chainParse: function(chain, index, chainContext, sourcemodui, chainReturnCB, transitions, chainreturn) {
      if (!transitions) transitions = [];
      if (chain.length <= index) {
         chainReturnCB({ success: true, reason: 'chain done, total items: ' + (index-1) });
      } else {
         modtask.udtToTrans(
           chain[index],
           chainContext, sourcemodui, index,
           chainReturnCB,
           function(_transition, extra_udts)
           {
              transitions.push(_transition);

              if (typeof(_transition) != "object")
                 modtask.Fail("Framework Error: _transition is not object!");

              if (_transition["chainreturn"])
              {
                 chainreturn = _transition["chainreturn"];
              }

              if (extra_udts.length > 0)
              {
                 chain.splice.apply(chain, [index+1, 0].concat(extra_udts));
              }
              modtask.chainParse(chain, index+1, chainContext, sourcemodui,  chainReturnCB, transitions, chainreturn);
           },
           // Dont eval
           false,
           chainreturn
         );
      }
   },

   udtToTrans : function(udt, chainContext, sourcemodui, chainindex, chainReturnCB, processChainItemCallback, donteval, chainreturn)
   {
      if (donteval)
      {
      }
      else 
      {
         if (typeof(udt) == "function")
         {
            modtask.modcontroller.moddyn.udt(
               udt,
              chainContext,
               function(outcome) {
                  if (outcome.success) {
                     _udt = outcome.data;
                     modtask.udtToTrans(_udt, chainContext, sourcemodui, chainindex, chainReturnCB, processChainItemCallback, true, chainreturn);
                  } else {
                     return chainReturnCB(outcome);
                  }
               }
            ); 
            return ; 
         }
      }
      var _transition = 
      { 
         "udt" : udt,
         chainContext: chainContext,
         // Keep this for backwards compatibility
         "sourcepart" : chainContext,
         "sourcemodui" : sourcemodui,
         "method" : "replace",  
         "what" : { 
            "method" : "",  // inline, ext 
            "part" : ""
         } 
      };  
      if (udt.length == 0)
         modtask.modcontroller.moderr.trans(
            _transition, 
            "udtToTrans", 
            "UDT cannot be an empty array. Please remove it.", 
            udt);  

      var extra_udts = [];
      switch (modtask.modcore.realTypeOf(udt[0]))
      {
         case "string" : 
            break;
         case "array" : 
            if (udt.length > 1)
               extra_udts = udt.slice(1, udt.length);
            udt = udt[0];
            break;
         default: 
            modtask.modcontroller.moderr.trans(
               _transition, 
               "udtToTrans", 
               "UDT[0] must be a string.", 
               udt); 
            break;
      } 
      _transition.udt = udt;      
      _transition.method = udt[0];
      if (udt.length < 2) udt[1] = false;
      if (udt.length < 3) udt[2] = false;  
      _transition.what.part = udt[1];
      switch(typeof(_transition.what.part))
      {
         case "string" : 
            _transition.what.method = "ext";
            break;
         case "object" : 
         case "function" :            
            _transition.what.method = "inline"; 
            break;  
         case "boolean" : 
            _transition.what.method = "inline";
            _transition.what.part = chainContext;
            break; 
         default : 
            modtask.modcontroller.moderr.trans(
               _transition, 
               "udtToTrans", 
               "make sure that UDT[1] is referencing a valid part.", 
               udt);  
            break;
      } 
      modtask.__modtask.doTransition(_transition , 
            function(__transition)
            {
               processChainItemCallback(__transition, extra_udts);
            }
       );      
   }
}
