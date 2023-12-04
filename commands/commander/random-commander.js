const fs = require('node:fs');
const path = require('node:path');
const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const cacheLocation = path.join('cache', 'CommanderCache.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('random-commander')
		.setDescription('Generates a random commander, based on current format rules.'),
	async execute(interaction) {
		await interaction.deferReply();

		const { events } = interaction.client;

		if (!events.has(interaction.guild.id)) {
			await interaction.editReply('A Host must first start an Event!');
			return;
		}

		const event = events.get(interaction.guild.id);

		if (!event.players.has(interaction.user.id))
			event.players.set(interaction.user.id, { 'mulligans': event.mulligans });

		const player = event.players.get(interaction.user.id);
		const commanders = await getCommanders(interaction);

		if (!player.commanderId) {
			player.mulligans = event.mulligans;
			player.commanderId = getRandomCommander(commanders).id;
		}

		const response = await interaction.editReply(buildSingleCommanderReply(commanderFromId(player.commanderId, commanders), player.mulligans));
		fs.writeFileSync(path.join('cache', 'events', `${interaction.guild.id}.plr`), JSON.stringify(Object.fromEntries(event.players)));

		await buildMulliganCallback(interaction, commanders, response);
	},
};

function commanderFromId(commanderId, commanders) {
	return commanders.find(commander => commander.id === commanderId);
}

function getRandomCommander(commanders) {
	return commanders[Math.floor(Math.random() * commanders.length)];
}

async function buildMulliganCallback(interaction, commanders, response) {
	const collectorFilter = i => i.user.id === interaction.user.id;
	try {
		const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

		const event = interaction.client.events.get(interaction.guild.id);
		const player = event.players.get(interaction.user.id);

		if (confirmation.customId === 'mulligan') {
			player.mulligans--;
			player.commanderId = getRandomCommander(commanders).id;
			const rec_response = await confirmation.update(buildSingleCommanderReply(commanderFromId(player.commanderId, commanders), player.mulligans));
			buildMulliganCallback(interaction, commanders, rec_response);
		} else if (confirmation.customId === 'confirm') {
			player.mulligans = -1;
			await confirmation.update(buildSingleCommanderReply(commanderFromId(player.commanderId, commanders), player.mulligans));
		}

		fs.writeFileSync(path.join('cache', 'events', `${interaction.guild.id}.plr`), JSON.stringify(Object.fromEntries(event.players)));
	} catch (e) {
		await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
	}
}

function buildSingleCommanderReply(commander, mulliganCount) {
	try {
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

		const confirm = new ButtonBuilder()
			.setCustomId('confirm')
			.setLabel('Confirm')
			.setStyle(ButtonStyle.Primary)
			.setDisabled(mulliganCount == -1);


		const mulligan = new ButtonBuilder()
			.setCustomId('mulligan')
			.setLabel('Mulligan')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(mulliganCount < 1);

		const row = new ActionRowBuilder()
			.addComponents(confirm)
			.addComponents(mulligan);

		const mulliganMessage = mulliganCount > 1 ? `${mulliganCount} mulligans` : mulliganCount == 1 ? '1 mulligan' : 'no mulligans';

		return {
			content: mulliganCount == -1 ? `You have selected **${commander.name}** as your commander. Get building!` : `You have ${mulliganMessage} remaining.`,
			embeds: [ imageEmbed ],
			components: [ row ],
		};
	} catch (e) {
		console.log(`Failed to build reply. Commander: ${commander}`);
	}
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