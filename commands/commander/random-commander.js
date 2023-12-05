const { commanderFromId, getCommanders } = require('../../utility/commander.js');
const cardCombiner = require('../../utility/cardCombiner.js');
const { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('random-commander')
		.setDescription('Generates a random commander, based on current format rules.'),
	async execute(interaction) {
		const { events } = interaction.client;

		if (!events.has(interaction.guild.id)) {
			await interaction.reply({ content: 'A Host must first start an Event!', ephemeral: true });
			return;
		}

		const event = events.get(interaction.guild.id);

		if (!event.hasPlayer(interaction.user.id)) {
			await interaction.reply({ content: 'Please register for the Event first using /register.', ephemeral: true });
			return;
		}

		const player = event.getPlayer(interaction.user.id);

		await interaction.deferReply({ ephemeral: player.commander != null });

		const commanders = await getCommanders(interaction.client);

		if (!player.commanderOptions || player.commanderOptions.length == 0)
			player.commanderOptions = event.getCommanderOptions();

		let reply;
		if (event.picks == 1 || player.commander)
			reply = buildSinglePickReply(player.commander ?? player.commanderOptions[0], commanders, player.mulligans);
		else
			reply = await buildMultiPickReply(player.commanderOptions, commanders, player.mulligans);

		event.save();
		const response = await interaction.editReply(reply);

		if (event.picks == 1)
			await buildSinglePickCallback(interaction, commanders, response);
		else
			await buildMultiPickCallback(interaction, commanders, response);
	},
};

async function buildSinglePickCallback(interaction, commanders, response) {
	const collectorFilter = i => i.user.id === interaction.user.id;
	try {
		const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

		const event = interaction.client.events.get(interaction.guild.id);
		const player = event.getPlayer(interaction.user.id);

		if (confirmation.customId === 'mulligan') {
			player.mulligans--;
			player.commanderOptions = event.getCommanderOptions();

			const reply = buildSinglePickReply(player.commanderOptions[0], commanders, player.mulligans);
			const rec_response = await confirmation.update(reply);

			buildSinglePickCallback(interaction, commanders, rec_response);
		} else if (confirmation.customId === 'confirm') {
			player.mulligans = -1;
			const commander = player.commanderOptions[0];
			event.claimCommander(interaction.user.id, commander);
			await confirmation.update(buildSinglePickReply(player.commander, commanders, player.mulligans));
		}

		event.save();
	} catch (e) {
		await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
	}
}

async function buildMultiPickCallback(interaction, commanders, response) {
	const collectorFilter = i => i.user.id === interaction.user.id;
	try {
		const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

		const event = interaction.client.events.get(interaction.guild.id);
		const player = event.getPlayer(interaction.user.id);

		if (confirmation.customId === 'mulligan') {
			player.mulligans--;
			player.commanderOptions = event.getCommanderOptions();

			const reply = await buildMultiPickReply(player.commanderOptions, commanders, player.mulligans);
			const rec_response = await confirmation.update(reply);

			buildMultiPickCallback(interaction, commanders, rec_response);
		} else if (confirmation.customId.startsWith('confirm-')) {
			player.mulligans = -1;
			const index = Number(confirmation.customId.substring(confirmation.customId.length - 1));
			const commander = player.commanderOptions[index];
			event.claimCommander(interaction.user.id, commander);
			await confirmation.update(buildSinglePickReply(player.commander, commanders, player.mulligans));
		}

		event.save();
	} catch (e) {
		await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
	}
}

function buildSinglePickReply(commanderId, commanders, mulliganCount) {
	const commander = commanderFromId(commanderId, commanders);
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
			files: [],
			components: [ row ],
		};
	} catch (e) {
		console.log(`Failed to build reply. Commander: ${commander}`);
	}
}

async function buildMultiPickReply(commanderOptions, commanders, mulliganCount) {
	const commanderFields = [];
	let query = '(';

	for (const i in commanderOptions) {
		const commander = commanderFromId(commanderOptions[i], commanders);
		const choice = Number(i) + 1;
		commanderFields.push({
			name: `Commander Choice #${choice}:`,
			value: commander.name,
		});
		query += `"${commander.name}" or `;
	}
	query = query.substring(0, query.length - 4);
	query += ') game:paper';
	query = encodeURI(query);

	const url = `https://scryfall.com/search?q=${query}`;

	let cardImages;
	try {
		cardImages = commanderOptions.map(id => commanderFromId(id, commanders).image_uris.large);
	} catch (e) {
		console.log(commanders);
		return;
	}
	const multiCardAttachment = await cardCombiner(cardImages);

	const embed = new EmbedBuilder()
		.setTitle('Commander Options')
		.setURL(url)
		.addFields(commanderFields)
		.setImage('attachment://cards.png');

	const confirmButtons = [];
	for (let i = 0; i < commanderOptions.length; i++) {
		const confirmButton = new ButtonBuilder()
			.setCustomId(`confirm-${i}`)
			.setLabel(`Pick #${i + 1}`)
			.setStyle(ButtonStyle.Primary)
			.setDisabled(mulliganCount == -1);
		confirmButtons.push(confirmButton);
	}

	const confirmRow = new ActionRowBuilder()
		.addComponents(confirmButtons);

	const mulligan = new ButtonBuilder()
		.setCustomId('mulligan')
		.setLabel('Mulligan')
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(mulliganCount < 1);

	const mulliganRow = new ActionRowBuilder()
		.addComponents(mulligan);

	const mulliganMessage = mulliganCount > 1 ? `${mulliganCount} mulligans` : mulliganCount == 1 ? '1 mulligan' : 'no mulligans';

	return {
		content: `You have ${mulliganMessage} remaining.`,
		embeds: [ embed ],
		files: [ multiCardAttachment ],
		components: [ confirmRow, mulliganRow ],
	};
}