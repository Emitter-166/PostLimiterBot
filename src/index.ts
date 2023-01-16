import {
    Client,EmbedBuilder,
    GuildChannel,
    IntentsBitField,
    PermissionsBitField
} from "discord.js";
import {DataTypes, Sequelize} from "sequelize";
import * as path from "path";

require('dotenv').config({
    path: path.join(__dirname, ".env")
})
const client = new Client({
    intents: [IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages]
})

const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: "channels.db",
    logging: false
})
 const channels = sequelize.define("channels", {
   channelId: {
       type: DataTypes.TEXT,
       allowNull: false
   },
    roleId: {
       type: DataTypes.TEXT,
        allowNull: false
    },
    cooldown: {
       type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false
    }
}, {
    timestamps: false,
    indexes: [
        {
            fields: ['channelId'],
            unique: true
        }
    ]
})

sequelize.sync({alter: true}).then(() => {
})


client.once('ready', () => {
    console.log("ready");
})

client.on('messageCreate', async msg => {
    try{
        if (msg.author.bot) return;
        const channelId = msg.channelId;
        const channel = await sequelize.model("channels").findOne({
            where: {channelId: channelId}
        })
        if(channel === null) return;

        const role = channel.get("roleId") as string;
        if(msg.member === null) return;
        if(msg.member.roles.cache.has(role)) return;

        const nextTime = (Date.now() + (channel.get("cooldown") as number * 1000) + "");

        await msg.member.roles.add("1062567202282287154")
        const dm = await msg.member.createDM();
        let s = `You will be able to chat again in the <#${channelId}> <t:${nextTime.slice(0, nextTime.length -3)}:R>, or activate "Kai Magic" to get unlimited messages on the channel and with Kai's DM (just send Kai "Go premium") 🎊🎉`;
        const embed = new EmbedBuilder()
            .setDescription("**" + s + "**");
        await dm.send({embeds: [embed]})
        saveTimeout(msg.author.id, nextTime + "")
    }catch (err){
        console.log(err);
    }
})


client.on('messageCreate', async msg => {
    try{
        if(!msg.member?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;
        const args = msg.content.split(" ");
        const commandName = args[0].toLowerCase();
        switch (commandName){
            case "!addcooldown":
                const role = args[1];
                const coolDownTime = args[2];
                const channelId = msg.channelId;

                if(!role || !coolDownTime){
                    msg.react("⛔").catch(err => {});
                }
                try{
                    await channels.create({
                        roleId: role,
                        channelId: channelId,
                        cooldown: coolDownTime
                    })
                    const channel = await (msg.channel as GuildChannel).fetch();
                    await channel.permissionOverwrites.create("1062567202282287154", {
                        SendMessages: false
                    })
                    msg.react("✅").catch(err => {});
                }catch (err){
                    msg.react("⛔").catch(err => {});
                }
                break;
            case "!removecooldown":
                const RMChannelId = msg.channelId;
                const RMRoleId = args[1];

                if(RMRoleId){
                    try{
                        await channels.destroy({
                            where: {
                                channelId: RMChannelId,
                                roleId: RMRoleId
                            }
                        })
                        const channel =  (await msg.guild?.channels.fetch(RMChannelId)) as GuildChannel
                        await channel.permissionOverwrites.delete("1062567202282287154");
                        msg.react("✅").catch(err => {});
                    }catch (err){
                        msg.react("⛔").catch(err => {});
                    }

                }else{
                    try{
                        await channels.destroy({
                            where: {
                                channelId: RMChannelId,
                            }
                        })
                        const channel = await (msg.channel as GuildChannel).fetch();
                        await channel.permissionOverwrites.delete("1062567202282287154");
                        msg.react("✅").catch(err => {});
                    }catch (err){
                        msg.react("⛔").catch(err => {});
                    }

                }
        }
    }catch (err){
        console.log(err)
    }
})

client.login(process.env._TOKEN).then(() => {
})

const fs = require('fs');

// Function to save the user's timeout information to the text file
function saveTimeout(userId:string, timeout:string) {
    try{
        fs.appendFile('timeout.txt', `${userId}, ${timeout}\n`, (err: Error) => {
        });
    }catch (err){
        console.log(err)
    }
}

// Function to read the timeout information from the text file
const readTimeout =  () => {
    fs.readFile('timeout.txt', 'utf8', async (err: Error, data: string) => {
        try{
            if (err) throw err;
            // Split the data into separate lines
            let lines = data.split('\n');
            let newData = "";
            // Iterate over each line
            const guild = await client.guilds.fetch("859736561830592522");
            for (let i = 0; i < lines.length; i++) {
                // Split the line into the user ID and timeout
                const [userId, timeout] = lines[i].split(',');

                // Check if the timeout has expired
                if (Date.now() > Number(timeout)) {
                    // Code to unmute the user here
                    const member = await guild.members.fetch(userId);
                    await member.roles.remove("1062567202282287154")
                    const dm = await member.createDM();
                    await dm.send(`You have been unmuted and can now send messages in the channel again. Enjoy!`)
                } else {
                    newData += lines[i] + "\n";
                }
            }
            fs.writeFile("timeout.txt", newData, (err: Error) => {
                if (err) throw err;
            });
        }catch (err){
            console.log(err);
        }
    });
}


// Call the readTimeout function every 30 seconds
setInterval(readTimeout, 30000);
