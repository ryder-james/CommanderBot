const fs = require('node:fs');
const path = require('node:path');
const { SlashCommandBuilder } = require('discord.js');

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

		events.set(interaction.guild.id, { players: new Map() });

		const event = events.get(interaction.guild.id);

		event.mulligans = interaction.options.getInteger('mulligans') ?? 0;
		const eventJson = JSON.stringify(event, (key, value) => {
			if (key == 'players')
				return undefined;
			return value;
		});
		fs.writeFileSync(path.join('cache', 'events', `${interaction.guild.id}.evt`), eventJson);
		if (fs.existsSync(path.join('cache', 'events', `${interaction.guild.id}.plr`)))
			fs.rmSync(path.join('cache', 'events', `${interaction.guild.id}.plr`));

		await interaction.reply({ content: 'Created!', ephemeral: true });
	},
};