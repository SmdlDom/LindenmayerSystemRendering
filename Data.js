LSystem = {};

LSystem.Data = {
	
	SmallTree: {
		theta: 0.3142,
		alpha: 0.2,
		decay: 0.88,
		iters: 8,
		str: "BBBBBA",
		dict: {
			"A": {"default": "[++BB[--C][++C][__C][^^C]A]/////+BBB[--C][++C][__C][^^C]A"},
			"B": {"default": "\\B", 
				"prob":[0.5, 0.5], 
				"val":["B", "\\\\B"]},
			"C": {"default": ""}
		}
	},
	
	FanTree: {
		theta: 0.15,
		alpha: 0.2,
		decay: 0.92,
		iters: 8,
		str: "EEEEEEBA",
		dict: {
			"A": {"default": "[++BBB[--C][++C][__C]\-A]//-BBB[--C][__C][^^C]+A"},
			"B": {"default": "\\B",
				"prob":[0.5, 0.5],
				"val":["B", "\\\\B"]},
			"C": {"default": "[--D][++D][__D][^^D]"},
			"D": {"default": ""}
		}
	},
	
	TinyTree: {
		theta: 0.394,
		alpha: 0.2,
		decay: 0.8,
		str: "\\\\\\\\\\\\B\\\\\\\\\\\\B\\\\\\\\\\\\B\\\\\\\\\\\\\\\\B\\\\\\\\\\\\B[++\\\\\\\\B\\\\\\\\B[--][++][__][^^][++\\\\BB[--][++][__][^^][++B\\\\B[--][++][__][^^][++BB[--C][++C][__C][^^C]A]/////+BBB[--C][++C][__C][^^C]A]/////+B\\\\BB[--][++][__][^^][++BB[--C][++C][__C][^^C]A]/////+BBB[--C][++C][__C][^^C]A]/////+\\\\\\\\B\\\\\\\\B\\\\B[--][++][__][^^][++B\\\\B[--][++][__][^^][++BB[--C][++C][__C][^^C]A]/////+BBB[--C][++C][__C][^^C]A]/////+\\\\BBB[--][++][__][^^][++BB[--C][++C][__C][^^C]A]/////+BBB[--C][++C][__C][^^C]A]/////+\\\\\\\\B\\\\B\\\\\\\\\\\\B[--][++][__][^^][++\\\\B\\\\\\\\B[--][++][__][^^][++BB[--][++][__][^^][++BB[--C][++C][__C][^^C]A]/////+BBB[--C][++C][__C][^^C]A]/////+BB\\\\B[--][++][__][^^][++BB[--C][++C][__C][^^C]A]/////+BBB[--C][++C][__C][^^C]A]/////+\\\\B\\\\BB[--][++][__][^^][++\\\\B\\\\B[--][++][__][^^][++BB[--C][++C][__C][^^C]A]/////+BBB[--C][++C][__C][^^C]A]/////+BBB[--][++][__][^^][++BB[--C][++C][__C][^^C]A]/////+BBB[--C][++C][__C][^^C]A"
	},
	
	Fern2D: {
		theta: 0.4363,
		alpha: 0.1,
		decay: 0.92,
		iters: 5,
		str: "X",
		dict: {
			"X": {"default": "F^[[X]_X]_F[_FX]^X"},
			"F": {"default": "FF"}
		}
	}
};