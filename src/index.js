'use strict'

/* eslint-disable indent */
const Discord = require('discord.js')
  const client = new Discord.Client()
require('dotenv').config()
const admin = require('firebase-admin')
  const serviceAccount = require('../' + process.env.FIR_SERVICEACCOUNT)
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  })
  const db = admin.firestore()
const Express = require('express')
  const app = Express()
const https = require('https')
/* eslint-enable indent */

const RANKS = {
  'Iron 1': 11,
  'Iron 2': 12,
  'Iron 3': 13,

  'Bronze 1': 21,
  'Bronze 2': 22,
  'Bronze 3': 23,

  'Silver 1': 31,
  'Silver 2': 32,
  'Silver 3': 33,

  'Gold 1': 41,
  'Gold 2': 42,
  'Gold 3': 43,

  'Platinum 1': 51,
  'Platinum 2': 52,
  'Platinum 3': 53,

  'Diamond 1': 61,
  'Diamond 2': 62,
  'Diamond 3': 63,

  'Immortal 1': 71,
  'Immortal 2': 72,
  'Immortal 3': 73,

  'Valorant': 81 // eslint-disable-line quote-props
}

const RANKS_REVERSED = {}
for (const key in RANKS) {
  const element = RANKS[key]
  RANKS_REVERSED[element] = key
}

const MAPS = ['Split', 'Bind', 'Haven', 'Training Grounds']

// \\
// \\//\\//\\//\\//\\//\\//\\//\\//\\//\\
// Heroku Init \\

app.set('port', (process.env.PORT || 6969))

app.get('/', function (request, response) {
  response.send('Hey')
}).listen(app.get('port'), function () {
  console.log(`ScrimBot Initilized | Running on port ${app.get('port')}`)
})

setInterval(() => {
  https.get('https://valorant-scrim-bot.herokuapp.com')
}, 5 * 60 * 1000) // 5 minutes in milliseconds

const activeUserRegistration = new Discord.Collection()
const userRegistrationSteps = [
  ['1. Valorant Username', 'What is your FULL Valorant username?'],
  ['2. Valorant Rank', 'What rank are you in Valorant? If you don\'t have a rank, type "N/A"'],
  ['3. Notifications', 'Do you want to be notified when LFG starts? Respond "yes" if you would like to opt-in.']
]

