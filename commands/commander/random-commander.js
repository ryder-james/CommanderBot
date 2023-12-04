const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

const cacheLocation = path.join('cache', 'CommanderCache.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('random-commander')
		.setDescription('Generates a random commander, based on current format rules.'),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		let commanders = interaction.client.commanders;
		if (commanders.length == 0) {
			if (fs.existsSync(cacheLocation))
				commanders = JSON.parse(fs.readFileSync(cacheLocation));
			else {
				console.log('fetching commanders');
				commanders = await getCommanderList(interaction);
				buildCommanderCache(commanders);
			}

			interaction.client.commanders = commanders;
		}

		const commander = commanders[Math.floor(Math.random() * commanders.length)];

		await interaction.editReply(buildSingleCommanderReply(commander));
	},
};

function buildSingleCommanderReply(commander) {
	const imageEmbed = new EmbedBuilder()
		.setTitle(commander.name)
		.setURL(commander.scryfall_uri)
		.addFields(
			{ name: 'Mana Cost', value: commander.mana_cost },
			{ name: 'Type', value: commander.type_line },
			{ name: 'Oracle Text', value: commander.oracle_text },
			{ name: 'Power/Toughness', value: `${commander.power}/${commander.toughness}` },
		)
		.setImage(commander.image_uris.large);

	return {
		content: 'here u go',
		embeds: [ imageEmbed ],
	};
}

async function getCommanderList() {
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