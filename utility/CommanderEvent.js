const fs = require('node:fs');
const path = require('node:path');
const { randomInt } = require('./random.js');

const basePath = path.join('cache', 'events');

module.exports = class CommanderEvent {
	constructor(commanderIds, eventId, maxMulligans, picks) {
		this.eventId = eventId;
		this.commanders = commanderIds;
		this.availableCommanders = commanderIds;
		this.usedCommanders = [];
		this.maxMulligans = maxMulligans;
		this.picks = picks;
		this.players = new Map();
	}

	register(player) {
		if (!this.players.has(player.id))
			this.players.set(player.id);
	}

	hasPlayer(playerId) {
		return this.players.has(playerId);
	}

	getPlayer(playerId) {
		return this.players.get(playerId);
	}

	updatePlayer(player) {
		if (!this.players.has(player.id))
			throw new Error(`Player ${player.id} has not been registered!`);
		this.players.set(player.id, player);
	}

	getCommanderOptions(allowDuplicates = false) {
		const options = [];

		for (let i = 0; i < this.picks; i++)
			options.push(this.randomCommander(allowDuplicates));

		return options;
	}

	randomCommander(allowDuplicates) {
		let commanderId;

		if (allowDuplicates)
			commanderId = this.randomFrom(this.commanders);
		else {
			commanderId = this.randomFrom(this.availableCommanders);

			const index = this.availableCommanders.indexOf(commanderId);
			if (index > -1) {
				this.usedCommanders.push(this.availableCommanders[index]);
				this.availableCommanders.splice(index, 1);
			}
		}

		return commanderId;
	}

	randomFrom(commanders) {
		return commanders[randomInt(commanders.length)];
	}

	save() {
		const obj = {
			usedCommanders: this.usedCommanders,
			maxMulligans: this.maxMulligans,
			picks: this.picks,
			players: JSON.stringify(Object.fromEntries(this.players)),
		};

		const outputFile = path.join(basePath, `${this.eventId}.evt`);
		fs.writeFileSync(outputFile, JSON.stringiy(obj));
	}

	load(eventId) {
		const inputFile = path.join(basePath, `${eventId}.evt`);
		const deserializedEvent = JSON.parse(fs.readFileSync(inputFile));

		this.eventId = eventId;
		this.usedCommanders = deserializedEvent.usedCommanders;
		this.maxMulligans = deserializedEvent.maxMulligans;
		this.picks = deserializedEvent.picks;
		this.players = new Map(Object.entries(JSON.parse(deserializedEvent.players)));

		this.availableCommanders = this.commanders.filter(commander => !this.usedCommanders.includes(commander));
	}
};