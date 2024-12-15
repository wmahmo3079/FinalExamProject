"use strict";

const path = require("path");
const portNumber = 5000;
const express = require("express"); /* Accessing express module */
const app = express(); /* app is a request handler function */
app.use(express.urlencoded({ extended: true }));
process.stdin.setEncoding("utf8");
const axios = require("axios");

require("dotenv").config({ path: path.resolve(__dirname, '.env') }) 

const uri = process.env.MONGO_CONNECTION_STRING;

/* Our database and collection */
const databaseAndCollection = {db: "TRAVEL", collection:"people"};
const { MongoClient, ServerApiVersion } = require('mongodb');


console.log(`Web server started and running at http://localhost:${portNumber}`);

const prompt = "Stop to shutdown the server: ";
process.stdout.write(prompt);
process.stdin.on('readable', () => {  /* on equivalent to addEventListener */
	const dataInput = process.stdin.read();
	if (dataInput !== null) {
		const command = dataInput.trim();
		if (command === "stop") {
			console.log("Shutting down the server");
            process.exit(0);  /* exiting */
        }
        process.stdout.write(prompt);
        process.stdin.resume();
    }
});

/* directory where templates will reside */
app.set("views", path.resolve(__dirname, "templates"));
app.use('/templates', express.static('templates'));

/* view/templating engine */
app.set("view engine", "ejs");

app.get("/", (request, response) => {
    response.render("index");
});

async function confirm(client, databaseAndCollection, data) {
	const { firstname, lastname, destination } = data;
	const application = { firstname, lastname, destination };

	try {
		await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(application);
		return { success: true, application };
	} catch (error) {
		console.error(error);
		return { success: false, error };
	}
}

app.post("/confirmation", async (req, res) => {
    const { firstname, lastname, destination } = req.body;

    if (!firstname || !lastname || !destination) {
        console.error("Missing form data");
        return res.status(400).send("Please fill out all fields in the form.");
    }

    const client = new MongoClient(uri);

    try {
        const response = await axios.get(`https://restcountries.com/v3.1/name/${encodeURIComponent(destination)}`);
        const countryData = response.data[0];

        const application = { firstname, lastname, destination };

        await client.connect();
        const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(application);

        res.render("confirmation", {
            firstname,
            lastname,
            destination,
            countryData: {
                officialName: countryData.name.official,
                region: countryData.region,
                subregion: countryData.subregion,
                population: countryData.population,
                capital: countryData.capital ? countryData.capital[0] : "No capital available",
                currency: Object.values(countryData.currencies || {}).map((currency) => currency.name).join(", "),
                languages: Object.values(countryData.languages || {}).join(", "),
                flag: countryData.flags.svg,
            },
        });
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).send("Error");
    } finally {
        await client.close();
    }
});

app.listen(portNumber);