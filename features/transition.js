
var modtask = 
{
   sourcepart : false,
   sourcemodui : false,
   modcontroller : false,

   init : function()
   {
      modtask.modcore = modtask.ldmod("core\\core");
   },
 
   chainParse: function(chain, index, sourcepart, sourcemodui, callback, transitions, chainreturn)
   {
      if (!transitions) transitions = [];
      if (chain.length <= index)
      {
         callback(transitions, chainreturn);
      }
      else 
      {
         modtask.udtToTrans(
               chain[index],
               sourcepart, sourcemodui, index, 
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
                  modtask.chainParse(chain, index+1, sourcepart, sourcemodui,  callback, transitions, chainreturn);
               },
               // Dont eval
               false,
               chainreturn
         );
      }
   },   

   doChain : function(chain, sourcepart, sourcemodui, callback, chainparams) 
   {
      if (!chain) modtask.Fail("doChain.invalid.chain");
      var i;
      switch(modtask.modcore.realTypeOf(chain))
      {
         case "function" :
            modtask.modcontroller.moddyn.udtchain(
               chain,  
               sourcepart, sourcemodui,
               function(_chain) { modtask.doChain(_chain, sourcepart, sourcemodui, callback); },
               chainparams 
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
                           sourcepart, 
                           "doChain", 
                           "Set chain element[" + i + "] to a UDT array. Currently it is '" + modtask.modcore.realTypeOf(chain[i]) + "'"
                           );   
                  }
               } 
            }
            chain = chain.slice(0); // clone it since we are changing the object 
            modtask.chainParse(chain, 0, sourcepart, sourcemodui, callback); 
            break; 
         default:
            modtask.modcontroller.moderr.chain(chain, sourcemodui,  sourcepart, 
                  "doChain", 
                  "chains can only be arrays or functions");
      } 
   },  

   udtToTrans : function(udt, sourcepart, sourcemodui, chainindex, callback, donteval, chainreturn)
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
               sourcepart, sourcemodui, chainindex, 
               function(_udt) { modtask.udtToTrans(_udt, sourcepart, sourcemodui, chainindex, callback, true, chainreturn); },
               chainreturn
            ); 
            return ; 
         }
      }
      var _transition = 
      { 
         "udt" : udt, 
         "sourcepart" : sourcepart,
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
            _transition.what.part = sourcepart;
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
               callback(__transition, extra_udts); 
            }
       );      
   },     

   getPart : function(transition, index)
   {
      var part = transition.udt[index];
      switch(modtask.modcore.realTypeOf(part)) 
      {
         case "object" :
         case "function" : 
            break;
         case "boolean" : 
            part = transition.sourcepart;    
            break;
         default : 
            modtask.modcontroller.moderr.trans(
               transition, 
               "getPart", 
               "make sure that UDT[" + index + "] is referencing a valid part. It is currently of type '" + modtask.modcore.realTypeOf(part) + "'"
               );  
            break;
      }
      return modtask.modcontroller.moddyn.getRendered(part); 
   },      

   extPartToUDT : function(part)
   {
      var ret = [];
      switch(modtask.modcore.realTypeOf(part["what"]))
      {
         case "string":         
            ret = ["replace", part["what"], part];
            break; 
         case "array":
            modtask.Fail("extPartToUDT.deprecated"); 
         //    ret = ["replace", part["what"][0], part, part["what"][1]]; 
            break;
         default:
            modtask.modcontroller.moderr.trans(part, "what", "extPartToUDT", "'what' can only be a string or array. Get rid of the 'ext' and assign 'what' directly tp the part");
            break;    
      }
  		if (modtask.modcore.isUndef(ret[3])) ret[3] = {}; 
      return ret; 
   }   
}
