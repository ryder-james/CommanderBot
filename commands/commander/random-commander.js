const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	cooldown: 10, // Seconds
	data: new SlashCommandBuilder()
		.setName('random-commander')
		.setDescription('Generates a random commander, based on current format rules.'),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		let commanders = interaction.client.commanders;
		if (commanders.length == 0) {
			console.log('fetching commanders');
			commanders = await getCommanderList(interaction);
			interaction.client.commanders = commanders;
		}
		console.log(commanders.length);
		await interaction.editReply(commanders[Math.floor(Math.random() * commanders.length)].name);
	},
};

async function getCommanderList() {
	const filters = [
		{
			'rule': 'is',
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

	return await fetch(uri)
		.then(response => {
			return response.json();
		})
		.then(data => {
			return data.data;
		});
}