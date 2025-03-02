import 'dotenv/config'
import fs from 'node:fs'
import { inspect } from 'util'
import express from 'express'
import archiver from 'archiver'
import serveIndex from 'serve-index'

const PORT = process.env['PORT']
const PUBLIC_DIRECTORY = process.env['PUBLIC_DIRECTORY']

let app = express()

app.use('/',
  express.static(PUBLIC_DIRECTORY),
  serveIndex(PUBLIC_DIRECTORY, { icons: true, view: 'details' }))

// Start Server
app.listen(PORT, ()=> { console.log("Listening on port", PORT)})
