import express, { json } from 'express'
import sling from './sling.js'

const app = express()
const port = 7676

app.use(json())

app.post('/csv', async (req, res) => {
    const {token, from, to, template, per_x_min} = req.body
    let cal = await sling.getCalendar(token, new Date(from), new Date(to))
    if (template === 'per_x_min') {
        cal = sling.subDividDays(cal, per_x_min)
    }
    const csv = sling.toCSV(cal)
    
    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", "attachment;filename=export.csv")
    res.writeHead(200)
    res.end(csv)
})

// Used for production
app.get('/privacy.html', (_req, res) => res.sendFile('/usr/src/app/privacy.html'))

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
