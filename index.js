import 'dotenv/config'


import fs from 'node:fs/promises'
import fss from 'node:fs'
import express from 'express'
import archiver from 'archiver'


const PORT = process.env['PORT']
const PUBLIC_DIRECTORY = process.env['PUBLIC_DIRECTORY']
const ZIP_FILE_NAME = 'files.zip'


let app = express()
app.set('view engine', 'pug')
app.use('/static', express.static('static'))


// Home Page
app.get('/', async (request, response, next)=> {
  try {

    let options =  { withFileTypes: true }
    let options2 = { withFileTypes: true, recursive: true }
    let files = await fs.readdir(PUBLIC_DIRECTORY, options)
    let structure = files
      .filter(t=> t.isDirectory())
      .map(d=> ({
        directory: d.name,
        flights: fss
          .readdirSync(d.parentPath + '/' + d.name, options)
          .filter(f=> f.isDirectory())
          .map(f=> ({
            files: fss
              .readdirSync(f.parentPath + '/' + f.name, options2)
              .filter(f=> f.isFile())
              .map(f=> f.parentPath + '/' + f.name)
          })),
        log: fss
          .readdirSync(d.parentPath + '/' + d.name, options)
          .filter(f=> f.isFile() && f.name.split('.')[1] == 'log')
          .map(l=> l.parentPath + '/' + l.name )[0] ?? null
      }))

    response.render('index', { structure })
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
    zip.directory(PUBLIC_DIRECTORY, false)
    zip.finalize()
  }
  catch (error) { next(error) }
})


// Download File
app.get('/download/:filePath', async (request, response, next)=> {
  try {
    let filePath = request.params.filePath
    response.download(filePath)
  }
  catch (error) { next(error) }
})


// Delete File
app.get('/delete/:fileName', async (request, response, next)=> {
  try {
    let fileName = request.params.fileName
    let files = await fs.readdir(PUBLIC_DIRECTORY)
    await fs.unlink(PUBLIC_DIRECTORY + fileName)
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