const activeMatchCreation = new Discord.Collection()
const matchCreationSteps = [
  ['1. Date & Time', 'When will the match be? Respond in the format YYYY-MM-DD/HH:MM'],
  ['2. Rank Minimum', 'What is the **MINIMUM** rank you are allowing into your tournament? If any, type "any"'],
  ['3. Rank Maximum', 'What is the **MAXIMUM** rank you are allowing into your tournament? If any, type "any"'],
  ['4. Player Count', 'How many players should be on each team? Max 5.'],
  ['5. Spectators', 'Are spectators allowed?'],
  ['6. Map', 'Which map would you like to play on? Respond 1 for Split, 2 for Bind, 3 for Haven, 4 for Training Grounds.']
]

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}! All systems online.`)
  client.user.setActivity('for matches', { type: 'WATCHING' })
})

client.on('message', async message => {
  if (message.author === client.user || message.author.bot === true) return // ignore messages from the bot itself or other bots
  if (activeUserRegistration.has(message.author.id)) {
    handleUserRegistration(activeUserRegistration.get(message.author.id), message)
    return
  }
  if (activeMatchCreation.has(message.author.id)) {
    handleMatchCreation(activeMatchCreation.get(message.author.id), message)
    return
  }
  if (message.guild.id !== '704495983542796338' && message.guild.id !== '350855731609600000') return // ignore message if not from "Fun Valorant Times"

  /* eslint-disable brace-style */
  if (message.content === 'v!register') {
    const existingRecord = await db.collection('users').doc(message.author.id).get()
      .catch(console.error)
    if (existingRecord.exists) {
      message.reply('You have already registered!')
      return
    }

    const embed = new Discord.MessageEmbed()
      .setTitle('ScrimBot Registration')
      .setAuthor(message.author.tag, message.author.avatarURL())
      .setDescription('Welcome to ScrimBot! We will ask you a set of questions to get started. At any time, you can cancel by reacting with the x below. You can either respond to these questions in the current channel or through DMs with the bot.')
      .addField(userRegistrationSteps[0][0], userRegistrationSteps[0][1])
    await message.author.createDM()
    message.author.send(embed)
      .then(async registrationMessage => {
        activeUserRegistration.set(message.author.id, {
          step: 0,
          botMessage: registrationMessage,
          userID: message.author.id,
          registrationInformation: {
            discordID: message.author.id
          }
        }) // add user to the list of users who are currently registering, and set their progress to 0 (none)
        registrationMessage.react('❌')
        message.reply('Check your DMs!')
      })
  }

  else if (message.content === 'v!match create') {
    const embed = new Discord.MessageEmbed()
      .setTitle('Create a Match')
      .setDescription('Let\'s start a match!')
      .setAuthor(message.author.tag, message.author.avatarURL())
      .addField(matchCreationSteps[0][0], matchCreationSteps[0][1])
    message.channel.send(embed)
      .then(async creationMessage => {
        activeMatchCreation.set(message.author.id, {
          step: 0,
          botMessage: creationMessage,
          userID: message.author.id,
          creationInformation: {
            players: { 1: [], 2: [] },
            spectators: false,
            map: 0,
            rankMinimum: '',
            rankMaximum: '',
            date: undefined,
            creator: message.author.id
          }
        }) // add user to the list of users who are currently registering, and set their progress to 0 (none)
        await creationMessage.react('❌')
      })
  }

  else if (message.content === 'v!match join') {
    const embed = new Discord.MessageEmbed()
      .setTitle('Join a Match')
      .setDescription('React with the match you want to join!')
    message.reply(embed)
  }

  else if (message.content.startsWith('v!match score')) {
    const embed = new Discord.MessageEmbed()
      .setTitle('Match Score Report')
      .setDescription('React with the match you want to join!')
    message.reply(embed)
  }

  else if (message.content === 'v!help') {
    const embed = new Discord.MessageEmbed()
      .setTitle('Help')
      .setDescription('v!register: Register to join matches.\nv!match create: Start a match.\nv!match join: Join a match.\nv!match score <match id> <score>')
    message.channel.send(embed)
  }

  else if (message.content === 'v!ping') {
    const embed = new Discord.MessageEmbed()
      .setTitle('You have pinged me')
      .setDescription(`Who's down for a game of ping pong?\n${client.ws.ping}ms`)
      .setURL('https://pong-2.com/')
    message.reply(embed)
  }

  else if (message.content === 'v!uptime') {
    const embed = new Discord.MessageEmbed()
      .setTitle('Uptime')
      .setDescription(`ScrimBot has been online for ${Math.floor(client.uptime / 60000)} minutes :)`)
    message.reply(embed)
  }

  else if (message.content === 'v!restart') {
    const existingRecord = await db.collection('botAdmins').doc(message.author.id).get()
      .catch(console.error)
    if (!existingRecord.exists) return message.reply('fuck off')
    const embed = new Discord.MessageEmbed()
      .setTitle('Restarting!')
      .setDescription('See you soon!')
    await message.channel.send(embed)
    client.destroy()
    process.exit(0)
  }

  else if (message.content === 'v!shutdown') {
    const existingRecord = await db.collection('botAdmins').doc(message.author.id).get()
      .catch(console.error)
    if (!existingRecord.exists) return message.reply('go away you pleb')
    const embed = new Discord.MessageEmbed()
      .setTitle('Shutdown!')
      .setDescription('Adios!')
    await message.channel.send(embed)
    client.destroy()
    process.exit(0)
  }
  /* eslint-enable brace-style */
})

client.on('messageReactionAdd', (reaction, user) => {
  if (reaction.message.author.bot) return // ignore messages from the bot itself or other bots
  if (activeUserRegistration.has(user.id) === false) return
  if (reaction.emoji.name === '❌') {
    const userRecord = activeUserRegistration.get(user.id)
    const embed = new Discord.MessageEmbed()
      .setTitle('ScrimBot Registration Cancelled')
      .setDescription('Your registration has been cancelled. If you want to try again, just type !register.')
    userRecord.botMessage.edit(embed)
    activeUserRegistration.delete(userRecord.userID)
    // reaction.remove()
  }
})

