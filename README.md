# Vegosvar
---

## Dependencies

Requires Node.js 0.12.7+, MongoDB 3.0+

## Install

Clone repository `git clone https://github.com/Vegosvar/Vegosvar`

Run `npm install`

Copy config.default.js to config.js.

Then run ``gulp`` to run the local server. 

Optionally you can set up a proxy with `nginx` and run Vegosvar as a `systemd` service.

## Configure

### Set up nginx

Copy default config

* `cp ansible/roles/nginx/files/nginx.conf /etc/nginx/sites-available/vegosvar.conf`

Enable site

* `sudo ln -s /etc/sites-available/vegosvar.conf /etc/nginx/sites-enabled`

Reload nginx for changes to take effect

* `sudo systemctl reload nginx`

### Set up systemd service

Copy service file

* `sudo cp ansible/roles/vegosvar/files/vegosvar.service /etc/systemd/system/`

Reload to make systemd register service

* `sudo systemctl daemon-reload`

Enable autostart

* `sudo systemctl enable vegosvar.service`

To start it without rebooting
* `sudo systemctl start vegosvar.service`

Check status
* `sudo systemctl status vegosvar`

Check log
* `sudo journalctl -f -u vegosvar`