var modtask = function(config) {

	var responseCounter = 0;

	var verbose = false;
	var cbs = {};
	var onCalls  = 0;
	var obj = {
		on: function(item, cb) {
			cbs[item] = cb;
		},
		write: function(buf) {
			var str = buf.toString('ascii');
			if (verbose) console.log('*** TEST CLIENT RECIEVED ***', JSON.stringify(str));
			transferData(str);
		},
		close: function() {
			if (verbose) console.log('*** TEST CLIENT CLOSE ***');
		},
		destroy: function() {
			if (verbose) console.log('*** TEST CLIENT DESTROY ***');
		}
	};

	function transferData(key) {
		var found = false;
		var i;
		for(i=responseCounter; i < config.responses.length; ++i) {
			var currentRespose = config.responses[i];
			if (currentRespose[0] == key || key.indexOf(currentRespose[0]) >= 0) {
				found = true;
				responseCounter = i + 1;
				break;
			}
		}

		if (found) {
			if (verbose)  console.log('*** TEST CLIENT SAID ***', JSON.stringify(currentRespose[1].toString()));
			cbs.data(currentRespose[1]);
		} else {
			console.log('*** TEST CLIENT Not sure how to respond, do nothing ***');
		}
	}

	return obj;
}
