const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const cacheLocation = path.join('cache', 'CommanderCache.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('random-commander')
		.setDescription('Generates a random commander, based on current format rules.'),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		const commanders = await getCommanders(interaction);
		const commander = commanders[Math.floor(Math.random() * commanders.length)];

		const response = await interaction.editReply(buildSingleCommanderReply(commander));

		await buildMulliganCallback(interaction, commanders, response);
	},
};

async function buildMulliganCallback(interaction, commanders, response) {
	const collectorFilter = i => i.user.id === interaction.user.id;
	try {
		const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

		if (confirmation.customId === 'mulligan') {
			console.log('mulligan!');
			const rec_response = await confirmation.update(buildSingleCommanderReply(commanders[Math.floor(Math.random() * commanders.length)]));
			buildMulliganCallback(interaction, commanders, rec_response);
		}
	} catch (e) {
		await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
	}
}

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

	const mulligan = new ButtonBuilder()
		.setCustomId('mulligan')
		.setLabel('Mulligan')
		.setStyle(ButtonStyle.Primary);


	const row = new ActionRowBuilder()
		.addComponents(mulligan);

	return {
		content: 'here u go',
		embeds: [ imageEmbed ],
		components: [ row ],
	};
}

async function getCommanders(interaction) {
	let commanders = interaction.client.commanders;

	if (commanders.length == 0) {
		if (fs.existsSync(cacheLocation))
			commanders = JSON.parse(fs.readFileSync(cacheLocation));
		else {
			console.log('fetching commanders');
			commanders = await fetchCommanderList();
			buildCommanderCache(commanders);
		}

		interaction.client.commanders = commanders;
	}

	return commanders;
}

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