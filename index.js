import 'dotenv/config'


import fs from 'node:fs/promises'
import fss from 'node:fs'
import express from 'express'
import archiver from 'archiver'
import path from 'node:path'


const PORT = process.env['PORT']
const PUBLIC_DIRECTORY = process.env['PUBLIC_DIRECTORY']
const ZIP_FILE_NAME = 'files.zip'


let app = express()
app.set('view engine', 'pug')
app.use('/static', express.static('static'))

// Home Page
app.get('/', async (request, response, next)=> {
  try {
    let options = { withFileTypes: true }
    let options2 = { withFileTypes: true, recursive: true }

    function formatSize(sizeInBytes) {
      const KB = 1024
      const MB = KB * 1024
      const GB = MB * 1024
    
      if (sizeInBytes >= GB) {
        return `${(sizeInBytes / GB).toFixed(1)} GB`
      } else if (sizeInBytes >= MB) {
        return `${(sizeInBytes / MB).toFixed(1)} MB`
      } else {
        return `${(sizeInBytes / KB).toFixed(1)} KB`
      }
    }    

    let dirs = await fs.readdir(PUBLIC_DIRECTORY, options)

    let structure = dirs
      .filter(d => d.isDirectory())
      .map(d => {
        const dirPath = path.join(PUBLIC_DIRECTORY, d.name)
        const flightDirs = fss.readdirSync(dirPath, options).filter(f => f.isDirectory())

        const flights = flightDirs.map(f => {
          const flightPath = path.join(dirPath, f.name)

          const allFiles = fss.readdirSync(flightPath, options2)
            .filter(f => f.isFile())
            .map(f => {
              const fullPath = path.join(flightPath, f.name)
              try {
                const stat = fss.statSync(fullPath)
                const relativePath = path.relative(PUBLIC_DIRECTORY, fullPath)
                return {
                  path: relativePath,
                  name: f.name,
                  mtime: stat.mtime,
                  size: stat.size,
                  displaySize: formatSize(stat.size)
                }
              } catch {
                return null
              }
            })
            .filter(f => f !== null)
            .sort((a, b) => b.mtime - a.mtime) // you can remove this line if you want inner files unsorted too

          return {
            name: f.name,
            files: allFiles
          }
        })

        const log = fss.readdirSync(dirPath, options)
          .filter(f => f.isFile() && f.name.endsWith('.log'))
          .map(l => path.relative(PUBLIC_DIRECTORY, path.join(dirPath, l.name)))[0] ?? null

        return {
          directory: d.name,
          flights,
          log
        }
      })
      .sort((a, b) => b.directory.localeCompare(a.directory)) // ← only sort the outermost folders

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
app.get('/download/:filePath(*)', async (req, res, next) => {
  try {
    const relativePath = req.params.filePath
    const absolutePath = path.join(PUBLIC_DIRECTORY, relativePath)
    res.download(absolutePath)
  } catch (error) {
    next(error)
  }
})


// Delete File
app.delete('/delete/:filePath(*)', async (req, res, next) => {
  try {
    const filePath = path.join(PUBLIC_DIRECTORY, req.params.filePath)
    await fs.unlink(filePath)
    res.status(200).send({ success: true })
  } catch (error) {
    next(error)
  }
})


// Error Handler
app.use((error, request, response, next)=> {
  console.error(error.stack)
  response.render('error', { error: error.stack })
})

// Multi-select
app.post('/', express.urlencoded({ extended: true }), async (req, res, next) => {
  try {
    const { _action, folders } = req.body

    if (!folders) return res.redirect('/')
    const folderList = Array.isArray(folders) ? folders : [folders]

    if (_action === 'delete') {
      await Promise.all(
        folderList.map(folder => fs.rm(path.join(PUBLIC_DIRECTORY, folder), { recursive: true, force: true }))
      )
      return res.redirect('/')
    }

    if (_action === 'download') {
      res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=selected-folders.zip"
      })

      const zip = archiver('zip', { zlib: { level: 9 } })
      zip.on('warning', next)
      zip.on('error', next)
      zip.pipe(res)

      folderList.forEach(folder => {
        zip.directory(path.join(PUBLIC_DIRECTORY, folder), folder)
      })

      await zip.finalize()
    }
  } catch (error) {
    next(error)
  }
})


// Start Server
app.listen(PORT, ()=> { console.log("Listening on port", PORT)})
