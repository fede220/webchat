# Webchat

A simple IRC-like web chat server & client, implemented with SockJS.  Server runs on Node.js.

This project was primarily created to familiarize myself with Node & websockets.

## Instructions

### Server

Always runs on port 8000.

    node server.js

### Client

Point your browser to http://<your server>:8000/

The first client to join the chat will become the chatroom Op.  If the Op leaves the chatroom, one of the remaining members is randomly promoted to Op.

#### Commands

* /whisper, /w <nickname> <message> - sends a private message (whisper) to member.
* /emote, /e <message> - 'emotes' the message
* /kick, /k <nickname> - removes target member from chatroom.  Requires Op status.
* /mute, /m <nickname> - mutes target member, preventing them from chatting or whispering.  Requires Op status.  Run /mute again to unmute.
* /promote, /p <nickname> - promotes target member to Op.  Requires Op status.

## Node Dependencies

* connect - for serving static resources
* sockjs - websockets implementation for client-server communication

## Other Notes

Twitter Bootstrap is used for CSS/layout.
