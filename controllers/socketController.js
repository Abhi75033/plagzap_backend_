module.exports = (io) => {
    const rooms = new Map(); // roomId -> Set of socketIds

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('join-room', (roomId, userId) => {
            socket.join(roomId);

            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
            }
            rooms.get(roomId).add(socket.id);

            const usersInRoom = Array.from(rooms.get(roomId)).filter(id => id !== socket.id);
            socket.emit('all-users', usersInRoom);

            console.log(`User ${socket.id} joined room ${roomId}. Users: ${usersInRoom.length}`);
        });

        socket.on('sending-signal', payload => {
            io.to(payload.userToSignal).emit('user-joined', {
                signal: payload.signal,
                callerID: payload.callerID
            });
        });

        socket.on('returning-signal', payload => {
            io.to(payload.callerID).emit('receiving-returned-signal', {
                signal: payload.signal,
                id: socket.id
            });
        });

        // Chat message
        socket.on('chat-message', (message) => {
            // Broadcast to all users in all rooms this socket is in
            socket.rooms.forEach(room => {
                if (room !== socket.id) { // Don't send to self's room (socket.id is always in rooms)
                    socket.to(room).emit('chat-message', message);
                }
            });
            console.log(`Chat message from ${message.userName}: ${message.message}`);
        });

        // Hand raise
        socket.on('hand-raised', (data) => {
            socket.rooms.forEach(room => {
                if (room !== socket.id) {
                    socket.to(room).emit('hand-raised', data);
                }
            });
            console.log(`${data.userName} ${data.raised ? 'raised' : 'lowered'} hand`);
        });

        // Reactions
        socket.on('reaction-sent', (data) => {
            socket.rooms.forEach(room => {
                if (room !== socket.id) {
                    socket.to(room).emit('reaction-sent', data);
                }
            });
            console.log(`${data.userName} sent reaction: ${data.reaction}`);
        });

        socket.on('disconnect', () => {
            rooms.forEach((users, roomId) => {
                if (users.has(socket.id)) {
                    users.delete(socket.id);
                    socket.to(roomId).emit('user-left', socket.id);
                }
            });
            console.log('User disconnected:', socket.id);
        });
    });
};
