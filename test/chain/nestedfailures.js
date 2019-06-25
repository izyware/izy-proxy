var modtask = [
	(chain) => {
		var counter = chain.get('queryObject').counter;
		if (counter > 0) {
			return chain([
				['//inline/rel:nestedfailures', { counter: counter - 1 }]
			]);
		} else {
			chain(['badcommand']);
		}
	},
	['ROF']
];
