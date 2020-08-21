"use strict";

const { get } = require("axios");

class Handler {
	constructor({ rekoSvc, translatorSvc }) {
		this.rekoSvc = rekoSvc;
		this.translatorSvc = translatorSvc;
	}

	async detectImageLabels(buffer) {
		const result = await this.rekoSvc
			.detectLabels({
				Image: {
					Bytes: buffer,
				},
			})
			.promise();

		//get items with confidence > 80.
		const workingItems = result.Labels.filter(
			({ Confidence }) => Confidence > 80
		);

		//join all names with and separator.
		const names = workingItems.map(({ Name }) => Name).join(" and ");

		return { names, workingItems };
	}

	async translateText(text) {
		console.log("text to translate", text);
		const params = {
			SourceLanguageCode: "en",
			TargetLanguageCode: "pt",
			Text: text,
		};

		const { TranslatedText } = await this.translatorSvc
			.translateText(params)
			.promise();

		return TranslatedText.split(" e ");
	}

	formatTextResults(texts, workingItems) {
		console.log("textsS", texts);
		console.log("workingItems", workingItems);

		const finalText = [];
		for (const indexText in texts) {
			const namePortuguese = texts[indexText];
			const confidence = workingItems[indexText].Confidence;
			finalText.push(
				`${confidence.toFixed(2)}% de ser do tipo ${namePortuguese}`
			);
		}

		console.log("finalText", finalText);

		return finalText.join("\n ");
	}

	async getImageBuffer(image) {
		const response = await get(image, {
			responseType: "arraybuffer",
		});
		const buffer = Buffer.from(response.data, "base64");

		return buffer;
	}

	async main(event) {
		try {
      
      const {imageUrl} = event.queryStringParameters;

      const buffer = await this.getImageBuffer(imageUrl);

			const { names, workingItems } = await this.detectImageLabels(
				buffer
			);

			const texts = await this.translateText(names);

			const finalText = this.formatTextResults(texts, workingItems);

			console.log("TEXTOS!", finalText);

			return {
				statusCode: 200,
				body: `A imagem tem\n `.concat(finalText),
			};
		} catch (e) {
			return {
				statusCode: 500,
				body: "Internal server error!" + e,
			};
		}
	}
}

const aws = require("aws-sdk");
const reko = new aws.Rekognition();
const translator = new aws.Translate();
const handler = new Handler({
	rekoSvc: reko,
	translatorSvc: translator,
});

//ignore all instances and use only this scope.
module.exports.main = handler.main.bind(handler);
