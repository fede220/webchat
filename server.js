// Require dependencies
var connect = require('connect');
var fs = require('fs');
var crypto = require('crypto');
 
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
var connectionsByNickname = {};

function doBroadcast(msg) {
	for(var id in broadcast) {
		broadcast[id].write(msg);
	}
}
function chatMessage(type, nickname, content, target) {
	var theMessage = {
		msg_type: type,
		nickname: nickname,
		content: content,
		target: target
	}
	console.log(JSON.stringify(theMessage));
	return JSON.stringify(theMessage);
}
function nicknamesToArray() {
	var nicknamesArray = new Array();
	for(var id in nicknames) {
		nicknamesArray[nicknamesArray.length] = nicknames[id];
	}
	return nicknamesArray;
}
// TODO: handle collision?
function generateAnonNickname() {
	var nickname = 'Anon_' + (new Date()).getTime().toString();
	return nickname;
}

function addMember(conn, nickname) {
	nicknames[conn.id] = nickname;
	connectionsByNickname[nickname] = conn.id;
}
function removeMember(conn){
	var nickname = nicknames[conn.id];
	delete broadcast[conn.id];
	delete nicknames[conn.id];
	delete connectionsByNickname[nickname];
}
function onConnection(conn) {
	// maintain our broadcast list
	broadcast[conn.id] = conn;
	// echo back
	conn.on('data', function(message) {
		console.log('Raw Message:' + message);
		var msg = JSON.parse(message);
		switch(msg.msg_type ? msg.msg_type : '') {
			case 'set_nickname':
				var nickname = msg.content;
				if (!nickname) {
					nickname = generateAnonNickname();
				}
				// join = need to send down list of current members.
				// If you're the first, don't bother!
				var listOfNicknames =  nicknamesToArray();
				if (listOfNicknames.length > 0) {
					conn.write(chatMessage('members', nickname, listOfNicknames));
				}
				addMember(conn, nickname);
				doBroadcast(chatMessage('connect', nickname, 'CONNECTED'));
				break;
			case 'chat':
			case 'emote':
				doBroadcast(chatMessage(msg.msg_type, nicknames[conn.id], msg.content));
				break;
			case 'whisper':
				var targetConn= broadcast[connectionsByNickname[msg.target]];
				if (targetConn) {
					var toSend = chatMessage('whisper', nicknames[conn.id], msg.content, msg.target);
					conn.write(toSend);
					targetConn.write(toSend);
				} else {
					conn.write(chatMessage('chat', msg.target, ' - username doesn\'t exist'));
				}
				break;
			default:
				console.warn("Unknown message type received: " + msg.msg_type);
		}
	});
	// notify disconnect
	conn.on('close', function() {
		console.log('    [-] broadcast close connection:' + conn);
		var disconnectMsg = chatMessage('disconnect', nicknames[conn.id], 'DISCONNECTED');
		removeMember(conn);
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
/*	require('async').map(['server.js','client.html','static/res/sockjs-0.3.2.min.js', 'dne.txt'], function(item, callback) { console.log("in the iterator"); callback(null, 'WOO');}, function(err, results){
	    // results is now an array of stats for each file
		console.log(require('util').inspect(results));
		});
		*/
}

