const fs = require('node:fs');
const path = require('node:path');

const cacheLocation = path.join('cache', 'CommanderCache.json');

exports.getCommanders = async function getCommanders(client) {
	let commanders = client.commanders;

	if (commanders.length == 0) {
		if (fs.existsSync(cacheLocation))
			commanders = JSON.parse(fs.readFileSync(cacheLocation));
		else {
			console.log('fetching commanders');
			commanders = await fetchCommanderList();
			buildCommanderCache(commanders);
		}

		client.commanders = commanders;
	}

	return commanders;
};

exports.commanderFromId = function commanderFromId(commanderId, commanders) {
	return commanders.find(commander => commander.id === commanderId);
};

async function fetchCommanderList() {
	const filters = [
		{
			'rule': 'is',
			'value': 'commander',
		},
		{
			'rule': 'legal',
			'value': 'commander',
		},
		{
			'rule': 'game',
			'value': 'paper',
		},
	];

	let uri = 'https://api.scryfall.com/cards/search?q=';

	for (const i in filters)
		uri += `${filters[i].rule}%3A${filters[i].value}+`;
	uri = uri.substring(0, uri.length - 1);

	let cards = [];
	return await fetch(uri)
		.then(response => {
			return response.json();
		})
		.then(async data => {
			cards = data.data;

			let next_page = data.next_page;
			while (next_page != undefined) {
				await fetch(next_page)
					.then(response => {
						return response.json();
					})
					.then(next_data => {
						next_page = next_data.next_page;
						cards = cards.concat(next_data.data);
					});
			}

			return cards;
		});
}

function buildCommanderCache(data) {
	fs.writeFile(cacheLocation, JSON.stringify(data), error => {
		if (error == null)
			return;
		console.error('Failed to cache commander list!');
		console.error(error);
	});
}