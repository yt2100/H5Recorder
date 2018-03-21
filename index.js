const { exec } = require('child_process');
const express = require('express');
const http = require('http')
const path = require('path');
const fs = require('fs');
const { Recorder, OverlayHandler, MergeHandler } = require('./Handlers')
var app = express();



let data = []


app.set('port', (process.env.PORT || 8080));

// http://expressjs.com/en/4x/api.html#app.listen
let server = http.createServer(app)

function main(jsonData, callback) {

	// fs.readFile(infile, function read(err, jsonData) {
	//     if (err) {
	//         throw err;
	//     }

			data = JSON.parse(jsonData)
			var expressStaticOptions = {
			  dotfiles: 'ignore',
			  etag: false,
			  extensions: ['htm', 'html'],
			  index: ['index.html', 'index.htm'],
			  maxAge: '1d',
			  redirect: false,
			  setHeaders: function (res, path, stat) {
			    res.set('x-timestamp', Date.now())
			  }
			}


			server.listen(() => {
				let serverPort = server.address().port

				app.use((req, res, next) => {
					//TODO: avoid using file:/// protocols;
					// extract the encoded path; localhost[/ENCODED_PATH]
					req.url = decodeURIComponent(req.url.substring(1))
					console.log(req.url)
					next()
				})

				data = data.map((entry) => {

					// local page?
					if (!entry.page.match(/http[s]*:\/\//)) {
						// check it path is not absolute
						if (!entry.page.match(/[^\:]*:|^\/^\\/)) {
							//TODO: parentDirectory
							entry.page = path.join(process.cwd(), entry.page)
							//TODO:encode
						}

						// use parent directory
						// http://expressjs.com/en/api.html#example.of.express.static
						let parentDirectory = path.dirname(entry.page)
						app.use(parentDirectory, express.static(parentDirectory, expressStaticOptions))
						entry.page = `http://localhost:${serverPort}/${encodeURI(entry.page)}` //encodeURIComponent
					}

					return entry
				})

				// server.close()
console.log(data)
				console.log('Server started at ', server.address().port) //process.argv[2]
			//
				let outputs = []
				Recorder(data).then((screenRecords) => {
					// console.log('recorder/screenRecords', screenRecords)
					OverlayHandler(data, screenRecords).then((overlayOutputs) => {
						// console.log('overlayOutputs', overlayOutputs)
						server.close()

						MergeHandler(overlayOutputs).then((overlayMergeOutput) => {
							console.log('MergeHandler:', overlayMergeOutput)

							if (overlayMergeOutput.length > 0) {
								outputs.push(overlayMergeOutput)
							} else if (overlayOutputs.length > 0) {
								outputs.push(...overlayOutputs)
							} else if (screenRecords.length > 0) {
								outputs.push(...screenRecords)
							}
							// at the end, merge all outputs:
							MergeHandler(outputs).then((output) => {
								console.log('outputs', output)
								callback(null, output)
							})

						})
					})
				})

			})

	// });

}



module.exports = function (infile, cb) {
  if (cb) return main(infile, cb)

  return new Promise(function (resolve, reject) {
    main(infile, function (err, data) {
      if (err) return reject(err)
      resolve(data)
    })
  })
}