// Require dependencies
var connect = require('connect');
var fs = require('fs');
 
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

// TODO: this probably belongs in redis (or at least a session)
var broadcast = {};
var nicknames = {};

function doBroadcast(msg) {
	for(var id in broadcast) {
		broadcast[id].write(msg);
	}
}
function chatMessage(type, nickname, content) {
	var theMessage = {
		msg_type: type,
		nickname: nickname,
		content: content
	}
	console.log(JSON.stringify(theMessage));
	return JSON.stringify(theMessage);
}
function nicknamesToArray() {
	var nicknamesArray = new Array();
	for(var id in nicknames) {
		console.log(id + ':' + nicknames[id]);
		nicknamesArray[nicknamesArray.length] = nicknames[id];
	}
	return nicknamesArray;
}
function onConnection(conn) {
	// maintain our broadcast list
	broadcast[conn.id] = conn;
	// echo back
	conn.on('data', function(message) {
		console.log('Raw Message:' + message);
		var msg = JSON.parse(message);
		switch(msg.msg_type) {
			case 'set_nickname':
				var nickname = msg.content;
				// join = need to send down list of current members.
				// If you're the first, don't bother!
				var listOfNicknames =  nicknamesToArray();
				if (listOfNicknames.length > 0) {
					conn.write(chatMessage('members', nickname, listOfNicknames));
				}
				nicknames[conn.id] = nickname;
				doBroadcast(chatMessage('connect', nickname, 'CONNECTED'));
				break;
			case 'chat':
				doBroadcast(chatMessage('chat', nicknames[conn.id], msg.content));
				break;
			default:
				console.warn("Unknown message type received: " + msg.msg_type);
		}
	});
	// notify disconnect
	conn.on('close', function() {
		console.log('    [-] broadcast close connection:' + conn);
		var disconnectMsg = chatMessage('disconnect', nicknames[conn.id], 'DISCONNECTED');
		delete broadcast[conn.id];
		delete nicknames[conn.id];
		doBroadcast(disconnectMsg);
	});
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
}

