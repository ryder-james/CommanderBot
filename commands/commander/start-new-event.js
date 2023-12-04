const fs = require('node:fs');
const path = require('node:path');
const { Collection, SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('start-new-event')
		.setDescription('Create a new event')
		.addIntegerOption(option =>
			option.setName('mulligans')
				.setDescription('The maximum number of rerolls allowed on commander pick.')
				.setMinValue(0)
				.setMaxValue(3),
		),
	async execute(interaction) {
		const { events } = interaction.client;

		events.set(interaction.guild.id, { players: new Collection() });

		const event = events.get(interaction.guild.id);

		event.mulligans = interaction.options.getInteger('mulligans') ?? 0;

		fs.writeFileSync(path.join('cache', 'events', `${interaction.guild.id}.evt`), JSON.stringify(event));

		await interaction.reply('Created!');
	},
};