LSystem.Lindenmayer = {
	
	iterateGrammar: function (str, dict, iters) {
		if (iters === 0) return str;


		let ptr = 0;
		for (let i = 0; i < str.length; i++) if (dict[str[ptr]]) {
			let val = dict[str[ptr]]["default"];
			str = str.slice(0, ptr) + val + str.slice(ptr + 1, str.length);
			ptr += val.length;
		} else ptr++;

		return this.iterateGrammar(str, dict, --iters)
	},
	
	iterateGrammarProb: function (str, dict, iters) {
		if (iters === 0) return str;

		let ptr = 0;
		for (let i = 0; i<str.length; i++) if (dict[str[ptr]]) {
			if (dict[str[ptr]]["prob"]) {
				let prob = Math.random();
				let choice = 0;
				let sum = 0;

				while (true) {
					sum += dict[str[ptr]]["prob"][choice];
					if (sum >= prob) break;
					choice++;
				}

				let val = dict[str[ptr]]["val"][choice];
				str = str.slice(0, ptr) + val + str.slice(ptr + 1, str.length);
				ptr += val.length;
			} else { //use default
				let val = dict[str[ptr]]["default"];
				str = str.slice(0, ptr) + val + str.slice(ptr + 1, str.length);
				ptr += val.length;
			}
		} else ptr++;

		return this.iterateGrammarProb(str, dict, --iters);
	}
};