client.on('messageReactionAdd', (reaction, user) => {
  if (reaction.message.author.bot) return // ignore messages from the bot itself or other bots
  if (activeMatchCreation.has(user.id) === false) return
  if (reaction.emoji.name === '❌') {
    const userRecord = activeMatchCreation.get(user.id)
    const embed = new Discord.MessageEmbed()
      .setTitle('ScrimBot Match Creation Cancelled')
      .setDescription('Your Match Creation has been cancelled. If you want to try again, just type !match create.')
    userRecord.botMessage.edit(embed)
    activeMatchCreation.delete(userRecord.userID)
    // reaction.remove()
  }
})

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return // ignore messages from the bot itself or other bots

  const matchInformationRef = db.collection('matches').doc(reaction.message.id)
  let matchInformation = await matchInformationRef.get()
  if (!matchInformation.exists) return
  matchInformation = matchInformation.data()

  const playerInformationRef = db.collection('users').doc(user.id)
  let playerInformation = await playerInformationRef.get()
  if (!playerInformation.exists) {
    reaction.message.channel.send(`<@${user.id}>, you are not registered with ScrimBot. Please type v!register before reacting!`, { timeout: 5000 })
    reaction.users.remove(user.id)
    return
  }
  playerInformation = playerInformation.data()

  if (matchInformation.players['1'].find(e => e.id === playerInformationRef.id) || matchInformation.players['2'].find(e => e.id === playerInformationRef.id) || (matchInformation.spectators && matchInformation.spectators.find(e => e.id === playerInformationRef.id))) {
    reaction.message.channel.send(`<@${user.id}>, you have already joined a team! Please remove that reaction before joining a new one.`, { timeout: 5000 })
    reaction.users.remove(user.id)
    return
  }

  const messageEmbed = reaction.message.embeds[0]

  switch (reaction.emoji.name) {
    case '🇦':
      matchInformation.players['1'].push(playerInformationRef)
      messageEmbed.fields[6].value === 'None' ? messageEmbed.fields[6].value = `• ${playerInformation.valorantUsername}` : messageEmbed.fields[6].value += `\n• ${playerInformation.valorantUsername}`
      break
    case '🇧':
      matchInformation.players['2'].push(playerInformationRef)
      messageEmbed.fields[7].value === 'None' ? messageEmbed.fields[7].value = `• ${playerInformation.valorantUsername}` : messageEmbed.fields[7].value += `\n• ${playerInformation.valorantUsername}`
      break
    case '🇸':
      if (!matchInformation.spectators) {
        reaction.message.channel.send(`<@${user.id}>, this match does not allow spectators! Either join a team or ask the match creator to start a new one.`, { timeout: 5000 })
        reaction.users.remove(user.id)
      } else {
        matchInformation.spectators.push(playerInformationRef)
        messageEmbed.fields[8].value === 'None' ? messageEmbed.fields[8].value = `• ${playerInformation.valorantUsername}` : messageEmbed.fields[8].value += `\n• ${playerInformation.valorantUsername}`
      }
      break
    default:
      console.log('other emoji')
  }

  reaction.message.edit(messageEmbed)
  matchInformationRef.update(matchInformation)
})

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return // ignore messages from the bot itself or other bots

  const matchInformationRef = db.collection('matches').doc(reaction.message.id)
  let matchInformation = await matchInformationRef.get()
  if (!matchInformation.exists) return
  matchInformation = matchInformation.data()

  const playerInformationRef = db.collection('users').doc(user.id)
  let playerInformation = await playerInformationRef.get()
  if (!playerInformation.exists) return
  playerInformation = playerInformation.data()

  // if (matchInformation.players['1'].find(e => e.id === playerInformationRef.id) || matchInformation.players['2'].find(e => e.id === playerInformationRef.id) || (matchInformation.spectators && matchInformation.spectators.find(e => e.id === playerInformationRef.id))) {
  //   reaction.message.channel.send(`<@${user.id}>, you have already joined a team! Please remove that reaction before joining a new one.`, { timeout: 5000 })
  //   reaction.users.remove(user.id)
  //   return
  // }

  const messageEmbed = reaction.message.embeds[0]

  let playersArrayIndex
  switch (reaction.emoji.name) {
    case '🇦':
      playersArrayIndex = matchInformation.players['1'].findIndex(e => e.id === playerInformationRef.id)
      if (playersArrayIndex > -1) matchInformation.players['1'].splice(playersArrayIndex, 1)

      messageEmbed.fields[6].value = ''
      matchInformation.players['1'].forEach(async playerRef => {
        let playerDoc = await playerRef.get()
        playerDoc = playerRef.data()
        messageEmbed.fields[6].value += `\n• ${playerDoc.valorantUsername}`
      })
      if (messageEmbed.fields[6].value === '') messageEmbed.fields[6].value = 'None'
      break
    case '🇧':
      playersArrayIndex = matchInformation.players['2'].findIndex(e => e.id === playerInformationRef.id)
      if (playersArrayIndex > -1) matchInformation.players['2'].splice(playersArrayIndex, 1)

      messageEmbed.fields[7].value = ''
      matchInformation.players['2'].forEach(async playerRef => {
        let playerDoc = await playerRef.get()
        playerDoc = playerRef.data()
        messageEmbed.fields[7].value += `\n• ${playerDoc.valorantUsername}`
      })
      if (messageEmbed.fields[7].value === '') messageEmbed.fields[7].value = 'None'
      break
    case '🇸':
      if (matchInformation.spectators) {
        playersArrayIndex = matchInformation.spectators.findIndex(e => e.id === playerInformationRef.id)
        if (playersArrayIndex > -1) matchInformation.spectators.splice(playersArrayIndex, 1)

        messageEmbed.fields[8].value = ''
        matchInformation.spectators.forEach(async playerRef => {
          let playerDoc = await playerRef.get()
          playerDoc = playerRef.data()
          messageEmbed.fields[8].value += `\n• ${playerDoc.valorantUsername}`
        })
        if (messageEmbed.fields[8].value === '') messageEmbed.fields[8].value = 'None'
      }
      break
  }

  reaction.message.edit(messageEmbed)
  matchInformationRef.update(matchInformation)
})

