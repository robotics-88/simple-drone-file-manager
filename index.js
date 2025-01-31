import fs from 'node:fs/promises'
import express from 'express'
import archiver from 'archiver'

// TODO
// handle sub-directories

const PORT = 9999
const ZIP_FILE_NAME = 'files.zip'

let app = express()
app.set('view engine', 'pug')
app.use('/static', express.static('static'))

// Home Page
app.get('/', async (request, response, next)=> {
  try {
    let files = await fs.readdir('./public/')
    response.render('index', { files })
  }
  catch (error) { next(error) }
})

// Download All Files
app.get('/download-all', (request, response, next)=> {
  try {
    response.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": "attachment; filename=" + ZIP_FILE_NAME
    })
    let zip = archiver('zip', { zlib: { level: 9 } })
    zip.on('warning', next)
    zip.on('error', next)
    zip.pipe(response)
    zip.directory('./public/', false)
    zip.finalize()
  }
  catch (error) { next(error) }
})

// Download File
app.get('/download/:fileName', async (request, response, next)=> {
  try {
    let fileName = request.params.fileName
    response.download('public/' + fileName)
  }
  catch (error) { next(error) }
})

// Delete File
app.get('/delete/:fileName', async (request, response, next)=> {
  try {
    let fileName = request.params.fileName
    let files = await fs.readdir('./public/')
    await fs.unlink('public/' + fileName)
    response.redirect('/')
  }
  catch (error) { next(error) }
})

// Error Handler
app.use((error, request, response, next)=> {
  console.error(error.stack)
  response.render('error', { error: error.stack })
})

// Start Server
app.listen(PORT, ()=> { console.log("Listening on port", PORT)})
