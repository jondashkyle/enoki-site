var uuid = require('uuid-v4')
var WebSocket = require('../lib/ws')
var xtend = require('xtend')

module.exports = chat

function chat (state, emitter) {
  var ws
  state.chat = {
    address: 'wss://amusing-cub.glitch.me/',
    loaded: false,
    live: false,
    note: 'loading',
    messages: [ ],
    scratch: '',
    editing: false,
    user: {
      name: uuid(),
      message: ''
    }
  }

  state.events.CHAT_READY = 'chat:ready'
  state.events.CHAT_SEND = 'chat:send'
  state.events.CHAT_MESSAGE = 'chat:message'
  state.events.CHAT_USER = 'chat:user'
  state.events.CHAT_SCRATCH = 'chat:scratch'
  state.events.CHAT_LIVE = 'chat:live'

  emitter.on(state.events.DOMCONTENTLOADED, function () {
    ws = new WebSocket(state.chat.address)

    ws.addEventListener('open', function (event) {
      state.chat.loaded = true
      emitter.emit(state.events.CHAT_READY)
      emitter.emit(state.events.RENDER)

      setTimeout(function () {
        var elMessages = document.querySelector('[data-messages]')
        if (state.chat.live && elMessages) {
          elMessages.scrollTop = elMessages.scrollHeight
        }
      }, 100)
    })

    ws.addEventListener('error', function (event) {
      var shouldRender = state.chat.loaded || state.chat.live
      state.chat.loaded = true
      state.chat.live = false
      if (shouldRender) emitter.emit(state.events.RENDER)
    })

    ws.addEventListener('message', function (event) {
      var data = JSON.parse(event.data)

      // active
      if (data.live !== undefined) {
        state.chat.live = data.live
      }

      if (data.note) {
        state.chat.note = data.note
      }

      // scratch
      if (!state.chat.editing && data.scratch !== undefined) {
        state.chat.scratch = data.scratch
        if (state.chat.live) scrollMessages('[data-scratch]')
      }

      // messages
      if (data.messages) {
        state.chat.messages = state.chat.messages.concat(data.messages)
      }

      // message
      if (data.message) {
        state.chat.messages.push(data)
        scrollMessages('[data-messages]')
        if (data.message === state.chat.user.message) {
          emitter.emit(state.events.CHAT_USER, { message: '' })
        }
      }

      emitter.emit(state.events.CHAT_MESSAGE)
      emitter.emit(state.events.RENDER)
    })
  })

  emitter.on(state.events.CHAT_SEND, function (data) {
    if (data && data.name && data.message) {
      data.timestamp = new Date()
      ws.send(JSON.stringify(data))
    }
  })

  emitter.on(state.events.CHAT_SCRATCH, function (data) {
    if (data && data.scratch) {
      state.chat.editing = true
      state.chat.scratch = data.scratch
      ws.send(JSON.stringify(data))
    }
  })

  emitter.on(state.events.CHAT_LIVE, function (data) {
    if (data && data.live !== undefined) {
      state.chat.live = data.live
      ws.send(JSON.stringify(data))
    }
  })

  emitter.on(state.events.CHAT_USER, function (data) {
    if (!data) return
    state.chat.user = xtend(state.chat.user, data)
    emitter.emit(state.events.RENDER)
  })

  emitter.on(state.events.CHAT_MESSAGE, function (data) {

  })
}

function scrollMessages (selector) {
  if (typeof document !== 'undefined') {
    var elMessages = document.querySelector(selector)
    if (!elMessages) return

    if (elMessages.scrollHeight - elMessages.offsetHeight === elMessages.scrollTop) {
      setTimeout(function () {
        var elMessages = document.querySelector(selector)
        elMessages.scrollTop = elMessages.scrollHeight
      }, 100)
    }
  }
}
