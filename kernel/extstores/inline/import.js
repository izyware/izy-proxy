/* izy-loadobject nodejs-require */
module.exports = (function() {
	var modtask = {};
	modtask.storage = {};
	modtask.addModule = function(items, name, raw)
	{
		var ret = { 'reason' : '', 'success' : true };
		items.push( { 'path' : name, 'raw' : raw } );
		return ret;
	}

	modtask.writeModule = function(path, raw, okpush, failpush)
	{
		modtask.__Kernel.INLINESTORE[path] = raw;
	}
	return modtask;
})();