const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('register')
		.setDescription('Register for an ongoing event in this server.'),
	async execute(interaction) {
		const { events } = interaction.client;

		if (!events.has(interaction.guild.id)) {
			await interaction.reply({ content: 'A Host must first start an Event!', ephemeral: true });
			return;
		}

		const event = events.get(interaction.guild.id);

		if (event.hasPlayer(interaction.user.id)) {
			await interaction.reply({ content: 'You are already registered for this event.', ephemeral: true });
			return;
		}

		event.register(interaction.user.id, {
			mulligans: event.maxMulligans,
		});

		await interaction.reply(`${interaction.user} has registered for the event!`);
	},
};