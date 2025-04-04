
```javascript
  let flights = trips
    .filter(t=> t.isDirectory())
    .map(d=> ({
      dateTime: d.name.split('_'),
      content: fss
        .readdirSync(PUBLIC_DIRECTORY + '/' + d.name, WITH_FILE_TYPES)
        .map(f=> f.isDirectory()
          ? fss.readdirSync(`${PUBLIC_DIRECTORY}/${d.name}/${f.name}/`)
          : 'log'
        )
    }))
    .map(d=> d.name.split('_'))
    .map( ([date, time])=> ({date, time}) )

    content: fss
      .readdirSync(PUBLIC_DIRECTORY + '/' + d.name, options)
      .map(f=> f.isDirectory()
        ? fss.readdirSync(f.parentPath + '/' + f.name)
        : f.parentPath + '/' + f.name
      )
```
