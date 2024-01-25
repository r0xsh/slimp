import express, { json } from 'express'
import sling from './sling.js'
const app = express()
const port = 7676

app.use(json())

app.post('/csv', async (req, res) => {
    const {token, from, to} = req.body
    const cal = await sling.getCalendar(token, new Date(from), new Date(to))
    const csv = sling.toCSV(cal)
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment;filename=export.csv");
    res.writeHead(200);
    res.end(csv);
})

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
