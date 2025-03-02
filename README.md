
# Cocoon

A file manager for (d)eccos.

## but how do I...???!!!

```sh
git clone git@github.com:robotics-88/cocoon.git
cd cocoon
npm install
```

Then you will need to create a `.env` file.
The values are up to you!

Note that `PUBLIC_DIRECTORY` must be an absolute path, no `~`s allowed!
```
PUBLIC_DIRECTORY='/home/username/r88_public/records/<date-time>/<burn_unit>/flight_<timestamp>/'
PORT=9999
```
Then run with `npm start` and connect!
