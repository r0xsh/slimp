import express, { json } from 'express'
import sling from './sling.js'
const app = express()
const port = 7676

app.use(json())

app.post('/csv', async (req, res) => {
    const {token, from, to, divBy} = req.body
    let cal = await sling.getCalendar(token, new Date(from), new Date(to))

    if (Number.isInteger(divBy)) {
        cal = sling.subDividDays(cal, divBy)
    }

    const csv = sling.toCSV(cal)
    
    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", "attachment;filename=export.csv")
    res.writeHead(200)
    res.end(csv)
})

// Used only in production environment
app.get('/privacy.html', (_req, res) => res.sendFile('privacy.html', {root: './'}) )

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

export default app