const handleUserRegistration = (userRecord, userMessage) => {
  if (userMessage.channel.type !== 'dm') return

  switch (userRecord.step) {
    case 0:
      userRecord.registrationInformation.valorantUsername = userMessage.content
      break
    case 1:
      if (!RANKS[userMessage.content]) {
        return userMessage.reply('Please give a valid rank!').then(msg => msg.delete({ timeout: 5000 }))
      } else {
        userRecord.registrationInformation.valorantRank = RANKS[userMessage.content] // TODO: cover edge cases
        break
      }
    case 2:
      userRecord.registrationInformation.notifications = (userMessage.content === 'yes' || userMessage.content === 'true' || userMessage.content === '1' || userMessage.content === 'si')
      break
  }

  if (userRecord.step < userRegistrationSteps.length - 1) {
    const embed = userRecord.botMessage.embeds[0]

    const previousField = embed.fields[userRecord.step]
    previousField.name = '✅ ' + previousField.name

    userRecord.step = userRecord.step + 1

    const stepInfo = userRegistrationSteps[userRecord.step]
    embed.addField(stepInfo[0], stepInfo[1])
    userRecord.botMessage.edit(embed)

    activeUserRegistration.set(userRecord.userID, userRecord)
  } else {
    const embed = new Discord.MessageEmbed()
      .setTitle('ScrimBot Registration Complete')
      .setDescription('Thanks for registering! Now it\'s time to get playing!')
    userRecord.botMessage.edit(embed)
    // userRecord.botMessage.reactions.removeAll()
    userRecord.registrationInformation.timestamp = new Date()
    db.collection('users').doc(userRecord.userID).set(userRecord.registrationInformation)
    console.log(userRecord)
    activeUserRegistration.delete(userRecord.userID)
  }
}

