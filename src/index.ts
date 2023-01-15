import {Client, IntentsBitField, PermissionsBitField} from "discord.js";
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
    console.log("Synced");
})


client.once('ready', () => {
    console.log("ready");
})

client.on('messageCreate', async msg => {
    if (msg.author.bot) return;

    const channelId = msg.channelId;
    const channel = await sequelize.model("channels").findOne({
        where: {channelId: channelId}
    })
    if(channel === null) return;

    const role = channel.get("roleId") as string;
    if(msg.member === null) return;
    if(msg.member.roles.cache.has(role)) return;

    const coolDownDuration = channel.get("cooldown") as number * 1000;
    const coolDownChannel = cooldowns.get(channelId);
    if(!coolDownChannel){
       cooldowns.set(channelId, new FixedSizeMap<string, number>(250));
        cooldowns.get(channelId)?.set(msg.author.id, new Date().getTime());
        return;
    }

    const coolDownUser = coolDownChannel.get(msg.author.id);

    if(!coolDownUser){
        cooldowns.get(channelId)?.set(msg.author.id, new Date().getTime());
    }else{
        let nextAllowedMessageAt = coolDownUser + coolDownDuration;
        if((new Date().getTime()) < nextAllowedMessageAt){
            let time = nextAllowedMessageAt.toString().substring(0, nextAllowedMessageAt.toString().length -3);
            try{
                msg.delete().catch(err => {});
                const dm = await msg.member.createDM()
                dm.send(`You can send a message in the <#${channelId}> channel again <t:${time}:R>.`).catch(err => {})
            }catch (err) {}
        }else{
            cooldowns.get(channelId)?.set(msg.author.id, new Date().getTime());

        }
    }
})


client.on('messageCreate', async msg => {
    if(!msg.member?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;
    const args = msg.content.split(" ");
    const commandName = args[0].toLowerCase();
    switch (commandName){
        case "!addcooldown":
            const role = args[1];
            const coolDownTime = args[2];
            const channelId = msg.channelId;

            if(!role || !coolDownTime || !channelId){
                msg.react("⛔").catch(err => {});
            }
            try{
                await channels.create({
                    roleId: role,
                    channelId: channelId,
                    cooldown: coolDownTime
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
                    msg.react("✅").catch(err => {});
                }catch (err){
                    msg.react("⛔").catch(err => {});
                }

            }



    }
})




client.login(process.env._TOKEN).then(() => {
    console.log("Logged in");
})

export class FixedSizeMap<K, V>{
    private readonly maxSize: number;
    private map: Map<K, V>;
    private keys: K[];

    constructor(maxSize: number) {
        this.maxSize = maxSize;
        this.map = new Map();
        this.keys = [];
    }

    set(key: K, value: V): void {
        if (this.keys.length >= this.maxSize) {
            this.removeOldest();
        }
        if (!this.map.has(key)) {
            this.keys.push(key);
        }
        this.map.set(key, value);
    }

    get(key: K): V | undefined {
        return this.map.get(key);
    }

    has(key: K): boolean {
        return this.map.has(key);
    }

    private removeOldest(): void {
        const oldestKey = this.keys.shift();
        this.map.delete(oldestKey as K);
    }
}
const cooldowns = new FixedSizeMap<string, FixedSizeMap<string, number>>(50);
