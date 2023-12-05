const { getCommanders } = require('../../utility/commander.js');
const CommanderEvent = require('../../utility/CommanderEvent.js');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('start-new-event')
		.setDescription('Create a new event')
		.addIntegerOption(option =>
			option.setName('mulligans')
				.setDescription('The maximum number of rerolls allowed on commander pick (0-3). Default: 0')
				.setMinValue(0)
				.setMaxValue(3),
		)
		.addIntegerOption(option =>
			option.setName('picks')
				.setDescription('The number of Commanders the player can pick from (1-4). Default: 1')
				.setMinValue(1)
				.setMaxValue(4),
		),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		const { events } = interaction.client;

		const commanders = await getCommanders(interaction.client);
		const commanderIds = commanders.map(commander => commander.id);
		const mulligans = interaction.options.getInteger('mulligans') ?? 0;
		const picks = interaction.options.getInteger('picks') ?? 1;
		const event = new CommanderEvent(commanderIds, interaction.guild.id, mulligans, picks);

		events.set(interaction.guild.id, event);
		event.save();

		await interaction.editReply('Created!');
	},
};