const handleMatchCreation = (userRecord, userMessage) => {
  if (userMessage.channel !== userRecord.botMessage.channel) return

  userMessage.delete()
  switch (userRecord.step) {
    case 0:
      userRecord.creationInformation.date = userMessage.content
      break
    case 1:
      if (!RANKS[userMessage.content]) {
        return userMessage.reply('please give a valid rank!').then(msg => msg.delete({ timeout: 5000 }))
      } else {
        userRecord.creationInformation.rankMinimum = RANKS[userMessage.content] // TODO: cover edge cases
        break
      }
    case 2:
      if (!RANKS[userMessage.content]) {
        return userMessage.reply('please give a valid rank!').then(msg => msg.delete({ timeout: 5000 }))
      } else {
        userRecord.creationInformation.rankMaximum = RANKS[userMessage.content] // TODO: cover edge cases
        break
      }
    case 3:
      if (!Number(userMessage.content) || Number(userMessage.content) > 5) {
        return userMessage.reply('please give a valid number!').then(msg => msg.delete({ timeout: 5000 }))
      } else {
        userRecord.creationInformation.maxTeamCount = Number(userMessage.content)
        break
      }
    case 4:
      userRecord.creationInformation.spectators = (userMessage.content === 'yes' || userMessage.content === 'true' || userMessage.content === '1' || userMessage.content === 'si') ? [] : false
      break
    case 5:
      if (!Number(userMessage.content) || Number(userMessage.content) > MAPS.length) {
        return userMessage.reply('please give a valid number!').then(msg => msg.delete({ timeout: 5000 }))
      } else {
        userRecord.creationInformation.map = MAPS[Number(userMessage.content - 1)]
        break
      }
  }

  if (userRecord.step < matchCreationSteps.length - 1) {
    const embed = userRecord.botMessage.embeds[0]

    const previousField = embed.fields[userRecord.step]
    previousField.name = '✅ ' + previousField.name

    userRecord.step = userRecord.step + 1

    const stepInfo = matchCreationSteps[userRecord.step]
    embed.addField(stepInfo[0], stepInfo[1])
    userRecord.botMessage.edit(embed)

    activeMatchCreation.set(userRecord.userID, userRecord)
  } else {
    const embed = new Discord.MessageEmbed()
      .setTitle('Match Creation Complete')
      .setDescription('Your match has been made!')
    userRecord.botMessage.edit(embed)
    userRecord.botMessage.reactions.removeAll()
    userRecord.creationInformation.timestamp = new Date()

    const matchEmbed = new Discord.MessageEmbed()
      .setTitle('Join Match')
      .setColor('PURPLE')
      .setDescription('React with 🇦 to join the A team, react with 🇧 to join the B team and react with 🇸 to be a spectator.')
      .setTimestamp(new Date(userRecord.creationInformation.date))
      .setAuthor(userMessage.author.tag, userMessage.author.avatarURL())
      .addField('Creator', userMessage.author.tag, true)
      .addField('Date', userRecord.creationInformation.date, true)
      .addField('Map', userRecord.creationInformation.map, true)
      .addField('Max Team Count', userRecord.creationInformation.maxTeamCount, true)
      .addField('Minimum Rank', RANKS_REVERSED[userRecord.creationInformation.rankMinimum], true)
      .addField('Maximum Rank', RANKS_REVERSED[userRecord.creationInformation.rankMaximum], true)
      .addField('Team A', 'None', true)
      .addField('Team B', 'None', true)
      .addField('Spectators', userRecord.creationInformation.spectators instanceof Array ? 'None' : 'Not allowed', true)
    userRecord.botMessage.channel.send(matchEmbed)
      .then(message => {
        message.react('🇦')
        message.react('🇧')
        if (userRecord.creationInformation.spectators) message.react('🇸')
        db.collection('matches').doc(message.id).set(userRecord.creationInformation)
        activeMatchCreation.delete(userRecord.userID)
      })
  }
}

if (process.env.TOKEN) {
  client.login(process.env.TOKEN)
} else {
  console.error('Bot token not found! Ensure environment variable TOKEN contains the bot token. If you don\'t understand this, go read the documentation.')
}

process.on('unhandledRejection', console.error)
