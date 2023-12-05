const { commanderFromId } = require('../../utility/commander.js');
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

		await interaction.deferReply();

		const player = event.getPlayer(interaction.user.id);
		// const commanders = await getCommanders(interaction);

		if (!player.commanderOptions || player.commanderOptions.length == 0)
			player.commanderOptions = event.getCommanderOptions();

		let reply;
		if (event.picks == 1)
			reply = buildSinglePickReply(player.commanderOptions[0], player.mulligans);
		else
			reply = buildMultiPickReply(player.commanderOptions, player.mulligans, player.commander);

		/* const response = */await interaction.editReply(reply);

		// if (player.mulligans > 0)
		// 	await buildMulliganCallback(interaction, commanders, response);
	},
};

// async function buildMulliganCallback(interaction, commanders, response) {
// 	const collectorFilter = i => i.user.id === interaction.user.id;
// 	try {
// 		const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

// 		const event = interaction.client.events.get(interaction.guild.id);
// 		const player = event.players.get(interaction.user.id);

// 		if (confirmation.customId === 'mulligan') {
// 			player.mulligans--;
// 			player.commanderId = getRandomCommander(commanders).id;
// 			const rec_response = await confirmation.update(buildSinglePickReply(commanderFromId(player.commanderId, commanders), player.mulligans));
// 			buildMulliganCallback(interaction, commanders, rec_response);
// 		} else if (confirmation.customId === 'confirm') {
// 			player.mulligans = -1;
// 			await confirmation.update(buildSinglePickReply(commanderFromId(player.commanderId, commanders), player.mulligans));
// 		}

// 		fs.writeFileSync(path.join('cache', 'events', `${interaction.guild.id}.plr`), JSON.stringify(Object.fromEntries(event.players)));
// 	} catch (e) {
// 		await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
// 	}
// }

function buildSinglePickReply(commanderId, mulliganCount) {
	const commander = commanderFromId(commanderId);
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

function buildMultiPickReply(commanders, mulliganCount, selectedCommanderId) {
	const firstCommander = commanderFromId(commanders[0]);
	const commanderFields = [];

	for (const commanderId in commanders) {
		commanderFields.push({
			name: 'Commander Choice:',
			value: commanderFromId(commanderId).name,
		});
	}

	const embeds = [
		new EmbedBuilder()
			.setTitle(firstCommander.name)
			.setURL('https://scryfall.com/')
			.addFields(commanderFields)
			.setImage(firstCommander.image_uris.large),
	];

	for (let i = 1; i < commanders.length; i++) {
		const commander = commanderFromId(commanders[i]);
		embeds.push(new EmbedBuilder()
			.setTitle(commander.name)
			.setURL('https://scryfall.com/')
			.setImage(commander.image_uris.large),
		);
	}

	const confirmButtons = [];
	for (let i = 0; i < commanders.length; i++) {
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
		content: mulliganCount == -1
			? `You have selected **${commanderFromId(selectedCommanderId)}** as your commander. Get building!`
			: `You have ${mulliganMessage} remaining.`,
		embeds: embeds,
		components: [ confirmRow, mulliganRow ],
	};
}