var modtask = function() {
	var res = {
		writeHead: function() {},
		write: function(x) { console.log(x); },
		end: function(x) { console.log(x); }
	};
	return res;
}


