module.exports = function() { 
var INLINESTORE = {};INLINESTORE["minicore"] = function() { 
var modtask = 
{
	platform : false,
	usermodule : false,

	// Kernel
	// Kernel.rootmodule [Minicore]
	// Kernel.rootmodule.usermodule [Usermodule at build time]
	// usermodule at a minimum must implement servicecallback  
	servicecallback : function(evt, platobject)
	{
 		if (evt == "systemstart")
		{
			// load the platform module first 
			// Do not use loadModuleInModtask. we dont want to override the Log, Sleep, etc. :)
			
			if (typeof(platobject) == "object" && typeof(platobject["overridehostingmodule"]) == "string")
			{
				modtask.platform = Kernel.loadModule(modtask, platobject["overridehostingmodule"]); 
				modtask.platform["platobject"] = platobject["platobject"];
			}
			else 
			{
				modtask.platform = Kernel.loadModule(modtask, "host/nodejs/base"); 
				modtask.platform["platobject"] = platobject;
			}				

			// redirect these to the platform counterparts 
			Kernel.Log = modtask.platform.Log;
			Kernel.Sleep = modtask.platform.Sleep;
			Kernel.exceptionToString = modtask.platform.exceptionToString;
			Kernel.getPlatformModule = function() { return modtask.platform; };
			Kernel.getBuildInfo = function() { return "2021-10-24 10:28:12"; } ;
			Kernel["getModulePath"] =  function(name)
			{
				if (typeof(modtask.platform.modspath[name]) != "string")
					Kernel.Fail("getModulePath " + name);
				return modtask.platform.modspath[name];
			};

			Kernel["getRootPathIfAny"] = function() {
				var ret = "";
				try { 
					if (typeof(Kernel.rootModule.usermodule["getRootPathIfAny"]) == "function")
						ret = Kernel.rootModule.usermodule["getRootPathIfAny"]();
				} catch(e) { }
				return ret;
			}
			// Fix these 
			modtask.Log = Kernel.Log;
			modtask.Sleep = Kernel.Sleep;
			modtask.exceptionToString = Kernel.exceptionToString;
			modtask.getPlatformModule = Kernel.getPlatformModule;
			Kernel["systemhealthymsg"] = "System Healthy. 100 percent pass rate for modules";
			var _userModuleSetupLog = Kernel.verbose.userModuleSetup; // Store in variable since it can be overwritten
			try 
			{
				if (_userModuleSetupLog) console.log('[userModuleSetup] loadModuleInModtask');
				modtask.usermodule = Kernel.loadModuleInModtask(modtask, "izymodtask/entrypoint");
				if (_userModuleSetupLog) console.log('[userModuleSetup] servicecallback');
				modtask.usermodule.servicecallback("init"); 
				if (_userModuleSetupLog) console.log('[userModuleSetup] done');
			}
			catch(e)
			{
 				var txt = "CRASH in usermodule: " + Kernel.exceptionToString(e);
 				modtask.platform.showUnhandledKernelExceptionMsg(txt);
				return txt;
			} 
		}
		return evt;
	},

	externalCall : function(obj, failed)
	{
		var msg = "";
		try 
		{
			if (failed)
			{
				msg = obj["p"];
			}
			else
			{
				return obj["fn"](obj["p"]);
			}
 		}
		catch(e)
		{
			failed = true;
			msg = Kernel.exceptionToString(e);
		}  
		var ctx = "";
		if (obj["context"])
			ctx = obj["context"];
		var txt = "externalCall " + ctx + " :::" + msg + "";
		modtask.platform.showUnhandledKernelExceptionMsg(txt);
		return txt;		
	},		

	getDependencies : function(moduleconfig)
	{
		var ret =  []; 
		return ret;		
	}
}
; return modtask;
 }; 
INLINESTORE["host/nodejs/base"] = function() { 
var modtask =
{
	platobject : false,

	modspath : 
	{
		"proc" : "host\\nodejs\\proc",
		"http" : "host\\nodejs\\http",
		"pinger" : "host/nodejs/pinger",
		"osdependentfilecommon" : "host/nodejs/filecommon"
	},

	getDependencies : function(moduleconfig)
	{
 		var ret = [];
		return ret;
	},

	getModulePath : function(name)
	{
		if (typeof(modtask.modspath[name]) != "string")
			Kernel.Fail("getModulePath " + name);
		return modtask.modspath[name];
	},

	endRuntime : function()
	{
		Kernel.Fail("endRuntime for nodejs");
	},		

 	showUnhandledKernelExceptionMsg : function(str)
	{
		try { console.log(str);} catch(e) { console.log("host.nodejs.showUnhandledKernelExceptionMsg.Failed"); }
	},		
	
	"Log" : function(s) 
	{
 		try { console.log(s); } catch(e) { console.log("host.nodejs.Log.Failed"); }
	},

	"Sleep" : function(miliseconds) 
	{
		console.log('sleep not available in webpack');
	},

	"exceptionToString" : function(e) 
	{ 
		var ret  = "";
		if (typeof(e["message"]) == "string")
		{ 	 
			ret = e.message;	
		}
		else  
		{
			ret = JSON.stringify(e);
		}
		return ret;   	
	}
}

; return modtask;
 }; 
INLINESTORE["izymodtask/entrypoint"] = function() { // both usermodule (izymodtask/entrypoint) and modtask/minicore.platform via host/nodejs/base
// see modtask/minicore.servicecallback for more details
// for usermodule reference see modtask/codegen/console/root.js

var modtask = function() {}

// Set from the index.js file
modtask.__contextualName = null;
modtask.__rootPathForAnchorDirectory = null;
modtask.__moduleSearchPaths = [];
modtask.verbose = {
  startup: false,
  setupSelectors: false,
  loadObject: false,
	loadModule: false,
  objectExist: false,
  iterateStoreChain: false,
  getObjectPath: false,
  iteratePathsToSearch: false
};

if (modtask.verbose.startup) console.log('entrypoint');

/************** Kernel Interfaces ****************/
modtask.platform = null; // set by modtask/minicore.servicecallback
modtask.Log = function(x) {
  console.log(x);
}
modtask.Sleep = function() {
  console.log('Warning, sleep not supported in nodejs');
}
modtask.exceptionToString = function(e) {
  return e.message;
}
modtask.showUnhandledKernelExceptionMsg = function(txt) {
  console.log('showUnhandledKernelExceptionMsg: ', txt);
}
modtask.modspath = {};
/* ^^^^^^^^^^^^^ Kernel Interfaces ^^^^^^^^^^^^^*/


/************** usermodule Interfaces ****************/
modtask.servicecallback = function(evt) {
  if (modtask.verbose.startup) console.log('servicecallback', evt);
  Kernel.verbose = modtask.verbose;
  if (Minicore.loadObjectOverwrite) {
    console.log('Selectors Already Setup');
  } else {
    // do it twice to force reload from the file system (if present)
		modtask.setupSelectors();
		modtask.setupSelectors();
  }
};

// getRootPathIfAny will tell the system where ljs.js is located at
// ITS a bad naming -- it is a Full File Path and that is why if non-empty, it should always end with /
// modtask/minicore will set Kernel.getRootPathIfAny to this
// kernel/extstores/file will use Kernel.getRootPathIfAny to calculate getAnchorDirectory (appends ./modtask to it)

modtask.getRootPathIfAny = function() {
  return modtask.__rootPathForAnchorDirectory;
}

// kernel/extstores/file uses this iteratePathsToSearch
modtask.getModuleSearchPaths = function() {
  return modtask.__moduleSearchPaths;
}

/* ^^^^^^^^^^^^^ usermodule Interfaces ^^^^^^^^^^^^^*/

modtask.setupSelectors = function() {
  if (modtask.verbose.setupSelectors) console.log('setupSelectors');
  var modsel = modtask.ldmod('kernel\\selectors');
  modsel.verbose = modtask.verbose;
  modsel.redirectStorage();
  // modsel.addStoreChain('kernel\\extstores\\file', true, modtask.verbose);
}

modtask.__$d = ['kernel\\selectors', 'kernel\\extstores\\file', 'host\\nodejs\\file', 'host\\nodejs\\filecommon'];
; return modtask;
 }; 
INLINESTORE["kernel\\selectors"] = function() { 
var modtask = {
	// gets set by loaders
	verbose: {

	},

	file : false,
	modstr : false,
	storemods : {},
	modsql : false,

	iterateModules : function(context) {
		modtask.iterateStoreChain(
		{
			"fn" : function(a,b, mod)
			{
				mod.iterateModules(context); 
			}
		}
		);
	},

	objectExist : function(objectname, details, loadtoo) {
		if (modtask.verbose.objectExist) console.log('objectExist [loadtoo = ' + loadtoo + ']', objectname);
 		if (typeof(details) != "object") details = {};
		details["chainstr"] = [];
		var exists = false;
		modtask.iterateStoreChain({
			"fn" : function(a, chainName, mod) {
				if (modtask.verbose.iterateStoreChain) console.log('delegate objectExist to: ' + chainName);
				details["chainstr"][details["chainstr"].length] = chainName;
				if (mod.objectExist(objectname, details, loadtoo)) {
					exists = true;
					return "break";
				} 
			}
		});
  		details["found"] = exists;
        modtask.objectExistsHook(objectname, details);
		return exists;
	},

   objectExistsHook : function() { },

	redirectStorage : function() {
		if (Minicore.loadObjectOverwrite == false)
			Minicore.loadObjectOverwrite = modtask.loadObject2;
		else
		{	
			// It should only be set to me :)
			if (Minicore.loadObjectOverwrite != modtask.loadObject2)
				modtask.Fail("redirectStorage called after already been set");		
		}
	},

	loadObject2 : function(_modtask, objecttype, objectname, inithash, donotcallinit, funcs) {
		if (modtask.verbose.loadObject) console.log('kernel/selectors.loadObject2', objectname);
		var ret ;
		// I am a singleton -- :-)
		if (objectname == modtask.__myname)
			return modtask; 

		if (typeof(funcs) != "object" || typeof(funcs["existfunc"]) != "function" || typeof(funcs["parsefunc"]) != "function") {
			var details = {};
			if (modtask.objectExist(objectname, details, true)) {
				ret = Minicore.rawLoadObject(_modtask, objecttype, objectname,
					function() {
						return details["obj"];
					});
			} else
				_modtask.Fail(Minicore.EncodeDecode_encodeErrorMessage("loadObject2", Minicore.ERR_DOESNOT_EXIST, objectname));
		}
		else 
		{
			ret =  Minicore.loadObject2(_modtask, objecttype, objectname, inithash, donotcallinit, funcs);

		}
		return ret;
	},

	getUnparsedObj : function(objref) {
		var details = { "unparsed" : true };
		if (modtask.objectExist(objref, details, true))
			return details["obj"];
		else 
			modtask.Fail("getUnparsedObj. not exists " + objref);
 	},

	augmentConfig : function(_modtask, failifnot, failforinfo) {
		var details = {};
		details["failifnot"] = failifnot;
		details["failforinfo"] = failforinfo;
		return modtask.configExists(_modtask, details, true);
	},

	configExists : function(_modtask, details, loadtoo) {
		if (typeof(_modtask["configname"]) != "string")
		{
			modtask.Fail("you must define 'configname' for " + _modtask.__myname + ", since it tries to augmentConfig");
		}
  		details["found"] = false;
		details["pathstrs"] = "";
		details["__modparent"] = _modtask.__myname;
		var paths = ["..\\thirdparty\\config\\" + _modtask.configname, "config\\" + _modtask.configname];
		for(i=0; i < paths.length; ++i)
		{
			details["pathstrs"] += ", " + paths[i];
	 		if (modtask.objectExist(paths[i], details, loadtoo))
			{
				details["found"] = paths[i];
				if (loadtoo)
				{
					details["obj"]["__modparent"] = _modtask;	
					modtask.augmentModule(_modtask, details["obj"]);
				}
				break;
			}
		}
 		if ((details["failifnot"] && details["found"] == false) || details["failforinfo"])
		{
 			modtask.Fail("augmentConfig.formatLoadInfo: " + modtask.formatLoadInfo(details));
		}
		return modtask;
	},

	getPathToCurrentConfigModule : function(_modtask) {
		var details = {};
		modtask.configExists(_modtask, details, false);
		if (details["found"])
			return details["found"];
		else 
			modtask.Fail("getPathToCurrentConfigModule " + _modtask.__myname);
 	},

	formatLoadInfo : function(details, breakdownformat) {
		var info = Minicore.newLine, p, i, chainstore;
		var chaininfo = "", foundinfo = "";

		foundinfo = (details["found"] ? "module found" : "module is missing" ) + Minicore.newLine;
		info += ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>" + Minicore.newLine;
		info += foundinfo;
		info += "__modparent: " + details["__modparent"] + Minicore.newLine;
		info +=	"Tried to load these modules: " + details["pathstrs"] + Minicore.newLine;
		info += "Chains where: ";
		for(i=0; i < details["chainstr"].length; ++i)
		{
			chainstore = details["chainstr"][i];
			chaininfo += Minicore.newLine + chainstore;
			if (details[chainstore])
			{
				chaininfo += " [ ";
				for(p in details[chainstore])
					chaininfo += details[chainstore][p] + " ";
				chaininfo += " ] ";
			}
		}		
		chaininfo += Minicore.newLine;
		info += chaininfo;
		if (details["found"])
		{
			info += "storagetype: " + details["storagetype"] + Minicore.newLine; 
			info += "__loadObject2Path: " + details["obj"]["__loadObject2Path"] + Minicore.newLine ;
			info += "OBJECTDUMP";
			for(p in details["obj"])
				info += Minicore.newLine + "  " + p + ": " + details["obj"][p];
		}
 		info += "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<" + Minicore.newLine;

		if (breakdownformat)
		{
			return { "chaininfo" : chaininfo, "foundinfo" : foundinfo} ;
		}
		else 
		{
			return info;
		}
	},

	getValidator : function() {
		var ret =false;
		if (modtask.objectExist("codegen\\validator"))
			ret = modtask.ldmod("codegen\\validator");
		return ret;
	},

	augmentModule : function(obj1, obj2) {
		var p;
		if (!obj2)
			return obj1;
		for(p in obj2)
		{
			if (p.indexOf("__") == 0)
				continue;
			obj1[p] = obj2[p];
		}
		return obj1;
	},

	validateConfig : function(_modtask, prop, type)
	{	
		if (typeof(_modtask[prop]) != type)
 			modtask.Fail("validateConfig failed for " + prop + " on " + _modtask.__myname); 
		return modtask;
	},


	init : function() {
		modtask.modstr = Kernel.loadModuleInModtask(modtask, "core\\string"); 
		modtask.addStoreChain("kernel\\extstores\\inline");
 	},			

	iterateStoreChain : function(ctx) {
		var p, i=0;
		var order = ["kernel/extstores/webstorage", "kernel\\extstores\\file", "kernel\\extstores\\inline"];
		var j;
		for(j=0; j < order.length; ++j) {
			p = order[j]; 
			if (modtask.storemods[p]) {
				if (modtask.verbose.iterateStoreChain) console.log('iterateStoreChain', p);
				if (ctx["fn"](i++, p, modtask.storemods[p]) == "break")
					break;
			}
		}
	},

	reconfigStoreChain : function(chainname, failifnot, failforinfo)
	{
		modtask.augmentConfig(modtask.storemods[chainname], failifnot, failforinfo); 	
	},

	addStoreChain : function(chainname, allowredo, verbose) {
		// Avoid loops 
		if (typeof(modtask.storemods[chainname]) == "object" && !allowredo)
			return modtask.storemods[chainname];
		modtask.storemods[chainname] = modtask.ldmod(chainname);
		modtask.storemods[chainname].verbose = verbose || {};
		modtask.reconfigStoreChain(chainname); 		
		if (typeof(modtask.storemods[chainname]["afterAdd"]) == "function")
			modtask.storemods[chainname]["afterAdd"](modtask);
		modtask.storemods[chainname]["ldmod"] = function(x) { modtask.Fail("StoreChain may only loadObject/ldmod on init. Fix this for " + chainname); } ;
		return modtask.storemods[chainname];
	},		

	getDependencies : function(moduleconfig)
	{
 		var ret = 
		[
			["modtask", "core\\string"],
			["modtask", "kernel\\extstores\\inline"]  
		];
		return ret;
	}	
}
; return modtask;
 }; 
INLINESTORE["core\\string"] = function() { 
var modtask = 
{
	VERIFY_STRING2 : function(res, val)
	{
		return modtask.VERIFY_STRING(modtask, res, val);
	},

	VERIFY_STRING : function(ctx, res, val)
	{		
		if (res != val || typeof(res) == "undefined" || typeof(val) == "undefined")
			ctx.Fail(Minicore.newLine + "VERIFY_STRING(" + Minicore.newLine + "'" + (res + "").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t") + "'" + Minicore.newLine + " !=  " + Minicore.newLine +  "'" + val + "')");
	},

	VERIFY_SUBSTRING2 : function(res, val)
	{
		if (typeof(res) == "undefined" || typeof(val) == "undefined" || !modtask.contains(res, val))
			modtask.Fail("VERIFY_SUBSTRING(" + Minicore.newLine + "'" + res + "'" + Minicore.newLine + " NOT_SUPERSTRING " + Minicore.newLine +  "'" + val + "')");
	},		

	splitLast : function(str, token)
	{
		var tmp = str.split(token);
		if (tmp.length <2) modtask.Fail("splitLast." + str + "." + token);
		var ret = [];
		ret[0] = "";
		ret[1] = tmp[tmp.length-1];
		ret[0] = str.substr(0, str.length-ret[1].length-token.length);
		return ret;
	},		
	
	replaceTokens : function(content, tokens)
	{
		var p;
		for(p in tokens)
		{
			var exp = p.replace(/\\/g, "\\\\").replace(/\[/g,"\\[").replace(/\$/g, "\\$").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
 			var re = new RegExp(exp,"g");
			content = content.replace(re, tokens[p]);		
		}
		return content;
	},

	toByteArray : function(str)
	{
		var i, ret = [];
		for(i=0; i < str.length; ++i)
			ret[i] = str.charCodeAt(i);
	       return ret;	
	},
		
	trim : function(str, extra)
	{
		str = str.replace(/^\s+|\s+$/g, "");		
		if (extra == "nonprintable")			
			str = str.replace( /[^a-zA-Z0-9\s-@\.\<\>="'_\\\&,\/]/g, ""); 
		return str;
	},

	contains : function(str1, str2)
	{
		var i;
		if (typeof(str2) == "object")
		{
			for(i=0; i < str2.length; ++i)
				if (modtask.contains(str1, str2[i]))
					return true; 
		}
		str1 = str1 + "";str2 = str2 + "";
		return (str1.indexOf(str2) >= 0);
	},

	noCapsPresent : function(str)
	{
		return str.match(/[A-Z]+/) == null;

	},


	strClean1013 : function(str, rpl, keep1013)
	{
		var ret = "";
		var i;
		for(i=0; i < str.length; ++i)
		{
			if (str.charCodeAt(i) == 13 || str.charCodeAt(i) == 10)
			{
				if (keep1013)
					ret += str.substr(i,1);			
				if (rpl)
					ret += rpl
				continue;
			}
			else 
				ret += str.substr(i,1);

		}
		return ret;
	},	

	startsWith : function(str1, str2)
	{
		var core = modtask.ldmod("core\\core");
		if (core.realTypeOf(str2) == "array")
		{
			var p;
			for(p in str2)
			{
				if (this.startsWith(str1, str2[p]))
					return true;
			}
			return false;
		}
		if (str1.length >= str2.length)
		{
			if (str1.substr(0, str2.length) == str2)
				return true;
		}
		return false;
	},		

	endsWith : function(str1, str2)
	{
		if (str1.length >= str2.length)
		{
			if (str1.substr(str1.length-str2.length, str2.length) == str2)
				return true;
		}
		return false;
	},

	nSpace: function(s,n)
	{
		return modtask.nStrrpt(s, n, " ");
	},

	nStrrpt : function(s,n, str)
	{
		var ret = s + "";
		while(ret.length < n)
			ret += str;
		return ret;
	},

	twoDigits : function(s)
	{
		if (s < 10)
			return "0" + s;
		else 
			return s;
	},

	randomNDigit : function(n)
	{
		var i;
		var ret = "";
		for (i=0; i < n ; ++i)
			ret += (Math.round(Math.random()*1000) + "").substr(0,1);
		return ret;
	},

	getDependencies : function(moduleconfig)
	{
		var ret =  
		[
			["modtask", "core\\core"] 
		]; 
		return ret;		
	} 
}

; return modtask;
 }; 
INLINESTORE["core\\core"] = function() { 
var modtask = 
{
	isUndef : function(v)
	{
		return (typeof(v) == "undefined");
	},

	realTypeOf : function(v) {
	  if (typeof(v) == "object") {
	    if (v === null) return "null";
		// The constructor based approach (v.constructor == (new Array).constructor ) does not work
		  // when objects are compared cross window (i.e. ide editor)
		  if (Object.prototype.toString.call(v) == Object.prototype.toString.call([])) return "array";
	    if (v.constructor == (new Date).constructor) return "date";
	    if (v.constructor == (new RegExp).constructor) return "regex";
	    return "object";
	  }
	  return typeof(v);
	},        

	arrayMatch : function(p, arr)
	{
		var i;
		for(i=0; i < arr.length; ++i)
			if (p.match(arr[i]))
				return true;
		return false;
	},
		
	arrayIndexExactMatch : function(p, arr)
	{
		var i;
		for(i=0; i < arr.length; ++i)
		{
			if (p == arr[i])
				return i;
		}
		return -1;
	},

	verifyArgs : function()
	{
		modtask.Fail('deprecated/use/core/verify.verifyArgs');
	},

	augmentObject :function(obj1, obj2)
	{
		var p;
		if (!obj2)
			return obj1;
		for(p in obj2)
			obj1[p] = obj2[p];
		return obj1;
	},

	augmentArray : function(arr1, arr2)
	{
		var i;
		var j = arr1.length;
		for(i=0; i < arr2.length;++i)
			arr1[j++] = arr2[i];
		return arr1;
	},

   cloneFunction : function(fn, max, now)
   {
    var that = fn;
    var temp = function temporary() { return that.apply(fn, arguments); };
    for( key in fn ) {
        temp[key] = modtask.cloneObject(fn[key], max, now + 1);
    }
    return temp;
   },                  

	cloneObject : function(obj, max, now) 
   {
      if (!max) max = 10;
      if (!now) now = 1;
      if (now > max)
         modtask.Fail("cloneObject.cannot.go.deeper than." + max);

      if (typeof(obj) == "function")
         return modtask.cloneFunction(obj, max, now);       
      if(obj == null || typeof(obj) != 'object')
         return obj; 
      if (modtask.realTypeOf(obj) == "array")
         return obj.slice(0);  
      var temp = {};       
      for(var key in obj)
         temp[key] = modtask.cloneObject(obj[key], max, now+1);
      return temp;
	},

   // order is important 
	patchObject : function(obj, patch)
        {
		var newobj = modtask.cloneObject(obj);
		var p;
		for(p in obj) if (!modtask.isUndef(patch[p])) newobj[p] = patch[p]; 
		return newobj;
	}, 		      

	arrayIndexMatch :function(p, arr, reverse)
	{
		var i;
		p = p + "";
		for(i=0; i < arr.length; ++i)
		{
			if (p.length > 0 && arr[i].length < 1)
				continue;
			if (reverse)
			{
				if (arr[i].match(p))
					return i;
			}
			else 
			{
				if (p.match(arr[i]))
					return i;
			}
		}
		return -1;
	},

	objToArr : function(obj)
	{
		var p, ret = [];
		for(p in obj) ret[ret.length] = p;
		return ret;
	},		

	getFirstElement : function(obj)
	{
		var p;
		for(p in obj) { break; } ;		
		return p;
	},

	isEmpty : function(obj)
	{
		var p;
		for(p in obj) return false;
		return true; 
	},

	obj : function(p, v) { var ret = {}; ret[p] = v; return ret; } 
}
; return modtask;
 };

 INLINESTORE["kernel\\extstores\\webpack"] = function() { 
	var modtask =
	{
		configname : "kernel\\extstores\\webpack",
	
		objectExist : function(objectname, details, loadtoo)
		{
			var extensions = ['.js', '.ts'];
			var pathPrefixes = ['./', './node_modules/izy-proxy/']
			var cachedModule = null;
			var isTypeScriptModule = false;
			for(var j=0; j < pathPrefixes.length && !cachedModule; ++j) {
				for(var i=0; i < extensions.length && !cachedModule; ++i) {
					var webpackPath = pathPrefixes[j] + objectname + extensions[i];
					if (extensions[i] == '.ts') isTypeScriptModule = true;
					cachedModule = __webpack_module_cache__[webpackPath];
				}
			}
			if (!cachedModule || !cachedModule.loaded) return false;

			// console.log(modtask.configname, { objectname, details, loadtoo, cachedModule });
			
			details["storagetype"] = "inline"; 
			if (loadtoo)
			{
				if (details["unparsed"] == true) {
					console.log('WARNING_NOT_SUPPORTED');
					// details["obj"] = Minicore.getInlineJScriptForObj(objectname); 
				} else {
					details["obj"] = cachedModule.exports;
					if (isTypeScriptModule && details["obj"].default) details["obj"] = details["obj"].default;
					details.obj = Minicore.postProcessNodeJSModule(details.obj, objectname);
					// Minicore.loadObject2(modtask, "modtask", objectname, false, true);
				}
			}	
			return true;
		},
	
		// todo: include relative pathinformation in the second param 	
		iterateModules : function(context) 
		{
			if (typeof(INLINESTORE) == "object")
			{
				var p ;
				for(p in INLINESTORE)
				{
					// var name = p.split("\\");
					// name = name[name.length-1];			
					var name = p;
					context["fn"]("", "", name);
				}
			}
		}	
	}
	; return modtask;
	 };


INLINESTORE["kernel\\extstores\\inline"] = function() { 
var modtask =
{
	configname : "kernel\\extstores\\inline",

 	objectExist : function(objectname, details, loadtoo)
	{
		var exists = false;
		if (!exists)
		{
			details["storagetype"] = "inline"; 
			exists = Minicore.objectExist("modtask", objectname); 
			if (exists && loadtoo)
			{
				if (details["unparsed"] == true)
				{
					details["obj"] = Minicore.getInlineJScriptForObj(objectname); 
				}
				else 
				{
					details["obj"] = Minicore.loadObject2(modtask, "modtask", objectname, false, true);
				}
			}
		}
		if (!exists) {
			return INLINESTORE["kernel\\extstores\\webpack"]().objectExist(objectname, details, loadtoo);
		}
		return exists;
	},

	// todo: include relative pathinformation in the second param 	
	iterateModules : function(context) 
	{
		if (typeof(INLINESTORE) == "object")
		{
			var p ;
			for(p in INLINESTORE)
			{
				// var name = p.split("\\");
				// name = name[name.length-1];			
				var name = p;
				context["fn"]("", "", name);
			}
		}
	}	
}
; return modtask;
 }; 
INLINESTORE["kernel\\extstores\\file"] = function() { 
var modtask =
{
	verbose: {},
   seperator : '/',
	defaultPathsToSearch : [],
	externalPathResolver : false,
	pathCache : {},
	file : false,
	modstr : false,
	getparseerrorinfo : true,
	modsel : false, 
	modpath : false,
	extentionstr : ".js",
	configname : "kernel\\extstores\\file",
 
	afterAdd : function(modsel)
	{
		modtask.modsel = modsel;
	},

	objectExist : function(objectname, details, loadtoo) {
		var exists = false, decodefunc = function(str) { return str; };
		if (!exists) {
			details["storagetype"] = "file";
			var pth = modtask.getObjectPath(objectname, true, details);
			if (pth != false)
				exists = modtask.file.FileExists(pth);
			if (exists) {
        details["objpath"] = pth;
        if (loadtoo) {
           if (details["unparsed"] == true) {
	            if (modtask.verbose.loadObject) console.log('loadObject via kernel/extstores/file.objectExist: ' + byname);
              details["obj"] = modtask.file.readFile(pth);
           } else {
              if (modtask.modstr.contains(pth, "needsobfuscate")) {
                 modtask.Fail("needsobfuscate not implemented");
              }
              details["obj"] = modtask.loadFromFileParseFunc(modtask, pth, "modtask", decodefunc);
           }
        }
			}
		} 
		return exists;
	},

	iterateModules : function(context) 
	{
		var tmpcontext1 = {
			"fn" : function(a, b, path) {
				if (!modtask.file.folderExists(path)) {
					return;
				}
				var tmpcontext = {
					"path" : path,  
					"fn" : function(a, b, taskname)
					{
						if ((!modtask.modstr.endsWith(taskname, "~")) && modtask.modstr.endsWith(taskname, modtask.extentionstr)) 
						{
							taskname = taskname.split(".")[0];
							context["fn"]("", "", taskname);
						}					
					}
				};
				modtask.file.iterateFoldercontent(modtask, tmpcontext);	 
			} 
		};
		modtask.iteratePathsToSearch(tmpcontext1);
 	},

 	getObjectPath : function(byname, dontfailifnotexist, details) {
		if (modtask.verbose.getObjectPath) console.log('getObjectPath', byname);
		var ret = false;

	  var probePathExists = function(pth) {
		  var exists = modtask.file.FileExists(pth);
		  if (modtask.verbose.getObjectPath) console.log('getObjectPath [' + byname + '], testing: ' + pth + ', exists=' + exists);
		  return exists;
	  }

 		if (modtask.pathCache[byname]) {
		} else {
			var tmpcontext = {
				"fn" : function(a, b, path) {
					ret = modtask.file.pathCombine(path, byname + modtask.determineExtension(byname));
					ret = modtask.kernelpath.normalize(ret);
					if (typeof(details) == "object") {
						if (!details[modtask.__myname]) {
							details[modtask.__myname] = { "chainstr" : "" };
						}
						details[modtask.__myname]["chainstr"] += ", " + ret;
					}
					if (probePathExists(ret)) {
						return "true";
					} else {
						ret = false;
					}
				} 
			};
		  // if begins with / first check the absolute path exists
		  // If not, then just fall back into searching everything else by removing the front slash
		  if (byname.indexOf('/') == 0) {
			  ret = byname + modtask.determineExtension(byname);
			  ret = modtask.kernelpath.normalize(ret);
			  if (!probePathExists(ret)) {
				  byname = byname.substr(1, byname.length-1);
				  modtask.iteratePathsToSearch(tmpcontext);
			  }
		  } else {
			  modtask.iteratePathsToSearch(tmpcontext);
		  }
			if (ret == false) {
				if (dontfailifnotexist) {
					modtask.pathCache[byname] = false;
				} else {
					modtask.Fail("getObjectPath.object not found " + byname);
				}
			} else
				modtask.pathCache[byname] = ret;
		}
		return modtask.pathCache[byname]; 
	},

	iteratePathsToSearch : function(context) {
		var paths = modtask.defaultPathsToSearch;
		var anchorpath = modtask.getAnchorDirectory();
		if (typeof(modtask.externalPathResolver) == "function") {
			paths = modtask.externalPathResolver(modtask);
		}

		if (typeof(Kernel.rootModule.usermodule.getModuleSearchPaths) == 'function') {
			paths = Kernel.rootModule.usermodule.getModuleSearchPaths().concat(paths);
		}

 		var i, path;
		if (modtask.verbose.iteratePathsToSearch) console.log('iteratePathsToSearch.paths', paths);
		for(i=0; i < paths.length; ++i) {
			path = modtask.modminipath.pathMap(paths[i]);
			if (!modtask.modstr.endsWith(path, modtask.seperator))
				modtask.Fail("iteratePathsToSearch has and entry that doesn't end in '" + modtask.seperator + "'. Please make sure the entry " + i + "(" + path + ") in config/kernel/extstores/file.js+getModuleSearchPaths ends with " + modtask.seperator );

			if (path.indexOf('rel:') == 0) {
				if (modtask.verbose.iteratePathsToSearch) console.log('iteratePathsToSearch.using anchor path [' + anchorpath + '] for path', path);
				path = path.replace(/^rel:/, '');
				path = modtask.file.pathCombine(anchorpath, path);
			}	
			if (context["fn"]("", "", path) == "true")
				break;
		}
	},	

	loadModuleInModtaskFromPath : function(_modtask, path, decodefunc)
	{
		if (typeof(decodefunc) != "function")
			decodefunc = function(str) { return str; };	

		var funcs = 
		{
			existfunc : function(objecttype, objectname) { return modtask.file.FileExists(objectname); } ,
			parsefunc : function(_modtask, objname, objecttype) { return modtask.loadFromFileParseFunc(_modtask, objname, objecttype , decodefunc); }
		}
		// true means do not validate
		return Kernel.loadModuleInModtask(_modtask, path, true, funcs);
	},

	// NOTE: Things get messed up when trying to load a modtask with the conflicting properties as ourselves.
	// One example is the config module for us :)
	loadFromFileParseFunc : function(_modtask, objname, objecttype, decodefunc) {
		if (modtask.verbose.loadObject) console.log('loadObject via kernel/extstores/file.loadFromFileParseFunc: [' + objecttype + '] ' + objname);
		var __tempobjstore = "";
		try {
			var unparsedstrform = decodefunc(modtask.file.readFile(objname));
			var token = 'izy-loadobject nodejs-require';
			if (typeof(require) == 'function' && (Kernel.forceRequireOnLoadFromFile || unparsedstrform.indexOf('/* ' + token + ' */') > -1)) {
				var requirePath = objname;
				if (requirePath.indexOf('./') == 0) {
					console.log('[warning] converting to fullPath', requirePath);
					requirePath = process.cwd() + '/' + requirePath;
				}
				// Critical dependency: the request of a dependency is an expression
				// __tempobjstore = require(objname);
				console.log('WILL FAIL: Critical dependency: the request of a dependency is an expression')
				__tempobjstore = {};
				__tempobjstore = Minicore.postProcessNodeJSModule(__tempobjstore, objname, requirePath);
			} else {
				__tempobjstore = Minicore.nakedParseStr(_modtask, objname, objecttype, unparsedstrform);
				__tempobjstore["__loadObject2Path"] = objname;
			}
		} catch(e) {
			var err = "loadFromFileParseFunc " + Minicore.newLine;
			if (e.stack) {
				err += e.stack;
			} else {
				err += "file   : " + objname + Minicore.newLine;
				err += "error  : " + modtask.exceptionToString(e) + Minicore.newLine;
			}
			_modtask.Fail(err);
		}
 		return __tempobjstore;
	},	
	
	getAnchorDirectory : function() {
		var path = modtask.file.getPathNameFromFullPath(Kernel.getRootPathIfAny());
		if (path.length == 0)
			path = ".";
		if (path.substr(path.length-1, 1) == modtask.seperator) {
			path = path.substr(0, path.length-1);
		}
 		return path + modtask.seperator + "modtask";
	},

	init : function() {
		modtask.modpath = modtask.ldmod("path");
	   modtask.file = modtask.ldmod("file");	
		modtask.modstr = modtask.ldmod("core\\string");
		modtask.modminipath = modtask.ldmod("minipath");
		modtask.seperator = modtask.modminipath.seperator;
		modtask.kernelpath = modtask.ldmod('kernel/path');
    modtask.defaultPathsToSearch = [
      'rel:' + modtask.seperator, // anchorpath/modtask
	    'rel:' + modtask.seperator + '..' + modtask.seperator // anchorpath
    ];
	},
 
	getDependencies : function(moduleconfig) {
 		var ret = [
		  ['modtask', 'minipath'],
			['modtask', 'file'],
			['modtask', 'path'],
		  ['modtask', 'core\\string'],
		  ['modtask', 'kernel/path']
		];
		return ret;
	}		
}

// We cannot use core/string because ldmod is not available here :(
modtask.endsWith = function(str1, str2) {
	if (str1.length >= str2.length) {
		if (str1.substr(str1.length-str2.length, str2.length) == str2) return true;
	}
	return false;
};

//
// Note no ldmod, etc. are allowed. This is a kernel level functionality
//
modtask.determineExtension = function(basepath) {
	var exclusionList = ['.html', '.css'];
	var i;
	for(i=0; i < exclusionList.length; ++i) {
		var item = exclusionList[i];
		if (modtask.endsWith(basepath, item)) return '';
	}
	return modtask.extentionstr;
}
; return modtask;
 }; 
INLINESTORE["minipath"] = function() { 
var modtask = {};
modtask.seperator = "/";
modtask.pathMap = function(path)
{
	path = path + "";
	switch(modtask.seperator)
	{
		case "/" :
			path = path.replace(/\\/g, modtask.seperator);
			break;
		case "\\" :
			path = path.replace(/\//g, "\\");
			break;
	}				
	return path; 
};
modtask.init = function()
{
	if (modtask.ldmod("kernel/plat").getOSName() == "windows")
	{
		modtask.seperator = "\\";
	};
}

modtask.getDependencies = function() { return [['modtask', 'kernel/plat']]; };
; return modtask;
 }; 
INLINESTORE["kernel/plat"] = function() { 
var modtask = {};
modtask.getOSName = function()
{
	var ret = 'unix';
	if (Minicore.rootModule.platform.__myname.indexOf('cscript') > 0)
		ret = 'windows';
	return ret; 
};
; return modtask;
 }; 
INLINESTORE["file"] = function() { 
var modtask =
{
	str : false,
   verbose : false, 	

seperator : "/",
newLine : "\r\n",


	getDependencies : function(moduleconfig)
	{
 		var ret = 
		[
	       		["modtask", "core\\string"],
			["modtask", "kernel\\logging"],
			["modtask", "minipath"]
		];
		return ret;
	},

	init : function()
	{
		modtask.modminipath = modtask.ldmod("minipath");
		modtask.seperator = modtask.modminipath.seperator;

		
		modtask.str = modtask.ldmod("core\\string"); 
		var _File = {}; // modtask.ldmod(Kernel.getModulePath("file"));
		if (_File["afterInit"])
			_File["afterInit"](modtask);

		modtask.ldmod("kernel\\logging").makeVerboseSensitive(modtask);
 
		modtask.FileExists = function(path)		
		{
			return _File.FileExists(modtask.modminipath.pathMap(path));
		};
		modtask.folderExists = function(path)
		{
			return _File.folderExists(modtask.modminipath.pathMap(path));
		};
		modtask.mappedCopy = _File.mappedCopy;
		modtask.iterateFilecontent = function(_modtask, context)  
		{
		if (!context["path"])
			_modtask.Fail("path not set");

		context["path"] = modtask.modminipath.pathMap(context["path"]);
		 _File.iterateFilecontent(_modtask, context);
		};
		modtask.iterateFilecontent2 = function(context) { return modtask.iterateFilecontent(modtask, context); } ;  

		modtask.iterateFoldercontent = function(_modtask, context)
		{
			if (!context["path"])
				_modtask.Fail("iterateFoldercontent.path not set");
			context["path"] = modtask.modminipath.pathMap(context["path"]);
			return _File.iterateFoldercontent(_modtask, context);
		}
		modtask.iterateFoldercontent2 = function(context) { return modtask.iterateFoldercontent(modtask, context); } 

		modtask.createFolder3 = function(path) { return modtask.createFolder2(modtask, path); } ;
		modtask.createFolder2 = 
		function(_modtask, path)
		{	
			path = modtask.modminipath.pathMap(path);
			return _File.createFolder2(_modtask, path);
		};
		modtask.removeFolder = function(_modtask, destdir)
		{
			return _File.removeFolder(_modtask, modtask.modminipath.pathMap(destdir));
		};
		modtask.removeFolder2 = function(path) { return modtask.removeFolder(modtask, path); } ;

		modtask.getTempFullFilePath = _File.getTempFullFilePath;
		modtask.getTempFullPath = _File.getTempFullPath;		

		// This is the one that adds \r\n at the end 
		modtask.writeToTextFile = function(file, str)
		{
			return modtask.writeFile(file, str + modtask.newLine);
		}

		 // This is the good one 
		modtask.writeFile = function(file, str)
		{
			return _File.writeFile(modtask.modminipath.pathMap(file), str);
		}
	
		modtask.deleteFile = function(path) { return _File.deleteFile(modtask.modminipath.pathMap(path)); } ;
		modtask.readFileEx = function(_modtask, path, absolute)
		{
			path = modtask.modminipath.pathMap(path);
			return _File.readFileEx(_modtask, path, absolute);
		};

		modtask.readFile = function(path) { return modtask.readFileEx(modtask, path, true); } ;  
		modtask.appendToFile = function(path, str)
		{
			return _File.appendToFile(modtask.modminipath.pathMap(path), str);
		}
		modtask.MoveFile = function(_modtask, src, dst)
		{
			return _File.MoveFile(_modtask, modtask.modminipath.pathMap(src), modtask.modminipath.pathMap(dst));
		}
		modtask.MoveFile2 = function(src, dest) { return _File.MoveFile(modtask, src, dest); };

		modtask.fileCreatedInDir = _File.fileCreatedInDir;
	},

	// Will forcefully write file. Createfolder if not exists
	forceWriteFile : function(fullpath, content)
	{
		fullpath = modtask.modminipath.pathMap(fullpath);
 		var folder = modtask.getPathNameFromFullPath(fullpath);
		if (!modtask.folderExists(folder))
			modtask.createFolder3(folder);
		return modtask.writeFile(fullpath, content); 		
	},

	getTempDir : function()
	{
		return modtask.getPathNameFromFullPath(modtask.getTempFullFilePath("prefix"));
	},	

	copy : function(fullsourcepath, destdir, destfilename)
	{
		fullsourcepath = modtask.modminipath.pathMap(fullsourcepath);
		destdir = modtask.modminipath.pathMap(destdir);

		var srcpath = modtask.getPathNameFromFullPath(fullsourcepath);
		var srcname = modtask.getFilenameFromFullPath(fullsourcepath);
		var map = {};
		if (!destfilename)
			destfilename = srcname;
		map[srcname] = destfilename;
		return modtask.mappedCopy(map, srcpath, destdir);
	},
 

	generateFileFromTemplate : function(_modtask, templatefile, outputfile, tokens)
	{
		var modstr = modtask.ldmod("core\\string");

		templatefile = modtask.modminipath.pathMap(templatefile);
		outputfile = modtask.modminipath.pathMap(outputfile);


		modtask.Log("generating " + outputfile);
		var content = modtask.readFileEx(modtask, templatefile, true);			
		modtask.writeToTextFile(outputfile, modstr.replaceTokens(content, tokens));		
	},	

	getFilenameFromFullPath : function(fullpath)
	{
		fullpath = modtask.modminipath.pathMap(fullpath);
		var tmp = fullpath.split(modtask.seperator);
		return tmp[tmp.length-1];
	},	

	// we cannot reference this back to kerne\\path -- because of the chain loader 
	getPathNameFromFullPath : function(fp)
	{
		fp = modtask.modminipath.pathMap(fp);
		var ret = "", i=0;
		var tmp = fp.split(modtask.seperator);
		for(i=0; i < tmp.length - 1; ++i)
			ret += tmp[i] + modtask.seperator;
		return ret;  
	},

	pathCombine : function(path1, path2)
	{
		path1 = modtask.modminipath.pathMap(path1);
		path2 = modtask.modminipath.pathMap(path2);


		if (typeof(path1) != "string" || typeof(path2) != "string")
			modtask.Fail("pathCombine: path1 or path2 nonstrings");

		if (path1.length == 0)
			return path2;
		if (path2.length == 0)
			return path1;

		var ret = path1 + modtask.seperator + path2 + modtask.seperator;
		ret = modtask.strCleanDoubleBackSlash(ret, modtask.seperator);
		if (ret.substr(ret.length-1, 1).indexOf(modtask.seperator) == 0)
			ret = ret.substr(0, ret.length-1);
		return ret;
	},

	emptyFolder : function(path)
	{
		modtask.removeFolder2(path);
		modtask.createFolder3(path); 
	},		

	// jscript regex bug: 	ret.replace(/\\\\/g, "\\") does not work!!!
	strCleanDoubleBackSlash : function(str, rpl)
	{
		var dbl = modtask.seperator + modtask.seperator;
		while(str.indexOf(dbl) >= 0)
			str = str.replace(dbl, rpl);
		return str;
	},


	 
	getDependencies : function(moduleconfig)
	{
 		var ret = 
		[
			["modtask", "core\\string"],
			["modtask", "kernel\\logging"],
			["modtask", "minipath"] 
		];
		return ret;
	}
}
; return modtask;
 }; 
INLINESTORE["kernel\\logging"] = function() { 
var modtask = 
{
	makeVerboseSensitive : function(mod)
	{
		if (typeof(mod["verbose"]) == "boolean")
		{
			mod["tmplog"] =mod["Log"];
			mod["Log"] = function(x, doit, dontloop) { if (doit || mod["verbose"] == true) return mod["tmplog"](x, doit); } 
		}
	}
}
; return modtask;
 }; 
INLINESTORE["path"] = function() { 
var modtask = 
{
	getRelativePath : function(fullPath, rootPath)
	{
		if (typeof(fullPath) != "string")
			modtask.Fail("getRelativePath  fullPath");

		if (typeof(rootPath) != "string")
			modtask.Fail("getRelativePath  rootPath");
	
		if (rootPath.length == 0)
			return fullPath;

		// On windows, drive is optional, so make sure that the drive is present on both strings 
		if (fullPath.indexOf(":") < 0)
			fullPath = "x:" + fullPath;
		if (rootPath.indexOf(":") < 0)
			rootPath = "x:" + rootPath;

		fullPath = fullPath.substr(2, fullPath.length-2);
		rootPath = rootPath.substr(2, rootPath.length-2);

		if (!modtask.modstr.startsWith(fullPath, rootPath))
		{
			// It could be because of ..
			fullPath = this.eliminateDoubleDot(fullPath);	
			rootPath = this.eliminateDoubleDot(rootPath);	
		}

		var prefix = "";var origroot = rootPath;
		while(!modtask.modstr.startsWith(fullPath, rootPath) && rootPath.length > 0)
		{
			prefix = "\\.." + prefix;
			// Shift-up
			rootPath = modtask.moveUp(rootPath);
		} 

		if (rootPath.length < 1)
		{
			modtask.Fail("getRelativePath impossible conversion for '" + fullPath + "' / '" + origroot + "'");
		} 

		if (!modtask.modstr.endsWith(rootPath, "\\"))
			rootPath = rootPath + "\\";
		var ret = fullPath.substr(rootPath.length, fullPath.length-rootPath.length);
		return prefix + "\\" + this.eliminateDoubleDot(ret);			
	},

	moveUp : function(path)
	{
		if (modtask.modstr.endsWith(path, "\\"))
			path = path.substr(0, path.length-1);
 		var pth = path.split("\\");
		var i;
		var ret = "";
		for(i=0; i < pth.length-1; ++i)
		{
			ret = ret + pth[i] + "\\";
		} 
		if (ret.length > 1)
			ret = ret.substr(ret, ret.length-1);

		return ret; 
	},		

	eliminateDoubleDot : function(path)
	{
		var pth = path.split("\\");
		var i;
		var ret = "";
		for(i=0; i < pth.length; ++i)
		{
			if (i+1 < pth.length && pth[i+1] == "..")
			{
				i+=1;
				continue;
			}
			ret = ret + pth[i] + "\\";
		} 
		ret = ret.substr(ret, ret.length-1);
		return ret;
	},

	getDependencies : function(moduleconfig)
	{
   		var ret =  [
			["modtask", "core\\string"] 
		];
 		return ret;		
	},

	init : function()
	{
		modtask.modstr = modtask.ldmod("core\\string");
	}
}
; return modtask;
 }; 
INLINESTORE["kernel/path"] = function() { 
var modtask = 
{
	up : "..\\",
	get : function(fp, depth) {
		var ret = "", i=0;
		var tmp = fp.split("\\");
		if (tmp.length - depth < 0)
		{
			for(i=0; i > tmp.length - depth; --i)
				ret += modtask.up; 
		}
		else 
		{
			for(i=0; i < tmp.length - depth; ++i)
				ret += tmp[i] + "\\";
		}
		return ret; 
	},

	parse : function(path) {
		return modtask.normalize(path);
	},

	normalize : function(path) {
		path = path + '';
		var slashbased = path.indexOf('/') >= 0;
		if (slashbased) {
			path = path.replace(/\//g, '\\');
		}
		path = path.replace(/[A-Za-z0-9-]+\\\.\.\\/g, '');
		if (slashbased) {
			path = path.replace(/\\/g, '/');
		}
		return path; 
	},		

	rel : function(rp, modulenameOrMod, useModuleContextForPath) {
		var modulename = modulenameOrMod;
		if (useModuleContextForPath) {
			if (modulenameOrMod.__contextualName) {
				modulename = modulenameOrMod.__contextualName;
			} else {
				modulename = modulenameOrMod.__myname;
			}
		}

		if (!modulename) modulename = modtask.__modtask.__myname;
		
		var slashbased = (rp.indexOf('/') >= 0 || modulename.indexOf('/') >= 0);
		rp = rp.replace(/\//g, "\\"); 
		modulename = (modulename+"").replace(/\//g, "\\"); 
 
 		var depth = 1;
		while(rp.indexOf(modtask.up) == 0) {
			rp = rp.substr(modtask.up.length, rp.length - modtask.up.length);
			depth++;
		} 
		var base = modtask.get(modulename, depth); 
		base = base + rp; 
		base = base.replace(/\//g, "\\"); 
	  base = modtask.parse(base);
		if (slashbased) {
			base = base.replace(/\\/g, '/');
		}
		return base;
   },

   resolve : function(modulenameOrMod, depname, useModuleContextForPath) {
      if (depname == "_data") {
         depname = modtask.rel("data", modulenameOrMod);
      }
      else if (depname.indexOf("rel:") == 0) {
         depname = modtask.rel(depname.substr(4, depname.length-4),
	         modulenameOrMod,
	         useModuleContextForPath);
      }
	   return depname;
   }     
}

modtask.parseInvokeString = function(path) {
	var pkg = '';
	if (path.indexOf(':') >= 0) {
		pkg = path.split(':');
	};
	var mod, params = '';
	if (pkg.length) {
		mod = pkg[0] + '/' + pkg[1];
		pkg = pkg[0];
		params = path.substr(mod.length+1);
	} else {
		pkg = '';
		mod = path;
		params = '';
	}
	return { path: path, pkg: pkg, mod: mod, params: params };
}

modtask.toInvokeString = function(path, _modToPkgMap) {
	if (!path) path = modtask.__modtask.__myname;
	if (path.indexOf("rel:") == 0) path = modtask.rel(path.substr(4, path.length-4));
	// already in the pkg:view/top format
	if (path.indexOf(':') > 0) {
		return {
			success: true,
			data: path
		};
	}

	var maps = [
		modtask.ldmod('kernel/mod').ldonce('kernel/extstores/import').modToPkgMap,
		_modToPkgMap
	];

	for (var q in maps) {
		try {
			var map = maps[q] || {};
			var p;
			for (p in map) {
				if (p == path || p.replace(/:/g) == path) {
					var pkg = map[p];
					path = path.substr(pkg.length + 1);
					path = pkg + ':' + path;
					return {
						success: true,
						data: path
					}
				}
			}
		} catch (e) {
			return {
				success: false,
				reason: 'There was an error using kernel/extstores/import modToPkgMap. Make sure kernerl/extstores/import is available.'
			};
		}
	}
	return {
		success: false,
		reason: '[toInvokeString] Cannot determine package name for "' + path + '" automatically.'
	};
}

; return modtask;
 }; 

INLINESTORE["proc"] = function() { 
var modtask = 
{
	runApp : false,
	str : false,
	file : false,

	runAppAndFailIfneeded : function(s, channel, outputstr, _modtask, shouldnotexist, logoutput, async, returnexitcode)
	{
		var rt = modtask.runApp(s, false, async);
		var res;

		if (returnexitcode && !async)
			return rt["ExitCode"];
		
		if (channel == "all")
			res = rt["StdErr"] + " " + rt["StdOut"];
		else 
			res= rt[channel];

		if (rt.StdErr && rt.StdErr.toUpperCase().indexOf("IS NOT RECOGNIZED AS AN INTERNAL OR EXTERNAL COMMAND") >= 0 )
			_modtask.Fail(rt.StdErr);
		
		if (logoutput)
			_modtask.Log(res);

		if (!outputstr)
			return res;
		if (shouldnotexist)
		{
			if (res.indexOf(outputstr) >=0)
				_modtask.Fail("Error running app\n" + s + ": '" + res + "'");
			else 
				return res;
		}
		else 
		{
			if (res.indexOf(outputstr) < 0)
				_modtask.Fail("Error running app\n" + s + ": '" + res + "'");
			else 
				return res;
		}
	},

	runGUIApp : function(s, visible, async)
    	{
		modtask.rawRun(s, visible, async); 		
	},	

	init : function()
	{
		modtask.file = modtask.ldmod("file");
		modtask.str = modtask.ldmod("core\\string");
		var _Proc = modtask.ldmod(Kernel.getModulePath("proc"));
		if (_Proc["afterInit"])
			_Proc["afterInit"](modtask); 
  		modtask.getBinPath = _Proc.getBinPath;
		modtask.createProcess = function(s, visible, async) { return modtask.runGUIApp(s, visible, async);} 
	        modtask.rawRun = _Proc.rawRun;
	        modtask.runApp = _Proc.runApp;		
		modtask.getEnvironmentVariable = _Proc.getEnvironmentVariable;
		modtask.constructShellCmdline = _Proc.constructShellCmdline;
	},
 
	getDependencies : function(moduleconfig)
	{
 		var ret = 
		[
 	       		["modtask", "core\\string"],
			["modtask", "file"]	
		];
		return ret;
	}	
}
; return modtask;
 }; 
INLINESTORE["os\\windows\\filecommon"] = function() { 
var modtask = 
{
	filemod : false,

	afterInit : function(_filemod)
	{
		modtask.filemod = _filemod;
	},	

	fileCreatedInDir : function(dir, ext, blocking, timeout)
	{
		var proc = modtask.ldmod("proc");
		var filecreated = false;
		var tmp = "";
		var cmd = "cmd /c dir /b " + dir + "\\*." + ext;
		var time = 0 ;
		var delta = 1000;

		do 
		{
			tmp = proc.runApp(cmd)["StdOut"].replace(/\n/g, "").replace(/\r/g, "").replace(/ */, "");
			filecreated = tmp.length > 0;
			if (filecreated)
				break;	
			if (!blocking || (time > timeout))
				return false;
 			modtask.Log("Waiting for ." + ext + " in " + dir + " t = " + time + "/" + timeout);
			time += delta;
			modtask.Sleep(delta);			
		} while(!filecreated);
		filecreated = modtask.filemod.pathCombine(dir, tmp);
		return filecreated;
	},

	search : function(_modtask, context)
	{
		var modstr = modtask.ldmod("core\\string");
		if (!context["expr"])
			_modtask.Fail("cotext.expr is null");
		var proc = modtask.ldmod("proc");		
		var ret = proc.runApp("dir /s/b/A-D \"" + context.expr + "\"")["StdOut"].split("\n");
		var i;
		for(i=0; i < ret.length; ++i)
		{
			ret[i]=ret[i].replace(/^\s+/g, "");
			ret[i] = modstr.strClean1013(ret[i],"");			
			if (ret[i].length > 0)
				context.fn(i, "", ret[i]);
		}
	},	

	getDependencies : function(moduleconfig)
	{
 		var ret = 
		[
			["modtask", "proc"],
	       		["modtask", "core\\string"]	
		];
		return ret;
	} 
}
; return modtask;
 }; 
INLINESTORE["host\\nodejs\\filecommon"] = function() { 
var modtask = 
{
	filemod : false,

	afterInit : function(_filemod)
	{
		modtask.filemod = _filemod;
	},	

	fileCreatedInDir : function(dir, ext, blocking, timeout)
	{
		var proc = modtask.ldmod("proc");
		var filecreated = false;
		var tmp = "";
		var cmd = "cmd /c dir /b " + dir + "\\*." + ext;
		var time = 0 ;
		var delta = 1000;

		do 
		{
			tmp = proc.runApp(cmd)["StdOut"].replace(/\n/g, "").replace(/\r/g, "").replace(/ */, "");
			filecreated = tmp.length > 0;
			if (filecreated)
				break;	
			if (!blocking || (time > timeout))
				return false;
 			modtask.Log("Waiting for ." + ext + " in " + dir + " t = " + time + "/" + timeout);
			time += delta;
			modtask.Sleep(delta);			
		} while(!filecreated);
		filecreated = modtask.filemod.pathCombine(dir, tmp);
		return filecreated;
	},

	search : function(_modtask, context)
	{
		var modstr = modtask.ldmod("core\\string");
		if (!context["expr"])
			_modtask.Fail("cotext.expr is null");
		var proc = modtask.ldmod("proc");		
		var ret = proc.runApp("dir /s/b/A-D \"" + context.expr + "\"")["StdOut"].split("\n");
		var i;
		for(i=0; i < ret.length; ++i)
		{
			ret[i]=ret[i].replace(/^\s+/g, "");
			ret[i] = modstr.strClean1013(ret[i],"");			
			if (ret[i].length > 0)
				context.fn(i, "", ret[i]);
		}
	},	

	getDependencies : function(moduleconfig)
	{
 		var ret = 
		[
			["modtask", "proc"],
	       		["modtask", "core\\string"]	
		];
		return ret;
	} 
}
; return modtask;
 }; 
INLINESTORE["kernel/mod"] = function() { 
var modtask = 
{
	ldni : function(modname)
	{
 		return Minicore.loadModuleInModtask(modtask.__modtask, modname, false, false, true);
 	},

	ldonce : function(modname)
	{
 		if (!Kernel["__loadedmods"]) Kernel["__loadedmods"] = {};
		if (!Kernel["__loadedmods"][modname])
			Kernel["__loadedmods"][modname] = modtask.__modtask.ldmod(modname);
		return Kernel["__loadedmods"][modname];
	},

	verifyProp : function(pn, typ) 
	{
		return modtask.vp(pn, typ);
	},

	vp : function(pn, typ, mod, nam, nomod) 
	{
		var tmptyp;
		if (nomod)
			tmptyp = typeof(mod);
		else 
		{
			if (!mod) mod = modtask.__modtask; 
			if (!nam) nam = mod.__myname; 
			tmptyp = typeof(mod[pn]); 
		}
		if (tmptyp != typ) modtask.Fail("'" + nam + "'['" + pn + "'] failed. expected " + typ + ", but is " + tmptyp, modtask);
		return modtask;	
	},

	inh : function(prop)
	{
		var par =  modtask.__modtask.__modtask;
		if (typeof(par[prop]) == "undefined") modtask.Fail(modtask.__modtask.__myname + " could not inherit property '" + prop + "' from '" + par.__myname + "'", modtask);
		modtask.__modtask[prop] = par[prop]; 
		return modtask;
	}		
}
; return modtask;
 }; 
INLINESTORE["core/datetime"] = function() { 



var modtask = 
{
	shortMonth3Names : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
	shortMonthNames :  ["Jan", "Feb", "March", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"],
	longMonthNames : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
	core : false,


   // Set this to the context timezone for your datetime strings. The default (below) is MST (Arizona)
   timezone_context_inmins : -8*60,  

   adjustfortimezone : function(timeinms)
   {
      var d = new Date();
      // In minutes 
      var utcminuslocal = d.getTimezoneOffset(); 
      // minutes
      var serverminuslocal = utcminuslocal + modtask.timezone_context_inmins;
      var dt = timeinms - serverminuslocal*60*1000; 
      return dt;
   },  
   		  
	// http://stackoverflow.com/questions/1197928/how-to-add-30-minutes-to-a-javascript-date-object	
	// direction is either up or down 
	adjustMiliseconds : function(dt, milisecs)
	{
		return modtask.getDateTime(false, new Date(this.dateInMilisecs(dt)*1+(milisecs*1)));
 	},	

	adjustSeconds : function(dt, secs)
	{
		return modtask.adjustMiliseconds(dt, 1000*secs);
 	},	

	getTodayDate : function(daydelta)
	{
		var currentTime = new Date();
		var month = (currentTime.getMonth() + 1);
		var day = currentTime.getDate();
		var year = currentTime.getFullYear();

		if (daydelta)
		{
			var yeardelta = Math.round(daydelta / 365);
			monthdelta = Math.round((daydelta - yeardelta*365)/30);
			daydelta = Math.round(daydelta - monthdelta * 30 - yeardelta*365);
			month -= monthdelta ; if (month < 1) month = 1;
			year -= yeardelta ; 
			day -= daydelta; if (day < 1) day = 1;
		}
 		return  modtask.modstr.twoDigits(month) + "/" + modtask.modstr.twoDigits(day) + "/" +  year; 
	},


	getDateTime : function(timeonly, currentTime)
	{
		if (!currentTime)
		{
			currentTime = new Date();
		}
		var hours = currentTime.getHours();
		var minutes = currentTime.getMinutes();
		var seconds = currentTime.getSeconds();
		var month = currentTime.getMonth() + 1;
		var day = currentTime.getDate();
		var year = currentTime.getFullYear();
		if (timeonly)
			return modtask.modstr.twoDigits(hours) + ":" + modtask.modstr.twoDigits(minutes) + ":" + modtask.modstr.twoDigits(seconds);
		else 
			return year + "-" + modtask.modstr.twoDigits(month) + "-" + modtask.modstr.twoDigits(day) + " " + modtask.modstr.twoDigits(hours) + ":" + modtask.modstr.twoDigits(minutes) + ":" + modtask.modstr.twoDigits(seconds);
	},

	dateInMilisecs : function(dt)
	{
		var dateObj;
		if (dt)
		{
			dt  = this.processDMTYDate(dt, false, true);
			// Note, JS months are zero based
			dateObj = new Date(dt["py"], dt["pm"]-1, dt["pd"], dt["hour"], dt["mins"], dt["secs"]);
		}
		else 
		{
			dateObj = new Date();
		}
		return dateObj.getTime() + "";
	},

	nowInMilisecs : function()
	{
		return this.dateInMilisecs();
	},

	milisecsToDateTime : function(ms)
	{
		return modtask.adjustMiliseconds(false, ms - modtask.nowInMilisecs() ); 
	},

	calcFriendlyNames : function(inputdate, ret, timeportion, referencedt)
	{
		var mul, num ;

      var deltatype =  "ago"; 
      delta = modtask.dateInMilisecs(referencedt.fulldt) - modtask.adjustfortimezone(modtask.dateInMilisecs(inputdate));
      if (delta < 0)
      {
         delta = -1*delta;
         deltatype = "from now";
      }
         
      delta = delta / 1000; 
      ret["deltainsecs"] = delta;
      map = 
      {
         "sec"  : 60,
         "min"  : 60,
         "hour" : 24,
         "day"  : 30,
         "month" : 12,
         "year"  : 1000
      }; 
      mul = 1;
      for(p in map)
      {
         if (delta <  map[p]*mul)
         {
            num = Math.round(delta / mul);
            ret["shortfriendlyname"] = "" + modtask.modstr.twoDigits(num) + " " + p + (num == 1 ? " " : "s") + " " + deltatype;
            ret["friendlyname"] = modtask.modstr.twoDigits(ret.pm) + "/" + ret.pd + ret["shortfriendlyname"]; 
            break;
         }
         else 
         {
            mul = map[p]*mul;
         }  
      }
		return ret;		
	},		

	// Input could be a string with either of these formats 
	// Sat Nov 6 14:44:51 PST 2010 
	// 2010-11-06 14:44:51 (SQL DateTime Format)
	processDMTYDate : function(inputdate, referencedt, dontprocessfriendlyname)
	{
		if (!referencedt)
		{
			referencedt = { 
				"fulldt" : modtask.getDateTime()
			} 
		};	
		var ret = {
			"pd" : "",
			"pm" : "",
			"py" : "",
			"daysago" : "",
			"friendlyname" : "N/A",
         "shortfriendlyname" : "N/A"
		};

		if (inputdate == null)
			return ret;
		inputdate = inputdate + ""; 
      if (inputdate == "")
         return ret; 
		var tmp1;
		var timeportion = "";

		
		if (inputdate.indexOf("-")>=0)
		{
			tmp1 = inputdate.split("-");
			ret["pm"] = tmp1[1];
			ret["pd"] = tmp1[2].split(" ")[0];
			ret["py"] = tmp1[0];
			timeportion = tmp1[2].split(" ")[1];
		}
		else 
		{		
			var dt = (inputdate + "").split(" ");
			ret["pm"] =  modtask.core.arrayIndexMatch(dt[1], modtask.shortMonth3Names) + 1;
			ret["pd"] = modtask.modstr.twoDigits(dt[2]);
			ret["py"] = dt[dt.length-1];
			timeportion = dt[3];
		}
		var timed = timeportion.split(":");
		ret["hour"] = timed[0];
		ret["mins"] = timed[1];
		ret["secs"] = timed[2];		
		if (dontprocessfriendlyname)
		{
		}
		else 
		{
			modtask.calcFriendlyNames(inputdate, ret, timeportion, referencedt);
		} 
		return ret;
	},

	formatAgoFrom : function(val, str)
	{
		var ret = "";
		if (val == 0)
			return false;
		if (val < 0)
			ret = modtask.modstr.twoDigits(val*-1)  + " " + str + "s " + "from now"; 
		else
		{	
			if (str == "day" && val == 1)
				ret = "-yesterday-";
			else 
				ret = modtask.modstr.twoDigits(val)  + " " + str + "s " + "ago";
		}
 		return " " + ret + " ";  
	},		

	init : function()
	{
		modtask.modstr = modtask.ldmod("core\\string");
		modtask.core = modtask.ldmod("core\\core");
	},

	getDependencies : function(moduleconfig)
	{
 		var ret = 
		[
 			["modtask", "core\\string"],
			["modtask", "core\\core"]
		];
		return ret;
	}			
}
; return modtask;
 }; 
INLINESTORE["core/string"] = function() { 
var modtask = 
{
	VERIFY_STRING2 : function(res, val)
	{
		return modtask.VERIFY_STRING(modtask, res, val);
	},

	VERIFY_STRING : function(ctx, res, val)
	{		
		if (res != val || typeof(res) == "undefined" || typeof(val) == "undefined")
			ctx.Fail(Minicore.newLine + "VERIFY_STRING(" + Minicore.newLine + "'" + (res + "").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t") + "'" + Minicore.newLine + " !=  " + Minicore.newLine +  "'" + val + "')");
	},

	VERIFY_SUBSTRING2 : function(res, val)
	{
		if (typeof(res) == "undefined" || typeof(val) == "undefined" || !modtask.contains(res, val))
			modtask.Fail("VERIFY_SUBSTRING(" + Minicore.newLine + "'" + res + "'" + Minicore.newLine + " NOT_SUPERSTRING " + Minicore.newLine +  "'" + val + "')");
	},		

	splitLast : function(str, token)
	{
		var tmp = str.split(token);
		if (tmp.length <2) modtask.Fail("splitLast." + str + "." + token);
		var ret = [];
		ret[0] = "";
		ret[1] = tmp[tmp.length-1];
		ret[0] = str.substr(0, str.length-ret[1].length-token.length);
		return ret;
	},		
	
	replaceTokens : function(content, tokens)
	{
		var p;
		for(p in tokens)
		{
			var exp = p.replace(/\\/g, "\\\\").replace(/\[/g,"\\[").replace(/\$/g, "\\$").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
 			var re = new RegExp(exp,"g");
			content = content.replace(re, tokens[p]);		
		}
		return content;
	},

	toByteArray : function(str)
	{
		var i, ret = [];
		for(i=0; i < str.length; ++i)
			ret[i] = str.charCodeAt(i);
	       return ret;	
	},
		
	trim : function(str, extra)
	{
		str = str.replace(/^\s+|\s+$/g, "");		
		if (extra == "nonprintable")			
			str = str.replace( /[^a-zA-Z0-9\s-@\.\<\>="'_\\\&,\/]/g, ""); 
		return str;
	},

	contains : function(str1, str2)
	{
		var i;
		if (typeof(str2) == "object")
		{
			for(i=0; i < str2.length; ++i)
				if (modtask.contains(str1, str2[i]))
					return true; 
		}
		str1 = str1 + "";str2 = str2 + "";
		return (str1.indexOf(str2) >= 0);
	},

	noCapsPresent : function(str)
	{
		return str.match(/[A-Z]+/) == null;

	},


	strClean1013 : function(str, rpl, keep1013)
	{
		var ret = "";
		var i;
		for(i=0; i < str.length; ++i)
		{
			if (str.charCodeAt(i) == 13 || str.charCodeAt(i) == 10)
			{
				if (keep1013)
					ret += str.substr(i,1);			
				if (rpl)
					ret += rpl
				continue;
			}
			else 
				ret += str.substr(i,1);

		}
		return ret;
	},	

	startsWith : function(str1, str2)
	{
		var core = modtask.ldmod("core\\core");
		if (core.realTypeOf(str2) == "array")
		{
			var p;
			for(p in str2)
			{
				if (this.startsWith(str1, str2[p]))
					return true;
			}
			return false;
		}
		if (str1.length >= str2.length)
		{
			if (str1.substr(0, str2.length) == str2)
				return true;
		}
		return false;
	},		

	endsWith : function(str1, str2)
	{
		if (str1.length >= str2.length)
		{
			if (str1.substr(str1.length-str2.length, str2.length) == str2)
				return true;
		}
		return false;
	},

	nSpace: function(s,n)
	{
		return modtask.nStrrpt(s, n, " ");
	},

	nStrrpt : function(s,n, str)
	{
		var ret = s + "";
		while(ret.length < n)
			ret += str;
		return ret;
	},

	twoDigits : function(s)
	{
		if (s < 10)
			return "0" + s;
		else 
			return s;
	},

	randomNDigit : function(n)
	{
		var i;
		var ret = "";
		for (i=0; i < n ; ++i)
			ret += (Math.round(Math.random()*1000) + "").substr(0,1);
		return ret;
	},

	getDependencies : function(moduleconfig)
	{
		var ret =  
		[
			["modtask", "core\\core"] 
		]; 
		return ret;		
	} 
}

; return modtask;
 }; 
INLINESTORE["ui/node/auth"] = function() { 
var modtask = 
{
   token : false,
   signRequest : function(q, accesstoken) {
      var token = accesstoken;
      if (!token)
         token = modtask.ldmod("kernel\\mod").ldonce(modtask.__myname)["token"];
      if (token != false) {
         var tag = modtask.ldmod("ui\\conn\\tags").AUTH_TAG; 
         q =  tag + token + tag + q;
      } 
      return q;
   },

   set : function(token) {
      modtask.ldmod("kernel\\mod").ldonce(modtask.__myname)["token"] = token; 
   },

   clear : function(token) {
      modtask.ldmod("kernel\\mod").ldonce(modtask.__myname)["token"] = false; 
   },

   __$d : ["ui\\conn\\tags"]
}
; return modtask;
 }; 
INLINESTORE["ui\\conn\\tags"] = function() { 
// This should match the tags in template/1/index.php
var modtask = 
{
   "XDOMAINPOST_TAG" : "crossDomainPost=",
   "AUTH_TAG" : "_=_:)a",
   "TUNNEL_TAG" : "__endpointid"
}
; return modtask;
 }; 


var Minicore = {
	verbose: {
		strictModeEval: false,
		loadObject: false,
		userModuleSetup: false
	},
	ERR_DOESNOT_EXIST 	: "Does not exist",
 	newLine : "\r\n",
	rootModule : false,
	isInlineFlat : false,
	loadObjectOverwrite : false,

	doOutcomeException : function(msg) {
		var hash = {};
		hash["message"] = msg;
		throw hash;
	},

 	EncodeFailStr : function(msg) {
		return "FAIL, " + msg;
	},

	toStringIfNeeded : function(res)
	{
		var rt = "";
		var p;
		if (typeof(res) == "object") 
		{
			for(p in res)
			{
				rt += "\r\n" + p + ": " + res[p];
			}
		}
		else 
		{
			try { rt = res + ""; } catch(e) { rt = "toStringIfNeeded.failed on " + typeof(res); };
		}
		return rt;
	},	

	Log : function(msg)
	{
  	},		
	
	Fail : function(msg)
	{
		msg = Minicore.toStringIfNeeded(msg);			
		msg = Minicore.EncodeFailStr(msg);
		Minicore.doOutcomeException(msg);
	},

	Sleep : function(miliseconds)
	{
 	},	

	loadModuleInModtask : function(modtask, modulename, donotvalidate, funcs, dontcallinit) {
		if (Minicore.verbose.loadObject) console.log('loadModuleInModtask', modulename);
		var mod = Minicore.loadModule(modulename, modtask, true, funcs);
 		Minicore.inheritFromModtask(modtask, mod);
		return Minicore.postLoadModule(modtask, mod, dontcallinit);
	},

	postLoadModule : function(modtask, mod, dontcallinit) {
 		mod["ldmod"] = function(x) {
		  if (x.indexOf('./') == 0) {
			  x = x.replace('./', 'rel:');
		  }
		  if (x.indexOf("rel:") == 0) return mod.ldmod(mod.ldmod('kernel/path').resolve(mod, x, true));
		  else return Kernel.loadModuleInModtask(mod, x); 
	  };
		mod["__modtask"] = modtask;
		mod.__Kernel = Kernel;
		mod["sp"] = function(p,v) { 
			var p1;if (typeof(p) == "object") { for(p1 in p) mod["sp"](p1, p[p1]); return mod; }  
			mod[p] = v; return mod; 
		};
		mod["setProp"] = mod["sp"];
		if (mod["Log"]) {
			mod["Log"] = function(x) { Kernel.Log(x); };	
	//		if (!mod["__logname"]) mod["__logname"] = "";
		//	mod["Log"] = function(x) { return modtask.Log(mod["__logname"] + " " + x); } 							
		}
		if (typeof(mod["init"]) == "function")
		{
			if (dontcallinit) { } else { mod["init"]();} 
		}
 		return mod;
	},		

	inheritFromModtask : function(modtask, mod)
	{	 
		var names = ["Log", "Fail", "Sleep", "exceptionToString", "doOutcomeException"];
		var i=0;
		for(i=0; i < names.length; ++i) 
			mod[names[i]] = modtask[names[i]];
	},

	loadModule : function(_modtask, modulename, compatparam, funcs) {
		// support modulename, donotvalidate, modtask 
		if (typeof(_modtask) == "string") {
			// Old format 
			var t = modulename;
			modulename = _modtask;
			_modtask = t;
		}

		if (Minicore.verbose.loadObject || Minicore.verbose.loadModule) console.log('loadModule [' + modulename + '], loadObjectOverwrite = ' +  (Minicore.loadObjectOverwrite && true));

		if (!_modtask) {
			_modtask = Minicore;
		}

		if (Minicore.loadObjectOverwrite == false) {
			return Minicore.loadObject2(_modtask, "modtask", modulename, false, true, funcs);
		} else {
			return Minicore.loadObjectOverwrite(_modtask, "modtask", modulename, false, true, funcs);
		}
	},

	loadObject2 : function(_modtask, objecttype, objectname, inithash, donotcallinit, funcs) {
		Minicore.flattenTheInlines();
		if (typeof(funcs) != "object")
			funcs = {};
		if (typeof(funcs["existfunc"]) != "function")
			funcs["existfunc"] = Minicore.objectExist;

		if (typeof(funcs["parsefunc"]) != "function")
			funcs["parsefunc"] = Minicore.miniParseObj;		

 		if (!funcs["existfunc"](objecttype, objectname)) {
 			_modtask.Fail(Minicore.EncodeDecode_encodeErrorMessage("loadObject2", Minicore.ERR_DOESNOT_EXIST, objectname));  
			return ;
		}
		return Minicore.rawLoadObject(_modtask, objecttype, objectname, funcs["parsefunc"]); 
	},

	rawLoadObject : function(_modtask, objecttype, objectname, parsefunc) {
		if (Minicore.verbose.loadObject) console.log('rawLoadObject', objectname);
		var retObj = {};
		var __loadObject2Path = "";
		__loadObject2Path = objectname;
		retObj = parsefunc(_modtask, objectname, objecttype);
		if (typeof(retObj["__loadObject2Path"]) != "string")
			retObj["__loadObject2Path"] = __loadObject2Path;
		if (typeof(retObj["__myname"]) != "string")
			retObj["__myname"] = objectname;
		return retObj;
	},

	flattenTheInlines : function()
	{
		if (Minicore.isInlineFlat)
			return ;

		Minicore.isInlineFlat = true;
		if (typeof(INLINESTORE) == "object")
		{
			var p ;
			for(p in INLINESTORE)
			{
				var name = p.split("\\");
				name = name[name.length-1];
				if (!INLINESTORE[name]) 
				{
					// Do not override something else !
					INLINESTORE[name] = INLINESTORE[p];
				}
			}
		}		
	},		

	objectExist : function(objecttype, objectname) {
		var __tempobjstore;
		try {
			__tempobjstore = typeof(INLINESTORE[objectname]);
		} catch(e) {
			return false;
		}
		return __tempobjstore == 'string' || __tempobjstore == 'function';
	},	

	JscriptToAA : function(modtask, JS, objstoredname, objname) {
		var objcontents;
		try {
			if (typeof(JS) == 'function') {
				objcontents = JS(objstoredname);
			} else {
        if (Minicore.verbose.strictModeEval) console.log('[strictModeEval] ' + objname);
				eval(JS + "; objcontents = " + objstoredname + ";");	
			}
		} catch(e) {
			modtask.Fail("JscriptToAA: eval failed on '" + objstoredname +"' :" +  e.description); 
		}
		return objcontents;
	},

	postProcessNodeJSModule : function(izyModuleExportsInline, objname, optionalRequirePath) {
		if (izyModuleExportsInline.forcemodulereload) {
			if (typeof(izyModuleExportsInline) != 'function') throw { message: 'forcemodulereload requires a function payload: ' +  objname};
			izyModuleExportsInline = Minicore.nakedParseStr(Minicore, objname, null, izyModuleExportsInline);
			if (typeof(izyModuleExportsInline) != 'object' && typeof(izyModuleExportsInline) != 'function') throw { message: 'module has forcemodulereload but function generator returned a non object/function. Make sure to not call the function in the module export: ' + objname };
		}
		if (optionalRequirePath) {
			izyModuleExportsInline.__loadObject2Path = optionalRequirePath;
		} else {
			izyModuleExportsInline.__loadObject2Path = objname;
		}
		return izyModuleExportsInline;
	},

	nakedParseStr : function(modtask, objname, objecttype, unparsedstrform) {
		var __tempobjstore = "";
		if (!objecttype)
			objecttype = "modtask";
		if (!unparsedstrform)
			unparsedstrform = Minicore.getInlineJScriptForObj(objname);
		__tempobjstore = unparsedstrform; 
		__tempobjstore = Minicore.JscriptToAA(modtask, __tempobjstore, objecttype, objname); 		
		return __tempobjstore;
	},

	miniParseObj : function(modtask, objname, objecttype, unparsedstrform) {
		try {
			return Minicore.nakedParseStr(modtask, objname, objecttype, unparsedstrform);
		} catch(e) {
			modtask.Fail("miniParseObj failed to parse '" + objname + "' from inlines. ");  
		}
	},

	getInlineJScriptForObj : function(objname) {
		var __tempobjstore = ""; 
		__tempobjstore = INLINESTORE[objname];
		return __tempobjstore;
	},

	decodeObjectStrForStorage : function(str) {
		return str;
	},

	getObjectInlineVar : function(objectname)
	{
		return "INLINESTORE[\"" + Minicore.EncodeDecode_encodeStringToJSStr(objectname) + "\"]";
	},

	EncodeDecode_encodeErrorMessage : function(action, errormsg, context)
	{
		return action + ", " + errormsg + ": " + context;
	},

	EncodeDecode_encodeStringToJSStr : function(str)
	{
		str = str.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
		var strs = {};

		strs[Minicore.newLine] = "\\" + "r" + "\\" + "n";
		strs["\r"] = "\\" + "r"; 
		strs["\n"] = "\\" + "n";

		var p;
		for(p in strs)
		{
			while (str.indexOf(p) >= 0)
				str = str.replace(p, strs[p]);
		}
		return str;
	}
};


var Kernel=Minicore;
Kernel.INLINESTORE = INLINESTORE;
Kernel.forceRequireOnLoadFromFile = false;

function onSystemStart(platobject)
{
	var p=false;for(p in INLINESTORE) { break; };
	if (p)
	{
		Kernel.rootModule = Kernel.loadModuleInModtask(Kernel, p);
		return Kernel.rootModule.servicecallback("systemstart", platobject);
	}	
} 




onSystemStart();return Kernel;};
