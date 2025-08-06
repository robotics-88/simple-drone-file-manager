import 'dotenv/config'


import fs from 'node:fs/promises'
import express from 'express'
import archiver from 'archiver'
import path from 'node:path'


const PORT = process.env['PORT']
const PUBLIC_DIRECTORY = process.env['PUBLIC_DIRECTORY']
const ZIP_FILE_NAME = 'files.zip'


let app = express()
app.set('view engine', 'pug')
app.use('/static', express.static('static'))

function formatSize(sizeInBytes) {
  const KB = 1024
  const MB = KB * 1024
  const GB = MB * 1024

  if (sizeInBytes >= GB) return `${(sizeInBytes / GB).toFixed(1)} GB`
  if (sizeInBytes >= MB) return `${(sizeInBytes / MB).toFixed(1)} MB`
  return `${(sizeInBytes / KB).toFixed(1)} KB`
}

// Helper function: Recursively list all files in the flight directory
async function walkFilesRecursively(dir) {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (e) {
    console.warn(`Cannot read directory ${dir}: ${e.message}`)
    return []
  }

  let files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      const nested = await walkFilesRecursively(fullPath)
      files = files.concat(nested)
    } else if (entry.isFile()) {
      try {
        const stat = await fs.stat(fullPath)
        files.push({
          path: path.relative(PUBLIC_DIRECTORY, fullPath),
          name: path.basename(fullPath),
          mtime: stat.mtime,
          size: stat.size,
          displaySize: formatSize(stat.size)
        })
      } catch (e) {
        console.warn(`Failed to stat file ${fullPath}: ${e.message}`)
      }
    } else {
      console.warn(`Skipping non-file entry: ${fullPath} (type: ${entry.constructor.name})`)
    }
  }

  return files
}

// Home Page
app.get('/', async (request, response, next) => {
  try {

    const topDirs = await fs.readdir(PUBLIC_DIRECTORY, { withFileTypes: true })
    const structure = await Promise.all(
      topDirs
        .filter(d => d.isDirectory())
        .map(async d => {
          try {
            const dirPath = path.join(PUBLIC_DIRECTORY, d.name)

            const flightDirs = (await fs.readdir(dirPath, { withFileTypes: true }))
              .filter(f => f.isDirectory())

            const flights = await Promise.all(
              flightDirs.map(async f => {
                const flightPath = path.join(dirPath, f.name)
                let allFiles = await walkFilesRecursively(flightPath)
                  .then(files => files.sort((a, b) => b.mtime - a.mtime))

                return {
                  name: f.name,
                  files: allFiles.filter(x => x !== null).sort((a, b) => b.mtime - a.mtime)
                }
              })
            )

            const logFile = (await fs.readdir(dirPath, { withFileTypes: true }))
              .filter(f => f.isFile() && f.name.endsWith('.log'))
              .map(f => path.relative(PUBLIC_DIRECTORY, path.join(dirPath, f.name)))[0] ?? null

            return {
              directory: d.name,
              flights,
              log: logFile
            }
          } catch (err) {
            console.warn(`Skipping folder ${d.name}: ${err.message}`)
            return null
          }
        })
    )

    response.render('index', {
      structure: structure.filter(x => x !== null).sort((a, b) => b.directory.localeCompare(a.directory))
    })
  } catch (error) {
    next(error)
  }
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
