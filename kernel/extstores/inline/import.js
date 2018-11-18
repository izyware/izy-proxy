
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
   INLINESTORE[path] = raw;
}
