// set the user's handle on first load
let handle = "";

function putHandle() {
	handle = prompt('your handle ?');
}

function setHandle(h) {
	localStorage.setItem('handle', h);
}

function sendNotification(msg) {
	let ndiv = document.createElement('div');
	ndiv.id = 'notify';

	// creating the message
	let np = document.createElement('p');
	let np_value = document.createTextNode(msg);
	np.appendChild(np_value);

	// putting the message in the div
	ndiv.appendChild(np);

	let mdiv = document.getElementById('main');
	mdiv.appendChild(ndiv);

	// remove the notification after waiting sometime :)
	setTimeout(function() {
		mdiv.removeChild(ndiv);
	}, 4000);

}

// start of js

// if nick is not in session storage, set it
if(!localStorage.getItem('handle')) {

	putHandle();

	while(handle == "") {

		alert('set a handle, dick head!');
		putHandle();
	} 

	setHandle(handle);

}

// set our socket connection to our server
let socket = io.connect('http://localhost:4000');

// get the handle from localStorage.getItem('handle')
let message = document.getElementById('message-box'),
	cw = document.getElementById('chat-window');

// load previous messages
socket.emit('history');

message.addEventListener('keydown', function(e) { // event keycode

	// when enter key is pressed send the data to our backend server
	if(e.which == 13) {

		let data = {
			name: localStorage.getItem('handle'),
			message: message.value
		};

		// https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault
		e.preventDefault();


		// super secret command to purge all chats
		if(data.message == "/purge") {
			socket.emit('removechats', localStorage.getItem('handle')); // we wanna know who purged the chats
			return;
		}

		socket.emit('chat', data); // send data back to our server
	}

});


// notifs via socket
socket.on('status', function(data) {
	if(data.error == false) {

		// clear chat window
		if(data.removal == true) {
			cw.innerHTML = "";
			message.value = "";
		}

		sendNotification("success: "+ data.message);
	} else {
		sendNotification("error: "+ data.message);
	}

});

// push all chats into front end
socket.on('dbchats', function(data) { // array meh!

	// console.log(data);

	for(let i=0; i<data.length; i++) {

		cw.innerHTML += "<p><strong>"+data[i]["name"]+": </strong>"+data[i]["message"]+"</p>";

	}

	// the scroll to point at bottom of div
	cw.scrollTop = cw.scrollHeight;

	message.value = "";

});

// end of js
