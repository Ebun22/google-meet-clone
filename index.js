const express = require('express');
const path = require('path');
const app = express();
const fs = require('fs');
var bodyParser = require('body-parser')
const fileUpload = require('express-fileupload')
const server = app.listen(8000, () => console.log("Listening on port 8000..."));
let userConnection = [];
let otherUsers = []

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.use(fileUpload({
    useTempFiles : true,
    tempFileDir : 'src/views/public/attachment/'
}));

app.use(express.static(path.join(__dirname, "")))

const io = require('socket.io')(server, {
    allowEIO3: true // false by default
});

io.on('connection', (socket) => {
    console.log('socket id is ', socket.id);

    socket.on("userConnection", (data)=>{
            console.log("this is the data passed from client: ", data)
        if (otherUsers.length === 0) {
            // If otherUsers array is empty, add the current user's details
            otherUsers.push({
                connectionId: socket.id,
                displayName: data.displayName,
                meetingId: data.meetingId
            });
        } else {
            // If otherUsers array is not empty, add users from userConnection with the same meetingId
            const usersWithSameMeetingId = userConnection.filter(user => (user.meetingId === otherUsers[0].meetingId) && (user.connectionId != otherUsers[0].connectionId));
            console.log(usersWithSameMeetingId)
            otherUsers.push(...usersWithSameMeetingId);
        }
        
        userConnection.push({
            connectionId: socket.id,
            displayName: data.displayName,
            meetingId: data.meetingId
        })

        const userCount = (otherUsers.length);
        // console.log("This is count of users in my room: ", userCount);
        // console.log("This is the other users: ", otherUsers);

        otherUsers.forEach( user => {
            socket.to(user.connectionId).emit("informOtherUsersAboutMe", {
                otherUserDisplayName: user.displayName,
                conId: socket.id,
                userCount: userCount
            })
        })

        socket.emit("informMeAboutOtherUser", otherUsers)
    });

    socket.on('SDPProcess', (data) => {
        socket.to(data.to_connId).emit('SDPProcess', {
            message: data.message,
            from_connId: data.data.to_connId
        })
    })

    socket.on('sendMessage', (msg) => {
        console.log(msg);
        const mUser = userConnection.find((p) => p.connectionId == socket.id);
        console.log("This is mUser "+ mUser)
        if(mUser){
            const meetingId = mUser.meetingId;
            const from = mUser.displayName;
            console.log("This is from "+ from)
            const list = userConnection.filter(p => p.meetingId == meetingId);
            list.forEach(v => {
                socket.to(v.connectionId).emit('showMessage', {
                    from: from,
                    message: msg
                })
            })
        }
    })

    socket.on('fileTransferToOther', (data) => {
        console.log(data);
        const mUser = userConnection.find((p) => p.connectionId == socket.id);
        if(mUser){
            const meetingId = mUser.meetingId;
            const from = mUser.displayName;
            const list = userConnection.filter(p => p.meetingId == meetingId);
            list.forEach(v => {
                socket.to(v.connectionId).emit('showFileMessage', {
                    username: data.username,
                    meetingId: data.meetingId,
                    filePath: data.filePath,
                    fileName: data.fileName,
                })
            })
        }
    })

    socket.on('disconnect', () => {
        let disUser = userConnection.find((user) => {user.connectionId == socket.id})
        if(disUser){
            const meetingId = disUser.meetingId;
            userConnection = userConnection.filter((user) => {
                user.connectionId != socket.id
            });
            const list  = userConnection.filter( user => user.meetingId == meetingId);
            list.forEach((user) => {
                const numUserLeft = userConnection.length;
                socket.to(user.connectionId).emit('informOthersAboutDisconnectedUser', 
                {
                    connId: socket.id,
                    numUserLeft: numUserLeft
                })
            })

        }
    })
});

app.post("/attachment", (req, res) => {
    const data = req.body;
    const imageFile = req.files.zipfile
    console.log(imageFile);
    const dir = `src/views/public/attachment/${data.meetingId}/`;
    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir)
    }

    imageFile.mv(`${dir}${imageFile.name}`, (error) => {
        if(error){
            console.log("couldn't upload the image fileUpload, error: ", error)
        } else {
            console.log("Image file uploaded sucessfully!")
        }
    })
})
