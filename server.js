// Require dependencies
var fs = require('fs');
var crypto = require('crypto');
var events = require('events');
var util = require('util');

var connect = require('connect');
 
// request handler
function handler(req, res) {
  fs.readFile(__dirname + '/client.html', function(err, data) {
    if(err) {
      console.log(err);
      res.writeHead(500);
      return res.end('Error loading client.html');
    }
    res.writeHead(200);
    res.end(data);
  });
  console.log('Done handler');
}
 
// creating the server ( localhost:8000 )
function startServer() {
	var app = connect.createServer();
	app.use(connect.static(__dirname + "/static"));
	app.use(handler);
	var http = require('http').createServer(app);
	var sockJs = require('sockjs').createServer();

	sockJs.on('connection', onConnection);
	sockJs.installHandlers(http, {
		sockjs_url: 'http://localhost:8000/res/sockjs-0.3.2.min.js',
		prefix: '/sockjs',
		jsessionid: false,
		log: sockJsLog,
	});
	http.listen(8000);
}

// MISC
function chatMessage(type, from, content, target) {
	var theMessage = {
		msg_type: type,
		from: from.toJSON(),
		content: content,
		target: target
	}
	console.log(JSON.stringify(theMessage));
	return JSON.stringify(theMessage);
}
// TODO: handle collision?
function generateAnonName(client) {
	var name = 'Anon_' + client.id.toString();
	return name;
}
// ** END MISC

// GLOBAL CHATROOM
var chatroom = null;
var CLIENT_CTR = 0;

// ** Chat Client
function Client(conn) {
	this.conn = conn;
	this.id = ++CLIENT_CTR;
	this.name = null;
	this.opts = {};
}
util.inherits(Client, events.EventEmitter);
var C = Client.prototype;

// Client - JSON format
C.toJSON = function() {
	return {
		id: this.id,
		name: this.name,
		opts: this.opts
	}
}

// Client - data received from client
C.onMessage = function(data) {
	var msg;
	console.log('Raw Message:' + data);
    try {
        msg = JSON.parse(data);
    }
    catch (e) {
        this.drop('Bad JSON.');
        return;
	}
	switch(msg.msg_type ? msg.msg_type : '') {
		case 'set_nickname':
			this.name = msg.content;
			if (!this.name) {
				this.name = generateAnonName(this);
			}
			// initial connect, send ack back to client w/ client details
			if (!chatroom.clients[this.id]) {
				this.send(chatMessage('connect', this, 'CONNECTED'));
			}
			chatroom.addClient(this);
			// need to send down list of current members.
			var memberList =  chatroom.getMemberList();
			if (memberList.length > 0) {
				this.send(chatMessage('members', this, memberList));
			}
			break;
		case 'chat':
		case 'emote':
			chatroom.broadcast(chatMessage(msg.msg_type, this, msg.content));
			break;
		case 'whisper':
			var targetClient = chatroom.clients[msg.target];
			if (targetClient) {
				var toSend = chatMessage('whisper', this, msg.content, targetClient.id);
				this.send(toSend);
				targetClient.send(toSend);
			} else {
				this.send(chatMessage('chat', targetClient, ' - client doesn\'t exist'));
			}
			break;
		default:
			console.warn("Unknown message type received: " + msg.msg_type);
	}
}
// Client - disconnect
C.onDisconnect = function() {
	console.log('    [-] closing connection for client: ' + this.id + ', conn:' + this.conn);
	this.emit('disconnected');
	this.conn.removeAllListeners();
	this.removeAllListeners();
}
// Client - send message to client
C.send = function(msg) {
	this.conn.write(msg);
}
// ** END client

// ** Chatroom
function Chatroom(id) {
	this.id = id;
	this.clients = {};
}
var CR = Chatroom.prototype;

// Chatroom: add client
CR.addClient = function(client) {
	console.log('adding client: ' + client.id + ", name: " + client.name);
	// add to client list
	this.clients[client.id] = client;
	client.once('disconnected', this.removeClient.bind(this, client));
	// tell everyone in the room that a new person joined
	this.broadcast(chatMessage('join', client, 'JOINED'));
}

// Chatroom: remove client
CR.removeClient = function(client) {
	delete this.clients[client.id];
	var disconnectMsg = chatMessage('disconnect', client, 'DISCONNECTED');
	this.broadcast(disconnectMsg);
}

// Chatroom: broadcast message
CR.broadcast = function(msg) {
	for(var id in this.clients) {
		this.clients[id].send(msg);
	}
}

// Chatroom: send message (to client)
CR.send = function(targetId, msg) {
	this.clients[target].send(msg);
}

// Chatroom: get list of current members (id:name)
CR.getMemberList = function() {
	var members = new Array();
	for(var id in this.clients) {
		members[members.length] = { id: this.clients[id].id, name: this.clients[id].name };
	}
	return members;
}
// ** END Chatroom
function onConnection(conn) {
	if (!chatroom) {
		chatroom = new Chatroom(1);
	}
	var client = new Client(conn);
	// handlers
	conn.on('data', client.onMessage.bind(client)); 
	conn.once('close', client.onDisconnect.bind(client));
}

function sockJsLog(sev, msg) {
	if (sev != 'debug' && sev != 'info') {
		console.error(msg);
//	else if (config.DEBUG)
	} else {
		console.log(msg);
	}
}

if (require.main === module) {
	startServer();
/*	require('async').map(['server.js','client.html','static/res/sockjs-0.3.2.min.js', 'dne.txt'], function(item, callback) { console.log("in the iterator"); callback(null, 'WOO');}, function(err, results){
	    // results is now an array of stats for each file
		console.log(require('util').inspect(results));
		});
		*/
}

