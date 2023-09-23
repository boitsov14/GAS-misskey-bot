function main() {

  Logger.log('Searching')

  const properties = PropertiesService.getScriptProperties()

  // Noteの検索
  const misskey_response = JSON.parse(UrlFetchApp.fetch('https://misskey.io/api/notes/mentions', {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify({
      'i': properties.getProperty('MISSKEY_ACCESS_TOKEN'),
      'sinceId': properties.getProperty('SINCE_ID')
    })
  }))
  Logger.log(JSON.stringify(misskey_response))

  // Note数が0なら終了
  if (misskey_response.length === 0) return

  // 最も古いNoteを指定
  const note = misskey_response[0]

  // LINE通知
  UrlFetchApp.fetch('https://notify-api.line.me/api/notify', {
    'method': 'post',
    'payload': {
      'message': note.url
        ? note.url
        : note.user.host
          ? `https://${note.user.host}/notes/${note.id}`
          : `https://misskey.io/notes/${note.id}`
    },
    'headers': { 'Authorization': 'Bearer ' + properties.getProperty('LINE_ACCESS_TOKEN') }
  })

  // botなら無視
  if (note.user.isBot) {
    Logger.log('Reply from a bot.')
    update_since_id(note.id)
    return
  }

  // @sequent_botから始まらない場合は無視
  if (!note.text.startsWith('@sequent_bot')) {
    Logger.log('Just a mention.')
    update_since_id(note.id)
    return
  }

  // publicでもhomeでもない場合は無視
  if (note.visibility !== 'public' && note.visibility !== 'home') {
    Logger.log('Not public nor home.')
    update_since_id(note.id)
    return
  }

  const txt = note.text.replaceAll('@sequent_bot', '').replaceAll('@misskey.io', '')

  // 送信するNoteの情報の設定
  const payload = {
    'id': note.id,
    'username': note.user.host ? '@' + note.user.username + '@' + note.user.host : '@' + note.user.username,
    'txt': txt
  }
  Logger.log(payload)

  update_since_id(note.id)

  // サーバへの送信
  const response = UrlFetchApp.fetch(properties.getProperty('URL') + '/misskey', {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'headers': {
      'Authorization': 'Bearer ' + properties.getProperty('PASSWORD')
    }
  })
  Logger.log(response)
}

function update_since_id(since_id) {
  PropertiesService.getScriptProperties().setProperty('SINCE_ID', since_id)
}
