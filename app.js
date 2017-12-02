/*
	Stolen from Traversy Media - youtube 
*/

const config = require('./config.json');

const express = require('express');
const app = express();


// serve chat page
app.use(express.static('public'));


const socket = require('socket.io');

// taken from : https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/mongoose
const mongoose = require('mongoose');

// mongodb://<dbuser>:<dbpassword>@ds129156.mlab.com:29156/crunchchat
const chatDB = "mongodb://" + process.env.DBUSER + ":" + process.env.DBPASS + "@" + config.mongo_host + "/" + config.mongo_db;
mongoose.connect(chatDB, {
  useMongoClient: true
});

mongoose.Promise = global.Promise; // replace with bluebird, if need be

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));


// define chat schema - start
/* 

{
	"handle": "brady",
	"message": "What up ?"
}

*/
const Schema = mongoose.Schema;

let chatModelSchema = new Schema({
    name: String,
    message: String
});

// Compile model from schema
let chatModel = mongoose.model('chat', chatModelSchema);

// define chat schema - end

// chat server init
const server = app.listen(process.env.PORT || config.port, () => {
	console.log(' -> running on '+config.port);
});

const io = socket(server);

io.on('connection', (sock) => {

	console.log('_>> connection - ' + sock.id);

	// ----------------------------------------------------------------------------------
	// sending status to the front end
	sendStatus = (s) => {
		io.sockets.emit('status', s);
	}
	// ----------------------------------------------------------------------------------


	// ----------------------------------------------------------------------------------
	// getting all docs in collection
	// https://stackoverflow.com/questions/24437085/mongoose-sorting-by-id
	sock.on('history', () => {
		// chatModel.find({}, null, {sort: {'_id': -1}}, (err, chats) => {
		chatModel.find({}, null, {sort: {'_id': 1}}, (err, chats) => {

			if(err) {
				throw err;
			}

			sock.emit('dbchats', chats); // chats is an Array

		});
	});
	// ----------------------------------------------------------------------------------

	// ----------------------------------------------------------------------------------
	// putting chats into chats collection
	sock.on('chat', (data) => { // this will be a JSON

		if(!data.name || !data.message) {

			sendStatus({
				error: true,
				message: 'handle (or) message missing'				
			});

			return;
		}

		// when we do get valid messages, we insert them into our collection
		let newChat = new chatModel({
			name: data.name,
			message: data.message
		});

		newChat.save((err, result) => {

			if(err) {
				sendStatus({
					error: true,
					message: 'error in saving chat to database'					
				});

				return;
			}

			io.sockets.emit('dbchats', [result]); 
			// chats is an Array -> result is an object, we send it to the front end as an array.

			// -- this should be removed soon :)
			// sendStatus({
			// 	error: false,
			// 	message: 'saved chat to database'				
			// });
			// --

		});

	});
	// ----------------------------------------------------------------------------------


	// ----------------------------------------------------------------------------------
	// when we get a removechats event clear the collection
	// ALERT: Bad move - not thinking eh!
	sock.on('removechats', (data) => {

		chatModel.remove({}, (err) => {

			if(err) {
				sendStatus({
					error: true,
					message: 'error in chat del'					
				});

				return;
			}

			sendStatus({
				error: false,
				removal: true,
				message: data+' removed chats'				
			});

		});

	});
	// ----------------------------------------------------------------------------------

});
