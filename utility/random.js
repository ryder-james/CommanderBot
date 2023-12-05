exports.randomInt = function(max, min = 0) {
	if (min > max) {
		const temp = min;
		min = max;
		max = temp;
	} else if (min == max)
		return min;

	return Math.floor(Math.random() * (max - min + 1)) + min;
};