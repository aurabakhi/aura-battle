const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// 1. Khởi tạo Express server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

// 2. Khởi tạo Discord Bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || 'YOUR_BOT_TOKEN';
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || 'YOUR_CHANNEL_ID';

// Store messages in memory
let messages = [];

client.once('ready', () => {
    console.log(`🤖 Bot "${client.user.tag}" đã trực tuyến thành công!`);

    // Listen to Discord messages
    client.on('messageCreate', (message) => {
        if (message.channelId === DISCORD_CHANNEL_ID && !message.author.bot) {
            const msgData = {
                content: message.content,
                author: message.author.username,
                timestamp: message.createdAt,
                source: 'discord'
            };
            messages.push(msgData);
            io.emit('newMessage', msgData);
            console.log(`[Discord] ${message.author.username}: ${message.content}`);
        }
    });
});

// API endpoint to send message from web to Discord
app.post('/api/send-message', express.json(), (req, res) => {
    const { content } = req.body;
    
    if (content && DISCORD_CHANNEL_ID) {
        const channel = client.channels.cache.get(DISCORD_CHANNEL_ID);
        if (channel) {
            channel.send(`**[Web] Bảo:** ${content}`);
            console.log(`[Đã gửi lên Discord] ${content}`);

            const msgData = {
                content: content,
                author: 'Bảo (Web)',
                timestamp: new Date(),
                source: 'web'
            };
            messages.push(msgData);
            io.emit('newMessage', msgData);
            
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Channel not found' });
        }
    } else {
        res.status(400).json({ error: 'Missing content' });
    }
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('Client connected');
    socket.emit('initialMessages', messages);
});

server.listen(PORT, () => {
    console.log(`🌐 Server running at http://localhost:${PORT}`);
});

client.login(DISCORD_BOT_TOKEN);
