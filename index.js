const fs = require('node:fs');
const path = require('node:path');
const CommanderEvent = require('./utility/CommanderEvent');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./secret.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
client.cooldowns = new Collection();
client.events = new Collection();
client.commanders = [];

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command)
			client.commands.set(command.data.name, command);
		else
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once)
		client.once(event.name, (...args) => event.execute(...args));
	else
		client.on(event.name, (...args) => event.execute(...args));
}

const cachePath = path.join(__dirname, 'cache');
if (!fs.existsSync(cachePath))
	fs.mkdirSync(cachePath);
const gameEventsPath = path.join(cachePath, 'events');
if (!fs.existsSync(gameEventsPath))
	fs.mkdirSync(gameEventsPath);
const gameEventFiles = fs.readdirSync(gameEventsPath).filter(file => file.endsWith('.evt'));

for (const file of gameEventFiles) {
	const eventKey = file.substring(0, file.length - 4);

	const event = new CommanderEvent();
	event.load(client, eventKey)
		.then(() => ready(event, eventKey));
}

function ready(event, eventKey) {
	client.events.set(eventKey, event);
	client.login(token);
}