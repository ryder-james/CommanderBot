const Canvas = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

const cardWidth = 672;
const cardHeight = 936;

module.exports = async function cardCombiner(cards) {
	if (!cards || cards.length < 1)
		throw Error('Not enough cards provided!');

	let canvas;
	if (cards.length == 1)
		canvas = await cardLayout1(cards[0]);
	else if (cards.length == 2)
		canvas = await cardLayout2(cards[0], cards[1]);
	else if (cards.length == 3)
		canvas = await cardLayout3(cards[0], cards[1], cards[2]);
	else if (cards.length == 4)
		canvas = await cardLayout4(cards[0], cards[1], cards[2], cards[3]);

	const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'cards.png' });
	return attachment;
};

async function cardLayout1(card1) {
	const canvas = Canvas.createCanvas(cardWidth, cardHeight);
	const ctx = canvas.getContext('2d');

	const image1 = await Canvas.loadImage(card1);

	ctx.drawImage(image1, 0, 0, cardWidth, cardHeight);

	return canvas;
}

async function cardLayout2(card1, card2) {
	const canvas = Canvas.createCanvas(cardWidth * 2, cardHeight);
	const ctx = canvas.getContext('2d');

	const image1 = await Canvas.loadImage(card1);
	const image2 = await Canvas.loadImage(card2);

	ctx.drawImage(image1, 0, 0, cardWidth, cardHeight);
	ctx.drawImage(image2, cardWidth, 0, cardWidth, cardHeight);

	return canvas;
}

async function cardLayout3(card1, card2, card3) {
	const canvas = Canvas.createCanvas(cardWidth * 1.5, cardHeight);
	const ctx = canvas.getContext('2d');

	const image1 = await Canvas.loadImage(card1);
	const image2 = await Canvas.loadImage(card2);
	const image3 = await Canvas.loadImage(card3);

	ctx.drawImage(image1, 0, 0, cardWidth, cardHeight);
	ctx.drawImage(image2, cardWidth, 0, cardWidth / 2, cardHeight / 2);
	ctx.drawImage(image3, cardWidth, cardHeight / 2, cardWidth / 2, cardHeight / 2);

	return canvas;
}

async function cardLayout4(card1, card2, card3, card4) {
	const canvas = Canvas.createCanvas(cardWidth * 2, cardHeight * 2);
	const ctx = canvas.getContext('2d');

	const image1 = await Canvas.loadImage(card1);
	const image2 = await Canvas.loadImage(card2);
	const image3 = await Canvas.loadImage(card3);
	const image4 = await Canvas.loadImage(card4);

	ctx.drawImage(image1, 0, 0, cardWidth, cardHeight);
	ctx.drawImage(image2, cardWidth, 0, cardWidth, cardHeight);
	ctx.drawImage(image3, 0, cardHeight, cardWidth, cardHeight);
	ctx.drawImage(image4, cardWidth, cardHeight, cardWidth, cardHeight);

	return canvas;
}