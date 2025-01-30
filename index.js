import fs from 'node:fs/promises'
import express from 'express'

const PORT = 9999

let app = express()
app.set('view engine', 'pug')
app.use('/static', express.static('static'))

// Home Page
app.get('/', async (request, response)=> {
  let files = await fs.readdir('./public/')
  response.render('index', { files })
})

// Download All Files
app.get('/download-all', (request, response)=> {
  // todo:
  // zip up da whole directory
  // https://cheatcode.co/blog/how-to-create-and-download-a-zip-file-with-node-js-and-javascript
  // response.download( ~~raw zip file~~ )
  response.end()
})

// Download File
app.get('/download/:fileName', async (request, response)=> {
  let fileName = request.params.fileName
  let files = await fs.readdir('./public/')
  if (files.includes(fileName)) response.download('public/' + fileName)
  else response.end()
})

// Delete File
app.get('/delete/:fileName', async (request, response)=> {
  let fileName = request.params.fileName
  let files = await fs.readdir('./public/')
  if (files.includes(fileName)) {
    await fs.unlink('public/' + fileName)
    response.redirect('/')
  }
  else response.end()
})

app.listen(PORT, ()=> { console.log("Listening on port", PORT)})
